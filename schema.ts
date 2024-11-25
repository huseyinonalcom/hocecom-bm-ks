import { text, relationship, password, timestamp, select, float, multiselect, virtual, checkbox, integer, json } from "@keystone-6/core/fields";
import { allowAll, denyAll } from "@keystone-6/core/access";
import { graphql, list } from "@keystone-6/core";
import type { Lists } from ".keystone/types";
import {
  isAdminAccountantManager,
  isWorker,
  isCompanyAdmin,
  isGlobalAdmin,
  isEmployee,
  isManager,
  isUser,
  isSuperAdmin,
  isAdminAccountantIntern,
} from "./functions";
import {
  calculateTotalWithoutTaxAfterReduction,
  calculateTotalWithoutTaxBeforeReduction,
  calculateTotalWithTaxAfterReduction,
  calculateTotalWithTaxBeforeReduction,
} from "./utils/calculations/documentproducts";

const companyFilter = ({ session }: { session?: any }) => {
  if (isGlobalAdmin({ session })) {
    return {};
  } else {
    return { company: { id: { equals: session.data.company.id } } };
  }
};

export const lists: Lists = {
  Accountancy: list({
    access: {
      operation: {
        create: isSuperAdmin,
        query: isAdminAccountantIntern,
        update: isAdminAccountantManager,
        delete: isSuperAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      isActive: checkbox({ defaultValue: false, access: { update: isAdminAccountantManager } }),
      logo: relationship({
        ref: "File",
        many: false,
      }),
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
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isUser,
        query: isUser,
        update: isEmployee,
        delete: isSuperAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
        try {
          if (operation === "create") {
            if (!inputData.company) {
              throw new Error("Company is required");
            }
          }
        } catch (error) {
          console.error(error);
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
      company: relationship({ ref: "Company", many: false }),
      extraFields: json(),
    },
  }),
  AssemblyComponent: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isManager,
        query: isEmployee,
        update: isManager,
        delete: isManager,
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
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  Brand: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isEmployee,
        query: isUser,
        update: isEmployee,
        delete: isGlobalAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      materials: relationship({ ref: "Material.brand", many: true }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  Company: list({
    access: {
      operation: {
        create: isAdminAccountantManager,
        query: isWorker,
        update: isCompanyAdmin,
        delete: denyAll,
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
      extraFields: json(),
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
      accountantEmail: text(),
      monthlyReports: checkbox({ defaultValue: false }),
    },
  }),
  Document: list({
    ui: {
      labelField: "date",
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
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
            if (inputData.type == "purchase" && inputData.number) {
              return;
            } else {
              const docs = await context.query.Document.findMany({
                orderBy: { number: "desc" },
                where: { type: { equals: inputData.type } },
                query: "id number",
              });
              const lastDocument = docs.at(0);
              if (lastDocument) {
                const lastNumber = lastDocument.number.split("-")[1];
                const lastYear = lastDocument.number.split("-")[0];
                if (lastYear == new Date().getFullYear()) {
                  resolvedData.number = `${lastYear}-${(parseInt(lastNumber) + 1).toFixed(0).padStart(7, "0")}`;
                } else {
                  resolvedData.number = `${new Date().getFullYear()}-${(1).toFixed(0).padStart(7, "0")}`;
                }
              } else {
                resolvedData.number = `${new Date().getFullYear()}-${(1).toFixed(0).padStart(7, "0")}`;
              }
            }
          }
        } catch (error) {
          console.error(error);
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
      total: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "totalWithTaxAfterReduction",
              });
              let total = 0;
              materials.forEach((docProd) => {
                total += docProd.totalWithTaxAfterReduction;
              });
              return total;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      totalWithTax: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "total tax",
              });
              let total = 0;
              materials.forEach((docProd) => {
                total += docProd.total * (1 + docProd.tax / 100);
              });
              return total - (total * (item.reduction ?? 0)) / 100;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      type: select({
        type: "string",
        options: ["quote", "sale", "dispatch", "invoice", "credit_note", "debit_note", "purchase"],
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
      number: text({ validation: { isRequired: true } }),
      totalPaid: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const payments = await context.query.Payment.findMany({
                where: { document: { some: { id: { equals: item.id } } }, isDeleted: { equals: false } },
                query: "value",
              });
              let total = 0;
              payments.forEach((payment) => {
                total += payment.value;
              });
              return total;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      comments: text(),
      references: text(),
      managerNotes: text(),
      establishment: relationship({ ref: "Establishment.documents", many: false }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      taxIncluded: checkbox({ defaultValue: true }),
      extraFields: json(),
    },
  }),
  DocumentProduct: list({
    ui: {
      labelField: "amount",
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
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
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager,
      },
    },
    fields: {
      amount: float({ validation: { isRequired: true, min: 1 } }),
      stockMovements: relationship({
        ref: "StockMovement.documentProduct",
        many: true,
      }),
      product: relationship({
        ref: "Material.documentProducts",
        many: false,
      }),
      name: text({ validation: { isRequired: true } }),
      tax: float({ validation: { isRequired: true, min: 0 } }),
      price: float({ validation: { isRequired: true, min: 0 } }),
      reduction: float({ defaultValue: 0 }),
      totalWithoutTaxBeforeReduction: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              let isTaxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "isTaxIncluded",
              }).then((res) => (isTaxIncluded = res.isTaxIncluded));
              return calculateTotalWithoutTaxBeforeReduction({
                price: item.price,
                amount: item.amount,
                isTaxIncluded,
              });
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      totalWithoutTaxAfterReduction: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              let isTaxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "isTaxIncluded",
              }).then((res) => (isTaxIncluded = res.isTaxIncluded));
              return calculateTotalWithoutTaxAfterReduction({
                price: item.price,
                amount: item.amount,
                reduction: item.reduction ?? 0,
                isTaxIncluded,
                tax: item.tax,
              });
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      totalWithTaxBeforeReduction: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              let isTaxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "isTaxIncluded",
              }).then((res) => (isTaxIncluded = res.isTaxIncluded));
              return calculateTotalWithTaxBeforeReduction({
                price: item.price,
                amount: item.amount,
                tax: item.tax,
                isTaxIncluded,
              });
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      totalWithTaxAfterReduction: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              let isTaxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "isTaxIncluded",
              }).then((res) => (isTaxIncluded = res.isTaxIncluded));
              return calculateTotalWithTaxAfterReduction({
                price: item.price,
                amount: item.amount,
                reduction: item.reduction ?? 0,
                tax: item.tax,
                isTaxIncluded,
              });
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      totalTax: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              let isTaxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "isTaxIncluded",
              }).then((res) => (isTaxIncluded = res.isTaxIncluded));
              return calculateTotalWithoutTaxAfterReduction({
                price: item.price,
                amount: item.amount,
                reduction: item.reduction ?? 0,
                tax: item.tax,
                isTaxIncluded,
              });
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      totalReduction: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              let isTaxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "isTaxIncluded",
              }).then((res) => (isTaxIncluded = res.isTaxIncluded));
              return calculateTotalWithoutTaxBeforeReduction({
                price: item.price,
                amount: item.amount,
                tax: item.tax,
                isTaxIncluded,
              });
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      document: relationship({
        ref: "Document.products",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  Establishment: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isAdminAccountantManager,
        query: isWorker,
        update: isCompanyAdmin,
        delete: isGlobalAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      defaultCurrency: text({ defaultValue: "EUR" }),
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
      stockMovements: relationship({
        ref: "StockMovement.establishment",
        many: true,
      }),
      users: relationship({ ref: "User.establishment", many: true }),
      address: relationship({ ref: "Address", many: false }),
      documents: relationship({ ref: "Document.establishment", many: true }),
      company: relationship({ ref: "Company.establishments", many: false }),
      extraFields: json(),
    },
  }),
  File: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: denyAll,
        delete: denyAll,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      url: text(),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  Material: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isManager,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      components: relationship({
        ref: "AssemblyComponent.assembly",
        many: true,
      }),
      assemblyComponents: relationship({
        ref: "AssemblyComponent.material",
        many: true,
      }),
      description: text(),
      price: float({ validation: { isRequired: true, min: 0 } }),
      currentStock: virtual({
        field: graphql.field({
          type: graphql.Int,
          async resolve(item, args, context) {
            try {
              const movements = await context.query.StockMovement.findMany({
                where: {
                  material: { id: { equals: item.id } },
                },
                query: "amount movementType",
              });
              let stock = 0;
              movements.forEach((movement) => {
                if (movement.movementType == "giriş") {
                  stock += movement.amount;
                } else {
                  stock -= movement.amount;
                }
              });
              return stock;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      status: select({
        type: "string",
        options: ["active", "passive", "cancelled"],
        defaultValue: "active",
        validation: { isRequired: true },
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
      tax: float({ defaultValue: 20, validation: { isRequired: true, min: 0 } }),
      brand: relationship({
        ref: "Brand.materials",
        many: false,
      }),
      suppliers: relationship({
        ref: "Supplier.materials",
        many: true,
      }),
      pricedBy: select({
        type: "string",
        options: ["amount", "volume", "length", "weight", "area"],
        defaultValue: "amount",
        validation: { isRequired: true },
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
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  Note: list({
    ui: {
      labelField: "note",
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: denyAll,
        delete: denyAll,
      },
    },
    fields: {
      note: text({ validation: { isRequired: true } }),
      creator: relationship({
        ref: "User.notes",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  Notification: list({
    ui: {
      labelField: "date",
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
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
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
    },
  }),
  Operation: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isEmployee,
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
      cost: float(),
      value: float({ validation: { isRequired: true, min: 0 } }),
      duration: integer(),
      description: text(),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  Payment: list({
    ui: {
      labelField: "timestamp",
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isCompanyAdmin,
      },
    },
    fields: {
      value: float({ validation: { isRequired: true, min: 0 } }),
      document: relationship({
        ref: "Document.payments",
        many: true,
      }),
      out: virtual({
        field: graphql.field({
          type: graphql.Boolean,
          async resolve(item, args, context) {
            try {
              const document = await context.query.Document.findMany({
                where: {
                  payments: {
                    some: {
                      id: {
                        equals: item.id,
                      },
                    },
                  },
                },
                query: "type",
              });
              switch (document[0].type) {
                case "satış":
                  return false;
                case "irsaliye":
                  return false;
                case "fatura":
                  return false;
                case "borç dekontu":
                  return false;
                case "alacak dekontu":
                  return true;
                case "satın alma":
                  return true;
                default:
                  return false;
              }
            } catch (e) {
              return false;
            }
          },
        }),
      }),
      isDeleted: checkbox({ defaultValue: false }),
      isVerified: checkbox({ defaultValue: false }),
      creator: relationship({
        ref: "User.payments",
        many: false,
      }),
      reference: text(),
      type: select({
        type: "string",
        options: ["cash", "debit_card", "credit_card", "online", "bank_transfer", "financing", "financing_unverified", "promissory"],
        defaultValue: "cash",
        validation: { isRequired: true },
      }),
      timestamp: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
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
      version: integer({ validation: { isRequired: true } }),
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
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: denyAll,
        delete: denyAll,
      },
    },
    fields: {
      material: relationship({
        ref: "Material.stockMovements",
        many: false,
      }),
      establishment: relationship({
        ref: "Establishment.stockMovements",
        many: false,
      }),
      amount: float({ validation: { isRequired: true, min: 0 } }),
      movementType: select({
        type: "string",
        options: ["in", "out"],
        defaultValue: "in",
        validation: { isRequired: true },
      }),
      documentProduct: relationship({
        ref: "DocumentProduct.stockMovements",
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
      createdAt: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
        access: {
          create: denyAll,
          update: denyAll,
        },
      }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  Storage: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isCompanyAdmin,
        query: isEmployee,
        update: isCompanyAdmin,
        delete: isGlobalAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  Supplier: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isGlobalAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      materials: relationship({ ref: "Material.suppliers", many: true }),
      documents: relationship({ ref: "Document.supplier", many: true }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  User: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        query: isUser,
        create: isManager,
        update: isManager,
        delete: isGlobalAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            if (!inputData.company) {
              throw new Error("Company is required");
            }
            let mail = inputData.email!;

            let mailPart1 = mail.split("@")[0];
            let mailPart2 = mail.split("@")[1];
            resolvedData.email = mailPart1 + "+" + resolvedData.company?.connect?.id + "@" + mailPart2;
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
      isBlocked: checkbox({ defaultValue: false }),
      phone: text(),
      role: select({
        type: "string",
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
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager,
      },
    },
    fields: {
      number: text({ validation: { isRequired: true } }),
      materials: relationship({
        ref: "Material.workOrders",
        many: true,
      }),
      operations: relationship({
        ref: "WorkOrderOperation.workOrder",
        many: true,
      }),
      datePlanned: timestamp(),
      dateStarted: timestamp(),
      dateFinished: timestamp(),
      creator: relationship({
        ref: "User.workOrders",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
  WorkOrderOperation: list({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter,
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isEmployee,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
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
      value: float({ validation: { isRequired: true, min: 0 } }),
      price: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const workOrder = await context.query.WorkOrder.findOne({
                where: { id: item.workOrderId },
                query: "reduction",
              });
              let total = item.value;

              total -= (total * (workOrder.reduction ?? 0)) / 100;
              return total;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      reduction: float({ defaultValue: 0 }),
      amount: float({ validation: { isRequired: true, min: 0 } }),
      total: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const workOrder = await context.query.WorkOrder.findOne({
                where: { id: item.workOrderId },
                query: "reduction",
              });
              let total = item.value * item.amount - (item.value * item.amount * (item.reduction ?? 0)) / 100;

              total -= (total * (workOrder.reduction ?? 0)) / 100;
              return total;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      wastage: float({
        validation: { min: 0 },
        defaultValue: 0,
      }),
      workOrder: relationship({
        ref: "WorkOrder.operations",
        many: false,
      }),
      operation: relationship({
        ref: "Operation.workOrderOperations",
        many: false,
      }),
      company: relationship({ ref: "Company", many: false, access: { update: denyAll } }),
      extraFields: json(),
    },
  }),
};
