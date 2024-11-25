import { eutaxes } from "./eutaxes";
import { generateInvoiceOut } from "./invoiceoutpdf";
import { generateRandomString } from "./random";
import { sendMail } from "./sendmail";

const bolAuthUrl = "https://login.bol.com/token?grant_type=client_credentials";

const bolApiUrl = "https://api.bol.com/retailer";

let bolTokens: { clientId: string; token: string; expiration: Date }[] = [];

function bolHeaders(headersType: string, clientId: string) {
  const tokenEntry = bolTokens.find((t) => t.clientId === clientId);
  if (!tokenEntry) {
    return;
  }

  const contentType = headersType === "json" ? "application/vnd.retailer.v10+json" : "application/vnd.retailer.v10+csv";
  return {
    "Content-Type": contentType,
    Accept: contentType,
    Authorization: `Bearer ${tokenEntry.token}`,
  };
}

async function authenticateBolCom(clientId: string, clientSecret: string) {
  const existingTokenEntry = bolTokens.find((t) => t.clientId === clientId);

  if (existingTokenEntry && new Date() < existingTokenEntry.expiration) {
    return existingTokenEntry.token;
  }

  const authHeader = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;

  try {
    const response = await fetch(bolAuthUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      console.error(await response.text());
      return false;
    }

    const data = await response.json();
    const newToken = {
      clientId,
      token: data["access_token"],
      expiration: new Date(new Date().getTime() + data["expires_in"] * 1000),
    };

    if (existingTokenEntry) {
      existingTokenEntry.token = newToken.token;
      existingTokenEntry.expiration = newToken.expiration;
    } else {
      bolTokens.push(newToken);
    }

    return newToken.token;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export const createDocumentsFromBolOrders = async (context) => {
  await context
    .sudo()
    .query.Company.findMany({
      query: "id bolClientID bolClientSecret owner { id } establishments { id }",
      where: {
        isActive: {
          equals: true,
        },
      },
    })
    .then(async (res) => {
      let companiesToSync = res.filter(
        (company: { id: string; bolClientID: string; bolClientSecret: string }) => company.bolClientID && company.bolClientSecret
      );
      console.log(companiesToSync);
      for (let i = 0; i < companiesToSync.length; i++) {
        const currCompany = res[i];
        getBolComOrders(currCompany.bolClientID, currCompany.bolClientSecret).then(async (orders) => {
          if (orders && orders.length > 0) {
            const sortedOrders = orders.sort((a, b) => new Date(a.orderPlacedDateTime).getTime() - new Date(b.orderPlacedDateTime).getTime());
            for (let i = 0; i < orders.length; i++) {
              try {
                await getBolComOrder(sortedOrders[i].orderId, currCompany.bolClientID, currCompany.bolClientSecret).then(async (orderDetails) => {
                  orderDetails && (await saveDocument(orderDetails, currCompany, context));
                });
              } catch (error) {
                console.error(error);
                console.error("Error fetching order details for orderId: ", sortedOrders[i]);
              }
            }
          }
        });
      }
    });
  console.log("Finished Cron Job for Bol Orders");
};

async function getBolComOrders(bolClientID: string, bolClientSecret: string) {
  await authenticateBolCom(bolClientID, bolClientSecret);

  const dateString = (date: Date) => date.toISOString().split("T")[0];

  try {
    let orders = [];
    let today = new Date();
    today.setDate(today.getDate() - 7);
    for (let i = 0; i < 7; i++) {
      today.setDate(today.getDate() + 1);
      const response = await fetch(`${bolApiUrl}/orders?fulfilment-method=ALL&status=ALL&latest-change-date=${dateString(today)}&page=1`, {
        method: "GET",
        headers: bolHeaders("json", bolClientID),
      });
      if (!response.ok) {
        console.error(await response.text());
      } else {
        const answer = await response.json();
        orders = orders.concat(answer.orders);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return orders;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getBolComOrder(orderId: string, bolClientID: string, bolClientSecret: string) {
  await authenticateBolCom(bolClientID, bolClientSecret);

  try {
    const response = await fetch(`${bolApiUrl}/orders/${orderId}`, {
      method: "GET",
      headers: bolHeaders("json", bolClientID),
    });

    if (!response.ok) {
      console.error(await response.text());
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

const saveDocument = async (bolDoc, company, context) => {
  try {
    const existingDoc = await payload.find({
      user: creator.docs[0],
      collection: "documents",
      where: {
        references: {
          equals: bolDoc.orderId,
        },
      },
    });
    if (existingDoc.docs.length > 0) {
      return;
    }

    let docAddress = null;
    let delAddress = null;

    const transformEmail = (email: string) => {
      let parts = email.split("@");
      let localPart = parts[0].split("+")[0];
      let domainPart = parts[1];
      return localPart + "+" + company.id + "@" + domainPart;
    };

    const existingCustomer = await payload.find({
      user: creator.docs[0],
      depth: 3,
      collection: "users",
      where: {
        email: {
          equals: transformEmail(bolDoc.billingDetails.email),
        },
      },
    });
    let user;
    if (existingCustomer.docs.length > 0) {
      user = existingCustomer.docs[0];

      if (user.customerAddresses && user.customerAddresses.length > 0) {
        for (let i = 0; i < user.customerAddresses.length; i++) {
          if (
            user.customerAddresses[i].street === bolDoc.shipmentDetails.streetName &&
            user.customerAddresses[i].door === bolDoc.shipmentDetails.houseNumber &&
            user.customerAddresses[i].zip === bolDoc.shipmentDetails.zipCode &&
            user.customerAddresses[i].city === bolDoc.shipmentDetails.city &&
            user.customerAddresses[i].country === bolDoc.shipmentDetails.countryCode
          ) {
            delAddress = user.customerAddresses[i];
          }
          if (
            user.customerAddresses[i].street === bolDoc.billingDetails.streetName &&
            user.customerAddresses[i].door === bolDoc.billingDetails.houseNumber &&
            user.customerAddresses[i].zip === bolDoc.billingDetails.zipCode &&
            user.customerAddresses[i].city === bolDoc.billingDetails.city &&
            user.customerAddresses[i].country === bolDoc.billingDetails.countryCode
          ) {
            docAddress = user.customerAddresses[i];
          }
        }
      }
    } else {
      delAddress = await payload.create({
        user: creator.docs[0],
        collection: "addresses",
        data: {
          street: bolDoc.shipmentDetails.streetName,
          door: bolDoc.shipmentDetails.houseNumber,
          zip: bolDoc.shipmentDetails.zipCode,
          city: bolDoc.shipmentDetails.city,
          country: bolDoc.shipmentDetails.countryCode,
          company: company.id,
        },
      });
      if (bolDoc.shipmentDetails.streetName !== bolDoc.billingDetails.streetName) {
        docAddress = await payload.create({
          user: creator.docs[0],
          collection: "addresses",
          data: {
            street: bolDoc.billingDetails.streetName,
            door: bolDoc.billingDetails.houseNumber,
            zip: bolDoc.billingDetails.zipCode,
            city: bolDoc.billingDetails.city,
            country: bolDoc.billingDetails.countryCode,
            company: company.id,
          },
        });
      } else {
        docAddress = delAddress;
      }
      const newUser = await payload.create({
        user: creator.docs[0],
        collection: "users",
        data: {
          email: bolDoc.billingDetails.email,
          preferredLanguage: bolDoc.shipmentDetails.language,
          phone: bolDoc.shipmentDetails.phone,
          customerAddresses: [docAddress.id, delAddress.id],
          password: generateRandomString(24),
          role: "customer",
          firstName: bolDoc.billingDetails.firstName,
          lastName: bolDoc.billingDetails.surname,
          company: company.id,
        },
      });
      user = newUser;
    }
    if (!delAddress) {
      delAddress = await payload.create({
        user: creator.docs[0],
        collection: "addresses",
        data: {
          street: bolDoc.shipmentDetails.streetName,
          door: bolDoc.shipmentDetails.houseNumber,
          zip: bolDoc.shipmentDetails.zipCode,
          city: bolDoc.shipmentDetails.city,
          country: bolDoc.shipmentDetails.countryCode,
          company: company.id,
        },
      });
    }
    if (!docAddress) {
      docAddress = await payload.create({
        user: creator.docs[0],
        collection: "addresses",
        data: {
          street: bolDoc.billingDetails.streetName,
          door: bolDoc.billingDetails.houseNumber,
          zip: bolDoc.billingDetails.zipCode,
          city: bolDoc.billingDetails.city,
          country: bolDoc.billingDetails.countryCode,
          company: company.id,
        },
      });
    }

    let documentProducts = [];
    for (let i = 0; i < bolDoc.orderItems.length; i++) {
      const products = await payload.find({
        user: creator.docs[0],
        collection: "products",
        where: {
          EAN: {
            equals: bolDoc.orderItems[i].product.ean,
          },
        },
      });
      documentProducts.push(
        await payload.create({
          user: creator.docs[0],
          collection: "document-products",
          data: {
            value: bolDoc.orderItems[i].unitPrice,
            company: company.id,
            product: products && products.docs.length > 0 ? (products.docs[0].id as number) : null,
            amount: bolDoc.orderItems[i].quantity,
            tax: eutaxes.find((t) => t.code == docAddress.country)?.standard ?? "21",
            name: products && products.docs.length > 0 ? products.docs[0].name : bolDoc.orderItems[i].product.title,
          },
        })
      );
    }
    const document = await payload.create({
      user: creator.docs[0],
      collection: "documents",
      data: {
        number: bolDoc.orderId,
        date: bolDoc.orderPlacedDateTime.split("T"),
        time: bolDoc.orderPlacedDateTime.split("T")[1].split("+")[0],
        documentProducts: documentProducts.map((dp) => dp.id),
        customer: user.id,
        company: company.id,
        references: bolDoc.orderId,
        delAddress: delAddress.id,
        docAddress: docAddress.id,
        creator: creator.docs[0].id as number,
        establishment: establishment.docs[0].id as number,
        type: "invoice",
      },
    });

    const DPs = document.products;

    await payload.create({
      user: creator.docs[0],
      collection: "payments",
      data: {
        value: DPs.reduce((acc: number, dp: { subTotal: number }) => acc + dp.subTotal, 0),
        type: "online",
        isVerified: true,
        document: document.id as number,
        date: bolDoc.orderPlacedDateTime.split("T"),
        creator: creator.docs[0].id as number,
        company: company.id,
        establishment: establishment.docs[0].id as number,
      },
    });

    try {
      const customer = document.customer;
      sendMail({
        recipient: "huseyin-_-onal@hotmail.com",
        subject: `Bestelling ${document.prefix ?? ""}${document.number}`,
        company: company,
        attachments: [await generateInvoiceOut({ document: document })],
        html: `<p>Beste ${
          customer.firstName + " " + customer.lastName
        },</p><p>In bijlage vindt u het factuur voor uw laatste bestelling bij ons.</p><p>Met vriendelijke groeten.</p><p>${company.name}</p>`,
      });
    } catch (error) {}
  } catch (error) {
    console.error(error);
  }
};
