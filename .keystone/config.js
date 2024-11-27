"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } })
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
            let mailPart12 = mail.split("@")[0];
            let mailPart22 = mail.split("@")[1];
            resolvedData.email = mailPart12 + "+" + resolvedData.company?.connect?.id + "@" + mailPart22;
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
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
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: import_access.denyAll } }),
      extraFields: (0, import_fields.json)()
    }
  })
};

// keystone.ts
var import_config2 = require("dotenv/config");

// utils/eutaxes.ts
var eutaxes = [
  {
    code: "AT",
    country: "Oostenrijk",
    standard: 20,
    low: 13,
    low2: 10,
    low3: null
  },
  {
    code: "BE",
    country: "Belgi\xEB",
    standard: 21,
    low: 12,
    low2: 6,
    low3: null
  },
  {
    code: "BG",
    country: "Bulgarije",
    standard: 20,
    low: 9,
    low2: null,
    low3: null
  },
  {
    code: "CY",
    country: "Cyprus",
    standard: 19,
    low: 9,
    low2: 5,
    low3: null
  },
  {
    code: "CZ",
    country: "Tsjechi\xEB",
    standard: 21,
    low: 15,
    low2: 12,
    low3: null
  },
  {
    code: "DE",
    country: "Duitsland",
    standard: 19,
    low: 7,
    low2: null,
    low3: null
  },
  {
    code: "DK",
    country: "Denemarken",
    standard: 25,
    low: 0,
    low2: null,
    low3: null
  },
  {
    code: "EE",
    country: "Estland",
    standard: 22,
    low: 9,
    low2: null,
    low3: null
  },
  {
    code: "EL",
    country: "Griekenland",
    standard: 24,
    low: 13,
    low2: 6,
    low3: null
  },
  {
    code: "ES",
    country: "Spanje",
    standard: 21,
    low: 10,
    low2: null,
    low3: null
  },
  {
    code: "FI",
    country: "Finland",
    standard: 24,
    low: 14,
    low2: 10,
    low3: null
  },
  {
    code: "FR",
    country: "Frankrijk",
    standard: 20,
    low: 10,
    low2: 5.5,
    low3: 2.1
  },
  {
    code: "HR",
    country: "Kroati\xEB",
    standard: 25,
    low: 13,
    low2: 5,
    low3: null
  },
  {
    code: "HU",
    country: "Hongarije",
    standard: 27,
    low: 18,
    low2: 5,
    low3: null
  },
  {
    code: "IE",
    country: "Ierland",
    standard: 23,
    low: 13.5,
    low2: 9,
    low3: null
  },
  {
    code: "IT",
    country: "Itali\xEB",
    standard: 22,
    low: 10,
    low2: 5,
    low3: 4
  },
  {
    code: "LT",
    country: "Litouwen",
    standard: 21,
    low: 9,
    low2: 5,
    low3: null
  },
  {
    code: "LU",
    country: "Luxemburg",
    standard: 17,
    low: 14,
    low2: 8,
    low3: 3
  },
  {
    code: "LV",
    country: "Letland",
    standard: 21,
    low: 12,
    low2: 5,
    low3: null
  },
  {
    code: "MT",
    country: "Malta",
    standard: 18,
    low: 12,
    low2: 7,
    low3: 5
  },
  {
    code: "NL",
    country: "Nederland",
    standard: 21,
    low: 9,
    low2: null,
    low3: null
  },
  {
    code: "PL",
    country: "Polen",
    standard: 23,
    low: 8,
    low2: 5,
    low3: null
  },
  {
    code: "PT",
    country: "Portugal",
    standard: 23,
    low: 13,
    low2: 6,
    low3: null
  },
  {
    code: "RO",
    country: "Roemeni\xEB",
    standard: 19,
    low: 9,
    low2: 5,
    low3: null
  },
  {
    code: "SE",
    country: "Zweden",
    standard: 25,
    low: 12,
    low2: 6,
    low3: null
  },
  {
    code: "SI",
    country: "Sloveni\xEB",
    standard: 22,
    low: 9.5,
    low2: 5,
    low3: null
  },
  {
    code: "SK",
    country: "Slowakije",
    standard: 20,
    low: 10,
    low2: null,
    low3: null
  }
];

// utils/invoiceoutpdf.ts
var import_buffer = require("buffer");

// utils/formatters/formatcurrency.ts
var formatCurrency = (value) => {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR"
  }).format(value);
};

// utils/formatters/dateformatters.ts
var dateFormatBe = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-FR");
};

// utils/addtodate.ts
function addDaysToDate(dateStr, daysToAdd) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + daysToAdd);
  return date;
}

// utils/invoiceoutpdf.ts
async function generateInvoiceOut({
  document,
  logoBuffer
}) {
  const invoiceDoc = document;
  const establishment = invoiceDoc.establishment;
  const establishmentAddress = establishment.address;
  const customer = invoiceDoc.customer;
  const documentProducts = invoiceDoc.documentProducts;
  const payments = invoiceDoc.payments;
  return new Promise(async (resolve, reject) => {
    const pageLeft = 20;
    const pageTop = 40;
    try {
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ size: "A4", margin: 20 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      if (logoBuffer) {
        doc.image(logoBuffer, pageLeft, pageTop, { height: 50 });
      } else {
        const response = await fetch(establishment.logo.url);
        logoBuffer = await import_buffer.Buffer.from(await response.arrayBuffer());
        doc.image(logoBuffer, pageLeft, pageTop, { height: 50 });
      }
      const columns = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
      const generateTableRow = (doc2, y2, name, description, price, amount, tax, subtotal, isHeader = false) => {
        if (isHeader) {
          doc2.lineWidth(25);
          const bgY = y2 + 5;
          doc2.lineCap("butt").moveTo(30, bgY).lineTo(550, bgY).stroke("black");
          doc2.fontSize(10).fillColor("white").text(name, columns[0], y2).text(description, columns[4], y2).text(price, columns[6], y2).text(amount, columns[7], y2).text(tax, columns[8], y2).text(subtotal, columns[9], y2);
        } else {
          doc2.fontSize(10).fillColor("black").text(name, columns[0], y2, { width: columns[3] - columns[0] }).text(description, columns[4], y2).text(price, columns[6], y2).text(amount, columns[7] + 20, y2).text(tax, columns[8], y2).text(subtotal, columns[9], y2);
        }
      };
      const generateInvoiceTable = (doc2, documentProducts2, y2) => {
        let invoiceTableTop = y2;
        generateTableRow(doc2, invoiceTableTop + 15, "Name", "Description", "Price", "Amount", "Tax", "Subtotal", true);
        for (let i = 1; i <= documentProducts2.length; i++) {
          const item = documentProducts2[i - 1];
          const position = invoiceTableTop + i * 40;
          generateTableRow(
            doc2,
            position,
            item.name,
            item.description,
            formatCurrency(item.value.toFixed(2)),
            item.amount,
            formatCurrency(Number(item.subTotalTax).toFixed(2)),
            formatCurrency(Number(item.subTotal).toFixed(2))
          );
        }
        return invoiceTableTop + (documentProducts2.length + 1) * 40;
      };
      const bankDetails = ({ doc: doc2, x, y: y2, establishment: establishment2 }) => {
        let strings = [];
        if (establishment2.bankAccount1) {
          strings.push(establishment2.bankAccount1);
        }
        if (establishment2.bankAccount2 !== null) {
          strings.push(establishment2.bankAccount2);
        }
        if (establishment2.bankAccount3 !== null) {
          strings.push(establishment2.bankAccount3);
        }
        strings.map((string, index) => {
          doc2.text(string, x, y2 + index * 15);
        });
      };
      const customerDetails = ({ doc: doc2, x, y: y2, invoiceDoc: invoiceDoc2 }) => {
        let strings = [];
        const docAddress = invoiceDoc2.delAddress;
        if (customer.customerCompany) {
          strings.push(customer.customerCompany);
        }
        if (customer.customerTaxNumber) {
          strings.push(customer.customerTaxNumber);
        }
        if (customer.phone) {
          strings.push(customer.phone);
        }
        strings.push(docAddress.street + " " + docAddress.door);
        if (docAddress.floor) {
          strings.push("floor: " + docAddress.floor);
        }
        strings.push(docAddress.zip + " " + docAddress.city + " " + docAddress.country);
        strings.map((string, index) => {
          doc2.text(string, x, y2 + index * 15);
        });
        return y2 + strings.length * 15;
      };
      const paymentsTable = ({ doc: doc2, x, y: y2, payments: payments2 }) => {
        doc2.lineCap("butt").moveTo(x, y2).lineTo(x + 230, y2).stroke("black");
        doc2.fillColor("white").text("Payment History:", x + 10, y2 - 5);
        doc2.fillColor("black");
        payments2.forEach((payment, i) => {
          doc2.text(dateFormatBe(payment.date), x + 10, y2 + 20 * (i + 1));
          doc2.text(payment.type, x + 85, y2 + 20 * (i + 1));
          doc2.text(formatCurrency(payment.value.toFixed(2)), x + 150, y2 + 20 * (i + 1), {
            width: 80,
            align: "right"
          });
        });
      };
      const taxTable = ({ doc: doc2, x, y: y2, documentProducts: documentProducts2 }) => {
        let taxRates = [];
        documentProducts2.forEach((docProd, i) => {
          if (!taxRates.includes(docProd.tax)) {
            taxRates.push(docProd.tax);
          }
        });
        taxRates = taxRates.sort((a, b) => a - b);
        doc2.fontSize(10).text("Total Tax:", x, y2 + 50);
        doc2.text(formatCurrency(documentProducts2.reduce((acc, dp) => acc + Number(dp.subTotalTax), 0)), x + 80, y2 + 50);
        taxRates.map((taxRate, index) => {
          doc2.text("Total Tax " + taxRate + "%:", x, y2 + 50 + (index + 1) * 15).text(
            formatCurrency(documentProducts2.filter((dp) => dp.tax === taxRate).reduce((acc, dp) => acc + Number(dp.subTotalTax), 0)),
            x + 80,
            y2 + 50 + (index + 1) * 15
          );
        });
        return y2 + taxRates.length * 15 + 50;
      };
      doc.fontSize(20).text("INVOICE", 455, pageTop);
      doc.fontSize(10).text("Invoice:", 380, 80);
      doc.text(invoiceDoc.number, 450, 80);
      doc.text("Date:", 380, 95);
      doc.text(dateFormatBe(invoiceDoc.date), 450, 95);
      doc.text("Valid Until:", 380, 110);
      doc.text(dateFormatBe(addDaysToDate(invoiceDoc.date, 15).toISOString()), 450, 110);
      doc.text("Delivery Date:", 380, 125);
      if (invoiceDoc.deliveryDate) {
        doc.text(dateFormatBe(invoiceDoc.deliveryDate), 450, 125);
      }
      let y = 140;
      doc.text(establishment.name, 50, y);
      doc.text(establishment.taxID, 50, y + 15);
      bankDetails({
        doc,
        x: 50,
        y: y + 30,
        establishment
      });
      doc.text(establishmentAddress.street + " " + establishmentAddress.door, 200, y);
      doc.text(establishmentAddress.zip + " " + establishmentAddress.city, 200, y + 15);
      doc.text(establishment.phone, 200, y + 30);
      doc.text(establishment.phone2, 200, y + 45);
      doc.text("Order: " + invoiceDoc.references, 380, y);
      doc.text(customer.firstName + " " + customer.lastName, 380, y + 15);
      y = customerDetails({
        doc,
        x: 380,
        y: y + 30,
        invoiceDoc
      });
      y += 60;
      y = generateInvoiceTable(doc, documentProducts, y);
      if (y < 500) {
        y = 500;
      }
      taxTable({
        doc,
        x: 30,
        y,
        documentProducts
      });
      paymentsTable({ doc, x: 170, y: y + 30, payments });
      let totalsX = 410;
      doc.text("Total Excl. Tax:", totalsX, y + 50);
      doc.text(
        formatCurrency(
          documentProducts.reduce((acc, dp) => acc + Number(dp.subTotal), 0) - documentProducts.reduce((acc, dp) => acc + Number(dp.subTotalTax), 0)
        ),
        totalsX + 70,
        y + 50
      );
      doc.text("Total:", totalsX, y + 65);
      doc.text(formatCurrency(documentProducts.reduce((acc, dp) => acc + Number(dp.subTotal), 0)), totalsX + 70, y + 65);
      doc.text("Already Paid:", totalsX, y + 80);
      doc.text(formatCurrency(payments.filter((p) => p.isVerified && !p.isDeleted).reduce((acc, dp) => acc + Number(dp.value), 0)), totalsX + 70, y + 80);
      doc.text("To Pay:", totalsX, y + 95);
      doc.text(
        formatCurrency(
          documentProducts.reduce((acc, dp) => acc + Number(dp.subTotal), 0) - payments.filter((p) => p.isVerified && !p.isDeleted).reduce((acc, dp) => acc + Number(dp.value), 0)
        ),
        totalsX + 70,
        y + 95
      );
      doc.end();
      doc.on("end", () => {
        const pdfData = import_buffer.Buffer.concat(buffers);
        resolve({
          filename: `invoice_${document.number}.pdf`,
          content: pdfData,
          contentType: "application/pdf"
        });
      });
    } catch (error) {
      console.error("error on pdf generation (invoice): ", error);
      reject(`Error generating invoice: ${error.message}`);
    }
  });
}

// utils/random.ts
function generateRandomString(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// utils/sendmail.ts
var sendMail = async ({
  recipient,
  bcc,
  company,
  subject,
  html,
  attachments
}) => {
  try {
    const nodemailer = require("nodemailer");
    let transporter = nodemailer.createTransport({
      host: company.emailHost,
      port: company.emailPort,
      secure: false,
      auth: {
        user: company.emailUser,
        pass: company.emailPassword
      }
    });
    let mailOptionsClient = {
      from: `"${company.emailUser}" <${company.emailUser}>`,
      to: recipient,
      bcc,
      attachments,
      subject,
      html: templatedMail({
        content: html,
        img64: company.logo.url
      })
    };
    transporter.sendMail(mailOptionsClient, (error) => {
      if (error) {
        return true;
      } else {
        return false;
      }
    });
  } catch (e) {
    return false;
  }
};
function templatedMail({ content, img64 }) {
  return mailPart1({ img64 }) + content + mailPart2;
}
var mailPart1 = ({ img64 }) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html>
  <head>
    <!-- Compiled with Bootstrap Email version: 1.5.1 -->
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style type="text/css">
      body,
      table,
      td {
        font-family: Helvetica, Arial, sans-serif !important;
      }
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 150%;
      }
      a {
        text-decoration: none;
      }
      * {
        color: inherit;
      }
      a[x-apple-data-detectors],
      u + #body a,
      #MessageViewBody a {
        color: inherit;
        text-decoration: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
      }
      img {
        -ms-interpolation-mode: bicubic;
      }
      table:not([class^="s-"]) {
        font-family: Helvetica, Arial, sans-serif;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        border-spacing: 0px;
        border-collapse: collapse;
      }
      table:not([class^="s-"]) td {
        border-spacing: 0px;
        border-collapse: collapse;
      }
      @media screen and (max-width: 600px) {
        .w-full,
        .w-full > tbody > tr > td {
          width: 100% !important;
        }
        .w-8,
        .w-8 > tbody > tr > td {
          width: 32px !important;
        }
        .h-16,
        .h-16 > tbody > tr > td {
          height: 64px !important;
        }
        .p-lg-10:not(table),
        .p-lg-10:not(.btn) > tbody > tr > td,
        .p-lg-10.btn td a {
          padding: 0 !important;
        }
        .pr-4:not(table),
        .pr-4:not(.btn) > tbody > tr > td,
        .pr-4.btn td a,
        .px-4:not(table),
        .px-4:not(.btn) > tbody > tr > td,
        .px-4.btn td a {
          padding-right: 16px !important;
        }
        .pl-4:not(table),
        .pl-4:not(.btn) > tbody > tr > td,
        .pl-4.btn td a,
        .px-4:not(table),
        .px-4:not(.btn) > tbody > tr > td,
        .px-4.btn td a {
          padding-left: 16px !important;
        }
        .pb-6:not(table),
        .pb-6:not(.btn) > tbody > tr > td,
        .pb-6.btn td a,
        .py-6:not(table),
        .py-6:not(.btn) > tbody > tr > td,
        .py-6.btn td a {
          padding-bottom: 24px !important;
        }
        .pt-8:not(table),
        .pt-8:not(.btn) > tbody > tr > td,
        .pt-8.btn td a,
        .py-8:not(table),
        .py-8:not(.btn) > tbody > tr > td,
        .py-8.btn td a {
          padding-top: 32px !important;
        }
        .pb-8:not(table),
        .pb-8:not(.btn) > tbody > tr > td,
        .pb-8.btn td a,
        .py-8:not(table),
        .py-8:not(.btn) > tbody > tr > td,
        .py-8.btn td a {
          padding-bottom: 32px !important;
        }
        *[class*="s-lg-"] > tbody > tr > td {
          font-size: 0 !important;
          line-height: 0 !important;
          height: 0 !important;
        }
        .s-6 > tbody > tr > td {
          font-size: 24px !important;
          line-height: 24px !important;
          height: 24px !important;
        }
      }
    </style>
  </head>
  <body
    class="bg-blue-100"
    style="
      outline: 0;
      width: 100%;
      min-width: 100%;
      height: 100%;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: Helvetica, Arial, sans-serif;
      line-height: 24px;
      font-weight: normal;
      font-size: 16px;
      -moz-box-sizing: border-box;
      -webkit-box-sizing: border-box;
      box-sizing: border-box;
      color: #000000;
      margin: 0;
      padding: 0;
      border-width: 0;
    "
    bgcolor="#cfe2ff"
  >
    <table
      class="bg-blue-100 body"
      valign="top"
      role="presentation"
      border="0"
      cellpadding="0"
      cellspacing="0"
      style="
        outline: 0;
        width: 100%;
        min-width: 100%;
        height: 100%;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        font-family: Helvetica, Arial, sans-serif;
        line-height: 24px;
        font-weight: normal;
        font-size: 16px;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
        color: #000000;
        margin: 0;
        padding: 0;
        border-width: 0;
      "
      bgcolor="#cfe2ff"
    >
      <tbody>
        <tr>
          <td valign="top" style="line-height: 24px; font-size: 16px; margin: 0" align="left" bgcolor="#cfe2ff">
            <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%">
              <tbody>
                <tr>
                  <td align="center" style="line-height: 24px; font-size: 16px; margin: 0; padding: 0 16px">
                    <!--[if (gte mso 9)|(IE)]>
                                          <table align="center" role="presentation">
                                            <tbody>
                                              <tr>
                                                <td width="600">
                                        <![endif]-->
                    <table align="center" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; margin: 0 auto">
                      <tbody>
                        <tr>
                          <td style="line-height: 24px; font-size: 16px; margin: 0" align="left">
                            <table class="s-6 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%" width="100%">
                              <tbody>
                                <tr>
                                  <td style="line-height: 24px; font-size: 24px; width: 100%; height: 24px; margin: 0" align="left" width="100%" height="24">
                                    &#160;
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <table class="ax-center" role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto">
                              <tbody>
                                <tr>
                                  <td style="line-height: 24px; font-size: 16px; margin: 0" align="left">
                                    <img
                                      class="h-16"
                                      src="${img64}"
                                      style="
                                        height: 64px;
                                        line-height: 100%;
                                        outline: none;
                                        text-decoration: none;
                                        display: block;
                                        border-style: none;
                                        border-width: 0;
                                      "
                                      height="64"
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <table class="s-6 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%" width="100%">
                              <tbody>
                                <tr>
                                  <td style="line-height: 24px; font-size: 24px; width: 100%; height: 24px; margin: 0" align="left" width="100%" height="24">
                                    &#160;
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <table
                              class="card rounded-3xl px-4 py-8 p-lg-10"
                              role="presentation"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              style="border-radius: 24px; border-collapse: separate !important; width: 100%; overflow: hidden; border: 1px solid #e2e8f0"
                              bgcolor="#ffffff"
                            >
                              <tbody>
                                <tr>
                                  <td
                                    style="line-height: 24px; font-size: 16px; width: 100%; border-radius: 24px; margin: 0; padding: 40px"
                                    align="left"
                                    bgcolor="#ffffff"
                                  >`;
};
var mailPart2 = `</td>
                                </tr>
                              </tbody>
                            </table>
                            <table class="s-6 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%" width="100%">
                              <tbody>
                                <tr>
                                  <td style="line-height: 24px; font-size: 24px; width: 100%; height: 24px; margin: 0" align="left" width="100%" height="24">
                                    &#160;
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                        <![endif]-->
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

// utils/bol-offer-sync.ts
var bolAuthUrl = "https://login.bol.com/token?grant_type=client_credentials";
var bolApiUrl = "https://api.bol.com/retailer";
var bolTokens = [];
function bolHeaders(headersType, clientId) {
  const tokenEntry = bolTokens.find((t) => t.clientId === clientId);
  if (!tokenEntry) {
    return;
  }
  const contentType = headersType === "json" ? "application/vnd.retailer.v10+json" : "application/vnd.retailer.v10+csv";
  return {
    "Content-Type": contentType,
    Accept: contentType,
    Authorization: `Bearer ${tokenEntry.token}`
  };
}
async function authenticateBolCom(clientId, clientSecret) {
  const existingTokenEntry = bolTokens.find((t) => t.clientId === clientId);
  if (existingTokenEntry && /* @__PURE__ */ new Date() < existingTokenEntry.expiration) {
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
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      console.error("bol auth error:", await response.text());
      return false;
    }
    const data = await response.json();
    const newToken = {
      clientId,
      token: data["access_token"],
      expiration: new Date((/* @__PURE__ */ new Date()).getTime() + data["expires_in"] * 1e3)
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
var createDocumentsFromBolOrders = async (context) => {
  await context.sudo().query.Company.findMany({
    query: "id bolClientID bolClientSecret name owner { id } establishments { id }",
    where: {
      isActive: {
        equals: true
      }
    }
  }).then(async (res) => {
    let companiesToSync = res.filter(
      (company) => company.bolClientID && company.bolClientSecret
    );
    for (let i = 0; i < companiesToSync.length; i++) {
      const currCompany = companiesToSync[i];
      getBolComOrders(currCompany.bolClientID, currCompany.bolClientSecret).then(async (orders) => {
        if (orders && orders.length > 0) {
          const sortedOrders = orders.sort((a, b) => new Date(a.orderPlacedDateTime).getTime() - new Date(b.orderPlacedDateTime).getTime());
          for (let i2 = 0; i2 < orders.length; i2++) {
            try {
              await getBolComOrder(sortedOrders[i2].orderId, currCompany.bolClientID, currCompany.bolClientSecret).then(async (orderDetails) => {
                orderDetails && await saveDocument(orderDetails, currCompany, context);
              });
            } catch (error) {
              console.error("Error fetching order details for orderId: ", sortedOrders[i2], error);
            }
          }
        }
      });
    }
  });
  console.log("Finished Cron Job for Bol Orders");
};
async function getBolComOrders(bolClientID, bolClientSecret) {
  await authenticateBolCom(bolClientID, bolClientSecret);
  const dateString = (date) => date.toISOString().split("T")[0];
  try {
    let orders = [];
    let today = /* @__PURE__ */ new Date();
    today.setDate(today.getDate() - 7);
    for (let i = 0; i < 7; i++) {
      today.setDate(today.getDate() + 1);
      const response = await fetch(`${bolApiUrl}/orders?fulfilment-method=ALL&status=ALL&latest-change-date=${dateString(today)}&page=1`, {
        method: "GET",
        headers: bolHeaders("json", bolClientID)
      });
      if (!response.ok) {
        console.error(await response.text());
      } else {
        const answer = await response.json();
        orders = orders.concat(answer.orders);
      }
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
    return orders;
  } catch (error) {
    console.error(error);
    return null;
  }
}
async function getBolComOrder(orderId, bolClientID, bolClientSecret) {
  await authenticateBolCom(bolClientID, bolClientSecret);
  try {
    const response = await fetch(`${bolApiUrl}/orders/${orderId}`, {
      method: "GET",
      headers: bolHeaders("json", bolClientID)
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
var saveDocument = async (bolDoc, company, context) => {
  try {
    const existingDoc = await context.sudo().query.Document.findMany({
      query: "references id",
      where: {
        company: {
          id: {
            equals: company.id
          }
        },
        references: {
          equals: bolDoc.orderId
        }
      }
    });
    if (existingDoc.length > 0) {
      return;
    }
    let docAddress = null;
    let delAddress = null;
    const transformEmail = (email) => {
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
            equals: company.id
          }
        },
        role: {
          equals: "customer"
        },
        email: {
          equals: transformEmail(bolDoc.billingDetails.email)
        }
      }
    });
    console.log(existingCustomer);
    let user;
    if (existingCustomer.length > 0) {
      user = existingCustomer.at(0);
      if (user.customerAddresses && user.customerAddresses.length > 0) {
        for (let i = 0; i < user.customerAddresses.length; i++) {
          if (user.customerAddresses[i].street === bolDoc.shipmentDetails.streetName && user.customerAddresses[i].door === bolDoc.shipmentDetails.houseNumber && user.customerAddresses[i].zip === bolDoc.shipmentDetails.zipCode && user.customerAddresses[i].city === bolDoc.shipmentDetails.city && user.customerAddresses[i].country === bolDoc.shipmentDetails.countryCode) {
            delAddress = user.customerAddresses[i];
          }
          if (user.customerAddresses[i].street === bolDoc.billingDetails.streetName && user.customerAddresses[i].door === bolDoc.billingDetails.houseNumber && user.customerAddresses[i].zip === bolDoc.billingDetails.zipCode && user.customerAddresses[i].city === bolDoc.billingDetails.city && user.customerAddresses[i].country === bolDoc.billingDetails.countryCode) {
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
              id: company.id
            }
          }
        }
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
              id: company.id
            }
          },
          customer: {
            connect: {
              id: user.id
            }
          }
        }
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
                id: company.id
              }
            },
            customer: {
              connect: {
                id: user.id
              }
            }
          }
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
              id: user.id
            }
          },
          company: {
            connect: {
              id: company.id
            }
          }
        }
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
              id: user.id
            }
          },
          company: {
            connect: {
              id: company.id
            }
          }
        }
      });
    }
    const document = await context.sudo().query.Document.createOne({
      data: {
        number: bolDoc.orderId,
        date: bolDoc.orderPlacedDateTime,
        customer: {
          connect: {
            id: user.id
          }
        },
        company: {
          connect: {
            id: company.id
          }
        },
        references: bolDoc.orderId,
        delAddress: {
          connect: {
            id: delAddress.id
          }
        },
        docAddress: {
          connect: {
            id: docAddress.id
          }
        },
        creator: {
          connect: {
            id: company.owner.id
          }
        },
        establishment: {
          connect: {
            id: company.establishments.at(0).id
          }
        },
        type: "invoice"
      }
    });
    for (let i = 0; i < bolDoc.orderItems.length; i++) {
      const products = await context.sudo().query.Material.findMany({
        query: "ean id",
        where: {
          ean: {
            equals: bolDoc.orderItems[i].product.ean
          },
          company: {
            id: {
              equals: company.id
            }
          }
        }
      });
      await context.sudo().query.DocumentProduct.createOne({
        data: {
          price: bolDoc.orderItems[i].unitPrice.toFixed(4),
          company: {
            connect: {
              id: company.id
            }
          },
          document: {
            connect: {
              id: document.id
            }
          },
          product: products && products.length > 0 ? {
            connect: {
              id: products[0].id
            }
          } : null,
          amount: bolDoc.orderItems[i].quantity.toFixed(4),
          tax: eutaxes.find((t) => t.code == docAddress.country)?.standard.toFixed(4) ?? "21.0000",
          name: products && products.length > 0 ? products[0].name : bolDoc.orderItems[i].product.title
        }
      });
    }
    await context.sudo().query.Payment.createOne({
      data: {
        value: bolDoc.orderItems.reduce((acc, dp) => acc + dp.unitPrice, 0).toFixed(4),
        type: "online",
        isVerified: true,
        document: {
          connect: {
            id: document.id
          }
        },
        timestamp: bolDoc.orderPlacedDateTime,
        company: {
          connect: {
            id: company.id
          }
        },
        creator: {
          connect: {
            id: company.owner.id
          }
        }
      }
    });
    try {
      const customer = user;
      sendMail({
        recipient: "contact@huseyinonal.com",
        subject: `Bestelling ${document.prefix ?? ""}${document.number}`,
        company,
        attachments: [await generateInvoiceOut({ document })],
        html: `<p>Beste ${customer.firstName + " " + customer.lastName},</p><p>In bijlage vindt u het factuur voor uw laatste bestelling bij ons.</p><p>Met vriendelijke groeten.</p><p>${company.name}</p>`
      });
    } catch (error) {
    }
  } catch (error) {
    console.error(error);
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
      port: 3344,
      cors: {
        origin: [
          "http://localhost:8081",
          "http://localhost:3000",
          "http://localhost:5173",
          "https://serce.mdi-muhasebe.com",
          "https://serceapi.mdi-muhasebe.com"
        ],
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
        createDocumentsFromBolOrders(context);
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
