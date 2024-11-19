import { text, relationship, password, timestamp, select, float, multiselect, virtual, checkbox, integer, json } from "@keystone-6/core/fields";
import { denyAll } from "@keystone-6/core/access";
import type { Lists } from ".keystone/types";
import { graphql, list } from "@keystone-6/core";

export type Session = {
  itemId: string;
  data: {
    isBlocked: boolean;
    username: string;
    role: "admin" | "customer" | "employee" | "manager";
    permissions: any;
  };
};

function isAdmin({ session }: { session?: Session }) {
  if (!session) return false;

  if (session.data.role == "admin") return true;

  return !session.data.isBlocked;
}

function isManager({ session }: { session?: Session }) {
  if (!session) return false;

  if (session.data.role == "admin" || session.data.role == "manager") return true;

  return !session.data.isBlocked;
}

function isEmployee({ session }: { session?: Session }) {
  if (!session) return false;

  if (session.data.role == "employee" || session.data.role == "admin" || session.data.role == "manager") return true;

  return !session.data.isBlocked;
}

function isUser({ session }: { session?: Session }) {
  if (!session) return false;

  if (session.data.role == "employee" || session.data.role == "admin" || session.data.role == "manager" || session.data.role == "customer") return true;

  return !session.data.isBlocked;
}

export const lists: Lists = {
  WorkOrder: list({
    ui: {
      labelField: "number",
    },
    access: {
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
      extraFields: json(),
    },
  }),
  WorkOrderOperation: list({
    ui: {
      labelField: "name",
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
        if (operation === "update") {
          if (inputData.startedAt) {
            if (item.finishedAt) {
              throw new Error("Application already finished");
            }
          }
          if (inputData.finishedAt) {
            if (!item.startedAt) {
              throw new Error("Application not started");
            }
            if (item.finishedAt) {
              throw new Error("Application already finished");
            }
            if (inputData.finishedAt < item.startedAt) {
              throw new Error("Finish date cannot be before start date");
            }
          }
        }
      },
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isEmployee,
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
      extraFields: json(),
    },
  }),
  Operation: list({
    ui: {
      labelField: "name",
    },
    access: {
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
      extraFields: json(),
    },
  }),
  Address: list({
    ui: {
      labelField: "street",
    },
    access: {
      operation: {
        create: isUser,
        query: isUser,
        update: isEmployee,
        delete: isAdmin,
      },
    },
    fields: {
      street: text({ validation: { isRequired: true } }),
      door: text({ validation: { isRequired: true } }),
      zip: text({ validation: { isRequired: true } }),
      city: text({ validation: { isRequired: true } }),
      floor: text({ validation: { isRequired: true } }),
      province: text({ validation: { isRequired: true } }),
      country: text({ validation: { isRequired: true } }),
      customer: relationship({
        ref: "User.customerAddresses",
        many: false,
      }),
      extraFields: json(),
    },
  }),
  Payment: list({
    ui: {
      labelField: "timestamp",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isAdmin,
      },
    },
    fields: {
      value: float({ validation: { isRequired: true, min: 0 } }),
      document: relationship({
        ref: "Document.payments",
        many: false,
      }),
      out: virtual({
        field: graphql.field({
          type: graphql.Boolean,
          async resolve(item, args, context) {
            try {
              const document = await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "type",
              });
              switch (document.type) {
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
      extraFields: json(),
    },
  }),
  User: list({
    ui: {
      labelField: "name",
    },
    access: {
      operation: {
        query: isUser,
        create: isManager,
        update: isManager,
        delete: isAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      username: text({ validation: { isRequired: true }, isIndexed: "unique" }),
      email: text({
        isIndexed: "unique",
      }),
      isBlocked: checkbox({ defaultValue: false }),
      phone: text(),
      role: select({
        type: "string",
        options: ["admin", "customer", "employee", "manager"],
        defaultValue: "customer",
        validation: { isRequired: true },
        isIndexed: true,
        access: {
          update: isAdmin,
        },
      }),
      permissions: multiselect({
        type: "enum",
        options: [
          { label: "Warranty", value: "warranty" },
          { label: "Price", value: "price" },
        ],
        access: {
          update: isAdmin,
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
      customerCompany: text(),
      customerTaxNumber: text(),
      customerTaxCenter: text(),
      payments: relationship({ ref: "Payment.creator", many: true }),
      customerAddresses: relationship({ ref: "Address.customer", many: true }),
      workOrders: relationship({ ref: "WorkOrder.creator", many: true }),
      extraFields: json(),
    },
  }),
  Note: list({
    ui: {
      labelField: "note",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isAdmin,
        delete: isAdmin,
      },
    },
    fields: {
      note: text({ validation: { isRequired: true } }),
      creator: relationship({
        ref: "User.notes",
        many: false,
      }),
      extraFields: json(),
    },
  }),
  File: list({
    ui: {
      labelField: "name",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isAdmin,
        delete: isAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      url: text(),
      extraFields: json(),
    },
  }),
  Document: list({
    ui: {
      labelField: "createdAt",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isManager,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, resolvedData, context }) => {
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
          const docs = await context.query.Document.findMany({
            orderBy: { number: "desc" },
            where: { type: { equals: resolvedData.type } },
            query: "id number",
          });
          const lastDocument = docs.at(0);
          if (lastDocument) {
            const lastNumber = lastDocument.number.split("-")[1];
            const lastYear = lastDocument.number.split("-")[0];
            if (lastYear == new Date().getFullYear()) {
              resolvedData.number = `${lastYear}-${(parseInt(lastNumber) + 1).toFixed(0).padStart(8, "0")}`;
            } else {
              resolvedData.number = `${new Date().getFullYear()}-${(parseInt(lastNumber) + 1).toFixed(0).padStart(8, "0")}`;
            }
          } else {
            resolvedData.number = `${new Date().getFullYear()}-${(1).toFixed(0).padStart(8, "0")}`;
          }
        }
      },
    },
    fields: {
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
                query: "total",
              });
              let total = 0;
              materials.forEach((docProd) => {
                total += docProd.total;
              });
              return total - (total * (item.reduction ?? 0)) / 100;
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
                query: "total",
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
        options: ["teklif", "satış", "irsaliye", "fatura", "borç dekontu", "alacak dekontu", "satın alma"],
        validation: { isRequired: true },
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
      reduction: float({ defaultValue: 0 }),
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
      number: text({ validation: { isRequired: true } }),
      totalPaid: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const payments = await context.query.Payment.findMany({
                where: { document: { id: { equals: item.id } }, isDeleted: { equals: false } },
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
      extraFields: json(),
    },
  }),
  DocumentProduct: list({
    ui: {
      labelField: "amount",
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
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
      total: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const document = await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "reduction",
              });
              let total = item.price * item.amount - (item.price * item.amount * (item.reduction ?? 0)) / 100;

              total -= (total * (document.reduction ?? 0)) / 100;
              return total;
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
              const document = await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "tax",
              });
              let total = item.price * item.amount - (item.price * item.amount * (item.reduction ?? 0)) / 100;

              return total * document.tax;
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
      extraFields: json(),
    },
  }),
  AssemblyComponent: list({
    ui: {
      labelField: "name",
    },
    access: {
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
      extraFields: json(),
    },
  }),
  Material: list({
    ui: {
      labelField: "name",
    },
    access: {
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
        options: ["aktif", "pasif", "iptal"],
        defaultValue: "aktif",
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
        options: ["amount", "length(mm)", "weight(g)", "area(m²)"],
        defaultValue: "amount",
        validation: { isRequired: true },
      }),
      type: select({
        type: "string",
        options: ["raw", "product"],
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
      extraFields: json(),
    },
  }),
  Storage: list({
    ui: {
      labelField: "name",
    },
    access: {
      operation: {
        create: isAdmin,
        query: isEmployee,
        update: isAdmin,
        delete: isAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      stockMovements: relationship({
        ref: "StockMovement.storage",
        many: true,
      }),
      extraFields: json(),
    },
  }),
  StockMovement: list({
    ui: {
      labelField: "movementType",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isAdmin,
        delete: isAdmin,
      },
    },
    fields: {
      material: relationship({
        ref: "Material.stockMovements",
        many: false,
      }),
      storage: relationship({
        ref: "Storage.stockMovements",
        many: false,
      }),
      amount: float({ validation: { isRequired: true, min: 0 } }),
      movementType: select({
        type: "string",
        options: ["giriş", "çıkış"],
        defaultValue: "giriş",
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
      extraFields: json(),
    },
  }),
  Supplier: list({
    ui: {
      labelField: "name",
    },
    access: {
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      materials: relationship({ ref: "Material.suppliers", many: true }),
      extraFields: json(),
      documents: relationship({ ref: "Document.supplier", many: true }),
    },
  }),
  Brand: list({
    ui: {
      labelField: "name",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isUser,
        update: isEmployee,
        delete: isAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      materials: relationship({ ref: "Material.brand", many: true }),
      extraFields: json(),
    },
  }),
  Notification: list({
    ui: {
      labelField: "date",
    },
    access: {
      operation: {
        create: isAdmin,
        query: isUser,
        update: isAdmin,
        delete: isAdmin,
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
        options: ["admin", "customer", "employee", "manager"],
      }),
    },
  }),
  SoftwareVersion: list({
    isSingleton: true,
    access: {
      operation: {
        create: isAdmin,
        query: isUser,
        update: isAdmin,
        delete: isAdmin,
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
  Config: list({
    isSingleton: true,
    access: {
      operation: {
        create: () => false,
        query: isUser,
        update: isAdmin,
        delete: () => false,
      },
    },
    ui: {
      labelField: "name",
    },
    fields: {
      defaultCurrency: text({ defaultValue: "TRY" }),
      extraFieldsProduct: json(),
    },
  }),
};
