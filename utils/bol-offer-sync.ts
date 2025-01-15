import { KeystoneContext } from "@keystone-6/core/types";
import { eutaxes } from "./eutaxes";
import { generateRandomString } from "./random";
import { sendMail } from "./sendmail";
import { transformEmail } from "./utils";
import { generateInvoiceOut } from "./pdf/document/invoiceoutpdf";

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

export const syncBolOrders = async ({ context }: { context: KeystoneContext }) => {
  const companiesToSync = await findCompaniesToSync({ context });
  for (let currCompany of companiesToSync) {
    let orders = await getBolComOrders(currCompany.bolClientID, currCompany.bolClientSecret);
    if (orders && orders.length > 0) {
      for (let order of orders) {
        try {
          const orderExists = await checkIfOrderExists({ orderId: order.orderId, company: currCompany, context });
          if (!orderExists) {
            const orderDetails = await getBolComOrder({
              orderId: order.orderId,
              bolClientID: currCompany.bolClientID,
              bolClientSecret: currCompany.bolClientSecret,
            });
            await saveDocument({ bolDoc: orderDetails, company: currCompany, context });
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(error);
        }
      }
    }
  }
};

const findCompaniesToSync = async ({ context }: { context: KeystoneContext }) => {
  return await context.sudo().query.Company.findMany({
    query: "id bolClientID bolClientSecret emailHost emailPort emailUser emailPassword name owner { id } establishments { id }",
    where: {
      isActive: {
        equals: true,
      },
      bolClientID: {
        not: {
          equals: "",
        },
      },
      bolClientSecret: {
        not: {
          equals: "",
        },
      },
    },
  });
};

async function getBolComOrders(bolClientID: string, bolClientSecret: string) {
  await authenticateBolCom(bolClientID, bolClientSecret);

  let orders: any[] = [];
  const dateString = (date: Date) => date.toISOString().split("T")[0];

  try {
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const response = await fetch(`${bolApiUrl}/orders?fulfilment-method=ALL&status=ALL&latest-change-date=${dateString(date)}&page=1`, {
        method: "GET",
        headers: bolHeaders("json", bolClientID),
      });
      if (!response.ok) {
        console.error(await response.text());
      } else {
        const answer = await response.json();
        if (answer.orders) {
          orders = orders.concat(answer.orders);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error(error);
  }
  const sortedOrders = orders.sort((a, b) => new Date(a.orderPlacedDateTime).getTime() - new Date(b.orderPlacedDateTime).getTime());

  return sortedOrders;
}

async function checkIfOrderExists({ orderId, company, context }: { orderId: string; company: any; context: KeystoneContext }) {
  const existingDoc = await context.sudo().query.Document.findMany({
    query: "id",
    where: {
      company: {
        id: {
          equals: company.id,
        },
      },
      externalId: {
        equals: orderId,
      },
    },
  });
  if (existingDoc.length > 0) {
    return true;
  }
  return false;
}

async function getBolComOrder({ orderId, bolClientID, bolClientSecret }: { orderId: string; bolClientID: string; bolClientSecret: string }) {
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

async function findProduct({ ean, company, context }: { ean: string; company: any; context: KeystoneContext }) {
  let products = await context.sudo().query.Material.findMany({
    query: "ean id name tax price",
    where: {
      ean: {
        equals: ean,
      },
      company: {
        id: {
          equals: company.id,
        },
      },
    },
  });
  if (products.length > 0) {
    return products.at(0);
  } else {
    return null;
  }
}

async function createProduct({ productDetails, company, context }: { productDetails: any; company: any; context: KeystoneContext }) {
  let product: Record<string, any> = {
    ean: productDetails.product.ean,
    name: productDetails.product.title,
    tax: "21.0000",
    price: productDetails.unitPrice.toFixed(4),
    company: {
      connect: {
        id: company.id,
      },
    },
  };
  const newProduct = await context.sudo().query.Material.createOne({
    data: product,
    query: "id ean name tax price",
  });
  return newProduct;
}

const saveDocument = async ({ bolDoc, company, context }: { bolDoc: any; company: any; context: KeystoneContext }) => {
  let document: Record<string, any> = {
    externalId: bolDoc.orderId,
    date: bolDoc.orderPlacedDateTime,
    company: {
      connect: {
        id: company.id,
      },
    },
    origin: "BOL.COM",
    products: {
      create: [],
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
    payments: {
      create: [
        {
          value: bolDoc.orderItems.reduce((acc: number, dp: { unitPrice: number }) => acc + dp.unitPrice, 0).toFixed(4),
          type: "online",
          isVerified: true,
          timestamp: bolDoc.orderPlacedDateTime,
          company: {
            connect: {
              id: company.id,
            },
          },
          creator: {
            connect: {
              id: company.owner.id,
            },
          },
        },
      ],
    },
    type: "invoice",
  };

  try {
    let customer = await getCustomer({ email: bolDoc.billingDetails.email, company, context });
    if (!customer) {
      customer = await createCustomer({ orderDetails: bolDoc, company, context });
    }
    document.customer = {
      connect: {
        id: customer!.id,
      },
    };

    let docAddress = customer!.customerAddresses.find(
      (address: { street: any; door: any; zip: any; city: any; country: any }) =>
        address.street.toLowerCase() == bolDoc.billingDetails.streetName.toLowerCase() &&
        address.door.toLowerCase() == bolDoc.billingDetails.houseNumber.toLowerCase() + (bolDoc.billingDetails.houseNumberExtension ?? "").toLowerCase() &&
        address.zip.toLowerCase() == bolDoc.billingDetails.zipCode.toLowerCase() &&
        address.city.toLowerCase() == bolDoc.billingDetails.city.toLowerCase() &&
        address.country.toLowerCase() == bolDoc.billingDetails.countryCode.toLowerCase()
    );

    document.docAddress = {
      connect: {
        id: docAddress!.id,
      },
    };

    let delAddress = customer!.customerAddresses.find(
      (address: { street: any; door: any; zip: any; city: any; country: any }) =>
        address.street.toLowerCase() == bolDoc.shipmentDetails.streetName.toLowerCase() &&
        address.door.toLowerCase().includes(bolDoc.shipmentDetails.houseNumber.toLowerCase()) &&
        address.zip.toLowerCase() == bolDoc.shipmentDetails.zipCode.toLowerCase() &&
        address.city.toLowerCase() == bolDoc.shipmentDetails.city.toLowerCase() &&
        address.country.toLowerCase() == bolDoc.shipmentDetails.countryCode.toLowerCase()
    );

    document.delAddress = {
      connect: {
        id: delAddress!.id,
      },
    };

    for (let orderProduct of bolDoc.orderItems) {
      let product = await findProduct({ ean: orderProduct.product.ean, company, context });
      if (!product) {
        product = await createProduct({ productDetails: orderProduct, company, context });
      }
      document.products.create.push({
        price: orderProduct.unitPrice.toFixed(4),
        company: {
          connect: {
            id: company.id,
          },
        },
        product: {
          connect: {
            id: product.id,
          },
        },
        amount: orderProduct.quantity.toFixed(4),
        tax: eutaxes.find((t) => t.code == docAddress.country)?.standard.toFixed(4) ?? "21.0000",
        name: product.name,
      });
    }

    const postedDocument = await context.sudo().query.Document.createOne({
      data: document,
      query:
        "prefix number date externalId origin totalTax totalPaid totalToPay total deliveryDate type payments { value timestamp type } products { name reduction description price amount totalTax totalWithTaxAfterReduction tax } delAddress { street door zip city floor province country } docAddress { street door zip city floor province country } customer { email firstName lastName phone customerCompany customerTaxNumber } establishment { name bankAccount1 bankAccount2 bankAccount3 taxID phone phone2 address { street door zip city floor province country } logo { url } }",
    });

    try {
      sendMail({
        establishment: postedDocument.establishment,
        recipient: "test@huseyinonal.com",
        subject: `Bestelling ${postedDocument.prefix ?? ""}${postedDocument.number}`,
        company: company,
        attachments: [await generateInvoiceOut({ document: postedDocument })],
        html: `<p>Beste ${
          postedDocument.customer!.firstName + " " + postedDocument.customer!.lastName
        },</p><p>In bijlage vindt u het factuur voor uw recentste bestelling bij ons.</p><p>Met vriendelijke groeten.</p><p>${
          postedDocument.establishment.name
        }</p>`,
      });
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    console.error(error);
  }
};

const getCustomer = async ({ email, company, context }: { email: string; company: any; context: KeystoneContext }) => {
  try {
    const existingCustomer = await context.sudo().query.User.findMany({
      query: "id email customerAddresses { id street door zip city country } firstName lastName",
      where: {
        role: {
          equals: "customer",
        },
        email: {
          equals: transformEmail({
            email: email,
            companyId: company.id,
          }),
        },
      },
    });
    if (existingCustomer.length > 0) {
      return existingCustomer.at(0);
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

const compareAddresses = ({ docAddress, delAddress }: { docAddress: any; delAddress: any }) => {
  if (
    docAddress.streetName.toLowerCase() === delAddress.streetName.toLowerCase() &&
    docAddress.houseNumber.toLowerCase() === delAddress.houseNumber.toLowerCase() &&
    docAddress.zipCode.toLowerCase() === delAddress.zipCode.toLowerCase() &&
    docAddress.city.toLowerCase() === delAddress.city.toLowerCase() &&
    docAddress.countryCode.toLowerCase() === delAddress.countryCode.toLowerCase()
  ) {
    return true;
  } else {
    return false;
  }
};

const createCustomer = async ({ orderDetails, company, context }: { orderDetails: any; company: any; context: KeystoneContext }) => {
  let customer: Record<string, any> = {
    email: orderDetails.billingDetails.email,
    firstName: orderDetails.billingDetails.firstName,
    lastName: orderDetails.billingDetails.surname,
    name: orderDetails.billingDetails.firstName + " " + orderDetails.billingDetails.surname,
    password: generateRandomString(24),
    role: "customer",
    company: {
      connect: {
        id: company.id,
      },
    },
  };
  let docAddress = orderDetails.billingDetails;
  let delAddress = orderDetails.shipmentDetails;
  customer.customerAddresses = {
    create: [
      {
        street: docAddress.streetName,
        door: docAddress.houseNumber,
        zip: docAddress.zipCode,
        city: docAddress.city,
        country: docAddress.countryCode,
        company: {
          connect: {
            id: company.id,
          },
        },
      },
    ],
  };
  if (docAddress.houseNumberExtension) {
    customer.customerAddresses.create.at(0).door = customer.customerAddresses.create.at(0).door + docAddress.houseNumberExtension;
  }
  const areAddressesSame = compareAddresses({ docAddress, delAddress });
  if (!areAddressesSame) {
    customer.customerAddresses.create.push({
      street: delAddress.streetName,
      door: delAddress.houseNumber,
      zip: delAddress.zipCode,
      city: delAddress.city,
      country: delAddress.countryCode,
      company: {
        connect: {
          id: company.id,
        },
      },
    });
  }

  try {
    const newUser = await context.sudo().query.User.createOne({
      data: customer,
      query: "id customerAddresses { id street door zip city country } firstName lastName email",
    });
    return newUser;
  } catch (error) {
    console.error(error);
    return null;
  }
};
