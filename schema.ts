import { text, relationship, password, timestamp, select, multiselect, virtual, checkbox, integer, json, decimal } from "@keystone-6/core/fields";
import { allowAll, denyAll } from "@keystone-6/core/access";
import { graphql, list } from "@keystone-6/core";
import { Decimal } from "@keystone-6/core/types";
import type { Lists } from ".keystone/types";
import {
  calculateTotalWithoutTaxAfterReduction,
  calculateTotalWithoutTaxBeforeReduction,
  calculateTotalWithTaxAfterReduction,
  calculateTotalWithTaxBeforeReduction,
} from "./utils/calculations/documentproducts";
import {
  isAdminAccountantManager,
  isWorker,
  isCompanyAdmin,
  isGlobalAdmin,
  isEmployee,
  isManager,
  isUser,
  isSuperAdmin,
  isIntern,
  isAccountant,
} from "./utils/accesscontrol/rbac";
import {
  filterOnIdAccountancyOrAccountancyCompanyRelation,
  filterOnCompanyRelation,
  filterOnIdCompanyOrCompanyAccountancyRelation,
  filterOnIdAccountancy,
  filterOnCompanyRelationOrCompanyAccountancyRelation,
} from "./utils/accesscontrol/tenantac";
import { sendMail } from "./utils/sendmail";
import { generateInvoiceOut } from "./utils/pdf/document/invoicepdf";
import { generateCreditNoteOut } from "./utils/pdf/document/creditnotepdf";

export const lists: Lists = {
  Accountancy: list({
    access: {
      filter: {
        query: filterOnIdAccountancyOrAccountancyCompanyRelation,
        update: filterOnIdAccountancy,
        delete: isSuperAdmin,
      },
      operation: {
        create: isSuperAdmin,
        query: isAccountant,
        update: isAdminAccountantManager,
        delete: isSuperAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, context, item, resolvedData }) => {
        try {
          if (operation === "create" || operation === "update") {
            const pin = resolvedData.pincode;
            let pinCheck = await context.sudo().query.Company.findOne({
              where: {
                pincode: String(pin),
              },
              query: "id",
            });
            if (!pinCheck) {
              pinCheck = await context.sudo().query.Accountancy.findOne({
                where: {
                  pincode: String(pin),
                },
                query: "id",
              });
            }
            if (pinCheck) {
              if (operation === "create") {
                throw new Error("Pincode already in use");
              } else if (operation === "update" && pinCheck.id !== item.id) {
                throw new Error("Pincode already in use");
              }
            }
          }
        } catch (error) {
          console.error("Pin set error:", error);
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      isActive: checkbox({ defaultValue: false, access: { update: isAdminAccountantManager } }),
      logo: relationship({
        ref: "File",
        many: false,
      }),
      pincode: text({ validation: { isRequired: true }, isIndexed: "unique" }),
      companies: relationship({ ref: "Company.accountancy", many: true }),
      users: relationship({ ref: "User.accountancy", many: true }),
      extraFields: json(),
    },
  }),
  Address: list({
    ui: {
      labelField: "street",
    },
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelationOrCompanyAccountancyRelation,
        delete: isSuperAdmin,
      },
      operation: {
        create: isUser,
        query: isUser,
        update: isEmployee,
        delete: isSuperAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, resolvedData, context }) => {
        try {
          if (operation === "create") {
            if (isGlobalAdmin({ session: context.session }) && resolvedData.company) {
            } else {
              resolvedData.company = {
                connect: {
                  id: context.session.data.company.id,
                },
              };
            }
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      street: text({ validation: { isRequired: true } }),
      door: text(),
      zip: text(),
      city: text(),
      floor: text(),
      province: text(),
      country: text(),
      customer: relationship({
        ref: "User.customerAddresses",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  AssemblyComponent: list({
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isManager,
        query: isEmployee,
        update: isManager,
        delete: isManager,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      description: text(),
      amount: integer(),
      assembly: relationship({
        ref: "Material.components",
        many: false,
      }),
      material: relationship({
        ref: "Material.assemblyComponents",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  Company: list({
    access: {
      filter: {
        query: filterOnIdCompanyOrCompanyAccountancyRelation,
        update: filterOnIdCompanyOrCompanyAccountancyRelation,
        delete: denyAll,
      },
      operation: {
        create: isAdminAccountantManager,
        query: isUser,
        update: isCompanyAdmin,
        delete: denyAll,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create" || operation === "update") {
            const pin = resolvedData.pincode;
            let pinCheck = await context.sudo().query.Company.findOne({
              where: {
                pincode: String(pin),
              },
              query: "id",
            });
            if (!pinCheck) {
              pinCheck = await context.sudo().query.Accountancy.findOne({
                where: {
                  pincode: String(pin),
                },
                query: "id",
              });
            }
            if (pinCheck) {
              if (operation === "create") {
                throw new Error("Pincode already in use");
              } else if (operation === "update" && pinCheck.id !== item.id) {
                throw new Error("Pincode already in use");
              }
            }
          }
        } catch (error) {
          console.error("Pin check error:", error);
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      isActive: checkbox({ defaultValue: false, access: { update: isAdminAccountantManager } }),
      logo: relationship({
        ref: "File",
        many: false,
      }),
      pincode: text({ validation: { isRequired: true }, isIndexed: "unique" }),
      owner: relationship({
        ref: "User.ownedCompany",
        many: false,
      }),
      users: relationship({ ref: "User.company", many: true }),
      establishments: relationship({ ref: "Establishment.company", many: true }),
      accountancy: relationship({ ref: "Accountancy.companies", many: false }),
      emailUser: text(),
      emailPassword: text(),
      emailHost: text(),
      emailPort: text(),
      emailSec: text(),
      stripeSecretKey: text(),
      stripePublishableKey: text(),
      bolClientID: text(),
      bolClientSecret: text(),
      amazonClientID: text(),
      amazonClientSecret: text(),
      einvoiceEmailIncoming: text(),
      einvoiceEmailOutgoing: text(),
      monthlyReports: checkbox({ defaultValue: false }),
      extraFields: json(),
    },
  }),
  Document: list({
    ui: {
      labelField: "date",
    },
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isManager,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, resolvedData, context }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }

        try {
          if (operation === "delete") {
            const products = await context.query.DocumentProduct.findMany({
              where: { document: { id: { equals: item.id } } },
              query: "id",
            });
            products.forEach(async (dp) => {
              await context.query.DocumentProduct.deleteOne({
                where: { id: dp.id },
              });
            });
          }
          if (operation === "create") {
            if (inputData.number) {
            } else {
              const docs = await context.query.Document.findMany({
                orderBy: { number: "desc" },
                where: {
                  type: { equals: inputData.type },
                  company: { id: { equals: resolvedData.company!.connect!.id } },
                  establishment: { id: { equals: resolvedData.establishment!.connect!.id } },
                },
                query: "id number",
              });
              const lastDocument = docs.at(0);
              let year = new Date().getFullYear();
              if (typeof resolvedData.date === "string") {
                year = new Date(resolvedData.date).getFullYear();
              } else if (resolvedData.date instanceof Date) {
                year = resolvedData.date.getFullYear();
              }
              if (lastDocument) {
                const lastDocumentNumber = lastDocument.number.split("-")[1];
                const lastDocumentYear = lastDocument.number.split("-")[0];
                if (lastDocumentYear == year) {
                  resolvedData.number = `${lastDocumentYear}-${(parseInt(lastDocumentNumber) + 1).toFixed(0).padStart(7, "0")}`;
                } else {
                  resolvedData.number = `${year}-${(1).toFixed(0).padStart(7, "0")}`;
                }
              } else {
                resolvedData.number = `${year}-${(1).toFixed(0).padStart(7, "0")}`;
              }
            }
            if (inputData.prefix) {
            } else {
              const establishment = await context.query.Establishment.findOne({
                where: { id: resolvedData.establishment!.connect!.id },
                query: "defaultPrefixes",
              });
              resolvedData.prefix = establishment.defaultPrefixes[resolvedData.type!];
            }
          }
        } catch (error) {
          console.error(error);
        }
      },
      afterOperation: async ({ operation, resolvedData, inputData, item, context }) => {
        if (resolvedData?.type != "purchase" && resolvedData?.type != "credit_note_incoming") {
          if (operation === "create" || operation === "update") {
            try {
              const postedDocument = await context.sudo().query.Document.findOne({
                where: { id: item.id },
                query:
                  "prefix number date externalId currency origin totalTax totalPaid totalToPay total deliveryDate type payments { value timestamp type } products { name reduction description price amount totalTax totalWithTaxAfterReduction tax } delAddress { street door zip city floor province country } docAddress { street door zip city floor province country } customer { email email2 firstName lastName phone customerCompany preferredLanguage customerTaxNumber } establishment { name bankAccount1 bankAccount2 bankAccount3 taxID phone phone2 company { emailHost emailPort emailUser emailPassword emailUser } address { street door zip city floor province country } logo { url } }",
              });
              if (postedDocument.type == "invoice" || postedDocument.type == "credit_note") {
                let bcc;
                if (postedDocument.customer.email2 && postedDocument.customer.email2 != "") {
                  bcc = postedDocument.customer.email2;
                }
                let attachment;
                if (postedDocument.type == "invoice") {
                  attachment = await generateInvoiceOut({ document: postedDocument });
                } else if (postedDocument.type == "credit_note") {
                  attachment = await generateCreditNoteOut({ document: postedDocument });
                }
                sendMail({
                  establishment: postedDocument.establishment,
                  recipient: postedDocument.customer.email.split("+")[0] + "@" + postedDocument.customer.email.split("@")[1],
                  bcc,
                  subject: `Document ${postedDocument.prefix ?? ""}${postedDocument.number}`,
                  company: postedDocument.establishment.company,
                  attachments: [attachment],
                  html: `<p>Beste ${
                    postedDocument.customer!.firstName + " " + postedDocument.customer!.lastName
                  },</p><p>In bijlage vindt u het document voor ons recentste transactie.</p><p>Met vriendelijke groeten.</p><p>${
                    postedDocument.establishment.name
                  }</p>`,
                });
              }
            } catch (error) {
              console.error(error);
            }
          }
        }
      },
    },
    fields: {
      date: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
        access: {
          update: isEmployee,
        },
      }),
      origin: text(),
      externalId: text(),
      deliveryDate: timestamp({
        isOrderable: true,
        access: {
          update: isEmployee,
        },
      }),
      createdAt: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
        access: {
          create: denyAll,
          update: denyAll,
        },
      }),
      type: select({
        type: "string",
        options: ["quote", "sale", "dispatch", "invoice", "credit_note", "debit_note", "purchase", "credit_note_incoming"],
        validation: { isRequired: true },
      }),
      currency: select({
        type: "string",
        options: ["TRY", "USD", "EUR"],
        defaultValue: "EUR",
        validation: { isRequired: true },
        access: {
          update: isCompanyAdmin,
        },
      }),
      creator: relationship({
        ref: "User.documents",
        many: false,
        access: {
          update: denyAll,
        },
      }),
      supplier: relationship({
        ref: "Supplier.documents",
        many: false,
      }),
      customer: relationship({
        ref: "User.customerDocuments",
        many: false,
        access: {
          update: denyAll,
        },
      }),
      files: relationship({
        ref: "File",
        many: true,
      }),
      isDeleted: checkbox({ defaultValue: false }),
      fromDocument: relationship({
        ref: "Document.toDocument",
        many: false,
      }),
      delAddress: relationship({
        ref: "Address",
        many: false,
      }),
      docAddress: relationship({
        ref: "Address",
        many: false,
      }),
      toDocument: relationship({
        ref: "Document.fromDocument",
        many: false,
      }),
      products: relationship({
        ref: "DocumentProduct.document",
        many: true,
      }),
      payments: relationship({
        ref: "Payment.document",
        many: true,
      }),
      prefix: text(),
      phase: integer(),
      number: text(),
      value: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount tax",
              });
              let total = 0;
              materials.forEach((docProd) => {
                total += calculateTotalWithTaxBeforeReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  taxIncluded: item.taxIncluded,
                });
              });
              return new Decimal(total);
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      total: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount reduction tax",
              });
              let total = 0;
              materials.forEach((docProd) => {
                total += calculateTotalWithTaxAfterReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded,
                });
              });
              return new Decimal(total);
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      totalPaid: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              const payments = await context.query.Payment.findMany({
                where: { document: { some: { id: { equals: item.id } } }, isDeleted: { equals: false } },
                query: "value",
              });
              let total = 0;
              payments.forEach((payment) => {
                total += Number(payment.value);
              });
              return new Decimal(total);
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      totalToPay: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount reduction tax",
              });
              let totalValue = 0;
              materials.forEach((docProd) => {
                totalValue += calculateTotalWithTaxAfterReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded,
                });
              });
              const payments = await context.query.Payment.findMany({
                where: { document: { some: { id: { equals: item.id } } }, isDeleted: { equals: false } },
                query: "value",
              });
              let totalPaid = 0;
              payments.forEach((payment) => {
                totalPaid += Number(payment.value);
              });
              let total = totalValue - totalPaid;
              if (total < 0.02 && total > -0.02) {
                total = 0;
              }
              return new Decimal(total);
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      totalTax: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount reduction tax",
              });
              let totalValue = 0;
              materials.forEach((docProd) => {
                totalValue += calculateTotalWithTaxAfterReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded,
                });
                totalValue -= calculateTotalWithoutTaxAfterReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded,
                });
              });
              return new Decimal(totalValue);
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      comments: text(),
      references: text(),
      managerNotes: text(),
      establishment: relationship({ ref: "Establishment.documents", many: false }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      taxIncluded: checkbox({ defaultValue: true }),
      extraFields: json(),
    },
  }),
  DocumentProduct: list({
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
        try {
          if (operation === "delete") {
            const movements = await context.query.StockMovement.findMany({
              where: { documentProduct: { id: { equals: item.id } } },
              query: "id",
            });
            movements.forEach(async (movement) => {
              await context.query.StockMovement.deleteOne({
                where: { id: movement.id },
              });
            });
          }
        } catch (error) {
          console.error(error);
        }
      },
      afterOperation: async ({ operation, item, context }) => {
        // if (operation === "create") {
        //   const generalStorage = await context.query.Storage.findMany({
        //     where: { name: { equals: "Genel" } },
        //     query: "id",
        //   });
        //   await context.query.StockMovement.createOne({
        //     data: {
        //       material: { connect: { id: item.productId } },
        //       storage: { connect: { id: generalStorage.at(0)!.id } },
        //       amount: item.amount,
        //       movementType: "çıkış",
        //       documentProduct: { connect: { id: item.id } },
        //     },
        //   });
        // }
      },
    },
    fields: {
      amount: decimal({ validation: { isRequired: true, min: "1" } }),
      stockMovement: relationship({
        ref: "StockMovement.documentProduct",
        many: false,
      }),
      product: relationship({
        ref: "Material.documentProducts",
        many: false,
      }),
      name: text({ validation: { isRequired: true } }),
      description: text(),
      tax: decimal({ validation: { isRequired: true, min: "0" } }),
      price: decimal({ validation: { isRequired: true } }),
      pricedBy: select({
        type: "string",
        options: ["amount", "volume", "length", "weight", "area", "time"],
        defaultValue: "amount",
      }),
      reduction: decimal({ defaultValue: "0" }),
      totalWithoutTaxBeforeReduction: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded",
              }).then((res) => (taxIncluded = res.taxIncluded));
              return new Decimal(
                calculateTotalWithoutTaxBeforeReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  taxIncluded,
                })
              );
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      totalWithoutTaxAfterReduction: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded",
              }).then((res) => (taxIncluded = res.taxIncluded));
              return new Decimal(
                calculateTotalWithoutTaxAfterReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  reduction: Number(item.reduction) ?? 0,
                  taxIncluded,
                })
              );
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      totalWithTaxBeforeReduction: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded",
              }).then((res) => (taxIncluded = res.taxIncluded));
              return new Decimal(
                calculateTotalWithTaxBeforeReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  taxIncluded,
                })
              );
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      totalWithTaxAfterReduction: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded",
              }).then((res) => (taxIncluded = res.taxIncluded));
              return new Decimal(
                calculateTotalWithTaxAfterReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  reduction: Number(item.reduction) ?? 0,
                  taxIncluded,
                })
              );
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      totalTax: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded",
              }).then((res) => (taxIncluded = res.taxIncluded));
              return new Decimal(
                calculateTotalWithTaxAfterReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  reduction: Number(item.reduction) ?? 0,
                  taxIncluded,
                }) -
                  calculateTotalWithoutTaxAfterReduction({
                    price: Number(item.price),
                    amount: Number(item.amount),
                    tax: Number(item.tax),
                    reduction: Number(item.reduction) ?? 0,
                    taxIncluded,
                  })
              );
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      totalReduction: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded",
              }).then((res) => (taxIncluded = res.taxIncluded));
              return new Decimal(
                calculateTotalWithTaxBeforeReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  taxIncluded,
                }) -
                  calculateTotalWithTaxAfterReduction({
                    price: Number(item.price),
                    amount: Number(item.amount),
                    tax: Number(item.tax),
                    reduction: Number(item.reduction) ?? 0,
                    taxIncluded,
                  })
              );
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      document: relationship({
        ref: "Document.products",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  Establishment: list({
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isAdminAccountantManager,
        query: isWorker,
        update: isCompanyAdmin,
        delete: isGlobalAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      defaultCurrency: select({
        type: "string",
        options: ["TRY", "USD", "EUR"],
        defaultValue: "EUR",
      }),
      logo: relationship({
        ref: "File",
        many: false,
      }),
      phone: text(),
      phone2: text(),
      taxID: text(),
      bankAccount1: text(),
      bankAccount2: text(),
      bankAccount3: text(),
      shelves: relationship({ ref: "Shelf.establishment", many: true }),
      users: relationship({ ref: "User.establishment", many: true }),
      address: relationship({ ref: "Address", many: false }),
      documents: relationship({ ref: "Document.establishment", many: true }),
      company: relationship({ ref: "Company.establishments", many: false }),
      defaultPrefixes: json({
        defaultValue: {
          quote: "",
          sale: "",
          dispatch: "",
          invoice: "",
          credit_note: "",
          debit_note: "",
        },
      }),
      featureFlags: json({
        defaultValue: {
          documents: true,
          stock: true,
          drive: true,
        },
      }),
      extraFields: json(),
    },
  }),
  File: list({
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isSuperAdmin,
        delete: isManager,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      url: text(),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      accountancy: relationship({ ref: "Accountancy", many: false, access: { update: isSuperAdmin } }),
      extraFields: json({
        defaultValue: {
          isCover: false,
          order: 1,
        },
      }),
    },
  }),
  Material: list({
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isManager,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      nameLocalized: json({
        defaultValue: {
          en: "",
          nl: "",
          fr: "",
          de: "",
        },
      }),
      components: relationship({
        ref: "AssemblyComponent.assembly",
        many: true,
      }),
      assemblyComponents: relationship({
        ref: "AssemblyComponent.material",
        many: true,
      }),
      description: text(),
      descriptionLocalized: json({
        defaultValue: {
          en: "",
          nl: "",
          fr: "",
          de: "",
        },
      }),
      price: decimal({ validation: { isRequired: true, min: "0" } }),
      currentStock: decimal({ defaultValue: "0" }),
      length: decimal({}),
      width: decimal({}),
      height: decimal({}),
      weight: decimal({}),
      area: decimal({}),
      status: select({
        type: "string",
        options: ["active", "passive", "cancelled"],
        defaultValue: "passive",
      }),
      files: relationship({
        ref: "File",
        many: true,
      }),
      workOrders: relationship({
        ref: "WorkOrder.materials",
        many: true,
      }),
      code: text(),
      ean: text(),
      tax: decimal({ defaultValue: "21", validation: { isRequired: true, min: "0" } }),
      suppliers: relationship({
        ref: "Supplier.materials",
        many: true,
      }),
      pricedBy: select({
        type: "string",
        options: ["amount", "volume", "length", "weight", "area", "time"],
        defaultValue: "amount",
      }),
      type: select({
        type: "string",
        options: ["raw", "product", "assembly", "service"],
        defaultValue: "product",
        validation: { isRequired: true },
      }),
      operations: relationship({
        ref: "Operation.material",
        many: true,
      }),
      stockMovements: relationship({
        ref: "StockMovement.material",
        many: true,
      }),
      documentProducts: relationship({
        ref: "DocumentProduct.product",
        many: true,
      }),
      stock: relationship({
        ref: "ShelfStock.material",
        many: true,
      }),
      earliestExpiration: timestamp(),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      tags: relationship({ ref: "Tag.materials", many: true }),
      extraFields: json(),
    },
  }),
  Note: list({
    ui: {
      labelField: "note",
    },
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: denyAll,
        delete: denyAll,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      note: text({ validation: { isRequired: true } }),
      creator: relationship({
        ref: "User.notes",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  Notification: list({
    ui: {
      labelField: "date",
    },
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isGlobalAdmin,
        query: isUser,
        update: isGlobalAdmin,
        delete: isGlobalAdmin,
      },
    },
    fields: {
      date: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
      }),
      message: text({ validation: { isRequired: true } }),
      link: text(),
      handled: checkbox({ defaultValue: false }),
      notifyRoles: multiselect({
        type: "enum",
        options: [
          "superadmin",
          "global_admin",
          "owner",
          "company_admin",
          "general_manager",
          "manager",
          "accountant",
          "employee",
          "intern",
          "worker",
          "customer",
        ],
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
    },
  }),
  Operation: list({
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isEmployee,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      files: relationship({
        ref: "File",
        many: true,
      }),
      material: relationship({
        ref: "Material.operations",
        many: false,
      }),
      workOrderOperations: relationship({
        ref: "WorkOrderOperation.operation",
        many: true,
      }),
      user: relationship({ ref: "User.operations", many: false }),
      cost: decimal(),
      value: decimal({ validation: { isRequired: true, min: "0" } }),
      duration: integer(),
      description: text(),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  Payment: list({
    ui: {
      labelField: "timestamp",
    },
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isCompanyAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      value: decimal({ validation: { isRequired: true, min: "0" } }),
      document: relationship({
        ref: "Document.payments",
        many: true,
      }),
      out: checkbox({ defaultValue: false }),
      isDeleted: checkbox({ defaultValue: false }),
      isVerified: checkbox({ defaultValue: false }),
      drawnPayments: relationship({
        ref: "Payment.originPayment",
        many: false,
      }),
      originPayment: relationship({
        ref: "Payment.drawnPayments",
        many: true,
      }),
      creator: relationship({
        ref: "User.payments",
        many: false,
      }),
      reference: text(),
      type: select({
        type: "string",
        options: [
          "cash",
          "debit_card",
          "credit_card",
          "online",
          "bank_transfer",
          "financing",
          "financing_unverified",
          "promissory",
          "cheque",
          "cashing",
          "trade",
          "other",
        ],
        defaultValue: "cash",
        validation: { isRequired: true },
      }),
      timestamp: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
      }),
      notes: relationship({ ref: "Note", many: true }),
      customer: relationship({ ref: "User.customerPayments", many: false }),
      supplier: relationship({ ref: "Supplier.payments", many: false }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  Shelf: list({
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isCompanyAdmin,
        query: isEmployee,
        update: isCompanyAdmin,
        delete: isGlobalAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      x: text(),
      y: text(),
      z: text(),
      contents: relationship({
        ref: "ShelfStock.shelf",
        many: true,
      }),
      establishment: relationship({
        ref: "Establishment.shelves",
        many: false,
      }),
      stockMovements: relationship({
        ref: "StockMovement.shelf",
        many: true,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  ShelfStock: list({
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isWorker,
        query: isIntern,
        update: isWorker,
        delete: isWorker,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
      afterOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create" || operation === "update") {
            const relatedShelfStocks = await context.query.ShelfStock.findMany({
              where: {
                material: {
                  id: {
                    equals: item.materialId,
                  },
                },
              },
              query: "id currentStock expiration material { id }",
            });
            let newMaterialStock: Decimal = new Decimal("0.00");
            let newExpiration = null;
            if (relatedShelfStocks.length > 0) {
              relatedShelfStocks.forEach((s) => {
                newMaterialStock = Decimal.add(newMaterialStock, s.currentStock);
              });
              newExpiration =
                relatedShelfStocks.filter((st) => st.expiration).toSorted((a, b) => new Date(a.expiration).getTime() - new Date(b.expiration).getTime())?.[0]
                  ?.expiration ?? null;
            } else {
              newMaterialStock = new Decimal("0.00");
              newExpiration = null;
            }
            await context.query.Material.updateOne({
              where: { id: item.materialId },
              data: { currentStock: newMaterialStock, earliestExpiration: newExpiration },
            });
          }
        } catch (error) {
          console.error(error);
        }
      },
    },
    fields: {
      shelf: relationship({
        ref: "Shelf.contents",
        many: false,
      }),
      material: relationship({
        ref: "Material.stock",
        many: false,
      }),
      stockMovements: relationship({
        ref: "StockMovement.shelfStock",
        many: true,
      }),
      expiration: timestamp(),
      currentStock: decimal(),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
    },
  }),
  SoftwareVersion: list({
    isSingleton: true,
    access: {
      operation: {
        create: isSuperAdmin,
        query: allowAll,
        update: isSuperAdmin,
        delete: denyAll,
      },
    },
    fields: {
      version: integer({ validation: { isRequired: true }, defaultValue: 1 }),
      mobileVersion: integer({ validation: { isRequired: true }, defaultValue: 1 }),
      iosLink: text(),
      androidLink: text(),
      webLink: text(),
      windowsLink: text(),
      macLink: text(),
      date: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
      }),
    },
  }),
  StockMovement: list({
    ui: {
      labelField: "movementType",
    },
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isSuperAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
      afterOperation: async ({ operation, context, item }) => {
        // if (operation === "create") {
        //   const material = await context.sudo().query.Material.findOne({
        //     where: { id: item.materialId },
        //     query: "id stock name",
        //   });
        //   const shelf = await context.sudo().query.Shelf.findOne({
        //     where: { id: item.shelfId },
        //     query: "id contents x y z",
        //   });
        //   let newMaterialStock: MaterialStock = material.stock ?? { shelfStocks: [] };
        //   // Normalize the expiration date
        //   const normalizedExpiration = item.expiration ? new Date(item.expiration).toISOString() : null;
        //   const existingStockIndex = newMaterialStock.shelfStocks.findIndex(
        //     (s) =>
        //       s.shelfId === item.shelfId &&
        //       ((!s.expiration && !normalizedExpiration) ||
        //         (s.expiration && normalizedExpiration && new Date(s.expiration).getTime() === new Date(normalizedExpiration).getTime()))
        //   );
        //   console.log({ existingStockIndex });
        //   // Handle 'in' and 'out' movements
        //   if (existingStockIndex === -1) {
        //     if (item.movementType === "in") {
        //       newMaterialStock.shelfStocks.push({
        //         shelfId: item.shelfId!,
        //         expiration: normalizedExpiration,
        //         amount: Number(item.amount),
        //         location: shelf.x + `-` + shelf.y + `-` + shelf.z,
        //       });
        //     } else if (item.movementType === "out") {
        //     }
        //   } else {
        //     if (item.movementType === "in") {
        //       newMaterialStock.shelfStocks[existingStockIndex].amount += Number(item.amount);
        //     } else if (item.movementType === "out") {
        //       newMaterialStock.shelfStocks[existingStockIndex].amount -= Number(item.amount);
        //       if (newMaterialStock.shelfStocks[existingStockIndex].amount <= 0) {
        //         newMaterialStock.shelfStocks = newMaterialStock.shelfStocks.filter((_, index) => index !== existingStockIndex);
        //       }
        //     }
        //   }
        //   // Determine the new earliest expiration
        //   let newEarliestExpiration: Date | null = null;
        //   if (newMaterialStock.shelfStocks.length > 0) {
        //     newMaterialStock.shelfStocks.sort((a: ShelfStock, b: ShelfStock) => {
        //       if (!a.expiration && !b.expiration) return 0;
        //       if (!a.expiration) return 1;
        //       if (!b.expiration) return -1;
        //       return new Date(a.expiration).getTime() - new Date(b.expiration).getTime();
        //     });
        //     newEarliestExpiration = newMaterialStock.shelfStocks[0].expiration ? new Date(newMaterialStock.shelfStocks[0].expiration) : null;
        //   }
        //   // Update the material's stock and earliest expiration
        //   await context.sudo().query.Material.updateOne({
        //     where: { id: material.id },
        //     data: { earliestExpiration: newEarliestExpiration, stock: newMaterialStock },
        //   });
        //   let newShelfContents: ShelfContents = shelf.contents ?? { materialContents: [] };
        //   const existingContentIndex = newShelfContents.materialContents.findIndex(
        //     (c) =>
        //       c.materialId === item.materialId &&
        //       ((!c.expiration && !normalizedExpiration) ||
        //         (c.expiration && normalizedExpiration && new Date(c.expiration).getTime() === new Date(normalizedExpiration).getTime()))
        //   );
        //   // Handle 'in' and 'out' movements for shelf contents
        //   if (existingContentIndex === -1) {
        //     if (item.movementType === "in") {
        //       newShelfContents.materialContents.push({
        //         name: material.name,
        //         materialId: item.materialId!,
        //         expiration: normalizedExpiration,
        //         amount: Number(item.amount),
        //       });
        //     } else if (item.movementType === "out") {
        //       // Log an error or handle invalid "out" movement
        //     }
        //   } else {
        //     if (item.movementType === "in") {
        //       newShelfContents.materialContents[existingContentIndex].amount += Number(item.amount);
        //     } else if (item.movementType === "out") {
        //       newShelfContents.materialContents[existingContentIndex].amount -= Number(item.amount);
        //       if (newShelfContents.materialContents[existingContentIndex].amount <= 0) {
        //         newShelfContents.materialContents = newShelfContents.materialContents.filter((_, index) => index !== existingContentIndex);
        //       }
        //     }
        //   }
        //   // Update the shelf's contents
        //   await context.sudo().query.Shelf.updateOne({
        //     where: { id: shelf.id },
        //     data: { contents: newShelfContents },
        //   });
        // }
      },
    },
    fields: {
      material: relationship({
        ref: "Material.stockMovements",
        many: false,
      }),
      amount: decimal({ validation: { isRequired: true, min: "0" } }),
      movementType: select({
        type: "string",
        options: ["in", "out"],
        defaultValue: "in",
        validation: { isRequired: true },
      }),
      shelfStock: relationship({
        ref: "ShelfStock.stockMovements",
        many: false,
      }),
      expiration: timestamp(),
      documentProduct: relationship({
        ref: "DocumentProduct.stockMovement",
        many: false,
      }),
      note: text(),
      customer: relationship({
        ref: "User.customerMovements",
        many: false,
      }),
      date: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
      }),
      shelf: relationship({
        ref: "Shelf.stockMovements",
        many: false,
      }),
      createdAt: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
        access: {
          create: denyAll,
          update: denyAll,
        },
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  Supplier: list({
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isGlobalAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      materials: relationship({ ref: "Material.suppliers", many: true }),
      documents: relationship({ ref: "Document.supplier", many: true }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      address: relationship({ ref: "Address", many: false }),
      taxId: text(),
      contactMail: text(),
      payments: relationship({ ref: "Payment.supplier", many: true }),
      orderMail: text(),
      balance: decimal(),
      phone: text(),
      orderTime: integer(),
      extraFields: json(),
    },
  }),
  Tag: list({
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isUser,
        update: isEmployee,
        delete: isManager,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      nameLocalized: json({
        defaultValue: {
          en: "",
          nl: "",
          fr: "",
          de: "",
        },
      }),
      description: text(),
      descriptionLocalized: json({
        defaultValue: {
          en: "",
          nl: "",
          fr: "",
          de: "",
        },
      }),
      materials: relationship({ ref: "Material.tags", many: true }),
      parentTag: relationship({
        ref: "Tag.childTags",
        many: false,
      }),
      childTags: relationship({
        ref: "Tag.parentTag",
        many: true,
      }),
      type: select({
        type: "string",
        options: ["collection", "category", "brand"],
        defaultValue: "category",
        validation: { isRequired: true },
      }),
      image: relationship({
        ref: "File",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  User: list({
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: isGlobalAdmin,
      },
      operation: {
        query: isUser,
        create: isManager,
        update: isManager,
        delete: isGlobalAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, inputData, context, resolvedData }) => {
        if (isAdminAccountantManager({ session: context.session })) {
          console.info("operation on user by admin accountant manager");
        } else {
          try {
            if (operation === "create" || operation == "update") {
              resolvedData.company = {
                connect: {
                  id: context.session.data.company.id,
                },
              };
            }
          } catch (error) {
            console.error("Company hook error");
          }
        }
        try {
          if (operation === "create" || operation === "update") {
            if (!resolvedData.company) {
              if (!resolvedData.accountancy) {
                throw new Error("Company or Accountancy is required");
              }
            }
            let mail = inputData.email!;

            let mailPart1 = mail.split("@").at(0);
            let mailPart2 = mail.split("@").at(-1);
            let idPart;
            if (resolvedData.company) {
              idPart = resolvedData.company!.connect!.id;
            } else {
              idPart = resolvedData.accountancy!.connect!.id;
            }
            resolvedData.email = mailPart1 + "+" + idPart + "@" + mailPart2;
          }
        } catch (error) {
          console.error(error);
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({
        isIndexed: "unique",
        validation: { isRequired: true },
      }),
      customerPayments: relationship({ ref: "Payment.customer", many: true }),
      email2: text(),
      isBlocked: checkbox({ defaultValue: false }),
      phone: text(),
      role: select({
        type: "string",
        options: [
          "superadmin",
          "global_admin",
          "admin_accountant",
          "admin_accountant_manager",
          "owner",
          "company_admin",
          "admin_accountant_employee",
          "general_manager",
          "manager",
          "accountant",
          "admin_accountant_intern",
          "employee",
          "intern",
          "worker",
          "customer",
        ],
        defaultValue: "customer",
        validation: { isRequired: true },
        isIndexed: true,
        access: {
          update: isCompanyAdmin,
        },
      }),
      permissions: multiselect({
        type: "enum",
        options: [
          { label: "Warranty", value: "warranty" },
          { label: "Price", value: "price" },
        ],
        access: {
          update: isCompanyAdmin,
        },
      }),
      ssid: text(),
      password: password({
        validation: {
          isRequired: true,
          length: {
            min: 6,
          },
        },
      }),
      operations: relationship({ ref: "Operation.user", many: true }),
      notes: relationship({ ref: "Note.creator", many: true }),
      documents: relationship({ ref: "Document.creator", many: true }),
      customerDocuments: relationship({ ref: "Document.customer", many: true }),
      customerMovements: relationship({
        ref: "StockMovement.customer",
        many: true,
      }),
      customerBalance: decimal(),
      preferredLanguage: text(),
      customerCompany: text(),
      firstName: text(),
      lastName: text(),
      customerTaxNumber: text(),
      customerTaxCenter: text(),
      payments: relationship({ ref: "Payment.creator", many: true }),
      customerAddresses: relationship({ ref: "Address.customer", many: true }),
      workOrders: relationship({ ref: "WorkOrder.creator", many: true }),
      establishment: relationship({ ref: "Establishment.users", many: false }),
      accountancy: relationship({ ref: "Accountancy.users", many: false }),
      ownedCompany: relationship({ ref: "Company.owner", many: false }),
      company: relationship({ ref: "Company.users", many: false }),
      extraFields: json(),
    },
  }),
  WorkOrder: list({
    ui: {
      labelField: "number",
    },
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
    },
    fields: {
      datePlanned: timestamp(),
      dateStarted: timestamp(),
      dateFinished: timestamp(),
      number: text({ validation: { isRequired: true } }),
      materials: relationship({
        ref: "Material.workOrders",
        many: true,
      }),
      operations: relationship({
        ref: "WorkOrderOperation.workOrder",
        many: true,
      }),
      creator: relationship({
        ref: "User.workOrders",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
  WorkOrderOperation: list({
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isEmployee,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id,
              },
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
        try {
          if (operation === "update") {
            if (inputData.startedAt) {
              if (item.finishedAt) {
                throw new Error("Operation already finished");
              }
            }
            if (inputData.finishedAt) {
              if (!item.startedAt) {
                throw new Error("Operation not started");
              }
              if (item.finishedAt) {
                throw new Error("Operation already finished");
              }
              if (inputData.finishedAt < item.startedAt) {
                throw new Error("Finish date cannot be before start date");
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      },
    },
    fields: {
      files: relationship({
        ref: "File",
        many: true,
      }),
      startedAt: timestamp(),
      finishedAt: timestamp(),
      name: text({ validation: { isRequired: true } }),
      description: text(),
      value: decimal({ validation: { isRequired: true, min: "0" } }),
      price: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              const workOrder = await context.query.WorkOrder.findOne({
                where: { id: item.workOrderId },
                query: "reduction",
              });
              let total = Number(item.value);

              total -= (total * (workOrder.reduction ?? 0)) / 100;
              return new Decimal(total);
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      reduction: decimal({ defaultValue: "0" }),
      amount: decimal({ validation: { isRequired: true, min: "0" } }),
      total: virtual({
        field: graphql.field({
          type: graphql.Decimal,
          async resolve(item, args, context): Promise<Decimal> {
            try {
              const workOrder = await context.query.WorkOrder.findOne({
                where: { id: item.workOrderId },
                query: "reduction",
              });
              let total = Number(item.value) * Number(item.amount) - (Number(item.value) * Number(item.amount) * (Number(item.reduction) ?? 0)) / 100;

              total -= (total * (workOrder.reduction ?? 0)) / 100;
              return new Decimal(total);
            } catch (e) {
              return new Decimal(0);
            }
          },
        }),
      }),
      wastage: decimal({
        validation: { min: "0" },
        defaultValue: "0",
      }),
      workOrder: relationship({
        ref: "WorkOrder.operations",
        many: false,
      }),
      operation: relationship({
        ref: "Operation.workOrderOperations",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: json(),
    },
  }),
};
