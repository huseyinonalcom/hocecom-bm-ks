import {
  text,
  relationship,
  password,
  timestamp,
  select,
  float,
  multiselect,
  virtual,
  checkbox,
  integer,
  json,
} from "@keystone-6/core/fields";
import { denyAll } from "@keystone-6/core/access";
import type { Lists } from ".keystone/types";
import { graphql, list } from "@keystone-6/core";
import { calculateDate } from "./utils";

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

  if (session.data.role == "admin" || session.data.role == "manager")
    return true;

  return !session.data.isBlocked;
}

function isEmployee({ session }: { session?: Session }) {
  if (!session) return false;

  if (
    session.data.role == "employee" ||
    session.data.role == "admin" ||
    session.data.role == "manager"
  )
    return true;

  return !session.data.isBlocked;
}

function isUser({ session }: { session?: Session }) {
  if (!session) return false;

  if (
    session.data.role == "employee" ||
    session.data.role == "admin" ||
    session.data.role == "manager" ||
    session.data.role == "customer"
  )
    return true;

  return !session.data.isBlocked;
}

export const lists: Lists = {
  User: list({
    ui: {
      labelField: "firstname",
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
        if (operation === "create") {
          const existingUsers = await context.query.User.findMany({
            query: "id",
            where: {
              OR: [
                { role: { equals: "employee" } },
                { role: { equals: "admin" } },
                { role: { equals: "manager" } },
              ],
            },
          });
          if (existingUsers.length > 14) {
            throw new Error("User limit reached");
          }
        }
      },
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
      username: text({ validation: { isRequired: true }, isIndexed: "unique" }),
      email: text({
        isIndexed: "unique",
      }),
      isBlocked: checkbox({ defaultValue: false }),
      phone: text({ validation: { isRequired: false } }),
      firstname: text({ validation: { isRequired: true } }),
      lastname: text({ validation: { isRequired: false } }),
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
      ssid: text({ validation: { isRequired: false } }),
      password: password({
        validation: {
          isRequired: true,
          length: {
            min: 6,
          },
        },
      }),
      qcWorkOrders: relationship({
        ref: "WorkOrder.qcUser",
        many: true,
      }),
      workOrders: relationship({ ref: "WorkOrder.creator", many: true }),
      clientOrders: relationship({ ref: "WorkOrder.customer", many: true }),
      applicationsToApply: relationship({
        ref: "Application.applicant",
        many: true,
      }),
      applications: relationship({
        ref: "Application.creator",
        many: true,
      }),
      notes: relationship({ ref: "Note.creator", many: true }),
      documents: relationship({ ref: "Document.creator", many: true }),
      customerDocuments: relationship({ ref: "Document.customer", many: true }),
      customerMovements: relationship({
        ref: "StockMovement.customer",
        many: true,
      }),
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
      workOrder: relationship({
        ref: "WorkOrder.notes",
        many: false,
      }),
      creator: relationship({
        ref: "User.notes",
        many: false,
      }),
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
      application: relationship({
        ref: "Application.images",
        many: false,
      }),
      workOrder: relationship({
        ref: "WorkOrder.images",
        many: false,
      }),
      product: relationship({
        ref: "Product.images",
        many: false,
      }),
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
      beforeOperation: async ({ operation, item, inputData, context }) => {
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
          if (item.paymentPlanId) {
            await context.query.PaymentPlan.deleteOne({
              where: { id: item.paymentPlanId },
            });
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
              const products = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "amount product { price }",
              });
              let total = 0;
              products.forEach((product) => {
                total += product.amount * product.product.price;
              });
              return total - (total * (item.reduction ?? 0)) / 100;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      documentType: select({
        type: "string",
        options: ["satış", "fatura", "irsaliye", "sözleşme", "diğer"],
        defaultValue: "satış",
        validation: { isRequired: true },
      }),
      creator: relationship({
        ref: "User.documents",
        many: false,
      }),
      customer: relationship({
        ref: "User.customerDocuments",
        many: false,
      }),
      reduction: float({ defaultValue: 0 }),
      isDeleted: checkbox({ defaultValue: false }),
      number: text({}),
      invoiced: checkbox({ defaultValue: false }),
      products: relationship({
        ref: "DocumentProduct.document",
        many: true,
      }),
      paymentPlan: relationship({
        ref: "PaymentPlan.document",
        many: false,
      }),
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
        if (operation === "create") {
          const generalStorage = await context.query.Storage.findMany({
            where: { name: { equals: "Genel" } },
            query: "id",
          });
          await context.query.StockMovement.createOne({
            data: {
              product: { connect: { id: item.productId } },
              storage: { connect: { id: generalStorage.at(0)!.id } },
              amount: item.amount,
              movementType: "çıkış",
              documentProduct: { connect: { id: item.id } },
            },
          });
        }
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
      amount: float({ validation: { isRequired: true, min: 0 } }),
      stockMovements: relationship({
        ref: "StockMovement.documentProduct",
        many: true,
      }),
      product: relationship({
        ref: "Product.documentProducts",
        many: false,
      }),
      price: float({ validation: { isRequired: true, min: 0 } }),
      total: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const document = await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "reduction",
              });
              let total = item.price * item.amount;

              total -= (total * (document.reduction ?? 0)) / 100;
              return total;
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
    },
  }),
  WorkOrder: list({
    ui: {
      labelField: "createdAt",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
        if (operation === "delete") {
          const applications = await context.query.Application.findMany({
            where: { workOrder: { id: { equals: item.id } } },
            query: "id",
          });
          applications.forEach(async (app) => {
            await context.query.Application.deleteOne({
              where: { id: app.id },
            });
          });
          try {
            let paymentPlan;
            paymentPlan = await context.query.PaymentPlan.findMany({
              where: { workOrder: { id: { equals: item.id } } },
              query: "id",
            }).then((plans) => plans.at(0));
            if (paymentPlan) {
              await context.query.PaymentPlan.deleteOne({
                where: { id: paymentPlan.id },
              });
            }
          } catch (e) {}
        }
      },
    },
    fields: {
      creator: relationship({
        ref: "User.workOrders",
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
      images: relationship({
        ref: "File.workOrder",
        many: true,
      }),
      notes: relationship({
        ref: "Note.workOrder",
        many: true,
      }),
      status: select({
        type: "string",
        options: ["aktif", "pasif", "tamamlandı", "iptal", "teklif"],
        defaultValue: "pasif",
        access: {
          update: isManager,
        },
      }),
      reduction: float({}),
      paymentPlan: relationship({
        ref: "PaymentPlan.workOrder",
        many: false,
      }),
      qcDone: checkbox({ defaultValue: false }),
      qcUser: relationship({
        ref: "User.qcWorkOrders",
        many: false,
      }),
      checkDate: timestamp({
        validation: { isRequired: false },
      }),
      checkDone: checkbox({ defaultValue: false }),
      notifications: relationship({
        ref: "Notification.workOrder",
        many: true,
      }),
      startedAt: virtual({
        field: graphql.field({
          type: graphql.String,
          async resolve(item, args, context) {
            try {
              const applications = await context.query.Application.findMany({
                where: { workOrder: { id: { equals: item.id } } },
                query: "startedAt",
              });
              let earliestStart = applications.at(0)!.startedAt;
              applications.forEach((app) => {
                if (app.startedAt < earliestStart) {
                  earliestStart = app.startedAt;
                }
              });

              if (!earliestStart) {
                return null;
              }

              return new Date(earliestStart)
                .toLocaleString("tr-TR")
                .slice(0, -3);
            } catch (e) {
              return null;
            }
          },
        }),
      }),
      finishedAt: virtual({
        field: graphql.field({
          type: graphql.String,
          async resolve(item, args, context) {
            try {
              const applications = await context.query.Application.findMany({
                where: { workOrder: { id: { equals: item.id } } },
                query: "finishedAt",
              });
              if (applications.every((app) => app.finishedAt)) {
                let latestFinish = applications.at(0)!.finishedAt;
                applications.forEach((app) => {
                  if (app.finishedAt > latestFinish) {
                    latestFinish = app.finishedAt;
                  }
                });
                return new Date(latestFinish)
                  .toLocaleString("tr-TR")
                  .slice(0, -3);
              } else {
                return null;
              }
            } catch (e) {
              return null;
            }
          },
        }),
      }),
      car: relationship({
        ref: "Car.workOrders",
        many: false,
      }),
      customer: relationship({
        ref: "User.clientOrders",
        many: false,
      }),
      value: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const applications = await context.query.Application.findMany({
                where: { workOrder: { id: { equals: item.id } } },
                query: "value",
              });
              let total = 0;
              applications.forEach((app) => {
                total += app.value;
              });
              return total;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      total: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const applications = await context.query.Application.findMany({
                where: { workOrder: { id: { equals: item.id } } },
                query: "price",
              });
              let total = 0;
              applications.forEach((app) => {
                total += app.price;
              });
              return total;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      applications: relationship({
        ref: "Application.workOrder",
        many: true,
      }),
    },
  }),
  Application: list({
    ui: {
      labelField: "name",
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
        if (operation === "update") {
          if (inputData.startedAt) {
            if (item.startedAt) {
              throw new Error("Application already started");
            }
            if (!inputData.applicant) {
              throw new Error("Applicant is required");
            }
          }
          if (inputData.finishedAt) {
            if (!item.startedAt) {
              throw new Error("Application not started");
            }
            if (!inputData.applicant) {
              throw new Error("Applicant is required");
            }
            if (item.finishedAt) {
              throw new Error("Application already finished");
            }
            if (inputData.finishedAt < item.startedAt) {
              throw new Error("Finish date cannot be before start date");
            }
            if (inputData.applicant.connect?.id != item.applicantId) {
              throw new Error("Applicant cannot be changed");
            }
          }
          if (inputData.wastage && inputData.wastage > (item.wastage ?? 0)) {
            const generalStorage = await context.query.Storage.findMany({
              where: { name: { equals: "Genel" } },
              query: "id",
            });
            const wastageStorage = await context.query.Storage.findMany({
              where: { name: { equals: "Fire" } },
              query: "id",
            });
            await context.query.StockMovement.createOne({
              data: {
                product: { connect: { id: item.productId } },
                storage: { connect: { id: wastageStorage.at(0)!.id } },
                amount: inputData.wastage - (item.wastage ?? 0),
                movementType: "giriş",
                application: { connect: { id: item.id } },
              },
            });
            await context.query.StockMovement.createOne({
              data: {
                product: { connect: { id: item.productId } },
                storage: { connect: { id: generalStorage.at(0)!.id } },
                amount: inputData.wastage - (item.wastage ?? 0),
                movementType: "çıkış",
                application: { connect: { id: item.id } },
              },
            });
          } else if (
            inputData.wastage &&
            item.wastage &&
            inputData.wastage < item.wastage
          ) {
            const generalStorage = await context.query.Storage.findMany({
              where: { name: { equals: "Genel" } },
              query: "id",
            });
            const wastageStorage = await context.query.Storage.findMany({
              where: { name: { equals: "Fire" } },
              query: "id",
            });
            await context.query.StockMovement.createOne({
              data: {
                product: { connect: { id: item.productId } },
                storage: { connect: { id: wastageStorage.at(0)!.id } },
                amount: item.wastage - inputData.wastage,
                movementType: "çıkış",
                application: { connect: { id: item.id } },
              },
            });
            await context.query.StockMovement.createOne({
              data: {
                product: { connect: { id: item.productId } },
                storage: { connect: { id: generalStorage.at(0)!.id } },
                amount: item.wastage - inputData.wastage,
                movementType: "giriş",
                application: { connect: { id: item.id } },
              },
            });
          }
        } else if (operation === "delete") {
          const movements = await context.query.StockMovement.findMany({
            where: { application: { id: { equals: item.id } } },
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
        if (operation === "create") {
          const generalStorage = await context.query.Storage.findMany({
            where: { name: { equals: "Genel" } },
            query: "id",
          });
          await context.query.StockMovement.createOne({
            data: {
              product: { connect: { id: item.productId } },
              storage: { connect: { id: generalStorage.at(0)!.id } },
              amount: item.amount,
              movementType: "çıkış",
              application: { connect: { id: item.id } },
            },
          });
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
      workOrder: relationship({
        ref: "WorkOrder.applications",
        many: false,
      }),
      images: relationship({
        ref: "File.application",
        many: true,
      }),
      startedAt: timestamp(),
      finishedAt: timestamp(),
      name: text({ validation: { isRequired: true } }),
      description: text({}),
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
      amount: float({ validation: { isRequired: true, min: 0 } }),
      wastage: float({
        validation: { isRequired: false, min: 0 },
        defaultValue: 0,
      }),
      location: relationship({
        ref: "ApplicationLocation.applications",
        many: false,
      }),
      product: relationship({
        ref: "Product.applications",
        many: false,
      }),
      applicant: relationship({
        ref: "User.applicationsToApply",
        many: false,
      }),
      creator: relationship({
        ref: "User.applications",
        many: false,
      }),
      type: relationship({
        ref: "ApplicationType.applications",
        many: false,
      }),
      stockMovements: relationship({
        ref: "StockMovement.application",
        many: true,
      }),
    },
  }),
  ApplicationType: list({
    ui: {
      labelField: "name",
    },
    access: {
      operation: {
        create: isManager,
        query: isEmployee,
        update: isManager,
        delete: isAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      applications: relationship({
        ref: "Application.type",
        many: true,
      }),
      products: relationship({
        ref: "Product.applicationType",
        many: true,
      }),
      locations: relationship({
        ref: "ApplicationLocation.applicationTypes",
        many: true,
      }),
    },
  }),
  Product: list({
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
      description: text({}),
      price: float({ validation: { isRequired: true, min: 0 } }),
      currentStock: virtual({
        field: graphql.field({
          type: graphql.Int,
          async resolve(item, args, context) {
            try {
              const generalStorage = await context.query.Storage.findMany({
                where: { name: { equals: "Genel" } },
                query: "id",
              });
              const movements = await context.query.StockMovement.findMany({
                where: {
                  product: { id: { equals: item.id } },
                  storage: { id: { equals: generalStorage.at(0)!.id } },
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
      images: relationship({
        ref: "File.product",
        many: true,
      }),
      code: text({}),
      ean: text({}),
      productBrand: relationship({
        ref: "ProductBrand.products",
        many: false,
      }),
      pricedBy: select({
        type: "string",
        options: ["amount", "length"],
        defaultValue: "amount",
        validation: { isRequired: true },
      }),
      applications: relationship({
        ref: "Application.product",
        many: true,
      }),
      applicationType: relationship({
        ref: "ApplicationType.products",
        many: false,
      }),
      stockMovements: relationship({
        ref: "StockMovement.product",
        many: true,
      }),
      documentProducts: relationship({
        ref: "DocumentProduct.product",
        many: true,
      }),
      warrantyType: select({
        type: "string",
        options: ["ömür", "garanti", "ömur_boyu", "yok"],
        defaultValue: "yok",
        validation: { isRequired: true },
      }),
      warrantyTimeScale: select({
        type: "string",
        options: ["gün", "ay", "yıl"],
        defaultValue: "yıl",
        validation: { isRequired: true },
      }),
      warrantyTime: float({ validation: { isRequired: false, min: 0 } }),
      color: text({}),
      width: float({}),
      length: float({}),
      height: float({}),
      depth: float({}),
      weight: float({}),
      thickness: float({}),
      extraFields: json({
        defaultValue: {
          colorWarranty: false,
          customPricing: {
            sideWindow: "",
            windshield: "",
            sunroof: "",
            glassTop: "",
            hood: "",
            hoodFender: "",
            hoodFenderBumper: "",
            complete: "",
          },
        },
      }),
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
      product: relationship({
        ref: "Product.stockMovements",
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
      note: text({}),
      customer: relationship({
        ref: "User.customerMovements",
        many: false,
      }),
      date: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
      }),
      application: relationship({
        ref: "Application.stockMovements",
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
    },
  }),
  ProductBrand: list({
    ui: {
      labelField: "name",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      products: relationship({ ref: "Product.productBrand", many: true }),
    },
  }),
  Car: list({
    ui: {
      labelField: "licensePlate",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isAdmin,
      },
    },
    fields: {
      vin: text(),
      carModel: relationship({
        ref: "CarModel.cars",
        many: false,
      }),
      licensePlate: text(),
      workOrders: relationship({ ref: "WorkOrder.car", many: true }),
    },
  }),
  CarModel: list({
    ui: {
      labelField: "name",
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
      name: text({
        validation: { isRequired: true },
        isFilterable: true,
        isIndexed: true,
      }),
      cars: relationship({ ref: "Car.carModel", many: true }),
      carBrand: relationship({ ref: "CarBrand.carModels", many: false }),
    },
  }),
  CarBrand: list({
    ui: {
      labelField: "name",
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
      name: text({
        validation: { isRequired: true },
        isFilterable: true,
        isIndexed: true,
      }),
      carModels: relationship({ ref: "CarModel.carBrand", many: true }),
    },
  }),
  ApplicationLocation: list({
    ui: {
      labelField: "name",
    },
    access: {
      operation: {
        create: isManager,
        query: isEmployee,
        update: isManager,
        delete: isAdmin,
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      applicationTypes: relationship({
        ref: "ApplicationType.locations",
        many: true,
      }),
      applications: relationship({
        ref: "Application.location",
        many: true,
      }),
    },
  }),
  PaymentPlan: list({
    ui: {
      labelField: "name",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isAdmin,
      },
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
        if (operation === "delete") {
          const payments = await context.query.Payment.findMany({
            where: { paymentPlan: { id: { equals: item.id } } },
            query: "id",
          });
          payments.forEach(async (payment) => {
            await context.query.Payment.deleteOne({
              where: { id: payment.id },
            });
          });
        }
      },
      afterOperation: async ({ operation, item, context }) => {
        if (operation === "create") {
          for (let i = 1; i < item.periods; i++) {
            await context.query.Notification.createOne({
              data: {
                paymentPlan: { connect: { id: item.id } },
                date: new Date(
                  new Date().getTime() +
                    i * item.periodDuration * 24 * 60 * 60 * 1000
                ),
                message: "Ödeme tarihi",
                notifyRoles: ["admin"],
              },
            });
          }
        } else if (operation === "update") {
          const exitingNotifications =
            await context.query.Notification.findMany({
              where: { paymentPlan: { id: { equals: item.id } } },
              query: "id date",
            });

          exitingNotifications.forEach(async (notification) => {
            await context.query.Notification.deleteOne({
              where: { id: notification.id },
            });
          });

          for (let i = 1; i < item.periods; i++) {
            await context.query.Notification.createOne({
              data: {
                paymentPlan: { connect: { id: item.id } },
                date: new Date(
                  new Date().getTime() +
                    i * item.periodDuration * 24 * 60 * 60 * 1000
                ),
                message: "Ödeme tarihi",
                notifyRoles: ["admin"],
              },
            });
          }
        }
      },
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      workOrder: relationship({
        ref: "WorkOrder.paymentPlan",
        many: false,
      }),
      payments: relationship({
        ref: "Payment.paymentPlan",
        many: true,
      }),
      document: relationship({
        ref: "Document.paymentPlan",
        many: false,
      }),
      periods: float({
        validation: { isRequired: true, min: 0 },
        defaultValue: 1,
      }),
      periodDuration: float({
        validation: { isRequired: true, min: 0 },
        defaultValue: 1,
      }),
      periodPayment: float({
        validation: { isRequired: true, min: 0 },
        defaultValue: 1,
      }),
      periodDurationScale: select({
        type: "string",
        options: ["gün", "hafta", "ay"],
        defaultValue: "ay",
        validation: { isRequired: true },
      }),
      total: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              let workOrder;
              if (item.workOrderId) {
                workOrder = await context.query.WorkOrder.findOne({
                  where: { id: item.workOrderId },
                  query: "total",
                });
              }
              let document;
              document = await context.query.Document.findMany({
                where: { paymentPlan: { id: { equals: item.id } } },
                query: "total",
              }).then((docs) => docs.at(0));

              let total = 0;

              if (workOrder) {
                total = workOrder.total;
              } else if (document) {
                total = document.total;
              }

              return total;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      paid: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const payments = await context.query.Payment.findMany({
                where: { paymentPlan: { id: { equals: item.id } } },
                query: "amount",
              });
              let total = 0;
              payments.forEach((payment) => {
                total += payment.amount;
              });
              return total;
            } catch (e) {
              return 0;
            }
          },
        }),
      }),
      toPay: virtual({
        field: graphql.field({
          type: graphql.Float,
          async resolve(item, args, context) {
            try {
              const total = async () => {
                try {
                  let workOrder;
                  if (item.workOrderId) {
                    workOrder = await context.query.WorkOrder.findOne({
                      where: { id: item.workOrderId },
                      query: "total",
                    });
                  }
                  let document;
                  document = await context.query.Document.findMany({
                    where: { paymentPlan: { id: { equals: item.id } } },
                    query: "total",
                  }).then((docs) => docs.at(0));

                  let total = 0;

                  if (workOrder) {
                    total = workOrder.total;
                  } else if (document) {
                    total = document.total;
                  }

                  return total;
                } catch (e) {
                  return 0;
                }
              };

              const paid = async () => {
                try {
                  const payments = await context.query.Payment.findMany({
                    where: { paymentPlan: { id: { equals: item.id } } },
                    query: "amount",
                  });
                  let total = 0;
                  payments.forEach((payment) => {
                    total += payment.amount;
                  });
                  return total;
                } catch (e) {
                  return 0;
                }
              };

              return (await total()) - (await paid());
            } catch (e) {
              return 123456;
            }
          },
        }),
      }),
      nextPaymentDate: virtual({
        field: graphql.field({
          type: graphql.String,
          async resolve(item, args, context) {
            try {
              const payments = await context.query.Payment.findMany({
                where: { paymentPlan: { id: { equals: item.id } } },
                query: "amount date",
                orderBy: { date: "asc" },
              });

              if (payments.length == 0) {
                return "-";
              }

              const firstPayment = payments.at(0);
              const firstPaymentDate = firstPayment!.date;

              let dates = [];

              for (let i = 1; i < item.periods; i++) {
                dates.push(
                  calculateDate({
                    number: i * item.periodDuration,
                    unit: item.periodDurationScale,
                    startDate: new Date(firstPaymentDate),
                  })
                );
              }

              const now = new Date();
              const nextPaymentDate =
                dates.find((date) => date.getTime() > now.getTime()) || "-";

              if (nextPaymentDate === "-") {
                return "-";
              }

              return new Date(nextPaymentDate)
                .toLocaleString("tr-TR")
                .split(" ")[0];
            } catch (e) {
              return "-";
            }
          },
        }),
      }),
      completed: virtual({
        field: graphql.field({
          type: graphql.Boolean,
          async resolve(item, args, context) {
            try {
              const workOrder = await context.query.WorkOrder.findOne({
                where: { id: item.workOrderId },
                query: "total",
              });
              let document;
              document = await context.query.Document.findMany({
                where: { paymentPlan: { id: { equals: item.id } } },
                query: "total",
              }).then((docs) => docs.at(0));

              let total = 0;

              if (workOrder) {
                total = workOrder.total;
              } else if (document) {
                total = document.total;
              }

              const payments = await context.query.Payment.findMany({
                where: { paymentPlan: { id: { equals: item.id } } },
                query: "amount",
              });
              let paid = 0;
              payments.forEach((payment) => {
                paid += payment.amount;
              });

              return total <= paid;
            } catch (e) {
              return false;
            }
          },
        }),
      }),
      notifications: relationship({
        ref: "Notification.paymentPlan",
        many: true,
      }),
    },
  }),
  Payment: list({
    ui: {
      labelField: "date",
    },
    access: {
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isManager,
      },
    },
    fields: {
      amount: float({ validation: { isRequired: true, min: 0 } }),
      paymentPlan: relationship({
        ref: "PaymentPlan.payments",
        many: false,
      }),
      reference: text({}),
      type: select({
        type: "string",
        options: [
          "nakit",
          "kredi kartı",
          "havale",
          "çek",
          "senet",
          "banka kartı",
        ],
        defaultValue: "nakit",
        validation: { isRequired: true },
      }),
      date: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
      }),
    },
  }),
  Notification: list({
    ui: {
      labelField: "date",
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
      date: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
      }),
      message: text({ validation: { isRequired: true } }),
      paymentPlan: relationship({
        ref: "PaymentPlan.notifications",
        many: false,
      }),
      workOrder: relationship({
        ref: "WorkOrder.notifications",
        many: false,
      }),
      link: text({}),
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
      iosLink: text({}),
      androidLink: text({}),
      webLink: text({}),
      windowsLink: text({}),
      macLink: text({}),
      date: timestamp({
        defaultValue: { kind: "now" },
        isOrderable: true,
      }),
    },
  }),
};
