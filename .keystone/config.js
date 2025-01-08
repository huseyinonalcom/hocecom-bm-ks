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
  sessionData: "id role permissions isBlocked company { id } accountancy { id }",
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
var import_types = require("@keystone-6/core/types");

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
  if (session2.data.role == "global_admin" || isSuperAdmin({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isAdminAccountantOwner = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "admin_accountant" || isGlobalAdmin({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isAdminAccountantManager = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "admin_accountant_manager" || isAdminAccountantOwner({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isOwner = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "owner" || isAdminAccountantManager({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isCompanyAdmin = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "company_admin" || isOwner({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isAdminAccountantEmployee = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "admin_accountant_employee" || isAdminAccountantManager({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isGeneralManager = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "general_manager" || isCompanyAdmin({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isManager = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "manager" || isGeneralManager({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isAccountant = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "accountant" || isManager({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isAdminAccountantIntern = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "admin_accountant_intern" || isAdminAccountantEmployee({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isEmployee = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "employee" || isAccountant({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isIntern = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "intern" || isEmployee({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isWorker = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "worker" || isIntern({ session: session2 })) return !session2.data.isBlocked;
  return false;
};
var isUser = ({ session: session2 }) => {
  if (!session2) return false;
  if (session2.data.role == "customer" || isWorker({ session: session2 })) return !session2.data.isBlocked;
  return false;
};

// schema.ts
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create" || operation === "update") {
            const pin = resolvedData.pincode;
            const pinCheck = await context.sudo().query.Company.findOne({
              where: {
                pincode: String(pin)
              },
              query: "id"
            });
            if (pinCheck) {
              throw new Error("Pincode already in use");
            }
          }
        } catch (error) {
          console.error("Pin check error:", error);
        }
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
      beforeOperation: async ({ operation, item, inputData, resolvedData, context }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
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
  Company: (0, import_core.list)({
    access: {
      operation: {
        create: isAdminAccountantManager,
        query: isWorker,
        update: isCompanyAdmin,
        delete: import_access.denyAll
      }
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create" || operation === "update") {
            const pin = resolvedData.pincode;
            const pinCheck = await context.sudo().query.Accountancy.findOne({
              where: {
                pincode: String(pin)
              },
              query: "id"
            });
            if (pinCheck) {
              throw new Error("Pincode already in use");
            }
          }
        } catch (error) {
          console.error("Pin check error:", error);
        }
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
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
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
            if (inputData.number) {
              return;
            } else {
              const docs = await context.query.Document.findMany({
                orderBy: { number: "desc" },
                where: {
                  type: { equals: inputData.type },
                  company: { id: { equals: resolvedData.company.connect.id } },
                  establishment: { id: { equals: resolvedData.establishment.connect.id } }
                },
                query: "id number"
              });
              const lastDocument = docs.at(0);
              let year = (/* @__PURE__ */ new Date()).getFullYear();
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
                  resolvedData.number = `${year}-${1 .toFixed(0).padStart(7, "0")}`;
                }
              } else {
                resolvedData.number = `${year}-${1 .toFixed(0).padStart(7, "0")}`;
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
      origin: (0, import_fields.text)(),
      externalId: (0, import_fields.text)(),
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
      number: (0, import_fields.text)(),
      value: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount tax"
              });
              let total = 0;
              materials.forEach((docProd) => {
                total += calculateTotalWithTaxBeforeReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
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
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
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
                total += Number(payment.value);
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
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded
                });
              });
              const payments = await context.query.Payment.findMany({
                where: { document: { some: { id: { equals: item.id } } }, isDeleted: { equals: false } },
                query: "value"
              });
              let totalPaid = 0;
              payments.forEach((payment) => {
                totalPaid += Number(payment.value);
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
      totalTax: (0, import_fields.virtual)({
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
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded
                });
                totalValue -= calculateTotalWithoutTaxAfterReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded
                });
              });
              return new import_types.Decimal(totalValue);
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
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
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
      stockMovement: (0, import_fields.relationship)({
        ref: "StockMovement.documentProduct",
        many: false
      }),
      product: (0, import_fields.relationship)({
        ref: "Material.documentProducts",
        many: false
      }),
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      description: (0, import_fields.text)(),
      tax: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      price: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      pricedBy: (0, import_fields.select)({
        type: "string",
        options: ["amount", "volume", "length", "weight", "area"],
        defaultValue: "amount"
      }),
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
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
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
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  reduction: Number(item.reduction) ?? 0,
                  taxIncluded
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
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
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
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  reduction: Number(item.reduction) ?? 0,
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
                calculateTotalWithTaxAfterReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  reduction: Number(item.reduction) ?? 0,
                  taxIncluded
                }) - calculateTotalWithoutTaxAfterReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  reduction: Number(item.reduction) ?? 0,
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
                calculateTotalWithTaxBeforeReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  taxIncluded
                }) - calculateTotalWithTaxAfterReduction({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  tax: Number(item.tax),
                  reduction: Number(item.reduction) ?? 0,
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      defaultCurrency: (0, import_fields.select)({
        type: "string",
        options: ["TRY", "USD", "EUR"],
        defaultValue: "EUR"
      }),
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
      shelves: (0, import_fields.relationship)({ ref: "Shelf.establishment", many: true }),
      users: (0, import_fields.relationship)({ ref: "User.establishment", many: true }),
      address: (0, import_fields.relationship)({ ref: "Address", many: false }),
      documents: (0, import_fields.relationship)({ ref: "Document.establishment", many: true }),
      company: (0, import_fields.relationship)({ ref: "Company.establishments", many: false }),
      featureFlags: (0, import_fields.json)({
        defaultValue: {
          documents: true,
          stock: true,
          drive: true
        }
      }),
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      url: (0, import_fields.text)(),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)({
        defaultValue: {
          isCover: false,
          order: 1
        }
      })
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      nameLocalized: (0, import_fields.json)({
        defaultValue: {
          en: "",
          nl: "",
          fr: "",
          de: ""
        }
      }),
      components: (0, import_fields.relationship)({
        ref: "AssemblyComponent.assembly",
        many: true
      }),
      assemblyComponents: (0, import_fields.relationship)({
        ref: "AssemblyComponent.material",
        many: true
      }),
      description: (0, import_fields.text)(),
      descriptionLocalized: (0, import_fields.json)({
        defaultValue: {
          en: "",
          nl: "",
          fr: "",
          de: ""
        }
      }),
      price: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      currentStock: (0, import_fields.decimal)({ defaultValue: "0" }),
      length: (0, import_fields.decimal)({}),
      width: (0, import_fields.decimal)({}),
      height: (0, import_fields.decimal)({}),
      weight: (0, import_fields.decimal)({}),
      area: (0, import_fields.decimal)({}),
      status: (0, import_fields.select)({
        type: "string",
        options: ["active", "passive", "cancelled"],
        defaultValue: "passive"
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
      suppliers: (0, import_fields.relationship)({
        ref: "Supplier.materials",
        many: true
      }),
      pricedBy: (0, import_fields.select)({
        type: "string",
        options: ["amount", "volume", "length", "weight", "area"],
        defaultValue: "amount"
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
      stock: (0, import_fields.relationship)({
        ref: "ShelfStock.material",
        many: true
      }),
      earliestExpiration: (0, import_fields.timestamp)(),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      tags: (0, import_fields.relationship)({ ref: "Tag.materials", many: true }),
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
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
  Shelf: (0, import_core.list)({
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      }
    },
    fields: {
      x: (0, import_fields.text)(),
      y: (0, import_fields.text)(),
      z: (0, import_fields.text)(),
      contents: (0, import_fields.relationship)({
        ref: "ShelfStock.shelf",
        many: true
      }),
      establishment: (0, import_fields.relationship)({
        ref: "Establishment.shelves",
        many: false
      }),
      stockMovements: (0, import_fields.relationship)({
        ref: "StockMovement.shelf",
        many: true
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  ShelfStock: (0, import_core.list)({
    access: {
      filter: {
        query: companyFilter,
        update: companyFilter,
        delete: companyFilter
      },
      operation: {
        create: isWorker,
        query: isIntern,
        update: isWorker,
        delete: isWorker
      }
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
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
                    equals: item.materialId
                  }
                }
              },
              query: "id currentStock expiration material { id }"
            });
            let newMaterialStock = new import_types.Decimal("0.00");
            let newExpiration = null;
            if (relatedShelfStocks.length > 0) {
              relatedShelfStocks.forEach((s) => {
                newMaterialStock = import_types.Decimal.add(newMaterialStock, s.currentStock);
              });
              newExpiration = relatedShelfStocks.filter((st) => st.expiration).toSorted((a, b) => new Date(a.expiration).getTime() - new Date(b.expiration).getTime())?.[0]?.expiration ?? null;
            } else {
              newMaterialStock = new import_types.Decimal("0.00");
              newExpiration = null;
            }
            await context.query.Material.updateOne({
              where: { id: item.materialId },
              data: { currentStock: newMaterialStock, earliestExpiration: newExpiration }
            });
          }
        } catch (error) {
          console.error(error);
        }
      }
    },
    fields: {
      shelf: (0, import_fields.relationship)({
        ref: "Shelf.contents",
        many: false
      }),
      material: (0, import_fields.relationship)({
        ref: "Material.stock",
        many: false
      }),
      stockMovements: (0, import_fields.relationship)({
        ref: "StockMovement.shelfStock",
        many: true
      }),
      expiration: (0, import_fields.timestamp)(),
      currentStock: (0, import_fields.decimal)(),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } })
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
      version: (0, import_fields.integer)({ validation: { isRequired: true }, defaultValue: 1 }),
      mobileVersion: (0, import_fields.integer)({ validation: { isRequired: true }, defaultValue: 1 }),
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
        update: isEmployee,
        delete: isSuperAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      },
      afterOperation: async ({ operation, context, item }) => {
      }
    },
    fields: {
      material: (0, import_fields.relationship)({
        ref: "Material.stockMovements",
        many: false
      }),
      amount: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      movementType: (0, import_fields.select)({
        type: "string",
        options: ["in", "out"],
        defaultValue: "in",
        validation: { isRequired: true }
      }),
      shelfStock: (0, import_fields.relationship)({
        ref: "ShelfStock.stockMovements",
        many: false
      }),
      expiration: (0, import_fields.timestamp)(),
      documentProduct: (0, import_fields.relationship)({
        ref: "DocumentProduct.stockMovement",
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
      shelf: (0, import_fields.relationship)({
        ref: "Shelf.stockMovements",
        many: false
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      materials: (0, import_fields.relationship)({ ref: "Material.suppliers", many: true }),
      documents: (0, import_fields.relationship)({ ref: "Document.supplier", many: true }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      address: (0, import_fields.relationship)({ ref: "Address", many: false }),
      taxId: (0, import_fields.text)(),
      contactMail: (0, import_fields.text)(),
      orderMail: (0, import_fields.text)(),
      phone: (0, import_fields.text)(),
      orderTime: (0, import_fields.integer)(),
      extraFields: (0, import_fields.json)()
    }
  }),
  Tag: (0, import_core.list)({
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
        delete: isManager
      }
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      nameLocalized: (0, import_fields.json)({
        defaultValue: {
          en: "",
          nl: "",
          fr: "",
          de: ""
        }
      }),
      description: (0, import_fields.text)(),
      descriptionLocalized: (0, import_fields.json)({
        defaultValue: {
          en: "",
          nl: "",
          fr: "",
          de: ""
        }
      }),
      materials: (0, import_fields.relationship)({ ref: "Material.tags", many: true }),
      parentTag: (0, import_fields.relationship)({
        ref: "Tag.childTags",
        many: false
      }),
      childTags: (0, import_fields.relationship)({
        ref: "Tag.parentTag",
        many: true
      }),
      type: (0, import_fields.select)({
        type: "string",
        options: ["collection", "category", "brand"],
        defaultValue: "category",
        validation: { isRequired: true }
      }),
      image: (0, import_fields.relationship)({
        ref: "File",
        many: false
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
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
        if (isSuperAdmin({ session: context.session })) {
          console.info("operation on user by superadmin");
        } else if (!isAdminAccountantManager({ session: context.session })) {
          try {
            if (operation === "create" || operation == "update") {
              resolvedData.company = {
                connect: {
                  id: context.session.data.company.id
                }
              };
            }
          } catch (error) {
            console.error("Company hook error");
          }
        } else {
          try {
            if (operation === "create" || operation == "update") {
              resolvedData.accountancy = {
                connect: {
                  id: context.session.data.accountancy.id
                }
              };
            }
          } catch (error) {
            console.error("Accountancy hook error");
          }
        }
        try {
          if (operation === "create" || operation === "update") {
            if (!resolvedData.company) {
              if (!resolvedData.accountancy) {
                throw new Error("Company or Accountancy is required");
              }
            }
            let mail = inputData.email;
            let mailPart12 = mail.split("@").at(0);
            let mailPart22 = mail.split("@").at(-1);
            let idPart;
            if (resolvedData.company) {
              idPart = resolvedData.company.connect.id;
            } else {
              idPart = resolvedData.accountancy.connect.id;
            }
            resolvedData.email = mailPart12 + "+" + idPart + "@" + mailPart22;
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
      email2: (0, import_fields.text)(),
      isBlocked: (0, import_fields.checkbox)({ defaultValue: false }),
      phone: (0, import_fields.text)(),
      role: (0, import_fields.select)({
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
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
            };
          }
        } catch (error) {
          console.error("Company hook error");
        }
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
      datePlanned: (0, import_fields.timestamp)(),
      dateStarted: (0, import_fields.timestamp)(),
      dateFinished: (0, import_fields.timestamp)(),
      number: (0, import_fields.text)({ validation: { isRequired: true } }),
      materials: (0, import_fields.relationship)({
        ref: "Material.workOrders",
        many: true
      }),
      operations: (0, import_fields.relationship)({
        ref: "WorkOrderOperation.workOrder",
        many: true
      }),
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
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        try {
          if (operation === "create") {
            resolvedData.company = {
              connect: {
                id: context.session.data.company.id
              }
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
              let total = Number(item.value);
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
              let total = Number(item.value) * Number(item.amount) - Number(item.value) * Number(item.amount) * (Number(item.reduction) ?? 0) / 100;
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
  const documentProducts = invoiceDoc.products;
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
            formatCurrency(Number(item.price).toFixed(2)),
            item.amount,
            formatCurrency(Number(item.totalTax).toFixed(2)),
            formatCurrency(Number(item.totalWithTaxAfterReduction).toFixed(2))
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
          doc2.text(dateFormatBe(payment.timestamp), x + 10, y2 + 20 * (i + 1));
          doc2.text(payment.type, x + 85, y2 + 20 * (i + 1));
          doc2.text(formatCurrency(Number(payment.value).toFixed(2)), x + 150, y2 + 20 * (i + 1), {
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
        doc2.text(formatCurrency(documentProducts2.reduce((acc, dp) => acc + Number(dp.totalTax), 0)), x + 80, y2 + 50);
        taxRates.map((taxRate, index) => {
          doc2.text("Total Tax " + taxRate + "%:", x, y2 + 50 + (index + 1) * 15).text(
            formatCurrency(documentProducts2.filter((dp) => dp.tax === taxRate).reduce((acc, dp) => acc + Number(dp.totalTax), 0)),
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
      doc.text(formatCurrency(documentProducts.reduce((acc, docProd) => acc + Number(docProd.totalWithoutTaxAfterReduction), 0)), totalsX + 70, y + 50);
      doc.text("Total:", totalsX, y + 65);
      let total = documentProducts.reduce((acc, docProd) => acc + Number(docProd.totalWithTaxAfterReduction), 0);
      doc.text(formatCurrency(total), totalsX + 70, y + 65);
      doc.text("Already Paid:", totalsX, y + 80);
      let totalPaid = payments.filter((payment) => payment.isVerified && !payment.isDeleted).reduce((acc, payment) => acc + Number(payment.value), 0);
      doc.text(formatCurrency(totalPaid), totalsX + 70, y + 80);
      doc.text("To Pay:", totalsX, y + 95);
      doc.text(formatCurrency(total - totalPaid), totalsX + 70, y + 95);
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
  establishment,
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
        img64: establishment.logo.url
      })
    };
    transporter.sendMail(mailOptionsClient, (error) => {
      if (error) {
        console.log("mail error", error);
        return true;
      } else {
        console.log("mail sent");
        return false;
      }
    });
  } catch (e) {
    console.log("mail error", e);
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

// utils/utils.ts
var transformEmail = ({ email, companyId }) => {
  let parts = email.split("@");
  let localPart = parts[0].split("+")[0];
  let domainPart = parts[1];
  return localPart + "+" + companyId + "@" + domainPart;
};

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
var syncBolOrders = async ({ context }) => {
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
              bolClientSecret: currCompany.bolClientSecret
            });
            await saveDocument({ bolDoc: orderDetails, company: currCompany, context });
            await new Promise((resolve) => setTimeout(resolve, 1e3));
          }
        } catch (error) {
          console.error(error);
        }
      }
    }
  }
};
var findCompaniesToSync = async ({ context }) => {
  return await context.sudo().query.Company.findMany({
    query: "id bolClientID bolClientSecret emailHost emailPort emailUser emailPassword name owner { id } establishments { id }",
    where: {
      isActive: {
        equals: true
      },
      bolClientID: {
        not: {
          equals: ""
        }
      },
      bolClientSecret: {
        not: {
          equals: ""
        }
      }
    }
  });
};
async function getBolComOrders(bolClientID, bolClientSecret) {
  await authenticateBolCom(bolClientID, bolClientSecret);
  let orders = [];
  const dateString = (date) => date.toISOString().split("T")[0];
  try {
    for (let i = 0; i < 3; i++) {
      const date = /* @__PURE__ */ new Date();
      date.setDate(date.getDate() - i);
      const response = await fetch(`${bolApiUrl}/orders?fulfilment-method=ALL&status=ALL&latest-change-date=${dateString(date)}&page=1`, {
        method: "GET",
        headers: bolHeaders("json", bolClientID)
      });
      if (!response.ok) {
        console.error(await response.text());
      } else {
        const answer = await response.json();
        if (answer.orders) {
          orders = orders.concat(answer.orders);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
  } catch (error) {
    console.error(error);
  }
  const sortedOrders = orders.sort((a, b) => new Date(a.orderPlacedDateTime).getTime() - new Date(b.orderPlacedDateTime).getTime());
  return sortedOrders;
}
async function checkIfOrderExists({ orderId, company, context }) {
  const existingDoc = await context.sudo().query.Document.findMany({
    query: "id",
    where: {
      company: {
        id: {
          equals: company.id
        }
      },
      externalId: {
        equals: orderId
      }
    }
  });
  if (existingDoc.length > 0) {
    return true;
  }
  return false;
}
async function getBolComOrder({ orderId, bolClientID, bolClientSecret }) {
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
async function findProduct({ ean, company, context }) {
  let products = await context.sudo().query.Material.findMany({
    query: "ean id name tax price",
    where: {
      ean: {
        equals: ean
      },
      company: {
        id: {
          equals: company.id
        }
      }
    }
  });
  if (products.length > 0) {
    return products.at(0);
  } else {
    return null;
  }
}
async function createProduct({ productDetails, company, context }) {
  let product = {
    ean: productDetails.product.ean,
    name: productDetails.product.title,
    tax: "21.0000",
    price: productDetails.unitPrice.toFixed(4),
    company: {
      connect: {
        id: company.id
      }
    }
  };
  const newProduct = await context.sudo().query.Material.createOne({
    data: product,
    query: "id ean name tax price"
  });
  return newProduct;
}
var saveDocument = async ({ bolDoc, company, context }) => {
  let document = {
    externalId: bolDoc.orderId,
    date: bolDoc.orderPlacedDateTime,
    company: {
      connect: {
        id: company.id
      }
    },
    origin: "BOL.COM",
    products: {
      create: []
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
    payments: {
      create: [
        {
          value: bolDoc.orderItems.reduce((acc, dp) => acc + dp.unitPrice, 0).toFixed(4),
          type: "online",
          isVerified: true,
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
      ]
    },
    type: "invoice"
  };
  try {
    let customer = await getCustomer({ email: bolDoc.billingDetails.email, company, context });
    if (!customer) {
      customer = await createCustomer({ orderDetails: bolDoc, company, context });
    }
    document.customer = {
      connect: {
        id: customer.id
      }
    };
    let docAddress = customer.customerAddresses.find(
      (address) => address.street.toLowerCase() == bolDoc.billingDetails.streetName.toLowerCase() && address.door.toLowerCase() == bolDoc.billingDetails.houseNumber.toLowerCase() + (bolDoc.billingDetails.houseNumberExtension ?? "").toLowerCase() && address.zip.toLowerCase() == bolDoc.billingDetails.zipCode.toLowerCase() && address.city.toLowerCase() == bolDoc.billingDetails.city.toLowerCase() && address.country.toLowerCase() == bolDoc.billingDetails.countryCode.toLowerCase()
    );
    document.docAddress = {
      connect: {
        id: docAddress.id
      }
    };
    let delAddress = customer.customerAddresses.find(
      (address) => address.street.toLowerCase() == bolDoc.shipmentDetails.streetName.toLowerCase() && address.door.toLowerCase().includes(bolDoc.shipmentDetails.houseNumber.toLowerCase()) && address.zip.toLowerCase() == bolDoc.shipmentDetails.zipCode.toLowerCase() && address.city.toLowerCase() == bolDoc.shipmentDetails.city.toLowerCase() && address.country.toLowerCase() == bolDoc.shipmentDetails.countryCode.toLowerCase()
    );
    document.delAddress = {
      connect: {
        id: delAddress.id
      }
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
            id: company.id
          }
        },
        product: {
          connect: {
            id: product.id
          }
        },
        amount: orderProduct.quantity.toFixed(4),
        tax: eutaxes.find((t) => t.code == docAddress.country)?.standard.toFixed(4) ?? "21.0000",
        name: product.name
      });
    }
    const postedDocument = await context.sudo().query.Document.createOne({
      data: document,
      query: "number date deliveryDate type payments { value timestamp type } products { name description price amount totalTax totalWithTaxAfterReduction tax } delAddress { street door zip city country } docAddress { street door zip city country } customer { email firstName lastName phone customerCompany customerTaxNumber } establishment { name bankAccount1 bankAccount2 bankAccount3 taxID phone phone2 address { street door zip city country } logo { url } }"
    });
    try {
      sendMail({
        establishment: postedDocument.establishment,
        recipient: "test@huseyinonal.com",
        subject: `Bestelling ${postedDocument.prefix ?? ""}${postedDocument.number}`,
        company,
        attachments: [await generateInvoiceOut({ document: postedDocument })],
        html: `<p>Beste ${postedDocument.customer.firstName + " " + postedDocument.customer.lastName},</p><p>In bijlage vindt u het factuur voor uw recentste bestelling bij ons.</p><p>Met vriendelijke groeten.</p><p>${postedDocument.establishment.name}</p>`
      });
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    console.error(error);
  }
};
var getCustomer = async ({ email, company, context }) => {
  try {
    const existingCustomer = await context.sudo().query.User.findMany({
      query: "id email customerAddresses { id street door zip city country } firstName lastName",
      where: {
        role: {
          equals: "customer"
        },
        email: {
          equals: transformEmail({
            email,
            companyId: company.id
          })
        }
      }
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
var compareAddresses = ({ docAddress, delAddress }) => {
  if (docAddress.streetName.toLowerCase() === delAddress.streetName.toLowerCase() && docAddress.houseNumber.toLowerCase() === delAddress.houseNumber.toLowerCase() && docAddress.zipCode.toLowerCase() === delAddress.zipCode.toLowerCase() && docAddress.city.toLowerCase() === delAddress.city.toLowerCase() && docAddress.countryCode.toLowerCase() === delAddress.countryCode.toLowerCase()) {
    return true;
  } else {
    return false;
  }
};
var createCustomer = async ({ orderDetails, company, context }) => {
  let customer = {
    email: orderDetails.billingDetails.email,
    firstName: orderDetails.billingDetails.firstName,
    lastName: orderDetails.billingDetails.surname,
    name: orderDetails.billingDetails.firstName + " " + orderDetails.billingDetails.surname,
    password: generateRandomString(24),
    role: "customer",
    company: {
      connect: {
        id: company.id
      }
    }
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
            id: company.id
          }
        }
      }
    ]
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
          id: company.id
        }
      }
    });
  }
  try {
    const newUser = await context.sudo().query.User.createOne({
      data: customer,
      query: "id customerAddresses { id street door zip city country } firstName lastName email"
    });
    return newUser;
  } catch (error) {
    console.error(error);
    return null;
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
        origin: ["https://dfatest.huseyinonal.com", "https://huseyinonal.com", "http://localhost:3399", "http://localhost:3400", "https://acc.digitalforge.be"],
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
          const keystoneContext = await context.withRequest(req, res);
          try {
            if (!req.file) {
              return res.status(400).json({ message: "No valid file provided" });
            }
            const result = await fileUpload(req.file);
            const file = await context.sudo().query.File.createOne({
              query: "id",
              data: {
                name: result.fileName,
                url: result.fileUrl,
                company: {
                  connect: {
                    id: keystoneContext.session.data.company.id
                  }
                }
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
              const pinCheckAccountancy = await context.sudo().query.Accountancy.findOne({
                where: {
                  pincode: String(pin)
                },
                query: "id"
              });
              if (pinCheckAccountancy) {
                res.status(200).json({ id: pinCheckAccountancy.id });
              }
              res.status(404).json({ message: "Bad pin" });
            }
          } catch (error) {
            console.error("Pin check error:", error);
            res.status(500).json({ error: "Pin check failed" });
            return;
          }
        });
        cron.schedule("*/5 * * * *", async () => {
          try {
            console.log("Running Cron Job for Bol Orders");
            syncBolOrders({ context });
          } catch (error) {
            console.error("Error running cron job", error);
          }
        });
        try {
          console.log("Running Cron Job for Bol Orders");
          syncBolOrders({ context });
        } catch (error) {
          console.error("Error running cron job", error);
        }
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
