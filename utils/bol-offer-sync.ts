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

  let auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const authHeader = `Basic ${auth}`;

  try {
    const response = await fetch(bolAuthUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("bol auth error:", await response.text());
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
    console.error("bol token error:", error);
    return false;
  }
}

export const createDocumentsFromBolOrders = async (context) => {
  await context
    .sudo()
    .query.Company.findMany({
      query: "id bolClientID bolClientSecret name owner { id } establishments { id }",
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
      for (let i = 0; i < companiesToSync.length; i++) {
        const currCompany = companiesToSync[i];
        getBolComOrders(currCompany.bolClientID, currCompany.bolClientSecret).then(async (orders) => {
          if (orders && orders.length > 0) {
            const sortedOrders = orders.sort((a, b) => new Date(a.orderPlacedDateTime).getTime() - new Date(b.orderPlacedDateTime).getTime());
            for (let i = 0; i < orders.length; i++) {
              try {
                await getBolComOrder(sortedOrders[i].orderId, currCompany.bolClientID, currCompany.bolClientSecret).then(async (orderDetails) => {
                  orderDetails && (await saveDocument(orderDetails, currCompany, context));
                });
              } catch (error) {
                console.error("Error fetching order details for orderId: ", sortedOrders[i], error);
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
    const existingDoc = await context.sudo().query.Document.findMany({
      query: "references id",
      where: {
        company: {
          id: {
            equals: company.id,
          },
        },
        references: {
          equals: bolDoc.orderId,
        },
      },
    });
    if (existingDoc.length > 0) {
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

    const existingCustomer = await context.sudo().query.User.findMany({
      query: "id email customerAddresses { id street door zip city country } firstName lastName",
      where: {
        company: {
          id: {
            equals: company.id,
          },
        },
        role: {
          equals: "customer",
        },
        email: {
          equals: transformEmail(bolDoc.billingDetails.email),
        },
      },
    });

    console.log(existingCustomer);

    let user;
    if (existingCustomer.length > 0) {
      user = existingCustomer.at(0);

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
      const newUser = await context.sudo().query.User.createOne({
        data: {
          email: bolDoc.billingDetails.email,
          preferredLanguage: bolDoc.shipmentDetails.language,
          phone: bolDoc.shipmentDetails.phone,
          password: generateRandomString(24),
          role: "customer",
          firstName: bolDoc.billingDetails.firstName,
          lastName: bolDoc.billingDetails.surname,
          name: bolDoc.billingDetails.firstName + " " + bolDoc.billingDetails.surname,
          company: {
            connect: {
              id: company.id,
            },
          },
        },
      });
      user = newUser;
      console.log("new user created", newUser);
      delAddress = await context.sudo().query.Address.createOne({
        query: "id street door zip city country",
        data: {
          street: bolDoc.shipmentDetails.streetName,
          door: bolDoc.shipmentDetails.houseNumber,
          zip: bolDoc.shipmentDetails.zipCode,
          city: bolDoc.shipmentDetails.city,
          country: bolDoc.shipmentDetails.countryCode,
          company: {
            connect: {
              id: company.id,
            },
          },
          customer: {
            connect: {
              id: user.id,
            },
          },
        },
      });
      if (bolDoc.shipmentDetails.streetName !== bolDoc.billingDetails.streetName) {
        docAddress = await context.sudo().query.Address.createOne({
          query: "id street door zip city country",
          data: {
            street: bolDoc.billingDetails.streetName,
            door: bolDoc.billingDetails.houseNumber,
            zip: bolDoc.billingDetails.zipCode,
            city: bolDoc.billingDetails.city,
            country: bolDoc.billingDetails.countryCode,
            company: {
              connect: {
                id: company.id,
              },
            },
            customer: {
              connect: {
                id: user.id,
              },
            },
          },
        });
      } else {
        docAddress = delAddress;
      }
    }
    if (!delAddress) {
      delAddress = await context.sudo().query.Address.createOne({
        query: "id street door zip city country",
        data: {
          street: bolDoc.shipmentDetails.streetName,
          door: bolDoc.shipmentDetails.houseNumber,
          zip: bolDoc.shipmentDetails.zipCode,
          city: bolDoc.shipmentDetails.city,
          country: bolDoc.shipmentDetails.countryCode,
          customer: {
            connect: {
              id: user.id,
            },
          },
          company: {
            connect: {
              id: company.id,
            },
          },
        },
      });
    }
    if (!docAddress) {
      docAddress = await context.sudo().query.Address.createOne({
        query: "id street door zip city country",
        data: {
          street: bolDoc.billingDetails.streetName,
          door: bolDoc.billingDetails.houseNumber,
          zip: bolDoc.billingDetails.zipCode,
          city: bolDoc.billingDetails.city,
          country: bolDoc.billingDetails.countryCode,
          customer: {
            connect: {
              id: user.id,
            },
          },
          company: {
            connect: {
              id: company.id,
            },
          },
        },
      });
    }

    const document = await context.sudo().query.Document.createOne({
      data: {
        number: bolDoc.orderId,
        date: bolDoc.orderPlacedDateTime,
        customer: {
          connect: {
            id: user.id,
          },
        },
        company: {
          connect: {
            id: company.id,
          },
        },
        references: bolDoc.orderId,
        delAddress: {
          connect: {
            id: delAddress.id,
          },
        },
        docAddress: {
          connect: {
            id: docAddress.id,
          },
        },
        creator: {
          connect: {
            id: company.owner.id as number,
          },
        },

        establishment: {
          connect: {
            id: company.establishments.at(0).id as number,
          },
        },
        type: "invoice",
      },
    });

    for (let i = 0; i < bolDoc.orderItems.length; i++) {
      const products = await context.sudo().query.Material.findMany({
        query: "ean id",
        where: {
          ean: {
            equals: bolDoc.orderItems[i].product.ean,
          },
          company: {
            id: {
              equals: company.id,
            },
          },
        },
      });
      await context.sudo().query.DocumentProduct.createOne({
        data: {
          price: bolDoc.orderItems[i].unitPrice.toFixed(4),
          company: {
            connect: {
              id: company.id,
            },
          },
          document: {
            connect: {
              id: document.id as number,
            },
          },
          product:
            products && products.length > 0
              ? {
                  connect: {
                    id: products[0].id as number,
                  },
                }
              : null,
          amount: bolDoc.orderItems[i].quantity.toFixed(4),
          tax: eutaxes.find((t) => t.code == docAddress.country)?.standard.toFixed(4) ?? "21.0000",
          name: products && products.length > 0 ? products[0].name : bolDoc.orderItems[i].product.title,
        },
      });
    }

    await context.sudo().query.Payment.createOne({
      data: {
        value: bolDoc.orderItems.reduce((acc: number, dp) => acc + dp.unitPrice, 0).toFixed(4),
        type: "online",
        isVerified: true,
        document: {
          connect: {
            id: document.id as number,
          },
        },
        timestamp: bolDoc.orderPlacedDateTime,
        company: {
          connect: {
            id: company.id,
          },
        },
        creator: {
          connect: {
            id: company.owner.id as number,
          },
        },
      },
    });

    try {
      const customer = user;
      sendMail({
        recipient: "contact@huseyinonal.com",
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
