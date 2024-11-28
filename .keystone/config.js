"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default
});
module.exports = __toCommonJS(keystone_exports);

// utils/fileupload.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var import_config = require("dotenv/config");
var s3Client = new import_client_s3.S3Client({
  region: process.env.REGION,
  endpoint: process.env.STORAGE_URL,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    accountId: process.env.ACCOUNT_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
  }
});
var fileUpload = async (file) => {
  const randomString = Math.random().toString(36).substring(2, 15);
  const newFileName = `${Date.now()}-${randomString}-${file.originalname}`;
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: `uploads/${newFileName}`,
    Body: file.buffer,
    ContentType: file.mimetype
  };
  try {
    const command = new import_client_s3.PutObjectCommand(params);
    await s3Client.send(command);
    return {
      success: true,
      fileUrl: `${process.env.STORAGE_PUBLIC_URL}/${params.Key}`,
      fileName: newFileName
    };
  } catch (error) {
    console.error("file upload error:", error);
    throw new Error("Failed to upload file");
  }
};

// auth.ts
var import_crypto = require("crypto");
var import_auth = require("@keystone-6/auth");
var import_session = require("@keystone-6/core/session");
var sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV !== "production") {
  sessionSecret = (0, import_crypto.randomBytes)(32).toString("hex");
}
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  sessionData: "id role permissions isBlocked company { id }",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "role", "email", "password"]
  }
});
var sessionMaxAge = 60 * 60 * 24 * 30;
var session = (0, import_session.statelessSessions)({
  maxAge: sessionMaxAge,
  secret: sessionSecret
});

// keystone.ts
var import_core2 = require("@keystone-6/core");

// schema.ts
var import_fields = require("@keystone-6/core/fields");
var import_access = require("@keystone-6/core/access");
var import_core = require("@keystone-6/core");

// utils/calculations/documentproducts.ts
var calculateBaseTotal = ({
  price,
  amount,
  taxIncluded,
  tax = 0
  // optional for when we need to calculate base from tax-included price
}) => {
  if (taxIncluded) {
    return Number(price * amount / (1 + tax / 100));
  }
  return Number(price * amount);
};
var calculateTotalWithoutTaxBeforeReduction = ({ price, amount, taxIncluded, tax = 0 }) => {
  return calculateBaseTotal({ price, amount, taxIncluded, tax });
};
var calculateReductionAmount = ({ price, amount, taxIncluded, reduction, tax }) => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax });
  return Number(total * (reduction / 100));
};
var calculateTotalWithoutTaxAfterReduction = ({ price, amount, taxIncluded, reduction, tax }) => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax });
  const reductionAmount = calculateReductionAmount({ price, amount, taxIncluded, reduction, tax });
  return Number(total - reductionAmount);
};
var calculateTotalWithTaxBeforeReduction = ({ price, amount, taxIncluded, tax }) => {
  if (taxIncluded) {
    return Number(price * amount);
  }
  const totalBeforeReduction = calculateTotalWithoutTaxBeforeReduction({
    price,
    amount,
    taxIncluded
  });
  return Number(totalBeforeReduction * (1 + tax / 100));
};
var calculateTotalWithTaxAfterReduction = ({ price, amount, taxIncluded, reduction, tax }) => {
  const totalAfterReduction = calculateTotalWithoutTaxAfterReduction({
    price,
    amount,
    taxIncluded,
    reduction,
    tax
  });
  return Number(totalAfterReduction * (1 + tax / 100));
};

// functions.ts
var isSuperAdmin = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "superadmin") return true;
  return false;
};
var isGlobalAdmin = ({ session: session2 }) => {
  if (!session2) return false;
  if (isSuperAdmin({ session: session2 }) || session2.data.role == "global_admin") return true;
  return !session2.data.isBlocked;
};
var isAdminAccountantOwner = ({ session: session2 }) => {
  if (!session2) return false;
  if (isGlobalAdmin({ session: session2 }) || session2.data.role == "admin_accountant") return true;
  return !session2.data.isBlocked;
};
var isAdminAccountantManager = ({ session: session2 }) => {
  if (!session2) return false;
  if (isAdminAccountantOwner({ session: session2 }) || session2.data.role == "admin_accountant_manager") return true;
  return !session2.data.isBlocked;
};
var isOwner = ({ session: session2 }) => {
  if (!session2) return false;
  if (isAdminAccountantManager({ session: session2 }) || session2.data.role == "owner") return true;
  return !session2.data.isBlocked;
};
var isCompanyAdmin = ({ session: session2 }) => {
  if (!session2) return false;
  if (isOwner({ session: session2 }) || session2.data.role == "company_admin") return true;
  return !session2.data.isBlocked;
};
var isAdminAccountantEmployee = ({ session: session2 }) => {
  if (!session2) return false;
  if (isAdminAccountantManager({ session: session2 }) || session2.data.role == "admin_accountant_employee") return true;
  return !session2.data.isBlocked;
};
var isGeneralManager = ({ session: session2 }) => {
  if (!session2) return false;
  if (isCompanyAdmin({ session: session2 }) || session2.data.role == "general_manager") return true;
  return !session2.data.isBlocked;
};
var isManager = ({ session: session2 }) => {
  if (!session2) return false;
  if (isGeneralManager({ session: session2 }) || session2.data.role == "manager") return true;
  return !session2.data.isBlocked;
};
var isAccountant = ({ session: session2 }) => {
  if (!session2) return false;
  if (isManager({ session: session2 }) || session2.data.role == "accountant") return true;
  return !session2.data.isBlocked;
};
var isAdminAccountantIntern = ({ session: session2 }) => {
  if (!session2) return false;
  if (isAdminAccountantEmployee({ session: session2 }) || session2.data.role == "admin_accountant_intern") return true;
  return !session2.data.isBlocked;
};
var isEmployee = ({ session: session2 }) => {
  if (!session2) return false;
  if (isAccountant({ session: session2 }) || session2.data.role == "employee") return true;
  return !session2.data.isBlocked;
};
var isIntern = ({ session: session2 }) => {
  if (!session2) return false;
  if (isEmployee({ session: session2 }) || session2.data.role == "intern") return true;
  return !session2.data.isBlocked;
};
var isWorker = ({ session: session2 }) => {
  if (!session2) return false;
  if (isIntern({ session: session2 }) || session2.data.role == "worker") return true;
  return !session2.data.isBlocked;
};
var isUser = ({ session: session2 }) => {
  if (!session2) return false;
  if (isWorker({ session: session2 }) || session2.data.role == "customer") return true;
  return !session2.data.isBlocked;
};

// schema.ts
var import_types = require("@keystone-6/core/types");
var companyFilter = ({ session: session2 }) => {
  if (isGlobalAdmin({ session: session2 })) {
    return {};
  } else {
    return { company: { id: { equals: session2.data.company.id } } };
  }
};
var lists = {
  Accountancy: (0, import_core.list)({
    access: {
      operation: {
        create: isSuperAdmin,
        query: isAdminAccountantIntern,
        update: isAdminAccountantManager,
        delete: isSuperAdmin
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      isActive: (0, import_fields.checkbox)({ defaultValue: false, access: { update: isAdminAccountantManager } }),
      logo: (0, import_fields.relationship)({
        ref: "File",
        many: false
      }),
      companies: (0, import_fields.relationship)({ ref: "Company.accountancy", many: true }),
      users: (0, import_fields.relationship)({ ref: "User.accountancy", many: true }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Address: (0, import_core.list)({
    ui: {
      labelField: "street"
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isUser,
        query: isUser,
        update: isEmployee,
        delete: isSuperAdmin
      }
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
      }
    },
    fields: {
      street: (0, import_fields.text)({ validation: { isRequired: true } }),
      door: (0, import_fields.text)(),
      zip: (0, import_fields.text)(),
      city: (0, import_fields.text)(),
      floor: (0, import_fields.text)(),
      province: (0, import_fields.text)(),
      country: (0, import_fields.text)(),
      customer: (0, import_fields.relationship)({
        ref: "User.customerAddresses",
        many: false
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  AssemblyComponent: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isManager,
        query: isEmployee,
        update: isManager,
        delete: isManager
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      description: (0, import_fields.text)(),
      amount: (0, import_fields.integer)(),
      assembly: (0, import_fields.relationship)({
        ref: "Material.components",
        many: false
      }),
      material: (0, import_fields.relationship)({
        ref: "Material.assemblyComponents",
        many: false
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Brand: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isUser,
        update: isEmployee,
        delete: isGlobalAdmin
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      materials: (0, import_fields.relationship)({ ref: "Material.brand", many: true }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Company: (0, import_core.list)({
    access: {
      operation: {
        create: isAdminAccountantManager,
        query: isWorker,
        update: isCompanyAdmin,
        delete: import_access.denyAll
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      isActive: (0, import_fields.checkbox)({ defaultValue: false, access: { update: isAdminAccountantManager } }),
      logo: (0, import_fields.relationship)({
        ref: "File",
        many: false
      }),
      pincode: (0, import_fields.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
      owner: (0, import_fields.relationship)({
        ref: "User.ownedCompany",
        many: false
      }),
      users: (0, import_fields.relationship)({ ref: "User.company", many: true }),
      establishments: (0, import_fields.relationship)({ ref: "Establishment.company", many: true }),
      accountancy: (0, import_fields.relationship)({ ref: "Accountancy.companies", many: false }),
      extraFields: (0, import_fields.json)(),
      emailUser: (0, import_fields.text)(),
      emailPassword: (0, import_fields.text)(),
      emailHost: (0, import_fields.text)(),
      emailPort: (0, import_fields.text)(),
      emailSec: (0, import_fields.text)(),
      stripeSecretKey: (0, import_fields.text)(),
      stripePublishableKey: (0, import_fields.text)(),
      bolClientID: (0, import_fields.text)(),
      bolClientSecret: (0, import_fields.text)(),
      amazonClientID: (0, import_fields.text)(),
      amazonClientSecret: (0, import_fields.text)(),
      accountantEmail: (0, import_fields.text)(),
      monthlyReports: (0, import_fields.checkbox)({ defaultValue: false })
    }
  }),
  Document: (0, import_core.list)({
    ui: {
      labelField: "date"
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isManager
      }
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, resolvedData, context }) => {
        try {
          if (operation === "delete") {
            const products = await context.query.DocumentProduct.findMany({
              where: { document: { id: { equals: item.id } } },
              query: "id"
            });
            products.forEach(async (dp) => {
              await context.query.DocumentProduct.deleteOne({
                where: { id: dp.id }
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
                query: "id number"
              });
              const lastDocument = docs.at(0);
              if (lastDocument) {
                const lastNumber = lastDocument.number.split("-")[1];
                const lastYear = lastDocument.number.split("-")[0];
                if (lastYear == (/* @__PURE__ */ new Date()).getFullYear()) {
                  resolvedData.number = `${lastYear}-${(parseInt(lastNumber) + 1).toFixed(0).padStart(7, "0")}`;
                } else {
                  resolvedData.number = `${(/* @__PURE__ */ new Date()).getFullYear()}-${1 .toFixed(0).padStart(7, "0")}`;
                }
              } else {
                resolvedData.number = `${(/* @__PURE__ */ new Date()).getFullYear()}-${1 .toFixed(0).padStart(7, "0")}`;
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
    },
    fields: {
      date: (0, import_fields.timestamp)({
        defaultValue: { kind: "now" },
        isOrderable: true,
        access: {
          update: isEmployee
        }
      }),
      deliveryDate: (0, import_fields.timestamp)({
        isOrderable: true,
        access: {
          update: isEmployee
        }
      }),
      createdAt: (0, import_fields.timestamp)({
        defaultValue: { kind: "now" },
        isOrderable: true,
        access: {
          create: import_access.denyAll,
          update: import_access.denyAll
        }
      }),
      type: (0, import_fields.select)({
        type: "string",
        options: ["quote", "sale", "dispatch", "invoice", "credit_note", "debit_note", "purchase"],
        validation: { isRequired: true }
      }),
      currency: (0, import_fields.select)({
        type: "string",
        options: ["TRY", "USD", "EUR"],
        defaultValue: "EUR",
        validation: { isRequired: true },
        access: {
          update: isCompanyAdmin
        }
      }),
      creator: (0, import_fields.relationship)({
        ref: "User.documents",
        many: false,
        access: {
          update: import_access.denyAll
        }
      }),
      supplier: (0, import_fields.relationship)({
        ref: "Supplier.documents",
        many: false
      }),
      customer: (0, import_fields.relationship)({
        ref: "User.customerDocuments",
        many: false,
        access: {
          update: import_access.denyAll
        }
      }),
      files: (0, import_fields.relationship)({
        ref: "File",
        many: true
      }),
      isDeleted: (0, import_fields.checkbox)({ defaultValue: false }),
      fromDocument: (0, import_fields.relationship)({
        ref: "Document.toDocument",
        many: false
      }),
      delAddress: (0, import_fields.relationship)({
        ref: "Address",
        many: false
      }),
      docAddress: (0, import_fields.relationship)({
        ref: "Address",
        many: false
      }),
      toDocument: (0, import_fields.relationship)({
        ref: "Document.fromDocument",
        many: false
      }),
      products: (0, import_fields.relationship)({
        ref: "DocumentProduct.document",
        many: true
      }),
      payments: (0, import_fields.relationship)({
        ref: "Payment.document",
        many: true
      }),
      prefix: (0, import_fields.text)(),
      phase: (0, import_fields.integer)(),
      number: (0, import_fields.text)({ validation: { isRequired: true } }),
      total: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount reduction tax"
              });
              let total = 0;
              materials.forEach((docProd) => {
                total += calculateTotalWithTaxAfterReduction({
                  price: docProd.price,
                  amount: docProd.amount,
                  reduction: docProd.reduction ?? 0,
                  tax: docProd.tax,
                  taxIncluded: item.taxIncluded
                });
              });
              return new import_types.Decimal(total);
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      totalPaid: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              const payments = await context.query.Payment.findMany({
                where: { document: { some: { id: { equals: item.id } } }, isDeleted: { equals: false } },
                query: "value"
              });
              let total = 0;
              payments.forEach((payment) => {
                total += payment.value;
              });
              return new import_types.Decimal(total);
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      totalToPay: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount reduction tax"
              });
              let totalValue = 0;
              materials.forEach((docProd) => {
                totalValue += calculateTotalWithTaxAfterReduction({
                  price: docProd.price,
                  amount: docProd.amount,
                  reduction: docProd.reduction ?? 0,
                  tax: docProd.tax,
                  taxIncluded: item.taxIncluded
                });
              });
              const payments = await context.query.Payment.findMany({
                where: { document: { some: { id: { equals: item.id } } }, isDeleted: { equals: false } },
                query: "value"
              });
              let totalPaid = 0;
              payments.forEach((payment) => {
                totalPaid += payment.value;
              });
              let total = totalValue - totalPaid;
              if (total < 0.02 && total > -0.02) {
                total = 0;
              }
              return new import_types.Decimal(total);
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      comments: (0, import_fields.text)(),
      references: (0, import_fields.text)(),
      managerNotes: (0, import_fields.text)(),
      establishment: (0, import_fields.relationship)({ ref: "Establishment.documents", many: false }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      taxIncluded: (0, import_fields.checkbox)({ defaultValue: true }),
      extraFields: (0, import_fields.json)()
    }
  }),
  DocumentProduct: (0, import_core.list)({
    ui: {
      labelField: "amount"
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context }) => {
        try {
          if (operation === "delete") {
            const movements = await context.query.StockMovement.findMany({
              where: { documentProduct: { id: { equals: item.id } } },
              query: "id"
            });
            movements.forEach(async (movement) => {
              await context.query.StockMovement.deleteOne({
                where: { id: movement.id }
              });
            });
          }
        } catch (error) {
          console.error(error);
        }
      },
      afterOperation: async ({ operation, item, context }) => {
      }
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager
      }
    },
    fields: {
      amount: (0, import_fields.decimal)({ validation: { isRequired: true, min: "1" } }),
      stockMovements: (0, import_fields.relationship)({
        ref: "StockMovement.documentProduct",
        many: true
      }),
      product: (0, import_fields.relationship)({
        ref: "Material.documentProducts",
        many: false
      }),
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      description: (0, import_fields.text)(),
      tax: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      price: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      reduction: (0, import_fields.decimal)({ defaultValue: "0" }),
      totalWithoutTaxBeforeReduction: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded"
              }).then((res) => taxIncluded = res.taxIncluded);
              return new import_types.Decimal(
                calculateTotalWithoutTaxBeforeReduction({
                  price: item.price,
                  amount: item.amount,
                  taxIncluded
                })
              );
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      totalWithoutTaxAfterReduction: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded"
              }).then((res) => taxIncluded = res.taxIncluded);
              return new import_types.Decimal(
                calculateTotalWithoutTaxAfterReduction({
                  price: item.price,
                  amount: item.amount,
                  reduction: item.reduction ?? 0,
                  taxIncluded,
                  tax: item.tax
                })
              );
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      totalWithTaxBeforeReduction: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded"
              }).then((res) => taxIncluded = res.taxIncluded);
              return new import_types.Decimal(
                calculateTotalWithTaxBeforeReduction({
                  price: item.price,
                  amount: item.amount,
                  tax: item.tax,
                  taxIncluded
                })
              );
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      totalWithTaxAfterReduction: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded"
              }).then((res) => taxIncluded = res.taxIncluded);
              return new import_types.Decimal(
                calculateTotalWithTaxAfterReduction({
                  price: item.price,
                  amount: item.amount,
                  reduction: item.reduction ?? 0,
                  tax: item.tax,
                  taxIncluded
                })
              );
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      totalTax: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded"
              }).then((res) => taxIncluded = res.taxIncluded);
              return new import_types.Decimal(
                calculateTotalWithoutTaxAfterReduction({
                  price: item.price,
                  amount: item.amount,
                  reduction: item.reduction ?? 0,
                  tax: item.tax,
                  taxIncluded
                })
              );
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      totalReduction: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              let taxIncluded = true;
              await context.query.Document.findOne({
                where: { id: item.documentId },
                query: "taxIncluded"
              }).then((res) => taxIncluded = res.taxIncluded);
              return new import_types.Decimal(
                calculateTotalWithoutTaxBeforeReduction({
                  price: item.price,
                  amount: item.amount,
                  tax: item.tax,
                  taxIncluded
                })
              );
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      document: (0, import_fields.relationship)({
        ref: "Document.products",
        many: false
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Establishment: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isAdminAccountantManager,
        query: isWorker,
        update: isCompanyAdmin,
        delete: isGlobalAdmin
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      defaultCurrency: (0, import_fields.text)({ defaultValue: "EUR" }),
      logo: (0, import_fields.relationship)({
        ref: "File",
        many: false
      }),
      phone: (0, import_fields.text)(),
      phone2: (0, import_fields.text)(),
      taxID: (0, import_fields.text)(),
      bankAccount1: (0, import_fields.text)(),
      bankAccount2: (0, import_fields.text)(),
      bankAccount3: (0, import_fields.text)(),
      stockMovements: (0, import_fields.relationship)({
        ref: "StockMovement.establishment",
        many: true
      }),
      users: (0, import_fields.relationship)({ ref: "User.establishment", many: true }),
      address: (0, import_fields.relationship)({ ref: "Address", many: false }),
      documents: (0, import_fields.relationship)({ ref: "Document.establishment", many: true }),
      company: (0, import_fields.relationship)({ ref: "Company.establishments", many: false }),
      extraFields: (0, import_fields.json)()
    }
  }),
  File: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isSuperAdmin,
        delete: isSuperAdmin
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      url: (0, import_fields.text)(),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Material: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isManager
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      components: (0, import_fields.relationship)({
        ref: "AssemblyComponent.assembly",
        many: true
      }),
      assemblyComponents: (0, import_fields.relationship)({
        ref: "AssemblyComponent.material",
        many: true
      }),
      description: (0, import_fields.text)(),
      price: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      currentStock: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Int,
          async resolve(item, args, context) {
            try {
              const movements = await context.query.StockMovement.findMany({
                where: {
                  material: { id: { equals: item.id } }
                },
                query: "amount movementType"
              });
              let stock = 0;
              movements.forEach((movement) => {
                if (movement.movementType == "giri\u015F") {
                  stock += movement.amount;
                } else {
                  stock -= movement.amount;
                }
              });
              return stock;
            } catch (e) {
              return 0;
            }
          }
        })
      }),
      status: (0, import_fields.select)({
        type: "string",
        options: ["active", "passive", "cancelled"],
        defaultValue: "active",
        validation: { isRequired: true }
      }),
      files: (0, import_fields.relationship)({
        ref: "File",
        many: true
      }),
      workOrders: (0, import_fields.relationship)({
        ref: "WorkOrder.materials",
        many: true
      }),
      code: (0, import_fields.text)(),
      ean: (0, import_fields.text)(),
      tax: (0, import_fields.decimal)({ defaultValue: "21", validation: { isRequired: true, min: "0" } }),
      brand: (0, import_fields.relationship)({
        ref: "Brand.materials",
        many: false
      }),
      suppliers: (0, import_fields.relationship)({
        ref: "Supplier.materials",
        many: true
      }),
      pricedBy: (0, import_fields.select)({
        type: "string",
        options: ["amount", "volume", "length", "weight", "area"],
        defaultValue: "amount",
        validation: { isRequired: true }
      }),
      type: (0, import_fields.select)({
        type: "string",
        options: ["raw", "product", "assembly", "service"],
        defaultValue: "product",
        validation: { isRequired: true }
      }),
      operations: (0, import_fields.relationship)({
        ref: "Operation.material",
        many: true
      }),
      stockMovements: (0, import_fields.relationship)({
        ref: "StockMovement.material",
        many: true
      }),
      documentProducts: (0, import_fields.relationship)({
        ref: "DocumentProduct.product",
        many: true
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Note: (0, import_core.list)({
    ui: {
      labelField: "note"
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: import_access.denyAll,
        delete: import_access.denyAll
      }
    },
    fields: {
      note: (0, import_fields.text)({ validation: { isRequired: true } }),
      creator: (0, import_fields.relationship)({
        ref: "User.notes",
        many: false
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Notification: (0, import_core.list)({
    ui: {
      labelField: "date"
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isGlobalAdmin,
        query: isUser,
        update: isGlobalAdmin,
        delete: isGlobalAdmin
      }
    },
    fields: {
      date: (0, import_fields.timestamp)({
        defaultValue: { kind: "now" },
        isOrderable: true
      }),
      message: (0, import_fields.text)({ validation: { isRequired: true } }),
      link: (0, import_fields.text)(),
      handled: (0, import_fields.checkbox)({ defaultValue: false }),
      notifyRoles: (0, import_fields.multiselect)({
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
          "customer"
        ]
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } })
    }
  }),
  Operation: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isEmployee
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      files: (0, import_fields.relationship)({
        ref: "File",
        many: true
      }),
      material: (0, import_fields.relationship)({
        ref: "Material.operations",
        many: false
      }),
      workOrderOperations: (0, import_fields.relationship)({
        ref: "WorkOrderOperation.operation",
        many: true
      }),
      user: (0, import_fields.relationship)({ ref: "User.operations", many: false }),
      cost: (0, import_fields.decimal)(),
      value: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      duration: (0, import_fields.integer)(),
      description: (0, import_fields.text)(),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Payment: (0, import_core.list)({
    ui: {
      labelField: "timestamp"
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isCompanyAdmin
      }
    },
    fields: {
      value: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      document: (0, import_fields.relationship)({
        ref: "Document.payments",
        many: true
      }),
      out: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Boolean,
          async resolve(item, args, context) {
            try {
              const document = await context.query.Document.findMany({
                where: {
                  payments: {
                    some: {
                      id: {
                        equals: item.id
                      }
                    }
                  }
                },
                query: "type"
              });
              switch (document[0].type) {
                case "sat\u0131\u015F":
                  return false;
                case "irsaliye":
                  return false;
                case "fatura":
                  return false;
                case "bor\xE7 dekontu":
                  return false;
                case "alacak dekontu":
                  return true;
                case "sat\u0131n alma":
                  return true;
                default:
                  return false;
              }
            } catch (e) {
              return false;
            }
          }
        })
      }),
      isDeleted: (0, import_fields.checkbox)({ defaultValue: false }),
      isVerified: (0, import_fields.checkbox)({ defaultValue: false }),
      creator: (0, import_fields.relationship)({
        ref: "User.payments",
        many: false
      }),
      reference: (0, import_fields.text)(),
      type: (0, import_fields.select)({
        type: "string",
        options: ["cash", "debit_card", "credit_card", "online", "bank_transfer", "financing", "financing_unverified", "promissory"],
        defaultValue: "cash",
        validation: { isRequired: true }
      }),
      timestamp: (0, import_fields.timestamp)({
        defaultValue: { kind: "now" },
        isOrderable: true
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  SoftwareVersion: (0, import_core.list)({
    isSingleton: true,
    access: {
      operation: {
        create: isSuperAdmin,
        query: import_access.allowAll,
        update: isSuperAdmin,
        delete: import_access.denyAll
      }
    },
    fields: {
      version: (0, import_fields.integer)({ validation: { isRequired: true } }),
      iosLink: (0, import_fields.text)(),
      androidLink: (0, import_fields.text)(),
      webLink: (0, import_fields.text)(),
      windowsLink: (0, import_fields.text)(),
      macLink: (0, import_fields.text)(),
      date: (0, import_fields.timestamp)({
        defaultValue: { kind: "now" },
        isOrderable: true
      })
    }
  }),
  StockMovement: (0, import_core.list)({
    ui: {
      labelField: "movementType"
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: import_access.denyAll,
        delete: import_access.denyAll
      }
    },
    fields: {
      material: (0, import_fields.relationship)({
        ref: "Material.stockMovements",
        many: false
      }),
      establishment: (0, import_fields.relationship)({
        ref: "Establishment.stockMovements",
        many: false
      }),
      amount: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      movementType: (0, import_fields.select)({
        type: "string",
        options: ["in", "out"],
        defaultValue: "in",
        validation: { isRequired: true }
      }),
      documentProduct: (0, import_fields.relationship)({
        ref: "DocumentProduct.stockMovements",
        many: false
      }),
      note: (0, import_fields.text)(),
      customer: (0, import_fields.relationship)({
        ref: "User.customerMovements",
        many: false
      }),
      date: (0, import_fields.timestamp)({
        defaultValue: { kind: "now" },
        isOrderable: true
      }),
      createdAt: (0, import_fields.timestamp)({
        defaultValue: { kind: "now" },
        isOrderable: true,
        access: {
          create: import_access.denyAll,
          update: import_access.denyAll
        }
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Storage: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isCompanyAdmin,
        query: isEmployee,
        update: isCompanyAdmin,
        delete: isGlobalAdmin
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Supplier: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isGlobalAdmin
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      materials: (0, import_fields.relationship)({ ref: "Material.suppliers", many: true }),
      documents: (0, import_fields.relationship)({ ref: "Document.supplier", many: true }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      address: (0, import_fields.relationship)({ ref: "Address", many: false }),
      taxId: (0, import_fields.text)(),
      extraFields: (0, import_fields.json)()
    }
  }),
  User: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        query: isUser,
        create: isManager,
        update: isManager,
        delete: isGlobalAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            if (!inputData.company) {
              throw new Error("Company is required");
            }
            let mail = inputData.email;
            let mailPart1 = mail.split("@")[0];
            let mailPart2 = mail.split("@")[1];
            resolvedData.email = mailPart1 + "+" + resolvedData.company?.connect?.id + "@" + mailPart2;
          }
        } catch (error) {
          console.error(error);
        }
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      email: (0, import_fields.text)({
        isIndexed: "unique",
        validation: { isRequired: true }
      }),
      isBlocked: (0, import_fields.checkbox)({ defaultValue: false }),
      phone: (0, import_fields.text)(),
      role: (0, import_fields.select)({
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
          "customer"
        ],
        defaultValue: "customer",
        validation: { isRequired: true },
        isIndexed: true,
        access: {
          update: isCompanyAdmin
        }
      }),
      permissions: (0, import_fields.multiselect)({
        type: "enum",
        options: [
          { label: "Warranty", value: "warranty" },
          { label: "Price", value: "price" }
        ],
        access: {
          update: isCompanyAdmin
        }
      }),
      ssid: (0, import_fields.text)(),
      password: (0, import_fields.password)({
        validation: {
          isRequired: true,
          length: {
            min: 6
          }
        }
      }),
      operations: (0, import_fields.relationship)({ ref: "Operation.user", many: true }),
      notes: (0, import_fields.relationship)({ ref: "Note.creator", many: true }),
      documents: (0, import_fields.relationship)({ ref: "Document.creator", many: true }),
      customerDocuments: (0, import_fields.relationship)({ ref: "Document.customer", many: true }),
      customerMovements: (0, import_fields.relationship)({
        ref: "StockMovement.customer",
        many: true
      }),
      preferredLanguage: (0, import_fields.text)(),
      customerCompany: (0, import_fields.text)(),
      firstName: (0, import_fields.text)(),
      lastName: (0, import_fields.text)(),
      customerTaxNumber: (0, import_fields.text)(),
      customerTaxCenter: (0, import_fields.text)(),
      payments: (0, import_fields.relationship)({ ref: "Payment.creator", many: true }),
      customerAddresses: (0, import_fields.relationship)({ ref: "Address.customer", many: true }),
      workOrders: (0, import_fields.relationship)({ ref: "WorkOrder.creator", many: true }),
      establishment: (0, import_fields.relationship)({ ref: "Establishment.users", many: false }),
      accountancy: (0, import_fields.relationship)({ ref: "Accountancy.users", many: false }),
      ownedCompany: (0, import_fields.relationship)({ ref: "Company.owner", many: false }),
      company: (0, import_fields.relationship)({ ref: "Company.users", many: false }),
      extraFields: (0, import_fields.json)()
    }
  }),
  WorkOrder: (0, import_core.list)({
    ui: {
      labelField: "number"
    },
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager
      }
    },
    fields: {
      number: (0, import_fields.text)({ validation: { isRequired: true } }),
      materials: (0, import_fields.relationship)({
        ref: "Material.workOrders",
        many: true
      }),
      operations: (0, import_fields.relationship)({
        ref: "WorkOrderOperation.workOrder",
        many: true
      }),
      datePlanned: (0, import_fields.timestamp)(),
      dateStarted: (0, import_fields.timestamp)(),
      dateFinished: (0, import_fields.timestamp)(),
      creator: (0, import_fields.relationship)({
        ref: "User.workOrders",
        many: false
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  WorkOrderOperation: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isEmployee
      }
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
      }
    },
    fields: {
      files: (0, import_fields.relationship)({
        ref: "File",
        many: true
      }),
      startedAt: (0, import_fields.timestamp)(),
      finishedAt: (0, import_fields.timestamp)(),
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      description: (0, import_fields.text)(),
      value: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      price: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              const workOrder = await context.query.WorkOrder.findOne({
                where: { id: item.workOrderId },
                query: "reduction"
              });
              let total = item.value;
              total -= total * (workOrder.reduction ?? 0) / 100;
              return new import_types.Decimal(total);
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      reduction: (0, import_fields.decimal)({ defaultValue: "0" }),
      amount: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      total: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              const workOrder = await context.query.WorkOrder.findOne({
                where: { id: item.workOrderId },
                query: "reduction"
              });
              let total = item.value * item.amount - item.value * item.amount * (item.reduction ?? 0) / 100;
              total -= total * (workOrder.reduction ?? 0) / 100;
              return new import_types.Decimal(total);
            } catch (e) {
              return new import_types.Decimal(0);
            }
          }
        })
      }),
      wastage: (0, import_fields.decimal)({
        validation: { min: "0" },
        defaultValue: "0"
      }),
      workOrder: (0, import_fields.relationship)({
        ref: "WorkOrder.operations",
        many: false
      }),
      operation: (0, import_fields.relationship)({
        ref: "Operation.workOrderOperations",
        many: false
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  })
};

// keystone.ts
var import_config2 = require("dotenv/config");

// utils/bulkdocumentsenderstart.ts
var import_worker_threads = require("worker_threads");
var import_path = __toESM(require("path"));
async function fetchCompany(companyID, context) {
  let company;
  await context.sudo().query.Company.findOne({
    query: "id name accountantEmail",
    where: { id: companyID }
  }).then((res) => {
    company = res;
  });
  return company;
}
async function fetchDocuments(companyID, docTypes, month, year, context) {
  const fetchedDocuments = await context.sudo().query.Document.findMany({
    orderBy: [{ date: "desc" }],
    query: "id number establishment { taxID logo { url } } supplier { name address { street door zip city country } taxId } date files { url name } type products { name totalWithTaxAfterReduction tax }",
    where: {
      company: {
        id: {
          equals: companyID
        }
      },
      type: {
        in: docTypes
      },
      date: {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 1)
      }
    }
  });
  return Array.from(fetchedDocuments);
}
async function startBulkDocumentSenderWorker({ companyID, docTypes, month, year, context }) {
  const documents = await fetchDocuments(companyID, docTypes, month, year, context);
  if (documents.length === 0) {
    console.log("No documents found for companyID: ", companyID, "docTypes: ", docTypes, "month: ", month, "year: ", year);
    return;
  }
  const company = await fetchCompany(companyID, context);
  const workerData = { documents, company };
  new import_worker_threads.Worker(import_path.default.resolve("./utils/bulkdocumentsenderworker.ts"), {
    execArgv: ["-r", "ts-node/register"],
    workerData
  });
}
var bulkSendDocuments = ({ companyID, docTypes, month, year, context }) => {
  try {
    startBulkDocumentSenderWorker({ companyID, docTypes, month, year, context });
  } catch (error) {
    console.error("Error occurred while starting bulkdocumentsender with params: ", companyID, docTypes, month, year, "error: ", error);
  }
};

// keystone.ts
var keystone_default = withAuth(
  (0, import_core2.config)({
    db: {
      provider: "postgresql",
      url: process.env.DB,
      idField: { kind: "cuid" }
    },
    server: {
      port: 3399,
      cors: {
        origin: ["http://localhost:8081", "http://localhost:3000", "http://localhost:5173", "https://dfatest.huseyinonal.com", "https://huseyinonal.com"],
        credentials: true
      },
      extendExpressApp: (app, context) => {
        var cron = require("node-cron");
        const multer = require("multer");
        const upload = multer({
          storage: multer.memoryStorage(),
          limits: {
            fileSize: 50 * 1024 * 1024
          }
        });
        app.post("/rest/upload", upload.single("file"), async (req, res) => {
          try {
            if (!req.file) {
              return res.status(400).json({ message: "No valid file provided" });
            }
            const result = await fileUpload(req.file);
            const file = await context.sudo().query.File.createOne({
              query: "id",
              data: {
                name: result.fileName,
                url: result.fileUrl
              }
            });
            res.status(200).json({
              fileUpload: {
                id: file.id
              }
            });
          } catch (error) {
            console.error("Upload error:", error);
            res.status(500).json({ error: "Upload failed" });
          }
        });
        app.get("/rest/pincheck", async (req, res) => {
          if (!req.query.pin) {
            return res.status(400).json({ message: "No pin provided" });
          }
          try {
            let pin = req.query.pin;
            const pinCheck = await context.sudo().query.Company.findOne({
              where: {
                pincode: String(pin)
              },
              query: "id"
            });
            if (pinCheck) {
              res.status(200).json({ id: pinCheck.id });
            } else {
              res.status(404).json({ message: "Bad pin" });
            }
          } catch (error) {
            console.error("Pin check error:", error);
            res.status(500).json({ error: "Pin check failed" });
            return;
          }
        });
        const sendDocumentsToAccountant = async () => {
          try {
            let companiesWithMonthlyReportsActive = await context.sudo().query.Company.findMany({
              where: {
                monthlyReports: {
                  equals: true
                }
              }
            });
            console.log(companiesWithMonthlyReportsActive);
            let currentYear = (/* @__PURE__ */ new Date()).getFullYear();
            for (let company of companiesWithMonthlyReportsActive) {
              bulkSendDocuments({
                companyID: company.id,
                docTypes: ["purchase"],
                month: (/* @__PURE__ */ new Date()).getMonth() - 5,
                // last month
                year: currentYear,
                // Current year
                context
              });
              bulkSendDocuments({
                companyID: company.id,
                docTypes: ["purchase"],
                month: (/* @__PURE__ */ new Date()).getMonth() - 4,
                // last month
                year: currentYear,
                // Current year
                context
              });
              bulkSendDocuments({
                companyID: company.id,
                docTypes: ["purchase"],
                month: (/* @__PURE__ */ new Date()).getMonth() - 3,
                // last month
                year: currentYear,
                // Current year
                context
              });
              bulkSendDocuments({
                companyID: company.id,
                docTypes: ["purchase"],
                month: (/* @__PURE__ */ new Date()).getMonth() - 2,
                // last month
                year: currentYear,
                // Current year
                context
              });
              bulkSendDocuments({
                companyID: company.id,
                docTypes: ["purchase"],
                month: (/* @__PURE__ */ new Date()).getMonth() - 1,
                // last month
                year: currentYear,
                // Current year
                context
              });
              bulkSendDocuments({
                companyID: company.id,
                docTypes: ["purchase"],
                month: (/* @__PURE__ */ new Date()).getMonth(),
                // last month
                year: currentYear,
                // Current year
                context
              });
            }
          } catch (error) {
            console.error("Error starting bulk document sender", error);
          }
        };
        sendDocumentsToAccountant();
        cron.schedule("0 0 2 * *", async () => {
          try {
            let companiesWithMonthlyReportsActive = await context.sudo().query.companies.findMany({
              where: {
                monthlyReports: {
                  equals: true
                }
              }
            });
            let currentYear = (/* @__PURE__ */ new Date()).getFullYear();
          } catch (error) {
            console.error("Error starting bulk document sender", error);
          }
        });
      }
    },
    lists,
    session,
    graphql: {
      bodyParser: {
        limit: "20mb"
      }
    }
  })
);
//# sourceMappingURL=config.js.map
