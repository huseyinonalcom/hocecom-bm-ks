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

// lib/calculations/dates/getStartAndEnd.ts
function getMondayAndSundayTwoWeeksAgo() {
  const today = /* @__PURE__ */ new Date();
  const dayOfWeek = today.getDay();
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - (dayOfWeek + 6) % 7);
  const mondayTwoWeeksAgo = new Date(mondayThisWeek);
  mondayTwoWeeksAgo.setDate(mondayTwoWeeksAgo.getDate() - 7);
  const sundayTwoWeeksAgo = new Date(mondayTwoWeeksAgo);
  sundayTwoWeeksAgo.setDate(mondayTwoWeeksAgo.getDate() + 6);
  return { monday: mondayTwoWeeksAgo, sunday: sundayTwoWeeksAgo };
}

// lib/fetch/documents.ts
var fetchDocumentQuery = "id date type total number origin externalId prefix currency comments totalPaid totalTax references totalToPay value externalId origin taxIncluded deliveryDate files { id name url } creator { id email role firstName lastName name } customer { id email role customerCompany preferredLanguage customerTaxNumber firstName lastName name customerAddresses { id street door zip city floor province country } } delAddress { id street door zip city floor province country } docAddress { id street door zip city floor province country } payments { id value isDeleted isVerified reference type timestamp creator { id email role firstName lastName name } } supplier { id name taxId contactMail address { id street door zip city floor province country } } fromDocument { id type number creator { id email role firstName lastName name } } toDocument { id type number creator { id email role firstName lastName name } } products { id amount name tax price pricedBy description reduction totalWithTaxAfterReduction totalTax totalReduction product { id name tax price pricedBy } } establishment { id name phone phone2 taxID bankAccount1 bankAccount2 defaultCurrency bankAccount3 address { id street door zip city floor province country } logo { id url } company { owner { email } } }";
async function fetchDocuments({
  companyID,
  docTypes,
  start,
  end,
  all,
  context
}) {
  let where = {
    company: {
      id: {
        equals: companyID
      }
    },
    isDeleted: {
      equals: false
    },
    type: {
      in: docTypes
    }
  };
  if (!all) {
    const { monday, sunday } = getMondayAndSundayTwoWeeksAgo();
    monday.setHours(0, 0, 0, 10);
    sunday.setHours(23, 59, 59, 500);
    where = {
      ...where,
      date: {
        gte: monday,
        lte: sunday
      }
    };
  }
  if (start && end) {
    where = {
      ...where,
      date: {
        gte: start,
        lte: end
      }
    };
  }
  let fetchedDocuments = [];
  let round = 0;
  let keepGoing = true;
  const fetchedDocumentsPer = 20;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  while (keepGoing) {
    await sleep(3e3);
    try {
      let documents = await context.sudo().query.Document.findMany({
        orderBy: [{ date: "asc" }],
        take: fetchedDocumentsPer,
        skip: round * fetchedDocumentsPer,
        query: fetchDocumentQuery,
        where
      });
      fetchedDocuments = fetchedDocuments.concat(documents);
      keepGoing = documents.length > 0;
      round++;
      console.log(`Fetched documents (round: ${round}): `, documents.length);
    } catch (error) {
      console.error("Error fetching documents: ", error);
      keepGoing = false;
    }
  }
  return Array.from(fetchedDocuments);
}
async function fetchDocumentByID({ documentID, context, sudo = false }) {
  let fetchedDocument;
  try {
    if (sudo) {
      fetchedDocument = await context.sudo().query.Document.findOne({
        query: fetchDocumentQuery,
        where: {
          id: documentID
        }
      });
    } else {
      fetchedDocument = await context.query.Document.findOne({
        query: fetchDocumentQuery,
        where: {
          id: documentID
        }
      });
    }
  } catch (e) {
    console.error(e);
  }
  return fetchedDocument;
}

// lib/fetch/company.ts
async function fetchCompany(companyID, context) {
  let company;
  await context.sudo().query.Company.findOne({
    query: "id name einvoiceEmailIncoming einvoiceEmailOutgoing logo { url } emailHost emailPort emailUser emailPassword",
    where: { id: companyID }
  }).then((res) => {
    company = res;
  });
  return company;
}

// lib/automation/documents/bulkdocumentsenderstart.ts
var import_worker_threads = require("worker_threads");
var import_path = __toESM(require("path"));
var bulkSendDocuments = async ({ docTypes, context }) => {
  try {
    let companiesWithMonthlyReportsActive = await context.sudo().query.Company.findMany({
      where: {
        monthlyReports: {
          equals: true
        }
      }
    });
    let dateToSend = /* @__PURE__ */ new Date();
    dateToSend.setDate(-1);
    for (let company of companiesWithMonthlyReportsActive) {
      startBulkDocumentSenderWorker({ companyID: company.id, docTypes, context, month: dateToSend.getMonth() + 1, year: dateToSend.getFullYear() });
    }
  } catch (error) {
    console.error("Error occurred while starting bulkdocumentsender with params: ", docTypes, "error: ", error);
  }
};
async function startBulkDocumentSenderWorker({ companyID, docTypes, month, year, context }) {
  const documents = await fetchDocuments({
    companyID,
    docTypes,
    month,
    year,
    context
  });
  if (documents.length === 0) {
    console.info("No documents found for companyID: ", companyID, "docTypes: ", docTypes, "month: ", month, "year: ", year);
    return;
  }
  const company = await fetchCompany(companyID, context);
  const workerData = { documents, company };
  new import_worker_threads.Worker(import_path.default.resolve("./lib/automation/documents/bulkdocumentsenderworker.ts"), {
    execArgv: ["-r", "ts-node/register"],
    workerData
  });
}

// lib/pdf/common/positioning.ts
var pageSizesDimensions = {
  A4: {
    width: 595,
    height: 842
  }
};
var flexBox = ({
  pageSize,
  originY,
  flex,
  column,
  columnCount
}) => {
  const pageWidth = pageSizesDimensions[pageSize].width;
  if (column < 1 || column > columnCount) {
    throw new Error("Invalid column index.");
  }
  if (flex <= 0 || columnCount <= 0) {
    throw new Error("Flex and column count must be positive numbers.");
  }
  const columnWidth = pageWidth / columnCount;
  const boxWidth = columnWidth * flex;
  if (boxWidth > pageWidth) {
    throw new Error("Box width exceeds page width.");
  }
  const x = (column - 1) * columnWidth;
  if (x + boxWidth > pageWidth) {
    throw new Error("Box exceeds page boundaries.");
  }
  return {
    x,
    y: originY,
    width: boxWidth
  };
};

// lib/formatters/formatcurrency.ts
var formatCurrency = (value, currency) => {
  let lang;
  switch (currency) {
    case "TRY":
      lang = "tr-TR";
      break;
    case "USD":
      lang = "en-US";
      break;
    case "EUR":
      lang = "nl-BE";
      break;
  }
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency
  }).format(value);
};

// lib/localization/locales/en.ts
var enjson = {
  "invoice-details": "Invoice Details",
  "purchase-details": "Purchase Details",
  "credit_note-details": "Credit Note Details",
  "debit_note-details": "Debit Note Details",
  "dispatch-details": "Dispatch Details",
  accountant: "Accountant",
  active: "Active",
  "add-product": "Add Product",
  "add-supplier": "Add Supplier",
  "additional-information": "Additional Information",
  "address-delivery": "Delivery Address",
  "address-invoice": "Invoice Address",
  address: "Address",
  adresses: "Addresses",
  "already-paid": "Already Paid",
  amount: "Amount",
  attention: "Attention",
  bank_transfer: "Bank Transfer",
  "block-self": "You cannot block yourself.",
  blocked: "Blocked",
  cancel: "Cancel",
  cancelled: "Cancelled",
  cash: "Cash",
  choose: "Choose",
  city: "City",
  "client-details": "Client Details",
  close: "Close",
  code: "Code",
  comments: "Comments",
  company_admin: "Admin",
  company: "Company",
  "confirm-exit-text": "Are you sure you want to exit the program?",
  "confirm-exit": "Exit Program",
  connect: "Sign In",
  contact: "Contact",
  continue: "Continue",
  "convert-to-delivery_note": "Convert to Delivery Note",
  "convert-to-invoice": "Convert to Invoice",
  "convert-to-order": "Convert to Order",
  "copy-material": "Copy Material",
  country: "Country",
  "create-invoice": "New Invoice",
  "create-order": "New Order",
  "create-quote": "New Quote",
  "create-stock-movement": "Create Stock Movement",
  creator: "Sales Person",
  credit_card: "Credit Card",
  credit_note_date: "Credit Note Date",
  credit_note_details: "Credit Note Details",
  credit_note: "Credit Note",
  "current-stock": "Current Stock",
  "customer-company": "Company",
  "customer-details": "Customer Details",
  "customer-tax-id": "VAT Number",
  customer: "Customer",
  customers: "Customers",
  dashboard: "Dashboard",
  date_credit_note: "Credit Note Date",
  date_delivery_note: "Delivery Note Date",
  date_invoice: "Invoice Date",
  date_order: "Order Date",
  date_quote: "Quote Date",
  date_sale: "Order Date",
  "date-dispatch": "Dispatch Date",
  "date-sale": "Sale Date",
  date: "Date",
  debit_card: "Debit Card",
  debit_note: "Debit Note",
  deliveries: "Deliveries",
  delivery_note_date: "Delivery Note Date",
  delivery_note_details: "Delivery Note Details",
  delivery_note: "Dispatch",
  "delivery-date": "Delivery Date",
  delivery: "Delivery",
  description: "Description",
  "details-customer": "Customer Details",
  "details-for-payment": "Payment Details",
  details: "Details",
  "dialog-warning": "Warning!",
  dispatch: "Dispatch",
  document: "Document",
  documents: "Documents",
  door: "Door",
  download_update: "Download Update",
  drop_files: "Drag or click to add files",
  ean: "EAN",
  "edit-customer": "Edit Customer",
  "edit-document": "Edit Document",
  email: "Email",
  employee: "Sales Person",
  end: "End",
  "enter-email": "Enter your email address",
  "error-creating-payment": "Error while saving payment",
  "error-updating-payment": "Error while updating payment",
  establishment: "Establishment",
  establishments: "Establishments",
  expiration: "Expiration Date",
  export: "Export",
  "field-required": "Required field",
  files: "Files",
  "fill-all-fields": "Fill in all fields!",
  filter: "Filter",
  financing_unverified: "Financing (Unverified)",
  financing: "Financing",
  "first-name": "First Name",
  firstname: "First Name",
  firstName: "First Name",
  floor: "Floor",
  "forgot-password": "I forgot my password.",
  general_manager: "General Manager",
  import: "Import",
  incoming: "Incoming",
  intern: "Intern",
  invoice_date: "Invoice Date",
  invoice_details: "Invoice Details",
  invoice: "Invoice",
  invoicing: "Invoicing",
  "last-name": "Last Name",
  lastname: "Last Name",
  lastName: "Last Name",
  "leave-empty": "Leave empty for automatic number",
  "list-customers": "Customer List",
  "list-documents": "Document List",
  "list-establishments": "Establishments List",
  "list-materials": "Materials List",
  "list-suppliers": "Suppliers List",
  login: "Login",
  "manager-notes": "Manager Notes",
  manager: "Manager",
  materials: "Materials",
  "modify-dispatch": "Modify Dispatch",
  "modify-invoice": "Modify Invoice",
  "modify-material": "Edit Material",
  "modify-quote": "Modify Quote",
  "modify-sale": "Modify Order",
  name: "Name",
  new_document_credit_note: "New Credit Note",
  new_document_delivery_note: "New Delivery Note",
  new_document_invoice: "New Invoice",
  new_document_order: "New Order",
  new_document_quote: "New Quote",
  "new-address": "New Address",
  "new-customer": "New Customer",
  "new-document": "New Document",
  "new-line": "New Line",
  "new-material": "New Material",
  "new-supplier": "New Supplier",
  "new-user": "New User",
  no: "No",
  online: "Online",
  order_date: "Order Date",
  order_details: "Order Details",
  order: "Order",
  outgoing: "Outgoing",
  owner: "Owner",
  page: "Page",
  paid: "Paid",
  passive: "Passive",
  password: "Password",
  "payment-details": "Payment Details",
  "payment-history": "Payment History",
  "payment-new": "New Payment",
  "payment-status": "Payment Status",
  payments: "Payments",
  "pdf-export": "PDF Export",
  PDF: "PDF",
  phone: "Phone",
  pincode: "PIN Code",
  "prefered-language": "Preferred Language",
  "price-net": "Net Price",
  price: "Price",
  "primary-details": "Primary Details",
  private: "Private",
  products: "Products",
  professionnal: "Professional",
  promissory: "Promissory",
  province: "Province",
  purchase: "Purchase",
  quote_date: "Quote Date",
  quote_details: "Quote Details",
  quote: "Quote",
  reduction: "Discount",
  reference: "Reference",
  references: "References",
  remove: "Remove",
  rename: "Rename",
  reset: "Reset",
  role: "Role",
  sale: "Order",
  save_credit_note: "Save Credit Note",
  save_CreditNote: "Save Credit Note",
  save_delivery_note: "Save Delivery Note",
  save_DeliveryNote: "Save Delivery Note",
  save_invoice: "Save Invoice",
  save_Invoice: "Save Invoice",
  save_order: "Save Order",
  save_Order: "Save Order",
  save_quote: "Save Quote",
  save_Quote: "Save Quote",
  "save-material": "Save Material",
  save: "Save",
  search: "Search",
  "secondary-details": "Additional Details",
  seller: "Sales Person",
  send: "Send password reset request",
  shelf: "Shelf",
  "signature-customer": "Customer Signature",
  "signature-delivery": "Sign here to confirm receipt of delivery",
  "signature-seller": "Seller Signature",
  start: "Start",
  "stock-movement-details": "Stock Movement Details",
  stock: "Stock",
  street: "Street",
  subtotal: "Subtotal",
  "supplier-details": "Supplier Details",
  supplier: "Supplier",
  suppliers: "Suppliers",
  "tax-in": "VAT Incl",
  "tax-out": "VAT Excl",
  tax: "VAT",
  "tax(%)": "VAT(%)",
  taxId: "VAT Number",
  taxID: "VAT Number",
  "timed-out": "You have been logged out due to inactivity. Please log in again.",
  "to-pay": "To Pay",
  "total-reduction": "Total Discount",
  "total-tax": "Total VAT",
  "total-to-pay": "Total to Pay",
  "total-value-excl-tax": "Total Excl. VAT",
  "total-value": "Total Value",
  total: "Total",
  type: "Type",
  unknown: "Other",
  "user-details": "User Details",
  "user-modify": "Modify User",
  user: "User",
  username: "Username",
  users: "Users",
  "valid-until": "Valid Until",
  value: "Value",
  warehouse: "Warehouse",
  worker: "Worker",
  yes: "Yes",
  z: "Z",
  zip: "Postal Code",
  "please-update": "Please update to continue.",
  "download-update": "Download Update",
  delete: "Delete",
  open: "Open",
  "choose-language": "Choose Language",
  "new-establishment": "New Establishment",
  "details-establishment": "Establishment Details",
  "modify-establishment": "Modify Establishment",
  "phone-1": "Phone",
  "phone-2": "Phone 2",
  "tax-id": "Tax ID",
  "bank-account-1": "Bank Account",
  "bank-account-2": "Bank Account 2",
  "bank-account-3": "Bank Account 3",
  "establishment-details": "Establishment Details",
  "stock-details": "Stock Details",
  weight: "kg (Weight)",
  width: "m (Width)",
  area: "m2 (Area)",
  length: "m (Length)",
  volume: "l/m\xB3 (Volume)",
  height: "m (Height)",
  "invalid-number": "invalid number",
  unit: "Unit",
  collections: "Collections",
  "add-collection": "Add Collection",
  "new-tag": "New Tag",
  edit: "Edit",
  "collection-details": "Collection Details",
  "list-payments": "Payments List",
  "list-users": "Users List",
  preview: "Preview",
  "external-id": "External ID",
  origin: "External Service",
  "sale-details": "Sale Details",
  addresses: "Addresses",
  "convert-to-credit_note": "Convert to Credit Note",
  "quote-details": "Quote Details",
  "required-field": "Required field",
  "user-or-password-invalid": "Username or password is incorrect",
  date_dispatch: "Dispatch Date",
  "modify-credit_note": "Modify Credit Note",
  "change-password": "Change Password",
  "reset-password": "Reset Password",
  "current-password": "Current Password",
  "new-password": "New Password",
  "password-confirm": "Confirm Password",
  "password-too-short": "Password must be at least 8 characters",
  "password-confirm-not-match": "Passwords do not match",
  "password-must-contain-number": "Password must contain a number",
  "password-updated": "Password updated",
  "password-update-failed": "Password update failed",
  "password-must-contain-letter": "Password must contain a letter",
  "user-invalid": "User configuration invalid.",
  "pincode-invalid": "Pincode invalid",
  "error-updating-document": "Error while updating document",
  "error-creating-document": "Error while creating document",
  "no-address": "No address chosen",
  "confirm-delete": "Confirm Delete",
  "confirm-delete-text": "Are you sure you want to delete this data? This action cannot be undone.",
  "address-details": "Address Details",
  "document-prefixes": "Document Prefixes",
  companies: "Companies",
  "modify-purchase": "Modify Purchase",
  date_purchase: "Date Purchase",
  other: "Other",
  cheque: "Cheque",
  "choose-establishment": "Choose Establishment",
  "invalid-email": "Invalid Email",
  "purchase-no-file": "Please upload the this purchase in PDF format.",
  "return-package": "Return Package",
  "password-reset-request": "Password reset request",
  "password-reset-request-message": "A password reset request has been submitted for your account on our digital platform.",
  "to-password-reset-form": "To password reset form",
  "password-reset-alternate": "In case the button did not work, click here or use the following link to reset your password"
};

// lib/localization/locales/fr.ts
var frjson = {
  "invoice-details": "Details de Facture",
  "purchase-details": "D\xE9tails de Achat",
  "credit_note-details": "Details de Note de Cr\xE9dit",
  "debit_note-details": "Details de Note de D\xE9bit",
  "dispatch-details": "D\xE9tails de Exp\xE9dition",
  accountant: "Comptable",
  active: "Actif",
  "add-product": "Ajouter un Produit",
  "add-supplier": "Ajouter un Fournisseur",
  "additional-information": "Informations Suppl\xE9mentaires",
  "address-delivery": "Adresse de Livraison",
  "address-invoice": "Adresse de Facturation",
  address: "Adresse",
  adresses: "Adresses",
  "already-paid": "D\xE9j\xE0 Pay\xE9",
  amount: "Montant",
  attention: "Attention",
  bank_transfer: "Virement Bancaire",
  "block-self": "Vous ne pouvez pas vous bloquer.",
  blocked: "Bloqu\xE9",
  cancel: "Annuler",
  cancelled: "Annul\xE9",
  cash: "Esp\xE8ces",
  choose: "Choisir",
  city: "Ville",
  "client-details": "D\xE9tails Client",
  close: "Fermer",
  code: "Code",
  comments: "Commentaires",
  company_admin: "Administrateur",
  company: "Entreprise",
  "confirm-exit-text": "\xCAtes-vous s\xFBr de vouloir quitter le programme\xA0?",
  "confirm-exit": "Quitter le programme",
  connect: "Se Connecter",
  contact: "Contact",
  continue: "Continuer",
  "convert-to-delivery_note": "Convertir en Bon de Livraison",
  "convert-to-invoice": "Convertir en Facture",
  "convert-to-order": "Convertir en Commande",
  "copy-material": "Copier le Mat\xE9riel",
  country: "Pays",
  "create-invoice": "Cr\xE9er une Facture",
  "create-order": "Cr\xE9er une Commande",
  "create-quote": "Cr\xE9er un Devis",
  "create-stock-movement": "Cr\xE9er un Mouvement de Stock",
  creator: "Cr\xE9ateur",
  credit_card: "Carte de Cr\xE9dit",
  credit_note_date: "Date de Note de Cr\xE9dit",
  credit_note_details: "D\xE9tails de Note de Cr\xE9dit",
  credit_note: "Note de Cr\xE9dit",
  "current-stock": "Stock Actuel",
  "customer-company": "Entreprise",
  "customer-details": "D\xE9tails du Client",
  "customer-tax-id": "Num\xE9ro de TVA",
  customer: "Client",
  customers: "Clients",
  dashboard: "Tableau de Bord",
  date_credit_note: "Date de Note de Cr\xE9dit",
  date_delivery_note: "Date du Bon de Livraison",
  date_invoice: "Date de la Facture",
  date_order: "Date de la Commande",
  date_quote: "Date du Devis",
  date_sale: "Date de Vente",
  "date-dispatch": "Date d'Exp\xE9dition",
  "date-sale": "Date de Commande",
  date: "Date",
  debit_card: "Carte de D\xE9bit",
  debit_note: "Note de D\xE9bit",
  deliveries: "Livraisons",
  delivery_note_date: "Date du Bon de Livraison",
  delivery_note_details: "D\xE9tails du Bon de Livraison",
  delivery_note: "Bon de Livraison",
  "delivery-date": "Date de Livraison",
  delivery: "Livraison",
  description: "Description",
  "details-customer": "D\xE9tails du Client",
  "details-for-payment": "D\xE9tails de Paiement",
  details: "D\xE9tails",
  "dialog-warning": "Attention\xA0!",
  dispatch: "Exp\xE9dition",
  document: "Document",
  documents: "Documents",
  door: "Porte",
  download_update: "T\xE9l\xE9charger la Mise \xE0 Jour",
  drop_files: "D\xE9poser ou cliquer pour ajouter des fichiers",
  ean: "Ean",
  "edit-customer": "Modifier le Client",
  "edit-document": "Modifier le Document",
  email: "E-mail",
  employee: "Employ\xE9",
  end: "Fin",
  "enter-email": "Saisissez votre adresse e-mail",
  "error-creating-payment": "Erreur lors de la cr\xE9ation du paiement",
  "error-updating-payment": "Erreur lors de la mise \xE0 jour du paiement",
  establishment: "\xC9tablissement",
  establishments: "\xC9tablissements",
  expiration: "Date d'Expiration",
  export: "Exporter",
  "field-required": "Champ obligatoire",
  files: "Fichiers",
  "fill-all-fields": "Veuillez remplir tous les champs\xA0!",
  filter: "Filtre",
  financing_unverified: "Financement (Non v\xE9rifi\xE9)",
  financing: "Financement",
  "first-name": "Pr\xE9nom",
  firstname: "Pr\xE9nom",
  firstName: "Pr\xE9nom",
  floor: "\xC9tage",
  "forgot-password": "Mot de passe oubli\xE9.",
  general_manager: "Directeur G\xE9n\xE9ral",
  import: "Importer",
  incoming: "Entrant",
  intern: "Stagiaire",
  invoice_date: "Date de Facture",
  invoice_details: "D\xE9tails de la Facture",
  invoice: "Facture",
  invoicing: "Facturation",
  "last-name": "Nom",
  lastname: "Nom",
  lastName: "Nom",
  "leave-empty": "Laisser vide pour num\xE9ro automatique",
  "list-customers": "Liste des Clients",
  "list-documents": "Liste des Documents",
  "list-establishments": "Liste des \xC9tablissements",
  "list-materials": "Liste des Mat\xE9riaux",
  "list-suppliers": "Liste des Fournisseurs",
  login: "Connexion",
  "manager-notes": "Notes du Manager",
  manager: "Manager",
  materials: "Mat\xE9riaux",
  "modify-dispatch": "Modifier l'Exp\xE9dition",
  "modify-invoice": "Modifier la Facture",
  "modify-material": "Modifier le Mat\xE9riel",
  "modify-quote": "Modifier le Devis",
  "modify-sale": "Modifier la Commande",
  name: "Nom",
  new_document_credit_note: "Nouvel Note de Cr\xE9dit",
  new_document_delivery_note: "Nouveau Bon de Livraison",
  new_document_invoice: "Nouvelle Facture",
  new_document_order: "Nouvelle Commande",
  new_document_quote: "Nouveau Devis",
  "new-address": "Nouvelle Adresse",
  "new-customer": "Nouveau Client",
  "new-document": "Nouveau Document",
  "new-line": "Nouvelle Ligne",
  "new-material": "Nouveau Mat\xE9riel",
  "new-supplier": "Nouveau Fournisseur",
  "new-user": "Nouvel Utilisateur",
  no: "Non",
  online: "En ligne",
  order_date: "Date de Commande",
  order_details: "D\xE9tails de la Commande",
  order: "Commande",
  outgoing: "Sortant",
  owner: "Propri\xE9taire",
  page: "Page",
  paid: "Pay\xE9",
  passive: "Passif",
  password: "Mot de passe",
  "payment-details": "D\xE9tails de Paiement",
  "payment-history": "Historique des Paiements",
  "payment-new": "Nouveau Paiement",
  "payment-status": "Statut du Paiement",
  payments: "Paiements",
  "pdf-export": "Exportation PDF",
  PDF: "PDF",
  phone: "T\xE9l\xE9phone",
  pincode: "Code PIN",
  "prefered-language": "Langue Pr\xE9f\xE9r\xE9e",
  "price-net": "Prix Net",
  price: "Prix",
  "primary-details": "D\xE9tails Principaux",
  private: "Priv\xE9",
  products: "Produits",
  professionnal: "Professionnel",
  promissory: "Promesse",
  province: "Province",
  purchase: "Achat",
  quote_date: "Date de Devis",
  quote_details: "D\xE9tails du Devis",
  quote: "Devis",
  reduction: "R\xE9duction",
  reference: "R\xE9f\xE9rence",
  references: "R\xE9f\xE9rences",
  remove: "Supprimer",
  rename: "Renommer",
  reset: "R\xE9initialiser",
  role: "R\xF4le",
  sale: "Vente",
  save_credit_note: "Enregistrer Note de Cr\xE9dit",
  save_CreditNote: "Enregistrer Note de Cr\xE9dit",
  save_delivery_note: "Enregistrer Bon de Livraison",
  save_DeliveryNote: "Enregistrer Bon de Livraison",
  save_invoice: "Enregistrer Facture",
  save_Invoice: "Enregistrer Facture",
  save_order: "Enregistrer Commande",
  save_Order: "Enregistrer Commande",
  save_quote: "Enregistrer Devis",
  save_Quote: "Enregistrer Devis",
  "save-material": "Enregistrer Mat\xE9riel",
  save: "Enregistrer",
  search: "Rechercher",
  "secondary-details": "D\xE9tails Secondaires",
  seller: "Vendeur",
  send: "Envoyer une demande de r\xE9cup\xE9ration de mot de passe",
  shelf: "\xC9tag\xE8re",
  "signature-customer": "Signature Client",
  "signature-delivery": "Signez ici pour confirmer que vous avez re\xE7u la livraison",
  "signature-seller": "Signature Vendeur",
  start: "D\xE9but",
  "stock-movement-details": "D\xE9tails Mouvement de Stock",
  stock: "Stock",
  street: "Rue",
  subtotal: "Sous-total",
  "supplier-details": "D\xE9tails Fournisseur",
  supplier: "Fournisseur",
  suppliers: "Fournisseurs",
  "tax-in": "TVA Incluse",
  "tax-out": "TVA Exclue",
  tax: "TVA",
  "tax(%)": "TVA(%)",
  taxId: "Num\xE9ro de TVA",
  taxID: "Num\xE9ro de TVA",
  "timed-out": "Vous avez \xE9t\xE9 d\xE9connect\xE9 pour inactivit\xE9. Veuillez vous reconnecter.",
  "to-pay": "\xC0 Payer",
  "total-reduction": "R\xE9duction Totale",
  "total-tax": "Total TVA",
  "total-to-pay": "Montant \xE0 Payer",
  "total-value-excl-tax": "Total Hors TVA",
  "total-value": "Valeur Totale",
  total: "Total",
  type: "Type",
  unknown: "Autre",
  "user-details": "D\xE9tails Utilisateur",
  "user-modify": "Modifier Utilisateur",
  user: "Utilisateur",
  username: "Nom d'Utilisateur",
  users: "Utilisateurs",
  "valid-until": "Valable Jusqu'\xE0",
  value: "Valeur",
  warehouse: "Entrep\xF4t",
  worker: "Ouvrier",
  yes: "Oui",
  z: "Z",
  zip: "Code Postal",
  "please-update": "Veuillez mettre \xE0 jour pour continuer.",
  "download-update": "T\xE9l\xE9charger la Mise \xE0 Jour",
  delete: "Supprimer",
  open: "Ouvrir",
  "choose-language": "Choisir Langue",
  "new-establishment": "Nouvel \xC9tablissement",
  "details-establishment": "D\xE9tails de l'\xC9tablissement",
  "modify-establishment": "Modifier l'\xC9tablissement",
  "phone-1": "T\xE9l\xE9phone",
  "phone-2": "T\xE9l\xE9phone 2",
  "tax-id": "Num\xE9ro de TVA",
  "bank-account-1": "Compte Bancaire",
  "bank-account-2": "Compte Bancaire 2",
  "bank-account-3": "Compte Bancaire 3",
  "establishment-details": "D\xE9tails de l'\xC9tablissement",
  "stock-details": "D\xE9tails du Stock",
  weight: "kg (Poids)",
  width: "m (Largeur)",
  area: "m2 (Surface)",
  length: "m (Longueur)",
  volume: "l/m\xB3 (Volume)",
  height: "m (Hauteur)",
  "invalid-number": "Num\xE9ro invalide",
  unit: "Unit\xE9",
  collections: "Collections",
  "add-collection": "Ajouter Collection",
  "new-tag": "Nouveau Etiquette",
  edit: "Modifier",
  "collection-details": "D\xE9tails de Collection",
  "list-payments": "Liste des Paiements",
  "list-users": "Liste des Utilisateurs",
  preview: "Aper\xE7u",
  "external-id": "ID Externe",
  origin: "Service Externe",
  "sale-details": "D\xE9tails de Vente",
  addresses: "Adresses",
  "convert-to-credit_note": "Convertir en Note de Cr\xE9dit",
  "quote-details": "D\xE9tails de Devis",
  "required-field": "Champ requis",
  "user-or-password-invalid": "Utilisateur ou mot de passe invalide",
  date_dispatch: "Date de Exp\xE9dition",
  "modify-credit_note": "Modifier la Note de Cr\xE9dit",
  "change-password": "Modifier mot de passe",
  "reset-password": "R\xE9initialiser le mot de passe",
  "current-password": "Mot de passe actuel",
  "new-password": "Nouveau mot de passe",
  "password-confirm": "Confirmer le mot de passe",
  "password-too-short": "Mot de passe doit comporter au moins 8 caract\xE8res",
  "password-confirm-not-match": "Les mots de passe ne correspondent pas",
  "password-must-contain-number": "Mot de passe doit comporter un chiffre",
  "password-updated": "Mot de passe mis \xE0 jour",
  "password-update-failed": "\xC9chec de la mise \xE0 jour du mot de passe",
  "password-must-contain-letter": "Mot de passe doit comporter une lettre",
  "user-invalid": "Configuration utilisateur invalide.",
  "pincode-invalid": "Code PIN invalide",
  "error-updating-document": "Une erreur s'est produite lors de la mise \xE0 jour du document",
  "error-creating-document": "Une erreur s'est produite lors de la cr\xE9ation du document",
  "no-address": "Aucune adresse choisie",
  "confirm-delete": "Confirmer la suppression",
  "confirm-delete-text": "\xCAtes-vous s\xFBr de vouloir supprimer ces donn\xE9es? Cette action ne peut pas \xEAtre annul\xE9e.",
  "address-details": "D\xE9tails de l'Adresse",
  "document-prefixes": "Pr\xE9fixes de Document",
  companies: "Entreprises",
  "modify-purchase": "Modifier Achat",
  date_purchase: "Date Achat",
  other: "Autre",
  cheque: "Ch\xE8que",
  "choose-establishment": "Choisissez un \xE9tablissement",
  "invalid-email": "E-mail invalide",
  "purchase-no-file": "Veuillez t\xE9l\xE9charger le document PDF de cet achat.",
  "return-package": "Retour Emballage",
  "password-reset-request": "Demande de r\xE9initialisation du mot de passe",
  "password-reset-request-message": "Une demande de r\xE9initialisation du mot de passe a \xE9t\xE9 soumise pour votre compte sur notre platforme digitale.",
  "to-password-reset-form": "Formulaire de r\xE9initialisation du mot de passe",
  "password-reset-alternate": "Si le bouton ne fonctionne pas, cliquez ici ou utilisez le lien suivant pour r\xE9initialiser votre mot de passe"
};

// lib/localization/locales/nl.ts
var nljson = {
  "invoice-details": "Factuur Details",
  "purchase-details": "Aankoop Details",
  "credit_note-details": "Creditnota Details",
  "debit_note-details": "Debit Nota Details",
  "dispatch-details": "Verzending Details",
  accountant: "Boekhouder",
  active: "Actief",
  "add-product": "Product Toevoegen",
  "add-supplier": "Leverancier toevoegen",
  "additional-information": "Bijkomende Informatie",
  "address-delivery": "Afleveradres",
  "address-invoice": "Facturatie Adres",
  address: "Adres",
  adresses: "Adressen",
  "already-paid": "Al Betaald",
  amount: "Aantal",
  attention: "Let op",
  bank_transfer: "Overschrijving",
  "block-self": "U kan uwzelf niet blokkeren.",
  blocked: "Geblokkeerd",
  cancel: "Annuleren",
  cancelled: "Geannuleerd",
  cash: "Cash",
  choose: "Kies",
  city: "Stad",
  "client-details": "Klant Details",
  close: "Afsluiten",
  code: "Code",
  comments: "Kommentaar",
  company_admin: "Admin",
  company: "Bedrijf",
  "confirm-exit-text": "Bent u zeker dat u het programma wilt afsluiten?",
  "confirm-exit": "Programma afsluiten",
  connect: "Aanmelden",
  contact: "Contact",
  continue: "Doorgaan",
  "convert-to-delivery_note": "Converteren naar Verzendnota",
  "convert-to-invoice": "Omzetten naar Factuur",
  "convert-to-order": "Omzetten naar Bestelling",
  "copy-material": "Kopieer materiaal",
  country: "Land",
  "create-invoice": "Nieuwe Factuur",
  "create-order": "Nieuwe Bestelling",
  "create-quote": "Nieuwe Offerte",
  "create-stock-movement": "Voorraadbeweging maken",
  creator: "Verkoper",
  credit_card: "Krediet kaart",
  credit_note_date: "Kredietnota Datum",
  credit_note_details: "Creditnota Details",
  credit_note: "Creditnota",
  "current-stock": "Huidige voorraad",
  "customer-company": "Bedrijf",
  "customer-details": "Klantdetails",
  "customer-tax-id": "BTW Nummer",
  customer: "Klant",
  customers: "Klanten",
  dashboard: "Dashboard",
  date_credit_note: "Creditnota Datum",
  date_delivery_note: "Leveringsbon Datum",
  date_invoice: "Factuur Datum",
  date_order: "Bestelling Datum",
  date_quote: "Offerte Datum",
  date_sale: "Bestellingsdatum",
  "date-dispatch": "Datum Verzending",
  "date-sale": "Datum Bestelling",
  date: "Datum",
  debit_card: "Bankkaart",
  debit_note: "Debit Nota",
  deliveries: "Leveringen",
  delivery_note_date: "Verzendnota datum",
  delivery_note_details: "Leveringsbon Details",
  delivery_note: "Leveringsbon",
  "delivery-date": "Leveringsdatum",
  delivery: "Levering",
  description: "Beschrijving",
  "details-customer": "Klant Details",
  "details-for-payment": "Betalingsdetails",
  details: "Details",
  "dialog-warning": "Waarschuwing!",
  dispatch: "Verzending",
  document: "Document",
  documents: "Documenten",
  door: "Deur",
  download_update: "Download Update",
  drop_files: "Sleep of klik om bestanden toe te voegen",
  ean: "Ean",
  "edit-customer": "Klant Wijzigen",
  "edit-document": "Document Wijzigen",
  email: "E-mail",
  employee: "Verkoper",
  end: "Einde",
  "enter-email": "Vul uw e-mailadres in",
  "error-creating-payment": "Fout tijdens opslaan van betaling",
  "error-updating-payment": "Fout tijdens wijziging van betaling",
  establishment: "Vestiging",
  establishments: "Vestigingen",
  expiration: "Vervaldatum",
  export: "Exporteren",
  "field-required": "Verplicht veld",
  files: "Bestanden",
  "fill-all-fields": "Vul alle velden in!",
  filter: "Filter",
  financing_unverified: "Lening (Ongeverifieerd)",
  financing: "Lening",
  "first-name": "Voornaam",
  firstname: "Voornaam",
  firstName: "Voornaam",
  floor: "Verdieping",
  "forgot-password": "Ik heb mijn wachtwoord vergeten.",
  general_manager: "Algemene Manager",
  import: "import",
  incoming: "Binnenkomend",
  intern: "Stagiair",
  invoice_date: "Factuur Datum",
  invoice_details: "Factuur Details",
  invoice: "Factuur",
  invoicing: "Facturatie",
  "last-name": "Achternaam",
  lastname: "Achternaam",
  lastName: "Achternaam",
  "leave-empty": "Laat leeg voor automatisch nummer",
  "list-customers": "Klantenlijst",
  "list-documents": "Documenten lijst",
  "list-establishments": "Vestigingen Lijst",
  "list-materials": "Materialenlijst",
  "list-suppliers": "Leverancierslijst",
  login: "Inloggen",
  "manager-notes": "Beheerder Notities",
  manager: "Manager",
  materials: "Materialen",
  "modify-dispatch": "Verzending Wijzigen",
  "modify-invoice": "Factuur Wijzigen",
  "modify-material": "Materiaal bewerken",
  "modify-quote": "Offerte Wijzigen",
  "modify-sale": "Bestelling Wijzigen",
  name: "Naam",
  new_document_credit_note: "Nieuwe Creditnota",
  new_document_delivery_note: "Nieuwe Leveringsbon",
  new_document_invoice: "Nieuwe Factuur",
  new_document_order: "Nieuwe Bestelling",
  new_document_quote: "Nieuwe Offerte",
  "new-address": "Nieuw Adres",
  "new-customer": "Nieuw Klant",
  "new-document": "Nieuw Document",
  "new-line": "Nieuwe Rij",
  "new-material": "Nieuw materiaal",
  "new-supplier": "Nieuwe leverancier",
  "new-user": "Nieuwe gebruiker",
  no: "Nee",
  online: "Online",
  order_date: "Bestellingsdatum",
  order_details: "Bestelling Details",
  order: "Bestelling",
  outgoing: "Uitgaand",
  owner: "Zaakvoerder",
  page: "Pagina",
  paid: "Betaald",
  passive: "Passief",
  password: "Wachtwoord",
  "payment-details": "Betalingsdetails",
  "payment-history": "Betalingsgeschiedenis",
  "payment-new": "Nieuwe Betaling",
  "payment-status": "Betalingsstatus",
  payments: "Betalingen",
  "pdf-export": "PDF Export",
  PDF: "PDF",
  phone: "Telefoon",
  pincode: "Pincode",
  "prefered-language": "Voorkeurstaal",
  "price-net": "Nettoprijs",
  price: "Prijs",
  "primary-details": "Primaire gegevens",
  private: "Priv\xE9",
  products: "Producten",
  professionnal: "Professioneel",
  promissory: "Promesse",
  province: "Provincie",
  purchase: "Aankoop",
  quote_date: "Offerte Datum",
  quote_details: "Offerte Details",
  quote: "Offerte",
  reduction: "Korting",
  reference: "Referentie",
  references: "Referentie",
  remove: "Verwijderen",
  rename: "Hernoemen",
  reset: "Reset",
  role: "Rol",
  sale: "Bestelling",
  save_credit_note: "Creditnota Opslaan",
  save_CreditNote: "Creditnota Opslaan",
  save_delivery_note: "Leveringsbon Opslaan",
  save_DeliveryNote: "Leveringsbon Opslaan",
  save_invoice: "Factuur Opslaan",
  save_Invoice: "Factuur Opslaan",
  save_order: "Bestelling Opslaan",
  save_Order: "Bestelling Opslaan",
  save_quote: "Offerte Opslaan",
  save_Quote: "Offerte Opslaan",
  "save-material": "Materiaal opslaan",
  save: "Opslaan",
  search: "Zoeken",
  "secondary-details": "Bijkomende Details",
  seller: "Verkoper",
  send: "Stuur wachtwoord herstel verzoek",
  shelf: "Schap",
  "signature-customer": "Handtekening Klant",
  "signature-delivery": "Teken hier om te bevestigen dat u de levering heeft ontvangen",
  "signature-seller": "Handtekening Verkoper",
  start: "Start",
  "stock-movement-details": "Details voorraadbeweging",
  stock: "Voorraad",
  street: "Straat",
  subtotal: "Subtotaal",
  "supplier-details": "Leveranciersdetails",
  supplier: "Leverancier",
  suppliers: "Leveranciers",
  "tax-in": "BTW Incl",
  "tax-out": "BTW Excl",
  tax: "BTW",
  "tax(%)": "BTW(%)",
  taxId: "BTW-nummer",
  taxID: "BTW-nummer",
  "timed-out": "U bent afgemeld wegens inactiviteit. Log opnieuw in.",
  "to-pay": "Te Betalen",
  "total-reduction": "Totaal Korting",
  "total-tax": "Totaal BTW",
  "total-to-pay": "Te Betalen",
  "total-value-excl-tax": "Totaal Excl. BTW",
  "total-value": "Totaal Waarde",
  total: "Totaal",
  type: "Soort",
  unknown: "Andere",
  "user-details": "Gebruikersgegevens",
  "user-modify": "Gebruiker Wijzigen",
  user: "Gebruiker",
  username: "Gebruikersnaam",
  users: "Gebruikers",
  "valid-until": "Vervaldatum",
  value: "Waarde",
  warehouse: "Magazijn",
  worker: "Arbeider",
  yes: "Ja",
  z: "Z",
  zip: "Postcode",
  "please-update": "Gelieve te updaten om door te gaan.",
  "download-update": "Update Downloaden",
  delete: "Verwijderen",
  open: "Openen",
  "choose-language": "Kies Taal",
  "new-establishment": "Nieuwe Vestiging",
  "details-establishment": "Vestiging Details",
  "modify-establishment": "Wijzig Vestiging",
  "phone-1": "Telefoon",
  "phone-2": "Telefoon 2",
  "tax-id": "BTW Nummer",
  "bank-account-1": "Bank Rekening",
  "bank-account-2": "Bank Rekening 2",
  "bank-account-3": "Bank Rekening 3",
  "establishment-details": "Vestiging Details",
  "stock-details": "Voorraad Details",
  weight: "kg (Gewicht)",
  width: "m (Breedte)",
  area: "m2 (Oppervlakte)",
  length: "m (Lengte)",
  volume: "l/m\xB3 (Volume)",
  height: "m (Hoogte)",
  "invalid-number": "Ongeldig nummer",
  unit: "Eenheid",
  collections: "Collectie",
  "add-collection": "Collectie Toevoegen",
  "new-tag": "Nieuwe Etiket",
  edit: "Bewerken",
  "collection-details": "Collectie Details",
  "list-payments": "Betalingslijst",
  "list-users": "Gebruikerslijst",
  preview: "Voorbeeld",
  "external-id": "Externe ID",
  origin: "Externe Service",
  "sale-details": "Verkoopdetails",
  addresses: "Adressen",
  "convert-to-credit_note": "Converteren naar Creditnota",
  "quote-details": "Offerte Details",
  "required-field": "Verplicht veld",
  "user-or-password-invalid": "Gebruiker of wachtwoord ongeldig",
  date_dispatch: "Levering Datum",
  "modify-credit_note": "Creditnota Wijzigen",
  "change-password": "Wachtwoord wijzigen",
  "reset-password": "Reset Wachtwoord",
  "current-password": "Huidig wachtwoord",
  "new-password": "Nieuw wachtwoord",
  "password-confirm": "Bevestig wachtwoord",
  "password-too-short": "Wachtwoord moet minstens 8 tekens bevatten",
  "password-confirm-not-match": "Wachtwoorden komen niet overeen",
  "password-must-contain-number": "Wachtwoord moet een nummer bevatten",
  "password-updated": "Wachtwoord bijgewerkt",
  "password-update-failed": "Wachtwoord update mislukt",
  "password-must-contain-letter": "Wachtwoord moet een letter bevatten",
  "user-invalid": "Gebruiker configuratie ongeldig.",
  "pincode-invalid": "Pincode ongeldig",
  "error-updating-document": "Fout tijdens het bijwerken van het document",
  "error-creating-document": "Fout tijdens het creatie van het document",
  "no-address": "Geen adres geselecteerd",
  "confirm-delete": "Bevestig verwijderen",
  "confirm-delete-text": "Weet u zeker dat u deze gegevens wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.",
  "address-details": "Adres Details",
  "document-prefixes": "Documentvoorvoegsels",
  companies: "Bedrijven",
  "modify-purchase": "Aankoop Wijzigen",
  date_purchase: "Datum Aankoop",
  other: "Andere",
  cheque: "Cheque",
  "choose-establishment": "Kies een Vestiging",
  "invalid-email": "Ongeldig E-mail",
  "purchase-no-file": "Voeg het aankoop toe aan deze document in PDF formaat.",
  "return-package": "Retour Emballage",
  "password-reset-request": "Wachtwoord reset verzoek",
  "password-reset-request-message": "Een wachtwoord reset verzoek is ingediend voor uw account op ons digitale platform.",
  "to-password-reset-form": "Naar wachtwoord reset formulier",
  "password-reset-alternate": "In het geval de knop niet werkt, klik hier of gebruik de volgende link om uw wachtwoord te resetten"
};

// lib/localization/locales/tr.ts
var trjson = {
  "invoice-details": "Fatura Detaylar\u0131",
  "purchase-details": "Sat\u0131nalma Detaylar\u0131",
  "credit_note-details": "Alacak Notu Detaylar\u0131",
  "debit_note-details": "Bor\xE7 Notu Detaylar\u0131",
  "dispatch-details": "\u0130rsaliye Detaylar\u0131",
  accountant: "Muhasebeci",
  active: "Aktif",
  "add-product": "\xDCr\xFCn Ekle",
  "add-supplier": "Tedarik\xE7i Ekle",
  "additional-information": "Ek Bilgi",
  "address-delivery": "Teslimat Adresi",
  "address-invoice": "Fatura Adresi",
  address: "Adres",
  adresses: "Adresler",
  "already-paid": "Zaten \xD6dendi",
  amount: "Miktar",
  attention: "Dikkat",
  bank_transfer: "Banka Havalesi",
  "block-self": "Kendinizi engelleyemezsiniz.",
  blocked: "Engellendi",
  cancel: "\u0130ptal",
  cancelled: "\u0130ptal Edildi",
  cash: "Nakit",
  choose: "Se\xE7",
  city: "\u015Eehir",
  "client-details": "M\xFC\u015Fteri Detaylar\u0131",
  close: "Kapat",
  code: "Kod",
  comments: "Yorumlar",
  company_admin: "Y\xF6netici",
  company: "\u015Eirket",
  "confirm-exit-text": "Programdan \xE7\u0131kmak istedi\u011Finize emin misiniz?",
  "confirm-exit": "Programdan \xC7\u0131k",
  connect: "Giri\u015F Yap",
  contact: "\u0130leti\u015Fim",
  continue: "Devam Et",
  "convert-to-delivery_note": "\u0130rsaliye Olu\u015Ftur",
  "convert-to-invoice": "Faturaya D\xF6n\xFC\u015Ft\xFCr",
  "convert-to-order": "Sipari\u015Fe D\xF6n\xFC\u015Ft\xFCr",
  "copy-material": "Malzeme Kopyala",
  country: "\xDClke",
  "create-invoice": "Yeni Fatura",
  "create-order": "Yeni Sipari\u015F",
  "create-quote": "Yeni Teklif",
  "create-stock-movement": "Stok Hareketi Olu\u015Ftur",
  creator: "Sat\u0131\u015F Temsilcisi",
  credit_card: "Kredi Kart\u0131",
  credit_note_date: "Alacak Notu Tarihi",
  credit_note_details: "Alacak Notu Detaylar\u0131",
  credit_note: "Alacak Notu",
  "current-stock": "Mevcut Stok",
  "customer-company": "\u015Eirket",
  "customer-details": "M\xFC\u015Fteri Detaylar\u0131",
  "customer-tax-id": "Vergi Numaras\u0131",
  customer: "M\xFC\u015Fteri",
  customers: "M\xFC\u015Fteriler",
  dashboard: "G\xF6sterge Paneli",
  date_credit_note: "Alacak Notu Tarihi",
  date_delivery_note: "\u0130rsaliye Tarihi",
  date_invoice: "Fatura Tarihi",
  date_order: "Sipari\u015F Tarihi",
  date_quote: "Teklif Tarihi",
  date_sale: "Sat\u0131\u015F Tarihi",
  "date-dispatch": "\u0130rsaliye Tarihi",
  "date-sale": "Sat\u0131\u015F Tarihi",
  date: "Tarih",
  debit_card: "Banka Kart\u0131",
  debit_note: "Bor\xE7 Notu",
  deliveries: "Teslimatlar",
  delivery_note_date: "\u0130rsaliye Tarihi",
  delivery_note_details: "\u0130rsaliye Detaylar\u0131",
  delivery_note: "\u0130rsaliye",
  "delivery-date": "Teslim Tarihi",
  delivery: "Teslimat",
  description: "A\xE7\u0131klama",
  "details-customer": "M\xFC\u015Fteri Detaylar\u0131",
  "details-for-payment": "\xD6deme Detaylar\u0131",
  details: "Detaylar",
  "dialog-warning": "Uyar\u0131!",
  dispatch: "\u0130rsaliye",
  document: "D\xF6k\xFCman",
  documents: "D\xF6k\xFCmanlar",
  door: "Kap\u0131",
  download_update: "G\xFCncelleme \u0130ndir",
  drop_files: "Dosyalar\u0131 s\xFCr\xFCkleyin veya t\u0131klay\u0131n",
  ean: "EAN",
  "edit-customer": "M\xFC\u015Fteri D\xFCzenle",
  "edit-document": "D\xF6k\xFCman\u0131 D\xFCzenle",
  email: "E-posta",
  employee: "Sat\u0131\u015F Temsilcisi",
  end: "Son",
  "enter-email": "E-posta adresinizi girin",
  "error-creating-payment": "\xD6deme kaydedilirken hata olu\u015Ftu",
  "error-updating-payment": "\xD6deme g\xFCncellenirken hata olu\u015Ftu",
  establishment: "Kurulu\u015F",
  establishments: "Kurulu\u015Flar",
  expiration: "Son Kullanma Tarihi",
  export: "D\u0131\u015Fa Aktar",
  "field-required": "Gerekli alan",
  files: "Dosyalar",
  "fill-all-fields": "T\xFCm alanlar\u0131 doldurun!",
  filter: "Filtre",
  financing_unverified: "Finansman (Do\u011Frulanmam\u0131\u015F)",
  financing: "Finansman",
  "first-name": "Ad",
  firstname: "Ad",
  firstName: "Ad",
  floor: "Kat",
  "forgot-password": "\u015Eifremi unuttum.",
  general_manager: "Genel M\xFCd\xFCr",
  import: "\u0130\xE7e Aktar",
  incoming: "Gelen",
  intern: "Stajyer",
  invoice_date: "Fatura Tarihi",
  invoice_details: "Fatura Detaylar\u0131",
  invoice: "Fatura",
  invoicing: "Faturalama",
  "last-name": "Soyad",
  lastname: "Soyad",
  lastName: "Soyad",
  "leave-empty": "Otomatik numara i\xE7in bo\u015F b\u0131rak\u0131n",
  "list-customers": "M\xFC\u015Fteri Listesi",
  "list-documents": "D\xF6k\xFCman Listesi",
  "list-establishments": "Kurulu\u015F Listesi",
  "list-materials": "Malzeme Listesi",
  "list-suppliers": "Tedarik\xE7i Listesi",
  login: "Giri\u015F",
  "manager-notes": "Y\xF6netici Notlar\u0131",
  manager: "Y\xF6netici",
  materials: "Malzemeler",
  "modify-dispatch": "\u0130rsaliye D\xFCzenle",
  "modify-invoice": "Fatura D\xFCzenle",
  "modify-material": "Malzeme D\xFCzenle",
  "modify-quote": "Teklif D\xFCzenle",
  "modify-sale": "Sipari\u015F D\xFCzenle",
  name: "Ad",
  new_document_credit_note: "Yeni Alacak Notu",
  new_document_delivery_note: "Yeni Teslimat Notu",
  new_document_invoice: "Yeni Fatura",
  new_document_order: "Yeni Sipari\u015F",
  new_document_quote: "Yeni Teklif",
  "new-address": "Yeni Adres",
  "new-customer": "Yeni M\xFC\u015Fteri",
  "new-document": "Yeni D\xF6k\xFCman",
  "new-line": "Yeni Sat\u0131r",
  "new-material": "Yeni Malzeme",
  "new-supplier": "Yeni Tedarik\xE7i",
  "new-user": "Yeni Kullan\u0131c\u0131",
  no: "Hay\u0131r",
  online: "\xC7evrimi\xE7i",
  order_date: "Sipari\u015F Tarihi",
  order_details: "Sipari\u015F Detaylar\u0131",
  order: "Sipari\u015F",
  outgoing: "Giden",
  owner: "Sahip",
  page: "Sayfa",
  paid: "\xD6dendi",
  passive: "Pasif",
  password: "\u015Eifre",
  "payment-details": "\xD6deme Detaylar\u0131",
  "payment-history": "\xD6deme Ge\xE7mi\u015Fi",
  "payment-new": "Yeni \xD6deme",
  "payment-status": "\xD6deme Durumu",
  payments: "\xD6demeler",
  "pdf-export": "PDF D\u0131\u015Fa Aktar",
  PDF: "PDF",
  phone: "Telefon",
  pincode: "PIN Kodu",
  "prefered-language": "Tercih Edilen Dil",
  "price-net": "Net Fiyat",
  price: "Fiyat",
  "primary-details": "Ana Detaylar",
  private: "\xD6zel",
  products: "\xDCr\xFCnler",
  professionnal: "Profesyonel",
  promissory: "Senet",
  province: "\u0130l",
  purchase: "Sat\u0131n Alma",
  quote_date: "Teklif Tarihi",
  quote_details: "Teklif Detaylar\u0131",
  quote: "Teklif",
  reduction: "\u0130ndirim",
  reference: "Referans",
  references: "Referanslar",
  remove: "Kald\u0131r",
  rename: "Yeniden Adland\u0131r",
  reset: "S\u0131f\u0131rla",
  role: "Rol",
  sale: "Sat\u0131\u015F",
  save_credit_note: "Alacak Notu Kaydet",
  save_CreditNote: "Alacak Notu Kaydet",
  save_delivery_note: "\u0130rsaliye Kaydet",
  save_DeliveryNote: "\u0130rsaliye Kaydet",
  save_invoice: "Fatura Kaydet",
  save_Invoice: "Fatura Kaydet",
  save_order: "Sipari\u015F Kaydet",
  save_Order: "Sipari\u015F Kaydet",
  save_quote: "Teklif Kaydet",
  save_Quote: "Teklif Kaydet",
  "save-material": "Malzeme Kaydet",
  save: "Kaydet",
  search: "Ara",
  "secondary-details": "Ek Detaylar",
  seller: "Sat\u0131\u015F Temsilcisi",
  send: "\u015Eifre s\u0131f\u0131rlama talebi g\xF6nder",
  shelf: "Raf",
  "signature-customer": "M\xFC\u015Fteri \u0130mzas\u0131",
  "signature-delivery": "Teslimat\u0131 onaylamak i\xE7in imzalay\u0131n",
  "signature-seller": "Sat\u0131c\u0131 \u0130mzas\u0131",
  start: "Ba\u015Flat",
  "stock-movement-details": "Stok Hareketi Detaylar\u0131",
  stock: "Stok",
  street: "Sokak",
  subtotal: "Ara Toplam",
  "supplier-details": "Tedarik\xE7i Detaylar\u0131",
  supplier: "Tedarik\xE7i",
  suppliers: "Tedarik\xE7iler",
  "tax-in": "KDV Dahil",
  "tax-out": "KDV Hari\xE7",
  tax: "KDV",
  "tax(%)": "KDV(%)",
  taxId: "KDV Numaras\u0131",
  taxID: "KDV Numaras\u0131",
  "timed-out": "Hareketsizlik nedeniyle oturumunuz kapat\u0131ld\u0131. L\xFCtfen tekrar giri\u015F yap\u0131n.",
  "to-pay": "\xD6denecek",
  "total-reduction": "Toplam \u0130ndirim",
  "total-tax": "Toplam KDV",
  "total-to-pay": "\xD6denecek Toplam",
  "total-value-excl-tax": "KDV Hari\xE7 Toplam",
  "total-value": "Toplam De\u011Fer",
  total: "Toplam",
  type: "T\xFCr",
  unknown: "Di\u011Fer",
  "user-details": "Kullan\u0131c\u0131 Detaylar\u0131",
  "user-modify": "Kullan\u0131c\u0131y\u0131 D\xFCzenle",
  user: "Kullan\u0131c\u0131",
  username: "Kullan\u0131c\u0131 Ad\u0131",
  users: "Kullan\u0131c\u0131lar",
  "valid-until": "Ge\xE7erlilik Tarihi",
  value: "De\u011Fer",
  warehouse: "Depo",
  worker: "\xC7al\u0131\u015Fan",
  yes: "Evet",
  z: "Z",
  zip: "Posta Kodu",
  "please-update": "Devam etmek i\xE7in l\xFCtfen g\xFCncelleyin.",
  "download-update": "G\xFCncellemeyi \u0130ndir",
  delete: "Sil",
  open: "A\xE7",
  "choose-language": "Dil Se\xE7in",
  "new-establishment": "Yeni Kurulu\u015F",
  "details-establishment": "Kurulu\u015F Detaylar\u0131",
  "modify-establishment": "Kurulu\u015Fu D\xFCzenle",
  "phone-1": "Telefon",
  "phone-2": "Telefon 2",
  "tax-id": "Vergi Numaras\u0131",
  "bank-account-1": "Banka Hesab\u0131",
  "bank-account-2": "Banka Hesab\u0131 2",
  "bank-account-3": "Banka Hesab\u0131 3",
  "establishment-details": "Kurulu\u015F Detaylar\u0131",
  "stock-details": "Stok Detaylar\u0131",
  weight: "kg (A\u011F\u0131rl\u0131k)",
  width: "m (Geni\u015Flik)",
  area: "m\xB2 (Alan)",
  length: "m (Uzunluk)",
  volume: "l/m\xB3 (Hacim)",
  height: "m (Y\xFCkseklik)",
  "invalid-number": "Ge\xE7ersiz numara",
  unit: "Birim",
  collections: "Koleksiyonlar",
  "add-collection": "Koleksiyon Ekle",
  "new-tag": "Yeni Etiket",
  edit: "D\xFCzenle",
  "collection-details": "Koleksiyon Detaylar\u0131",
  "list-payments": "\xD6deme Listesi",
  "list-users": "Kullan\u0131c\u0131 Listesi",
  preview: "\xD6nizleme",
  "external-id": "Ba\u011Fl\u0131 Numara",
  origin: "Ba\u011Fl\u0131 Servis",
  "sale-details": "Sat\u0131\u015F Detaylar\u0131",
  addresses: "Adresler",
  "convert-to-credit_note": "Alacak Notu Olu\u015Ftur",
  "quote-details": "Teklif Detaylar\u0131",
  "required-field": "Gerekli alan",
  "user-or-password-invalid": "Kullan\u0131c\u0131 veya \u015Fifre ge\xE7ersiz",
  date_dispatch: "\u0130rsaliye Tarihi",
  "modify-credit_note": "Alacak Notu D\xFCzenle",
  "change-password": "\u015Eifre de\u011Fi\u015Ftir",
  "reset-password": "\u015Eifreyi s\u0131f\u0131rla",
  "current-password": "Mevcut \u015Eifre",
  "new-password": "Yeni \u015Eifre",
  "password-confirm": "\u015Eifreyi Onayla",
  "password-too-short": "\u015Eifre en az 8 karakter uzunlu\u011Funda olmal\u0131d\u0131r",
  "password-confirm-not-match": "\u015Eifreler e\u015Fle\u015Fmiyor",
  "password-must-contain-number": "\u015Eifre en az bir say\u0131 i\xE7ermelidir",
  "password-updated": "\u015Eifre g\xFCncellendi",
  "password-update-failed": "\u015Eifre g\xFCncelleme ba\u015Far\u0131s\u0131z oldu",
  "password-must-contain-letter": "\u015Eifre en az bir harf i\xE7ermelidir",
  "user-invalid": "Kullan\u0131c\u0131 yap\u0131land\u0131rmas\u0131 ge\xE7ersiz.",
  "pincode-invalid": "Pin kodu ge\xE7ersiz",
  "error-updating-document": "Dok\xFCman g\xFCncellenirken hata olu\u015Ftu",
  "error-creating-document": "Dok\xFCman olu\u015Fturulurken hata olu\u015Ftu",
  "no-address": "Hi\xE7bir adres se\xE7ilmedi",
  "confirm-delete": "Silme Onayla",
  "confirm-delete-text": "Bu verileri silmek istedi\u011Finize emin misiniz? Bu i\u015Flem geri al\u0131namaz.",
  "address-details": "Adres Detaylar\u0131",
  "document-prefixes": "Dok\xFCman \xD6nekleri",
  companies: "\u015Eirketler",
  "modify-purchase": "Sat\u0131n Al\u0131m\u0131 De\u011Fi\u015Ftir",
  date_purchase: "Sat\u0131n Al\u0131m Tarihi",
  other: "Di\u011Fer",
  cheque: "\xC7ek",
  "choose-establishment": "Kurum Se\xE7",
  "invalid-email": "Ge\xE7ersiz E-posta",
  "purchase-no-file": "Sat\u0131n Alma faturas\u0131n\u0131 PDF bi\xE7iminde y\xFCkleyin.",
  "return-package": "Ambalaj \u0130adesi",
  "password-reset-request": "\u015Eifre s\u0131f\u0131rlama iste\u011Fi",
  "password-reset-request-message": "Hesab\u0131n\u0131z i\xE7in dijital platformumuzda bir \u015Fifre s\u0131f\u0131rlama iste\u011Fi g\xF6nderildi.",
  "to-password-reset-form": "\u015Eifre s\u0131f\u0131rlama formuna git",
  "password-reset-alternate": "E\u011Fer d\xFC\u011Fme \xE7al\u0131\u015Fm\u0131yorsa, buraya t\u0131klay\u0131n veya \u015Fifrenizi s\u0131f\u0131rlamak i\xE7in bu ba\u011Flant\u0131y\u0131 kullan\u0131n"
};

// lib/localization/localization.ts
var locales = {
  en: enjson,
  fr: frjson,
  tr: trjson,
  nl: nljson
};
var t = (key, lang) => {
  let res = key;
  let locale = lang.toLowerCase();
  if (!lang) {
    locale = "en";
  }
  try {
    res = locales[locale][key];
  } catch (e) {
    console.error("Translation not found for key:", key, "lang:", lang);
    console.error(e);
  }
  return res;
};

// lib/pdf/common/invoicingdetails.ts
var pdfInvoicingDetails = ({
  doc,
  document: invoiceDoc,
  x,
  y,
  width
}) => {
  const tr = (key) => {
    try {
      return t(key, invoiceDoc.customer.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const customer = invoiceDoc.customer;
  const address = invoiceDoc.docAddress;
  doc.fontSize(10).text(`${tr("invoicing")}: ` + customer.firstName + " " + customer.lastName, x, y, {
    width,
    align: "left"
  });
  doc.text(address.street + " " + address.door, {
    width,
    align: "left"
  });
  if (address.floor) {
    doc.text(`${tr("floor")}: ` + address.floor, {
      width,
      align: "left"
    });
  }
  if (address.zip || address.city) {
    doc.text(address.zip + " " + address.city, {
      width,
      align: "left"
    });
  }
  if (address.province || address.country) {
    doc.text(address.province + " " + address.country, {
      width,
      align: "left"
    });
  }
  return doc.y;
};

// lib/pdf/common/productstable.ts
var generateTableRow = (doc, y, name, description, price, amount, reduction, tax, subtotal, isHeader = false) => {
  const pageSize = "A4";
  const columnCount = 18;
  const flexBoxTableRow = ({ flex, column }) => flexBox({ pageSize, originY: y, flex, column, columnCount });
  const nameBox = flexBoxTableRow({ flex: 4, column: 1 });
  if (isHeader) {
    doc.lineWidth(17);
    const bgY = y + 4;
    doc.lineCap("butt").moveTo(20, bgY).lineTo(575, bgY).stroke("black");
  }
  let newY = nameBox.y;
  doc.fontSize(9).fillColor(isHeader ? "white" : "black").text(name, nameBox.x + 25, nameBox.y, { width: nameBox.width - 35, align: "left" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(description, 125, nameBox.y, { width: 90, align: "left" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(price, 225, nameBox.y, { width: 70, align: "right" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(amount, 300, nameBox.y, { width: 50, align: "right" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(reduction, 365, nameBox.y, { width: 50, align: "right" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(tax, 425, nameBox.y, { width: 70, align: "right" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(subtotal, 500, nameBox.y, { width: 65, align: "right" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  if (!isHeader) {
    doc.lineWidth(1);
    doc.lineCap("butt").moveTo(20, newY).lineTo(575, newY).stroke("black");
  }
  return newY + 5;
};
var generateProductTable = (doc, documentProducts, y, document) => {
  const tr = (key) => {
    try {
      return t(key, document.customer.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  let invoiceTableTop = y + 5;
  let showReduction = false;
  if (documentProducts.find((dp) => dp.reduction && Number(dp.reduction) > 0)) {
    showReduction = true;
  }
  let position = generateTableRow(
    doc,
    invoiceTableTop,
    tr("name"),
    tr("description"),
    tr("price"),
    tr("amount"),
    showReduction ? tr("reduction") : "",
    tr("tax"),
    tr("subtotal"),
    true
  );
  for (let i = 0; i < documentProducts.length; i++) {
    const item = documentProducts[i];
    position = generateTableRow(
      doc,
      position,
      item.name,
      item.description,
      formatCurrency(Number(item.price), document.currency),
      Number(item.amount).toFixed(2),
      showReduction ? Number(item.reduction).toFixed(2) + "%" : "",
      formatCurrency(Number(item.totalTax), document.currency),
      formatCurrency(Number(item.totalWithTaxAfterReduction), document.currency)
    );
  }
  return doc.y;
};

// lib/pdf/common/deliverydetails.ts
var pdfDeliveryDetails = ({
  doc,
  document: invoiceDoc,
  x,
  y,
  width
}) => {
  const tr = (key) => {
    try {
      return t(key, invoiceDoc.customer.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const address = invoiceDoc.delAddress;
  doc.fontSize(10).text(`${tr("delivery")}: `, x, y, {
    width,
    align: "left"
  });
  doc.text(address.street + " " + address.door, {
    width,
    align: "left"
  });
  if (address.floor) {
    doc.text(`${tr("floor")}: ` + address.floor, {
      width,
      align: "left"
    });
  }
  if (address.zip || address.city) {
    doc.text(address.zip + " " + address.city, {
      width,
      align: "left"
    });
  }
  if (address.province || address.country) {
    doc.text(address.province + " " + address.country, {
      width,
      align: "left"
    });
  }
  return doc.y;
};

// lib/pdf/common/paymentdetails.ts
var pdfPaymentDetails = ({ doc, document: invoiceDoc, x, y, width }) => {
  const tr = (key) => {
    try {
      return t(key, invoiceDoc.customer.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const establishment = invoiceDoc.establishment;
  const address = establishment.address;
  doc.fontSize(10).text(address.street + " " + address.door, x, y, {
    width,
    align: "left"
  });
  if (address.floor) {
    doc.text("Floor: " + address.floor, {
      width,
      align: "left"
    });
  }
  if (address.zip || address.city) {
    doc.text(address.zip + " " + address.city, {
      width,
      align: "left"
    });
  }
  if (address.province || address.country) {
    doc.text(address.province + " " + address.country, {
      width,
      align: "left"
    });
  }
  if (establishment.bankAccount1) {
    doc.text(establishment.bankAccount1, {
      width,
      align: "left"
    });
  }
  if (establishment.bankAccount2) {
    doc.text(establishment.bankAccount2, {
      width,
      align: "left"
    });
  }
  if (establishment.bankAccount3) {
    doc.text(establishment.bankAccount3, {
      width,
      align: "left"
    });
  }
  return doc.y;
};

// lib/pdf/common/taxtotals.ts
var taxTable = ({ doc, x, endY, document }) => {
  const tr = (key) => t(key, document.customer.preferredLanguage);
  let taxRates = [];
  const documentProducts = document.products;
  documentProducts.forEach((docProd, i) => {
    if (!taxRates.includes(docProd.tax)) {
      taxRates.push(docProd.tax);
    }
  });
  taxRates = taxRates.sort((a, b) => a - b);
  doc.fontSize(10);
  taxRates.map((taxRate, index) => {
    doc.text(`${tr("total-tax")} ` + Number(taxRate).toFixed(0) + "%:", x, endY - index * 15).text(
      formatCurrency(
        documentProducts.filter((dp) => dp.tax === taxRate).reduce((acc, dp) => acc + Number(dp.totalTax), 0),
        document.currency
      ),
      x + 80,
      endY - index * 15,
      {
        align: "right",
        width: 60
      }
    );
  });
  return endY - taxRates.length * 15;
};

// lib/pdf/common/pdfhead.ts
var pdfHead = async ({
  doc,
  document,
  logoBuffer,
  pageLeft,
  pageTop
}) => {
  const tr = (key) => {
    try {
      return t(key, document.customer.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const columnCount = 11;
  const flexBoxHead = ({ flex, column }) => flexBox({ pageSize: "A4", originY: pageTop + 5, flex, column, columnCount });
  const imageBox = flexBoxHead({ flex: 4, column: 1 });
  if (logoBuffer) {
    doc.image(logoBuffer, pageLeft, pageTop, { fit: [imageBox.width, 50] });
  } else {
    const response = await fetch(document.establishment.logo.url);
    logoBuffer = Buffer.from(await response.arrayBuffer());
    doc.image(logoBuffer, pageLeft, pageTop, { fit: [imageBox.width, 50] });
  }
  let establishmentDetailsBox = flexBoxHead({ flex: 3, column: 6 });
  establishmentDetailsBox.x += 20;
  establishmentDetailsBox.width -= 20;
  doc.fontSize(10).text(document.establishment.name, establishmentDetailsBox.x, establishmentDetailsBox.y, {
    width: establishmentDetailsBox.width,
    align: "left"
  });
  if (document.establishment.phone) {
    doc.text(document.establishment.phone, {
      width: establishmentDetailsBox.width
    });
  }
  if (document.establishment.phone2) {
    doc.text(document.establishment.phone2, {
      width: establishmentDetailsBox.width
    });
  }
  if (document.establishment.taxID) {
    doc.text(document.establishment.taxID, {
      width: establishmentDetailsBox.width
    });
  }
  let invoiceDetailsBox = flexBoxHead({ flex: 3, column: 8 });
  const validDate = new Date(document.date);
  validDate.setDate(validDate.getDate() + 15);
  invoiceDetailsBox.x += 50;
  invoiceDetailsBox.width -= 20;
  doc.fontSize(20).text(tr(document.type).toUpperCase(), invoiceDetailsBox.x + 5, invoiceDetailsBox.y, {
    width: invoiceDetailsBox.width - 5,
    align: "right"
  }).fontSize(10).text(`${tr(document.type)}: ` + document.prefix + document.number, invoiceDetailsBox.x, invoiceDetailsBox.y + 20, {
    width: invoiceDetailsBox.width,
    align: "left"
  }).text(`${tr("date")}: ` + new Date(document.date).toLocaleDateString("fr-be"), {
    width: invoiceDetailsBox.width,
    align: "left"
  });
  if (document.type == "invoice") {
    doc.text(`${tr("valid-until")}: ` + validDate.toLocaleDateString("fr-be"), {
      width: invoiceDetailsBox.width,
      align: "left"
    });
    if (document.deliveryDate) {
      doc.text(`${tr("date-dispatch")}: ` + new Date(document.deliveryDate).toLocaleDateString("fr-be"), {
        width: invoiceDetailsBox.width,
        align: "left"
      });
    }
    if (document.origin) {
      doc.text(`${tr("origin")}: ` + document.origin, {
        width: invoiceDetailsBox.width,
        align: "left"
      });
    }
    if (document.externalId) {
      doc.text(`${tr("external-id")}: ` + document.externalId, {
        width: invoiceDetailsBox.width,
        align: "left"
      });
    }
  }
};

// lib/pdf/document/creditnotepdf.ts
var import_buffer = require("buffer");
async function generateCreditNoteOut({
  document,
  logoBuffer
}) {
  const tr = (key) => {
    try {
      return t(key, document.customer.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const creditNoteDoc = document;
  const documentProducts = creditNoteDoc.products;
  return new Promise(async (resolve, reject) => {
    const pageLeft = 20;
    const pageTop = 40;
    const pageSize = "A4";
    try {
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ size: pageSize, margin: 20 });
      const buffers = [];
      doc.font("./lib/fonts/Roboto-Regular.ttf");
      doc.on("data", buffers.push.bind(buffers));
      await pdfHead({
        doc,
        document: creditNoteDoc,
        logoBuffer,
        pageLeft,
        pageTop
      });
      const detailsRowY = doc.y;
      let endOfDetailsRow = doc.y;
      const endOfPaymentDetails = pdfPaymentDetails({ doc, document: creditNoteDoc, x: pageLeft + 5, y: detailsRowY, width: 160 });
      if (endOfPaymentDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfPaymentDetails;
      }
      const endOfInvoicingDetails = pdfInvoicingDetails({ doc, document: creditNoteDoc, x: 200, y: detailsRowY, width: 165 });
      if (endOfInvoicingDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfInvoicingDetails;
      }
      const endOfDeliveryDetails = pdfDeliveryDetails({ doc, document: creditNoteDoc, x: 380, y: detailsRowY, width: 165 });
      if (endOfDeliveryDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfDeliveryDetails;
      }
      generateProductTable(doc, documentProducts, endOfDetailsRow, creditNoteDoc);
      let totalsXNames = 350;
      let totalXValues = 480;
      let totalsY = pageSizesDimensions[pageSize].height - 40;
      doc.fontSize(13);
      doc.lineWidth(1);
      doc.text(tr("total-value-excl-tax"), totalsXNames, totalsY - 45);
      doc.text(tr("total-tax"), totalsXNames, totalsY - 30);
      doc.lineWidth(1);
      doc.lineCap("butt").moveTo(350, totalsY - 10).lineTo(575, totalsY - 10).stroke("black");
      doc.text(tr("total"), totalsXNames, totalsY);
      doc.text(formatCurrency(Number(creditNoteDoc.total) - Number(creditNoteDoc.totalTax), creditNoteDoc.currency), totalXValues, totalsY - 45, {
        align: "right"
      });
      doc.text(formatCurrency(Number(creditNoteDoc.totalTax), creditNoteDoc.currency), totalXValues, totalsY - 30, {
        align: "right"
      });
      doc.text(formatCurrency(Number(creditNoteDoc.total), creditNoteDoc.currency), totalXValues, totalsY, {
        align: "right"
      });
      taxTable({
        doc,
        x: totalsXNames - 150,
        endY: pageSizesDimensions[pageSize].height - 40,
        document
      });
      doc.end();
      doc.on("end", () => {
        const pdfData = import_buffer.Buffer.concat(buffers);
        resolve({
          filename: `creditnote_${document.number}.pdf`,
          content: pdfData,
          contentType: "application/pdf"
        });
      });
    } catch (error) {
      console.error("error on pdf generation (creditnote): ", error);
      reject(`Error generating creditnote: ${error}`);
    }
  });
}

// lib/formatters/dateformatters.ts
var dateFormatBe = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-FR");
};
var dateFormatOnlyDate = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

// lib/pdf/common/paymenthistory.ts
var paymentsTable = ({ doc, x, yEnd, payments, invoiceDoc }) => {
  const tr = (key) => {
    try {
      return t(key, invoiceDoc.customer.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  doc.fontSize(8);
  payments.forEach((payment, i) => {
    doc.text(dateFormatBe(payment.timestamp), x, yEnd - 10 * (i + 1));
    doc.text(tr(payment.type), x + 55, yEnd - 10 * (i + 1));
    doc.text(formatCurrency(Number(payment.value), invoiceDoc.currency), x + 150, yEnd - 10 * (i + 1), {
      width: 75,
      align: "right"
    });
  });
  doc.fontSize(10);
  doc.text(`${tr("payment-history")}:`, x, yEnd - 10 * payments.length - 15);
};

// lib/pdf/document/invoicepdf.ts
var import_buffer2 = require("buffer");

// lib/pdf/common/packagereturntotals.ts
var returnPackage = ({ doc, x, endY, document }) => {
  const extraConfigReturnPackage = document.establishment?.documentExtras?.returnPackage ?? {};
  const documentExtras = document.extras?.values ?? [];
  const extrasParsed = [];
  try {
    documentExtras.forEach((extra) => {
      if (extra.type === "returnPackage") {
        try {
          extrasParsed.push({
            amount: Number(extra.amount) || 0,
            price: Number(extra.price) || 0,
            value: Number(extra.value) || 0
          });
        } catch (error) {
          console.error(error);
        }
      }
    });
  } catch (error) {
    console.error(error);
  }
  if (extraConfigReturnPackage.active === true && extraConfigReturnPackage.documentTypes.includes(document.type) && extrasParsed.length > 0 && extrasParsed.some((extra) => extra.value > 0)) {
    doc.fontSize(13).text(t("return-package", document.customer.preferredLanguage), x, endY);
    let tableY = endY + 15;
    extrasParsed.forEach((extra, index) => {
      const rowY = tableY + index * 15;
      doc.fontSize(10).text(extra.amount.toFixed(0), x, rowY, { align: "right", width: 30 }).text("x", x + 46, rowY).text(formatCurrency(extra.price, document.currency ?? "EUR"), x + 58, rowY, { align: "right", width: 51 }).text("=", x + 112, rowY).text(formatCurrency(extra.value, document.currency ?? "EUR"), x + 114, rowY, { align: "right", width: 62 });
    });
    const total = extrasParsed.reduce((sum, extra) => sum + extra.value, 0);
    doc.fontSize(14).text(
      `${t("total", document.customer.preferredLanguage)} =  ${formatCurrency(total, document.currency ?? "EUR")}`,
      x,
      tableY + extrasParsed.length * 15 + 5
    );
    return tableY + extrasParsed.length * 15 + 20;
  }
  return endY;
};

// lib/pdf/document/invoicepdf.ts
async function generateInvoiceOut({
  document,
  logoBuffer
}) {
  const tr = (key) => {
    try {
      return t(key, invoiceDoc.customer.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const invoiceDoc = document;
  const documentProducts = invoiceDoc.products;
  const payments = invoiceDoc.payments;
  return new Promise(async (resolve, reject) => {
    const pageLeft = 20;
    const pageTop = 40;
    const pageSize = "A4";
    try {
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ size: pageSize, margin: 20 });
      const buffers = [];
      doc.font("./lib/fonts/Roboto-Regular.ttf");
      doc.on("data", buffers.push.bind(buffers));
      await pdfHead({
        doc,
        document: invoiceDoc,
        logoBuffer,
        pageLeft,
        pageTop
      });
      const detailsRowY = doc.y;
      let endOfDetailsRow = doc.y;
      const endOfPaymentDetails = pdfPaymentDetails({ doc, document: invoiceDoc, x: pageLeft + 5, y: detailsRowY, width: 160 });
      if (endOfPaymentDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfPaymentDetails;
      }
      const endOfInvoicingDetails = pdfInvoicingDetails({ doc, document: invoiceDoc, x: 200, y: detailsRowY, width: 165 });
      if (endOfInvoicingDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfInvoicingDetails;
      }
      const endOfDeliveryDetails = pdfDeliveryDetails({ doc, document: invoiceDoc, x: 380, y: detailsRowY, width: 165 });
      if (endOfDeliveryDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfDeliveryDetails;
      }
      generateProductTable(doc, documentProducts, endOfDetailsRow, invoiceDoc);
      let totalsXKeys = 350;
      let totalXValues = 480;
      let totalsY = pageSizesDimensions[pageSize].height - 40;
      doc.fontSize(13);
      doc.lineWidth(1);
      doc.lineCap("butt").moveTo(350, totalsY - 85).lineTo(575, totalsY - 85).stroke("black");
      doc.text(tr("already-paid"), totalsXKeys, totalsY - 75);
      doc.text(tr("total-value-excl-tax"), totalsXKeys, totalsY - 60);
      doc.text(tr("total-tax"), totalsXKeys, totalsY - 45);
      doc.text(tr("total"), totalsXKeys, totalsY - 30);
      doc.lineWidth(1);
      doc.lineCap("butt").moveTo(350, totalsY - 10).lineTo(575, totalsY - 10).stroke("black");
      doc.text(tr("to-pay"), totalsXKeys, totalsY);
      doc.text(formatCurrency(Number(invoiceDoc.totalPaid), invoiceDoc.currency), totalXValues, totalsY - 75, {
        align: "right"
      });
      doc.text(formatCurrency(Number(invoiceDoc.total) - Number(invoiceDoc.totalTax), invoiceDoc.currency), totalXValues, totalsY - 60, {
        align: "right"
      });
      doc.text(formatCurrency(Number(invoiceDoc.totalTax), invoiceDoc.currency), totalXValues, totalsY - 45, {
        align: "right"
      });
      doc.text(formatCurrency(Number(invoiceDoc.total), invoiceDoc.currency), totalXValues, totalsY - 30, {
        align: "right"
      });
      doc.text(formatCurrency(Number(invoiceDoc.totalToPay), invoiceDoc.currency), totalXValues, totalsY, {
        align: "right"
      });
      paymentsTable({ doc, x: totalsXKeys, yEnd: totalsY - 92, payments, invoiceDoc });
      returnPackage({ doc, x: pageLeft, endY: totalsY - 92, document });
      taxTable({
        doc,
        x: totalsXKeys - 150,
        endY: pageSizesDimensions[pageSize].height - 40,
        document
      });
      doc.end();
      doc.on("end", () => {
        const pdfData = import_buffer2.Buffer.concat(buffers);
        resolve({
          filename: `invoice_${document.number}.pdf`,
          content: pdfData,
          contentType: "application/pdf"
        });
      });
    } catch (error) {
      console.error("error on pdf generation (invoice): ", error);
      reject(`Error generating invoice: ${error}`);
    }
  });
}

// lib/mail/sendmail.ts
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
    let bc = "test@huseyinonal.com";
    if (bcc) {
      bc += ", " + bcc;
    }
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
      bcc: bc,
      attachments,
      subject,
      html: templatedMail({
        content: html,
        img64: establishment.logo.url
      })
    };
    transporter.sendMail(mailOptionsClient, (error) => {
      if (error) {
        console.error("mail error", error);
        return false;
      } else {
        console.info("mail sent");
        return true;
      }
    });
  } catch (e) {
    console.error("mail error", e);
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

// lib/notifications/documentemail.ts
var sendDocumentEmail = async ({ documentId, context }) => {
  try {
    const postedDocument = await context.sudo().query.Document.findOne({
      where: { id: documentId },
      query: "prefix number extras date externalId currency origin totalTax totalPaid extras totalToPay total deliveryDate type payments { value timestamp type } products { name reduction description price amount totalTax totalWithTaxAfterReduction tax } delAddress { street door zip city floor province country } docAddress { street door zip city floor province country } customer { email email2 firstName lastName phone customerCompany preferredLanguage customerTaxNumber } establishment { name bankAccount1 bankAccount2 bankAccount3 taxID phone documentExtras phone2 company { emailHost emailPort emailUser emailPassword emailUser } address { street door zip city floor province country } logo { url } }"
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
        html: `<p>Beste ${postedDocument.customer.firstName + " " + postedDocument.customer.lastName},</p><p>In bijlage vindt u het document voor ons recentste transactie.</p><p>Met vriendelijke groeten.</p><p>${postedDocument.establishment.name}</p>`
      });
    }
  } catch (error) {
    console.error(`Notification failure: ${error}`);
  }
};

// lib/countries.ts
var countryNameToAbbreviation = (name) => {
  const abbreviaton = countries.find((country) => country.names.find((countryName) => countryName.toLowerCase() == name.toLowerCase()))?.alpha2;
  return abbreviaton ?? name;
};
var countries = [
  {
    id: 40,
    name: "Austria",
    names: ["Autriche", "\xD6sterreich", "Austria", "\xC1ustria", "Oostenrijk", "Avusturya"],
    alpha2: "at",
    alpha3: "aut"
  },
  {
    id: 56,
    name: "Belgium",
    names: ["Belgique", "Belgien", "Belgie", "Belgio", "B\xE9lgica", "Belgi\xEB", "Belgia", "Bel\xE7ika", "Belgium"],
    alpha2: "be",
    alpha3: "bel"
  },
  {
    id: 100,
    name: "Bulgaria",
    names: ["Bulgarie", "Bulgarien", "Bulg\xE1ria", "Bulgarije", "Bu\u0142garia", "Bulgaristan", "Bulgaria"],
    alpha2: "bg",
    alpha3: "bgr"
  },
  {
    id: 191,
    name: "Croatia",
    names: ["Croatie", "Kroatien", "Croacia", "Croazia", "Cro\xE1cia", "Kroati\xEB", "Chorwacja", "H\u0131rvatistan", "Croatia"],
    alpha2: "hr",
    alpha3: "hrv"
  },
  {
    id: 203,
    name: "Czechia",
    names: ["Tch\xE9quie", "Tschechien", "Rep\xFAblica Checa", "Rep. Ceca", "Ch\xE9quia", "Tsjechi\xEB", "Czechy", "\xC7ekya", "Czechia"],
    alpha2: "cz",
    alpha3: "cze"
  },
  {
    id: 208,
    name: "Denmark",
    names: ["Danemark", "D\xE4nemark", "Dinamarca", "Danimarca", "Denemarken", "Dania", "Danimarka", "Denmark"],
    alpha2: "dk",
    alpha3: "dnk"
  },
  {
    id: 233,
    name: "Estonia",
    names: ["Estonie", "Estland", "Estonia", "Est\xF3nia", "Estonya"],
    alpha2: "ee",
    alpha3: "est"
  },
  {
    id: 246,
    name: "Finland",
    names: ["Finlande", "Finnland", "Finlandia", "Finl\xE2ndia", "Finland", "Finlandiya"],
    alpha2: "fi",
    alpha3: "fin"
  },
  {
    id: 250,
    name: "France",
    names: ["France", "Frankreich", "Francia", "Fran\xE7a", "Frankrijk", "Francja", "Fransa"],
    alpha2: "fr",
    alpha3: "fra"
  },
  {
    id: 276,
    name: "Germany",
    names: ["Allemagne", "Deutschland", "Alemania", "Germania", "Alemanha", "Duitsland", "Niemcy", "Almanya", "Germany"],
    alpha2: "de",
    alpha3: "deu"
  },
  {
    id: 300,
    name: "Greece",
    names: ["Gr\xE8ce", "Griechenland", "Grecia", "Gr\xE9cia", "Griekenland", "Grecja", "Yunanistan", "Greece"],
    alpha2: "gr",
    alpha3: "grc"
  },
  {
    id: 348,
    name: "Hungary",
    names: ["Hongrie", "Ungarn", "Hungr\xEDa", "Ungheria", "Hungria", "Hongarije", "W\u0119gry", "Macaristan", "Hungary"],
    alpha2: "hu",
    alpha3: "hun"
  },
  {
    id: 372,
    name: "Ireland",
    names: ["Irlande", "Irland", "Irlanda", "Ierland", "Irlandia", "\u0130rlanda", "Ireland"],
    alpha2: "ie",
    alpha3: "irl"
  },
  {
    id: 380,
    name: "Italy",
    names: ["Italie", "Italien", "Italia", "It\xE1lia", "Itali\xEB", "W\u0142ochy", "\u0130talya", "Italy"],
    alpha2: "it",
    alpha3: "ita"
  },
  {
    id: 428,
    name: "Latvia",
    names: ["Lettonie", "Lettland", "Letonia", "Lettonia", "Let\xF4nia", "Letland", "\u0141otwa", "Letonya", "Latvia"],
    alpha2: "lv",
    alpha3: "lva"
  },
  {
    id: 440,
    name: "Lithuania",
    names: ["Lituanie", "Litauen", "Lituania", "Litu\xE2nia", "Litouwen", "Litwa", "Litvanya", "Lithuania"],
    alpha2: "lt",
    alpha3: "ltu"
  },
  {
    id: 442,
    name: "Luxembourg",
    names: ["Luxembourg", "Luxemburg", "Luxemburgo", "Lussemburgo", "Luksemburg", "L\xFCksemburg"],
    alpha2: "lu",
    alpha3: "lux"
  },
  {
    id: 470,
    name: "Malta",
    names: ["Malte", "Malta"],
    alpha2: "mt",
    alpha3: "mlt"
  },
  {
    id: 528,
    name: "Netherlands",
    names: ["Pays-Bas", "Niederlande", "Pa\xEDses Bajos", "Paesi Bassi", "Pa\xEDses Baixos", "Nederland", "Holandia", "Hollanda", "Netherlands"],
    alpha2: "nl",
    alpha3: "nld"
  },
  {
    id: 616,
    name: "Poland",
    names: ["Pologne", "Polen", "Polonia", "Pol\xF3nia", "Polska", "Polonya", "Poland"],
    alpha2: "pl",
    alpha3: "pol"
  },
  {
    id: 620,
    name: "Portugal",
    names: ["Portugal", "Portogallo", "Portugalia", "Portekiz"],
    alpha2: "pt",
    alpha3: "prt"
  },
  {
    id: 642,
    name: "Romania",
    names: ["Roumanie", "Rum\xE4nien", "Rumania", "Romania", "Rom\xE9nia", "Roemeni\xEB", "Rumunia", "Romanya"],
    alpha2: "ro",
    alpha3: "rou"
  },
  {
    id: 703,
    name: "Slovakia",
    names: ["Slovaquie", "Slowakei", "Eslovaquia", "Slovacchia", "Eslov\xE1quia", "Slowakije", "S\u0142owacja", "Slovakya", "Slovakia"],
    alpha2: "sk",
    alpha3: "svk"
  },
  {
    id: 705,
    name: "Slovenia",
    names: ["Slov\xE9nie", "Slowenien", "Eslovenia", "Slovenia", "Eslov\xEAnia", "Sloveni\xEB", "S\u0142owenia", "Slovenya"],
    alpha2: "si",
    alpha3: "svn"
  },
  {
    id: 724,
    name: "Spain",
    names: ["Espagne", "Spanien", "Espa\xF1a", "Spagna", "Espanha", "Spanje", "Hiszpania", "\u0130spanya", "Spain"],
    alpha2: "es",
    alpha3: "esp"
  },
  {
    id: 752,
    name: "Sweden",
    names: ["Su\xE8de", "Schweden", "Suecia", "Svezia", "Su\xE9cia", "Zweden", "Szwecja", "\u0130sve\xE7", "Sweden"],
    alpha2: "se",
    alpha3: "swe"
  },
  {
    id: 756,
    name: "Switzerland",
    names: ["Suisse", "Schweiz", "Suiza", "Svizzera", "Su\xED\xE7a", "Zwitserland", "Szwajcaria", "\u0130svi\xE7re", "Switzerland"],
    alpha2: "ch",
    alpha3: "che"
  },
  {
    id: 826,
    name: "United Kingdom of Great Britain and Northern Ireland",
    names: [
      "Royaume-Uni",
      "Vereinigtes K\xF6nigreich",
      "Reino Unido",
      "Regno Unito",
      "Verenigd Koninkrijk",
      "Wielka Brytania",
      "Birle\u015Fik Krall\u0131k",
      "United Kingdom of Great Britain and Northern Ireland"
    ],
    alpha2: "gb",
    alpha3: "gbr"
  }
];

// lib/peppol/xml/utils/sanitization.ts
var sanitizeText = (text2) => {
  return text2.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
};

// lib/mail/transformEmail.ts
var transformEmail = ({ email, companyId }) => {
  let parts = email.split("@");
  let localPart = parts[0].split("+")[0];
  let domainPart = parts[1];
  return localPart + "+" + companyId + "@" + domainPart;
};
var reverseTransformEmail = (email) => {
  let [localPart, domainPart] = email.split("@");
  let originalLocalPart = localPart.split("+")[0];
  return originalLocalPart + "@" + domainPart;
};

// lib/peppol/xml/components/party.ts
var party = ({ party: party2 }) => {
  const taxIDCleaned = ({ taxID }) => {
    let cleaned = taxID;
    if (cleaned.includes(":")) {
      cleaned = cleaned.split(":").pop() || "";
    }
    return cleaned.replace("BE", "").replaceAll(".", "").replaceAll(" ", "");
  };
  const taxIDWithCountry = ({ taxID }) => {
    let cleaned = taxID;
    if (cleaned.includes(":")) {
      cleaned = cleaned.split(":").pop() || "";
    }
    return cleaned.replaceAll(".", "").replaceAll(" ", "");
  };
  return `<cac:Party>
            ${party2.taxID ? `<cbc:EndpointID schemeID="BE:CBE">${taxIDCleaned({ taxID: party2.taxID })}</cbc:EndpointID>
                <cac:PartyIdentification>
                    <cbc:ID schemeAgencyID="BE" schemeAgencyName="KBO" schemeURI="http://www.e-fff.be/KBO">${taxIDCleaned({ taxID: party2.taxID })}</cbc:ID>
                </cac:PartyIdentification>
                <cac:PartyTaxScheme>
                    <cbc:CompanyID>${taxIDWithCountry({ taxID: party2.taxID })}</cbc:CompanyID>
                    <cac:TaxScheme>
                        <cbc:ID>VAT</cbc:ID>
                    </cac:TaxScheme>
                </cac:PartyTaxScheme>
                <cac:PartyLegalEntity>
                    <cbc:RegistrationName>${sanitizeText(party2.name)}</cbc:RegistrationName>
                    <cbc:CompanyID schemeID="BE:CBE">${taxIDCleaned({ taxID: party2.taxID })}</cbc:CompanyID>
                </cac:PartyLegalEntity>` : ``}
            <cac:PartyName>
                <cbc:Name>${sanitizeText(party2.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${sanitizeText(party2.address.street ?? "")}</cbc:StreetName>
                <cbc:BuildingNumber>${sanitizeText(party2.address.door ?? "")}</cbc:BuildingNumber>
                <cbc:CityName>${sanitizeText(party2.address.city ?? "")}</cbc:CityName>
                <cbc:PostalZone>${sanitizeText(party2.address.zip ?? "")}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>${countryNameToAbbreviation(party2.address.country)}</cbc:IdentificationCode>
                    <cbc:Name>${sanitizeText(party2.address.country)}</cbc:Name>
                </cac:Country>
            </cac:PostalAddress>
            <cac:Contact>
                <cbc:Name>${sanitizeText(party2.name)}</cbc:Name>
                <cbc:ElectronicMail>${sanitizeText(reverseTransformEmail(party2.email))}</cbc:ElectronicMail>
            </cac:Contact>
        </cac:Party>`;
};

// lib/peppol/xml/components/accountingSupplierParty.ts
var accountingSupplierParty = ({ supplierParty }) => {
  return `<cac:AccountingSupplierParty>
        ${party({
    party: supplierParty
  })}
    </cac:AccountingSupplierParty>`;
};

// lib/peppol/xml/components/accountingCustomerParty.ts
var accountingCustomerParty = ({ customerParty }) => {
  return `<cac:AccountingCustomerParty>
        ${party({
    party: {
      name: customerParty.name,
      taxID: customerParty.taxID,
      email: customerParty.email ?? "",
      address: customerParty.address
    }
  })}
    </cac:AccountingCustomerParty>`;
};

// lib/calculations/dates/addToDate.ts
function addDaysToDate(dateStr, daysToAdd) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + daysToAdd);
  return date;
}

// lib/peppol/xml/purchase/peppolpurchase.ts
var purchaseToXml = (document, pdf) => {
  try {
    const filename = `xml_${document.type}_${document.prefix ?? ""}${document.number.replaceAll("\\", "").replaceAll("/", "").replaceAll(" ", "")}_${document.id}.xml`;
    const establishment = document.establishment;
    const supplier = document.supplier;
    const documentProducts = document.products;
    let taxRates = [];
    documentProducts.forEach((product) => {
      if (!taxRates.includes(Number(product.tax))) {
        taxRates.push(Number(product.tax));
      }
    });
    taxRates = taxRates.map((tax) => {
      const totalBeforeTax2 = documentProducts.reduce((acc, product) => {
        if (Number(product.tax) === tax) {
          const subTotal = Number(product.totalWithTaxAfterReduction);
          return acc + subTotal / (1 + tax / 100);
        }
        return acc;
      }, 0);
      const totalTax2 = documentProducts.reduce((acc, product) => {
        if (Number(product.tax) === tax) {
          const subTotal = Number(product.totalWithTaxAfterReduction);
          const beforeTax = subTotal / (1 + tax / 100);
          return acc + (subTotal - beforeTax);
        }
        return acc;
      }, 0);
      return {
        rate: tax,
        totalBeforeTax: Number(totalBeforeTax2.toFixed(2)),
        totalTax: Number(totalTax2.toFixed(2))
      };
    });
    const totalTax = Number(taxRates.reduce((acc, taxRate) => acc + taxRate.totalTax, 0).toFixed(2));
    const total = Number(
      documentProducts.reduce((acc, product) => acc + Number(product.totalWithTaxAfterReduction), 0).toFixed(2)
    );
    const totalBeforeTax = Number((total - totalTax).toFixed(2));
    if (isNaN(total) || isNaN(totalBeforeTax) || isNaN(totalTax)) {
      console.error(
        "Calculation error purchase:",
        JSON.stringify({
          documentNumber: document.number,
          values: {
            total,
            totalBeforeTax,
            totalTax,
            taxRates,
            documentProducts: documentProducts.map(
              (p) => JSON.stringify({
                ...p,
                subTotal: Number(p.totalWithTaxAfterReduction),
                tax: Number(p.tax)
              })
            )
          }
        })
      );
    }
    const content = `<?xml version="1.0" encoding="utf-8"?>
<Invoice xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"
  xmlns:udt="urn:un:unece:uncefact:data:draft:UnqualifiedDataTypesSchemaModule:2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ccts="urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2"
  xmlns:stat="urn:oasis:names:specification:ubl:schema:xsd:DocumentStatusCode-1.0"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>1.0</cbc:CustomizationID>
  <cbc:ProfileID>E-FFF.BE BILLIT.BE</cbc:ProfileID>
  <cbc:ID>${document.number}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:IssueDate>${dateFormatOnlyDate(document.date)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listURI="http://www.E-FFF.be/ubl/2.0/cl/gc/BE-InvoiceCode-1.0.gc">380</cbc:InvoiceTypeCode>
  <cbc:TaxPointDate>${dateFormatOnlyDate(document.date)}</cbc:TaxPointDate>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>${filename}</cbc:ID>
    <cbc:DocumentType>CommercialInvoice</cbc:DocumentType>
    ${pdf ? `<cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="application/pdf" filename="${pdf.filename}">
      ${pdf.content.toString("base64")}
      </cbc:EmbeddedDocumentBinaryObject>
  </cac:Attachment>` : ``}
  </cac:AdditionalDocumentReference>
  ${accountingSupplierParty({
      supplierParty: {
        name: supplier.name,
        taxID: supplier.taxID,
        email: supplier.contactMail ?? "",
        address: supplier.address
      }
    })}
   ${accountingCustomerParty({
      customerParty: {
        name: establishment.name,
        taxID: establishment.taxID,
        email: establishment.company.owner.email,
        address: establishment.address
      }
    })}
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode listID="UN/ECE 4461" listName="Payment Means"
      listURI="http://docs.oasis-open.org/ubl/os-UBL-2.0-update/cl/gc/default/PaymentMeansCode-2.0.gc">
      1</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${dateFormatOnlyDate(addDaysToDate(document.date, 15).toString())}</cbc:PaymentDueDate>
  </cac:PaymentMeans>
 <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${Number(document.totalTax).toFixed(2)}</cbc:TaxAmount>
  ${taxRates.map((taxRate, i) => {
      return `<cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${Number(taxRate.totalBeforeTax).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${Number(taxRate.totalTax).toFixed(2)}</cbc:TaxAmount>
      <cbc:Percent>${taxRate.rate}</cbc:Percent>
      <cac:TaxCategory>
        <cbc:ID schemeID="UNCL5305" schemeName="Duty or tax or fee category">S</cbc:ID>
        <cbc:Name>0${i + 1}</cbc:Name>
        <cbc:Percent>${taxRate.rate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
    }).join("")}
    </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${Number(totalBeforeTax).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${Number(totalBeforeTax).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${Number(total).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${Number(total).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${documentProducts.map((docProd, i) => {
      let taxAmount = Number(docProd.totalWithTaxAfterReduction) - Number(docProd.totalWithTaxAfterReduction) / (1 + Number(docProd.tax) / 100);
      return `<cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:Note>${docProd.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")}</cbc:Note>
    <cbc:InvoicedQuantity>${Number(docProd.amount)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${(Number(docProd.totalWithTaxAfterReduction) - Number(taxAmount)).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="EUR">${Number(taxAmount).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="EUR">${(Number(docProd.totalWithTaxAfterReduction) - Number(taxAmount)).toFixed(2)}</cbc:TaxableAmount>        
        <cbc:TaxAmount currencyID="EUR">${Number(taxAmount).toFixed(2)}</cbc:TaxAmount>   
        <cbc:Percent>${Number(docProd.tax)}</cbc:Percent>   
        <cac:TaxCategory>
          <cbc:ID schemeID="UNCL5305" schemeName="Duty or tax or fee category">S</cbc:ID>
          <cbc:Name>OSS-S</cbc:Name>
          <cbc:Percent>${Number(docProd.tax)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${docProd.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID schemeID="UNCL5305" schemeName="Duty or tax or fee category">S</cbc:ID>
        <cbc:Name>OSS-S</cbc:Name>
        <cbc:Percent>${Number(docProd.tax)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
  </cac:InvoiceLine>`;
    }).join("")}
</Invoice>`;
    return {
      content,
      filename
    };
  } catch (error) {
    console.error("Error generating xml for purchase document: ", error);
    return {
      content: "",
      filename: ""
    };
  }
};

// lib/peppol/xml/invoice/peppolinvoice.ts
var invoiceToXml = (document, pdf) => {
  try {
    const filename = `xml_${document.type}_${document.prefix ?? ""}${document.number.replaceAll("\\", "").replaceAll("/", "").replaceAll(" ", "")}.xml`;
    const establishment = document.establishment;
    const customer = document.customer;
    const docAddress = document.docAddress;
    const documentProducts = document.products;
    let taxRates = [];
    documentProducts.forEach((product) => {
      if (!taxRates.includes(Number(product.tax))) {
        taxRates.push(Number(product.tax));
      }
    });
    taxRates = taxRates.map((tax) => {
      const totalBeforeTax2 = documentProducts.reduce((acc, product) => {
        if (Number(product.tax) === tax) {
          const subTotal = Number(product.totalWithTaxAfterReduction);
          return acc + subTotal / (1 + tax / 100);
        }
        return acc;
      }, 0);
      const totalTax2 = documentProducts.reduce((acc, product) => {
        if (Number(product.tax) === tax) {
          const subTotal = Number(product.totalWithTaxAfterReduction);
          const beforeTax = subTotal / (1 + tax / 100);
          return acc + (subTotal - beforeTax);
        }
        return acc;
      }, 0);
      return {
        rate: tax,
        totalBeforeTax: Number(totalBeforeTax2.toFixed(2)),
        totalTax: Number(totalTax2.toFixed(2))
      };
    });
    const totalTax = Number(taxRates.reduce((acc, taxRate) => acc + taxRate.totalTax, 0).toFixed(2));
    const total = Number(
      documentProducts.reduce((acc, product) => acc + Number(product.totalWithTaxAfterReduction), 0).toFixed(2)
    );
    const totalBeforeTax = Number((total - totalTax).toFixed(2));
    if (isNaN(total) || isNaN(totalBeforeTax) || isNaN(totalTax)) {
      console.error("Calculation error:", {
        documentNumber: document.number,
        values: {
          total,
          totalBeforeTax,
          totalTax,
          taxRates,
          documentProducts: documentProducts.map((p) => ({
            ...p,
            subTotal: Number(p.totalWithTaxAfterReduction),
            tax: Number(p.tax)
          }))
        }
      });
    }
    const content = `<?xml version="1.0" encoding="utf-8"?>
<Invoice xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"
  xmlns:udt="urn:un:unece:uncefact:data:draft:UnqualifiedDataTypesSchemaModule:2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ccts="urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2"
  xmlns:stat="urn:oasis:names:specification:ubl:schema:xsd:DocumentStatusCode-1.0"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#conformant#urn:UBL.BE:1.0.0.20180214</cbc:CustomizationID>
  <cbc:ProfileID>E-FFF.BE BILLIT.BE</cbc:ProfileID>
  <cbc:ID>${document.number}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:IssueDate>${dateFormatOnlyDate(document.date)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listURI="http://www.E-FFF.be/ubl/2.0/cl/gc/BE-InvoiceCode-1.0.gc">380</cbc:InvoiceTypeCode>
  <cbc:TaxPointDate>${dateFormatOnlyDate(document.date)}</cbc:TaxPointDate>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>${filename}</cbc:ID>
    <cbc:DocumentType>CommercialInvoice</cbc:DocumentType>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="application/pdf" filename="${pdf.filename}">
      ${pdf.content.toString("base64")}
      </cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  ${accountingSupplierParty({
      supplierParty: {
        name: establishment.name,
        taxID: establishment.taxID,
        email: establishment.company.owner.email,
        address: establishment.address
      }
    })}
  ${accountingCustomerParty({
      customerParty: {
        name: customer.firstName + " " + customer.lastName,
        taxID: customer.customerTaxNumber,
        email: customer.email,
        address: docAddress
      }
    })}
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode listID="UN/ECE 4461" listName="Payment Means"
      listURI="http://docs.oasis-open.org/ubl/os-UBL-2.0-update/cl/gc/default/PaymentMeansCode-2.0.gc">
      1</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${dateFormatOnlyDate(addDaysToDate(document.date, 15).toString())}</cbc:PaymentDueDate>
    <cac:PayeeFinancialAccount>
      <cbc:ID schemeName="IBAN">BE07068937722366</cbc:ID>
      <cac:FinancialInstitutionBranch>
        <cac:FinancialInstitution>
          <cbc:ID schemeName="BIC">GKCCBEBB</cbc:ID>
        </cac:FinancialInstitution>
      </cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${Number(document.totalTax).toFixed(2)}</cbc:TaxAmount>
  ${taxRates.map((taxRate, i) => {
      return `<cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${Number(taxRate.totalBeforeTax).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${Number(taxRate.totalTax).toFixed(2)}</cbc:TaxAmount>
      <cbc:Percent>${taxRate.rate}</cbc:Percent>
      <cac:TaxCategory>
        <cbc:ID schemeID="UNCL5305" schemeName="Duty or tax or fee category">S</cbc:ID>
        <cbc:Name>0${i + 1}</cbc:Name>
        <cbc:Percent>${taxRate.rate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
    }).join("")}
    </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${Number(totalBeforeTax).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${Number(totalBeforeTax).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${Number(total).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${Number(total).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${documentProducts.map((docProd, i) => {
      let taxAmount = Number(docProd.totalWithTaxAfterReduction) - Number(docProd.totalWithTaxAfterReduction) / (1 + Number(docProd.tax) / 100);
      return `<cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:Note>${docProd.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")}</cbc:Note>
    <cbc:InvoicedQuantity>${Number(docProd.amount)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${(Number(docProd.totalWithTaxAfterReduction) - Number(taxAmount)).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="EUR">${Number(taxAmount).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="EUR">${(Number(docProd.totalWithTaxAfterReduction) - Number(taxAmount)).toFixed(2)}</cbc:TaxableAmount>        
        <cbc:TaxAmount currencyID="EUR">${Number(taxAmount).toFixed(2)}</cbc:TaxAmount>   
        <cbc:Percent>${Number(docProd.tax)}</cbc:Percent>   
        <cac:TaxCategory>
          <cbc:ID schemeID="UNCL5305" schemeName="Duty or tax or fee category">S</cbc:ID>
          <cbc:Name>OSS-S</cbc:Name>
          <cbc:Percent>${Number(docProd.tax)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${docProd.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID schemeID="UNCL5305" schemeName="Duty or tax or fee category">S</cbc:ID>
        <cbc:Name>OSS-S</cbc:Name>
        <cbc:Percent>${Number(docProd.tax)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
  </cac:InvoiceLine>`;
    }).join("")}
</Invoice>`;
    return {
      content,
      filename
    };
  } catch (error) {
    console.error("Error generating xml for invoice document: ", error);
    return {
      content: "",
      filename: ""
    };
  }
};

// lib/peppol/xml/convert.ts
var import_promises = require("fs/promises");
var import_path2 = __toESM(require("path"));
async function writeAllXmlsToTempDir(tempDir, documents) {
  const response = await fetch(documents.at(0).establishment.logo.url);
  let logoBuffer = await Buffer.from(await response.arrayBuffer());
  await (0, import_promises.rm)(tempDir, { recursive: true, force: true });
  await (0, import_promises.mkdir)(tempDir);
  const filePaths = await Promise.all(
    documents.map(async (doc) => {
      try {
        let pdf;
        let xml;
        if (doc.type == "invoice") {
          pdf = await generateInvoiceOut({
            document: doc,
            logoBuffer
          });
          xml = invoiceToXml(doc, pdf);
        } else if (doc.type == "credit_note") {
          pdf = await generateCreditNoteOut({
            document: doc,
            logoBuffer
          });
          xml = invoiceToXml(doc, pdf);
        } else if (doc.type == "purchase") {
          if (doc.files.length > 0) {
            const response2 = await fetch(doc.files[0].url);
            const buffer = await response2.arrayBuffer();
            pdf = {
              filename: doc.files[0].name,
              content: Buffer.from(buffer),
              contentType: "application/pdf"
            };
          }
          xml = purchaseToXml(doc, pdf);
        } else if (doc.type == "credit_note_incoming") {
          if (doc.files.length > 0) {
            const response2 = await fetch(doc.files[0].url);
            const buffer = await response2.arrayBuffer();
            pdf = {
              filename: doc.files[0].name,
              content: Buffer.from(buffer),
              contentType: "application/pdf"
            };
          }
          xml = purchaseToXml(doc, pdf);
        }
        if (!xml) {
          throw new Error(`xml failed: ${doc.type}`);
        }
        const filePath = import_path2.default.join(tempDir, xml.filename);
        await (0, import_promises.writeFile)(filePath, xml.content);
        return filePath;
      } catch (error) {
        console.error("Error generating xml for document: ", doc.number, error);
        return null;
      }
    })
  );
  return filePaths.filter((path4) => path4 !== null);
}

// lib/random.ts
function generateRandomString(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// lib/eutaxes.ts
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

// lib/bol-offer-sync.ts
var bolAuthUrl = "https://login.bol.com/token?grant_type=client_credentials";
var bolApiUrl = "https://api.bol.com/retailer";
var bolTokens = [];
function bolHeaders(headersType, clientId) {
  const tokenEntry = bolTokens.find((t2) => t2.clientId === clientId);
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
  const existingTokenEntry = bolTokens.find((t2) => t2.clientId === clientId);
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
    console.log("Syncing bol for ", currCompany.name);
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
          value: bolDoc.orderItems.reduce((acc, dp) => acc + dp.unitPrice * dp.quantity, 0).toFixed(4),
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
        tax: eutaxes.find((t2) => t2.code == docAddress.country)?.standard.toFixed(4) ?? "21.0000",
        name: product.name
      });
    }
    await context.sudo().query.Document.createOne({
      data: document,
      query: "id"
    });
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

// lib/fileupload.ts
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
  const fileName = file.originalname;
  let sanitizedFileName = fileName.replaceAll(" ", "").replaceAll("/", "").replaceAll("\\", "");
  const newFileName = `${Date.now()}-${randomString}-${sanitizedFileName}`;
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

// keystone.ts
var import_fs = require("fs");

// auth.ts
var import_session = require("@keystone-6/core/session");
var import_auth = require("@keystone-6/auth");
var import_crypto = require("crypto");

// lib/mail/sendsystememail.ts
var sendSystemEmail = async ({
  recipient,
  subject,
  bcc,
  html,
  attachments
}) => {
  try {
    const nodemailer = require("nodemailer");
    let bc = "test@huseyinonal.com";
    if (bcc) {
      bc += ", " + bcc;
    }
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });
    let mailOptionsClient = {
      from: `"${process.env.MAIL_USER}" <${process.env.MAIL_USER}>`,
      to: recipient,
      bcc: bc,
      attachments,
      subject,
      html
    };
    transporter.sendMail(mailOptionsClient, (error) => {
      if (error) {
        console.error("mail error", error);
        return false;
      } else {
        console.info("mail sent");
        return true;
      }
    });
  } catch (e) {
    console.error("mail error", e);
    return false;
  }
};

// lib/mail/templates/password-reset/universal.ts
function passwordResetTemplate({
  resetToken,
  preferredLanguage,
  email,
  logo,
  company
}) {
  const resetLink = encodeURI(`${process.env.WEB_URL}/reset-password?token=${resetToken}&email=${email}`);
  return ` 
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html>
  <head>
    <!-- Compiled with Bootstrap Email version: 1.5.1 --><meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style type="text/css">
      body,table,td{font-family:Helvetica,Arial,sans-serif !important}.ExternalClass{width:100%}.ExternalClass,.ExternalClass p,.ExternalClass span,.ExternalClass font,.ExternalClass td,.ExternalClass div{line-height:150%}a{text-decoration:none}*{color:inherit}a[x-apple-data-detectors],u+#body a,#MessageViewBody a{color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit}img{-ms-interpolation-mode:bicubic}table:not([class^=s-]){font-family:Helvetica,Arial,sans-serif;mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;border-collapse:collapse}table:not([class^=s-]) td{border-spacing:0px;border-collapse:collapse}@media screen and (max-width: 600px){.w-full,.w-full>tbody>tr>td{width:100% !important}*[class*=s-lg-]>tbody>tr>td{font-size:0 !important;line-height:0 !important;height:0 !important}.s-2>tbody>tr>td{font-size:8px !important;line-height:8px !important;height:8px !important}.s-5>tbody>tr>td{font-size:20px !important;line-height:20px !important;height:20px !important}.s-10>tbody>tr>td{font-size:40px !important;line-height:40px !important;height:40px !important}}
    </style>
  </head>
  <body class="bg-light" style="outline: 0; width: 100%; min-width: 100%; height: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: Helvetica, Arial, sans-serif; line-height: 24px; font-weight: normal; font-size: 16px; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box; color: #000000; margin: 0; padding: 0; border-width: 0;" bgcolor="#f7fafc">
    <table class="bg-light body" valign="top" role="presentation" border="0" cellpadding="0" cellspacing="0" style="outline: 0; width: 100%; min-width: 100%; height: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: Helvetica, Arial, sans-serif; line-height: 24px; font-weight: normal; font-size: 16px; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box; color: #000000; margin: 0; padding: 0; border-width: 0;" bgcolor="#f7fafc">
      <tbody>
        <tr>
          <td valign="top" style="line-height: 24px; font-size: 16px; margin: 0;" align="left" bgcolor="#f7fafc">
            <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
              <tbody>
                <tr>
                  <td align="center" style="line-height: 24px; font-size: 16px; margin: 0; padding: 0 16px;">
                    <!--[if (gte mso 9)|(IE)]>
                      <table align="center" role="presentation">
                        <tbody>
                          <tr>
                            <td width="600">
                    <![endif]-->
                    <table align="center" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; margin: 0 auto;">
                      <tbody>
                        <tr>
                          <td style="line-height: 24px; font-size: 16px; margin: 0;" align="left">
                            <img class="img-fluid" src="${logo ?? "https://r2.hocecomv1.com/logo.png"}" alt="Logo" style="height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; max-width: 100%; width: 100%; border-style: none; border-width: 0;" width="100%">
                            <table class="s-10 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                              <tbody>
                                <tr>
                                  <td style="line-height: 40px; font-size: 40px; width: 100%; height: 40px; margin: 0;" align="left" width="100%" height="40">
                                    &#160;
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <table class="card" role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-radius: 6px; border-collapse: separate !important; width: 100%; overflow: hidden; border: 1px solid #e2e8f0;" bgcolor="#ffffff">
                              <tbody>
                                <tr>
                                  <td style="line-height: 24px; font-size: 16px; width: 100%; margin: 0;" align="left" bgcolor="#ffffff">
                                    <table class="card-body" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                                      <tbody>
                                        <tr>
                                          <td style="line-height: 24px; font-size: 16px; width: 100%; margin: 0; padding: 20px;" align="left">
                                            <h1 class="h3" style="padding-top: 0; padding-bottom: 0; font-weight: 500; vertical-align: baseline; font-size: 28px; line-height: 33.6px; margin: 0;" align="left">${company}</h1>
                                            <table class="s-2 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                              <tbody>
                                                <tr>
                                                  <td style="line-height: 8px; font-size: 8px; width: 100%; height: 8px; margin: 0;" align="left" width="100%" height="8">
                                                    &#160;
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <h5 class="text-teal-700" style="color: #13795b; padding-top: 0; padding-bottom: 0; font-weight: 500; vertical-align: baseline; font-size: 20px; line-height: 24px; margin: 0;" align="left">${t(
    "password-reset-request",
    preferredLanguage
  )}</h5>
                                            <table class="s-5 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                              <tbody>
                                                <tr>
                                                  <td style="line-height: 20px; font-size: 20px; width: 100%; height: 20px; margin: 0;" align="left" width="100%" height="20">
                                                    &#160;
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <table class="hr" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                                              <tbody>
                                                <tr>
                                                  <td style="line-height: 24px; font-size: 16px; border-top-width: 1px; border-top-color: #e2e8f0; border-top-style: solid; height: 1px; width: 100%; margin: 0;" align="left">
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <table class="s-5 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                              <tbody>
                                                <tr>
                                                  <td style="line-height: 20px; font-size: 20px; width: 100%; height: 20px; margin: 0;" align="left" width="100%" height="20">
                                                    &#160;
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <div class="space-y-3">
                                              <p class="text-gray-700" style="line-height: 24px; font-size: 16px; color: #4a5568; width: 100%; margin: 0;" align="left">${t(
    "password-reset-request-message",
    preferredLanguage
  )}</p>
                                            </div>
                                            <table class="s-5 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                              <tbody>
                                                <tr>
                                                  <td style="line-height: 20px; font-size: 20px; width: 100%; height: 20px; margin: 0;" align="left" width="100%" height="20">
                                                    &#160;
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <table class="hr" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                                              <tbody>
                                                <tr>
                                                  <td style="line-height: 24px; font-size: 16px; border-top-width: 1px; border-top-color: #e2e8f0; border-top-style: solid; height: 1px; width: 100%; margin: 0;" align="left">
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <table class="s-5 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                              <tbody>
                                                <tr>
                                                  <td style="line-height: 20px; font-size: 20px; width: 100%; height: 20px; margin: 0;" align="left" width="100%" height="20">
                                                    &#160;
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <table class="btn btn-primary" role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-radius: 6px; border-collapse: separate !important;">
                                              <tbody>
                                                <tr>
                                                  <td style="line-height: 24px; font-size: 16px; border-radius: 6px; margin: 0;" align="center" bgcolor="#0d6efd">
                                                    <a href="${resetLink}" target="_blank" style="color: #ffffff; font-size: 16px; font-family: Helvetica, Arial, sans-serif; text-decoration: none; border-radius: 6px; line-height: 20px; display: block; font-weight: normal; white-space: nowrap; background-color: #0d6efd; padding: 8px 12px; border: 1px solid #0d6efd;">${t(
    "to-password-reset-form",
    preferredLanguage
  )}</a>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <br>
                                            <p class="text-gray-700" style="line-height: 24px; font-size: 16px; color: #4a5568; width: 100%; margin: 0;" align="left">
                                              <a href="${resetLink}" target="_blank" style="color: #0d6efd;">${t(
    "password-reset-alternate",
    preferredLanguage
  )}: ${resetLink}</a>
                                            </p>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <table class="s-10 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                              <tbody>
                                <tr>
                                  <td style="line-height: 40px; font-size: 40px; width: 100%; height: 40px; margin: 0;" align="left" width="100%" height="40">
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
}

// auth.ts
var sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV !== "production") {
  sessionSecret = (0, import_crypto.randomBytes)(32).toString("hex");
}
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  sessionData: "id role permissions isBlocked company { id accountancy { id } } accountancy { id }",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "role", "email", "password"]
  },
  passwordResetLink: {
    sendToken: async ({ itemId, identity, token, context }) => {
      const recipient = await context.sudo().query.User.findOne({
        where: { id: itemId },
        query: "id preferredLanguage company { name logo { url } }"
      });
      const email = reverseTransformEmail(identity);
      const preferredLanguage = recipient.preferredLanguage ?? "en";
      sendSystemEmail({
        recipient: email,
        subject: t("password-reset-request", preferredLanguage),
        html: passwordResetTemplate({
          resetToken: token,
          preferredLanguage,
          email: identity,
          logo: recipient.company.logo.url,
          company: recipient.company.name
        })
      });
    },
    tokensValidForMins: 60
  }
});
var sessionMaxAge = 60 * 60 * 24 * 30;
var session = (0, import_session.statelessSessions)({
  maxAge: sessionMaxAge,
  secret: sessionSecret
});

// keystone.ts
var import_core2 = require("@keystone-6/core");
var import_promises3 = require("fs/promises");

// schema.ts
var import_fields = require("@keystone-6/core/fields");
var import_access = require("@keystone-6/core/access");

// lib/calculations/documents/documentproducts.ts
var calculateBaseTotal = ({ price, amount, taxIncluded, tax }) => {
  if (taxIncluded) {
    return Number(price * amount / (1 + tax / 100));
  }
  return Number(price * amount);
};
var calculateTotalWithoutTaxBeforeReduction = ({ price, amount, taxIncluded, tax }) => {
  return calculateBaseTotal({ price, amount, taxIncluded, tax });
};
var calculateReductionAmount = ({ price, amount, taxIncluded, reduction, tax, reductionType }) => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax });
  switch (reductionType) {
    case "percentage":
      return Number(total * (reduction / 100));
    case "onTotal":
      if (taxIncluded) {
        return Number(reduction / (1 + tax / 100));
      } else {
        return Number(reduction);
      }
    case "onAmount":
      if (taxIncluded) {
        return Number(amount * reduction / (1 + tax / 100));
      } else {
        return Number(amount * reduction);
      }
    default:
      return Number(total * (reduction / 100));
  }
};
var calculateTotalWithoutTaxAfterReduction = ({ price, amount, taxIncluded, reduction, tax, reductionType }) => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax });
  const reductionAmount = calculateReductionAmount({ price, amount, taxIncluded, reduction, tax, reductionType });
  return Number(total - reductionAmount);
};
var calculateTaxAmount = ({ price, amount, taxIncluded, reduction, tax, reductionType }) => {
  const totalWithoutTaxAfterReduction = calculateTotalWithoutTaxAfterReduction({
    price,
    amount,
    taxIncluded,
    reduction,
    tax,
    reductionType
  });
  return Number(totalWithoutTaxAfterReduction * (tax / 100));
};
var calculateTotalWithTaxBeforeReduction = ({ price, amount, taxIncluded, tax }) => {
  const totalWithoutTaxBeforeReduction = calculateTotalWithoutTaxBeforeReduction({
    price,
    amount,
    taxIncluded,
    tax
  });
  return Number(totalWithoutTaxBeforeReduction * (1 + tax / 100));
};
var calculateTotalWithTaxAfterReduction = ({ price, amount, taxIncluded, reduction, reductionType, tax }) => {
  const totalWithoutTaxAfterReduction = calculateTotalWithoutTaxAfterReduction({ price, amount, taxIncluded, reduction, tax, reductionType });
  return Number(totalWithoutTaxAfterReduction) * (1 + tax / 100);
};

// schema.ts
var import_core = require("@keystone-6/core");
var import_types = require("@keystone-6/core/types");

// lib/accesscontrol/rbac.ts
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

// lib/accesscontrol/tenantac.ts
var filterOnCompanyRelation = ({ session: session2 }) => {
  if (!session2) return false;
  try {
    if (isGlobalAdmin({ session: session2 })) {
      return true;
    } else {
      return { company: { id: { equals: session2.data.company?.id } } };
    }
  } catch (error) {
    console.error("filterOnCompany error:", error);
    return false;
  }
};
var filterOnCompanyRelationOrCompanyAccountancyRelation = ({ session: session2 }) => {
  if (!session2) return false;
  try {
    if (isGlobalAdmin({ session: session2 })) {
      return true;
    } else if (session2.data.company?.id) {
      return { company: { id: { equals: session2.data.company?.id } } };
    } else if (session2.data.accountancy?.id) {
      return { company: { accountancy: { id: { equals: session2.data.accountancy.id } } } };
    } else {
      return false;
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};
var filterOnIdCompanyOrCompanyAccountancyRelation = ({ session: session2 }) => {
  if (!session2) return false;
  try {
    if (isGlobalAdmin({ session: session2 })) {
      return true;
    } else if (session2.data.company?.id) {
      return { id: { equals: session2.data.company.id } };
    } else if (session2.data.accountancy?.id) {
      return { accountancy: { id: { equals: session2.data.accountancy.id } } };
    } else {
      return false;
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};
var filterOnIdAccountancy = ({ session: session2 }) => {
  if (!session2) return false;
  try {
    if (isGlobalAdmin({ session: session2 })) {
      return true;
    } else {
      return { id: { equals: session2.data.accountancy?.id } };
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};
var filterOnIdAccountancyOrAccountancyCompanyRelation = ({ session: session2 }) => {
  if (!session2) return false;
  try {
    if (isGlobalAdmin({ session: session2 })) {
      return true;
    } else if (session2.data.company?.accountancy?.id) {
      return { id: { equals: session2.data.company.accountancy.id } };
    } else if (session2.data.accountancy?.id) {
      return { id: { equals: session2.data.accountancy.id } };
    } else {
      return false;
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};

// schema.ts
var setCompany = (operation, context, resolvedData) => {
  let newResolvedDataCompany = resolvedData.company;
  try {
    if (operation === "create" || operation == "update") {
      if (isAdminAccountantManager({ session: context.session }) && resolvedData.company) {
        newResolvedDataCompany = resolvedData.company;
      } else {
        resolvedData.company = {
          connect: {
            id: context.session.data.company.id
          }
        };
        newResolvedDataCompany = {
          connect: {
            id: context.session.data.company.id
          }
        };
      }
    }
  } catch (error) {
    console.error("Company hook error");
    console.error(error);
    newResolvedDataCompany = resolvedData.company;
  }
  return newResolvedDataCompany;
};
var lists = {
  Accountancy: (0, import_core.list)({
    access: {
      filter: {
        query: filterOnIdAccountancyOrAccountancyCompanyRelation,
        update: filterOnIdAccountancy,
        delete: isSuperAdmin
      },
      operation: {
        create: isSuperAdmin,
        query: isAccountant,
        update: isAdminAccountantManager,
        delete: isSuperAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, item, resolvedData }) => {
        try {
          if (operation === "create" || operation === "update") {
            const pin = resolvedData.pincode;
            let pinCheck = await context.sudo().query.Company.findOne({
              where: {
                pincode: String(pin)
              },
              query: "id"
            });
            if (!pinCheck) {
              pinCheck = await context.sudo().query.Accountancy.findOne({
                where: {
                  pincode: String(pin)
                },
                query: "id"
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
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelationOrCompanyAccountancyRelation,
        delete: isSuperAdmin
      },
      operation: {
        create: isUser,
        query: isUser,
        update: isEmployee,
        delete: isSuperAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, resolvedData, context }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isManager,
        query: isEmployee,
        update: isManager,
        delete: isManager
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
      filter: {
        query: filterOnIdCompanyOrCompanyAccountancyRelation,
        update: filterOnIdCompanyOrCompanyAccountancyRelation,
        delete: import_access.denyAll
      },
      operation: {
        create: isAdminAccountantManager,
        query: isUser,
        update: isCompanyAdmin,
        delete: import_access.denyAll
      }
    },
    hooks: {
      beforeOperation: async ({ operation, item, context, resolvedData }) => {
        try {
          if (operation === "create") {
            if (isGlobalAdmin({ session: context.session }) && resolvedData.accountancy) {
            } else if (isAdminAccountantManager({ session: context.session }) && context.session.accountancy) {
              resolvedData.accountancy = {
                connect: {
                  id: context.session.accountancy.id
                }
              };
            }
          }
        } catch (error) {
        }
        try {
          if (operation === "create" || operation === "update") {
            const pin = resolvedData.pincode;
            let pinCheck = await context.sudo().query.Company.findOne({
              where: {
                pincode: String(pin)
              },
              query: "id"
            });
            if (!pinCheck) {
              pinCheck = await context.sudo().query.Accountancy.findOne({
                where: {
                  pincode: String(pin)
                },
                query: "id"
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
      einvoiceEmailIncoming: (0, import_fields.text)(),
      einvoiceEmailOutgoing: (0, import_fields.text)(),
      monthlyReports: (0, import_fields.checkbox)({ defaultValue: false }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Document: (0, import_core.list)({
    ui: {
      labelField: "date"
    },
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
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
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
            if (inputData.prefix) {
            } else {
              const establishment = await context.query.Establishment.findOne({
                where: { id: resolvedData.establishment.connect.id },
                query: "defaultPrefixes"
              });
              resolvedData.prefix = establishment.defaultPrefixes[resolvedData.type];
            }
          }
        } catch (error) {
          console.error(error);
        }
      },
      afterOperation: async ({ operation, resolvedData, inputData, item, context }) => {
        if (resolvedData?.type != "purchase" && resolvedData?.type != "credit_note_incoming") {
          if (operation === "create") {
            try {
              const documentId = item.id;
              let notificationDate = /* @__PURE__ */ new Date();
              notificationDate.setTime(notificationDate.getTime() + 1e3 * 35 * 60);
              context.sudo().query.Notification.createOne({
                data: {
                  date: notificationDate,
                  handled: false,
                  instructions: {
                    task: "sendDocumentEmail",
                    args: {
                      documentId
                    }
                  }
                }
              });
            } catch (error) {
              console.error(error);
            }
          }
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
        options: ["quote", "sale", "dispatch", "invoice", "credit_note", "debit_note", "purchase", "credit_note_incoming"],
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
            let extrasValue = 0;
            try {
              let extras = item.extras?.values ?? [];
              extras.forEach((extra) => {
                extrasValue += extra.value;
                if (!item.taxIncluded) {
                  extrasValue += extra.value * (extra.tax / 100);
                }
              });
            } catch (error) {
              extrasValue = 0;
              console.error(error);
            }
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
                if (isNaN(total)) {
                  total = 0;
                }
              });
              if (isNaN(extrasValue)) {
                extrasValue = 0;
              }
              total += extrasValue;
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
            let extrasValue = 0;
            try {
              let extras = item.extras?.values ?? [];
              extras.forEach((extra) => {
                extrasValue += extra.value;
                if (!item.taxIncluded) {
                  extrasValue += extra.value * (extra.tax / 100);
                }
              });
            } catch (error) {
              extrasValue = 0;
              console.error(error);
            }
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount reduction tax reductionType"
              });
              let total = 0;
              materials.forEach((docProd) => {
                total += calculateTotalWithTaxAfterReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded,
                  reductionType: docProd.reductionType ?? "percentage"
                });
                if (isNaN(total)) {
                  total = 0;
                }
              });
              if (isNaN(extrasValue)) {
                extrasValue = 0;
              }
              total += extrasValue;
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
            let extrasValue = 0;
            try {
              let extras = item.extras?.values ?? [];
              extras.forEach((extra) => {
                extrasValue += extra.value;
                if (!item.taxIncluded) {
                  extrasValue += extra.value * (extra.tax / 100);
                }
              });
            } catch (error) {
              extrasValue = 0;
              console.error(error);
            }
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount reduction tax reductionType"
              });
              let totalValue = 0;
              materials.forEach((docProd) => {
                totalValue += calculateTotalWithTaxAfterReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded,
                  reductionType: docProd.reductionType ?? "percentage"
                });
                if (isNaN(totalValue)) {
                  totalValue = 0;
                }
              });
              const payments = await context.query.Payment.findMany({
                where: { document: { some: { id: { equals: item.id } } }, isDeleted: { equals: false } },
                query: "value"
              });
              let totalPaid = 0;
              payments.forEach((payment) => {
                totalPaid += Number(payment.value);
              });
              if (isNaN(extrasValue)) {
                extrasValue = 0;
              }
              let total = totalValue - totalPaid + extrasValue;
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
      extras: (0, import_fields.json)({
        defaultValue: {
          values: []
        }
      }),
      totalTax: (0, import_fields.virtual)({
        field: import_core.graphql.field({
          type: import_core.graphql.Decimal,
          async resolve(item, args, context) {
            let extrasTax = 0;
            try {
              let extras = item.extras?.values ?? [];
              extras.forEach((extra) => {
                extrasTax = extra.value * (extra.tax / 100);
              });
            } catch (error) {
              extrasTax = 0;
              console.error(error);
            }
            try {
              const materials = await context.query.DocumentProduct.findMany({
                where: { document: { id: { equals: item.id } } },
                query: "price amount reduction tax reductionType"
              });
              let totalValue = 0;
              materials.forEach((docProd) => {
                totalValue += calculateTotalWithTaxAfterReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded,
                  reductionType: docProd.reductionType ?? "percentage"
                });
                totalValue -= calculateTotalWithoutTaxAfterReduction({
                  price: Number(docProd.price),
                  amount: Number(docProd.amount),
                  tax: Number(docProd.tax),
                  reduction: Number(docProd.reduction ?? "0"),
                  taxIncluded: item.taxIncluded,
                  reductionType: docProd.reductionType ?? "percentage"
                });
                if (isNaN(totalValue)) {
                  totalValue = 0;
                }
              });
              if (isNaN(extrasTax)) {
                extrasTax = 0;
              }
              totalValue += extrasTax;
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
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager
      }
    },
    hooks: {
      beforeOperation: async ({ operation, item, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
    fields: {
      amount: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      stockMovement: (0, import_fields.relationship)({
        ref: "StockMovement.documentProduct",
        many: false
      }),
      order: (0, import_fields.integer)(),
      product: (0, import_fields.relationship)({
        ref: "Material.documentProducts",
        many: false
      }),
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      description: (0, import_fields.text)(),
      tax: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      price: (0, import_fields.decimal)({ validation: { isRequired: true } }),
      pricedBy: (0, import_fields.select)({
        type: "string",
        options: ["amount", "volume", "length", "weight", "area", "time"],
        defaultValue: "amount"
      }),
      reduction: (0, import_fields.decimal)({ defaultValue: "0" }),
      reductionType: (0, import_fields.select)({
        type: "string",
        options: ["percentage", "onTotal", "onAmount"],
        defaultValue: "percentage"
      }),
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
                  taxIncluded,
                  reductionType: item.reductionType ?? "percentage"
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
                  taxIncluded,
                  reductionType: item.reductionType ?? "percentage"
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
                calculateTaxAmount({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  taxIncluded,
                  reduction: Number(item.reduction),
                  tax: Number(item.tax),
                  reductionType: item.reductionType ?? "percentage"
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
                calculateReductionAmount({
                  price: Number(item.price),
                  amount: Number(item.amount),
                  taxIncluded,
                  reduction: Number(item.reduction),
                  tax: Number(item.tax),
                  reductionType: item.reductionType ?? "percentage"
                }) * (1 + Number(item.tax) / 100)
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
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isAdminAccountantManager,
        query: isWorker,
        update: isCompanyAdmin,
        delete: isGlobalAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
      payments: (0, import_fields.relationship)({ ref: "Payment.establishment", many: true }),
      defaultPrefixes: (0, import_fields.json)({
        defaultValue: {
          quote: "",
          sale: "",
          dispatch: "",
          invoice: "",
          credit_note: "",
          debit_note: ""
        }
      }),
      pdfconfig: (0, import_fields.json)({
        defaultValue: {
          returnPackage: false
        }
      }),
      documentExtras: (0, import_fields.json)({
        defaultValue: {
          returnPackage: {
            active: false,
            documentTypes: [],
            values: []
          }
        }
      }),
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
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
        }
      }
    },
    fields: {
      name: (0, import_fields.text)({ validation: { isRequired: true } }),
      url: (0, import_fields.text)(),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      accountancy: (0, import_fields.relationship)({ ref: "Accountancy", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)({
        defaultValue: {
          isCover: false,
          order: 1
        }
      })
    }
  }),
  Product: (0, import_core.list)({
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isManager
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
        }
      }
    },
    fields: {
      variants: (0, import_fields.relationship)({
        ref: "Material.product",
        many: true
      }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      extraFields: (0, import_fields.json)()
    }
  }),
  Material: (0, import_core.list)({
    access: {
      filter: {
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isManager
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
        }
      }
    },
    fields: {
      product: (0, import_fields.relationship)({
        ref: "Product.variants",
        many: false
      }),
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
      color: (0, import_fields.text)({}),
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
        options: ["amount", "volume", "length", "weight", "area", "time"],
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
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: import_access.denyAll,
        delete: import_access.denyAll
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
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
      instructions: (0, import_fields.json)(),
      handled: (0, import_fields.checkbox)({ defaultValue: false }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } })
    }
  }),
  Operation: (0, import_core.list)({
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isEmployee
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isManager,
        delete: isCompanyAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
        }
      }
    },
    fields: {
      value: (0, import_fields.decimal)({ validation: { isRequired: true, min: "0" } }),
      document: (0, import_fields.relationship)({
        ref: "Document.payments",
        many: true
      }),
      out: (0, import_fields.checkbox)({ defaultValue: false }),
      isDeleted: (0, import_fields.checkbox)({ defaultValue: false }),
      isVerified: (0, import_fields.checkbox)({ defaultValue: false }),
      establishment: (0, import_fields.relationship)({ ref: "Establishment.payments", many: false }),
      drawnPayments: (0, import_fields.relationship)({
        ref: "Payment.originPayment",
        many: false
      }),
      originPayment: (0, import_fields.relationship)({
        ref: "Payment.drawnPayments",
        many: true
      }),
      creator: (0, import_fields.relationship)({
        ref: "User.payments",
        many: false
      }),
      reference: (0, import_fields.text)(),
      type: (0, import_fields.select)({
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
          "other"
        ],
        defaultValue: "cash",
        validation: { isRequired: true }
      }),
      timestamp: (0, import_fields.timestamp)({
        defaultValue: { kind: "now" },
        isOrderable: true
      }),
      currency: (0, import_fields.text)({
        defaultValue: "EUR",
        validation: { isRequired: true },
        access: {
          update: isCompanyAdmin
        }
      }),
      notes: (0, import_fields.relationship)({ ref: "Note", many: true }),
      customer: (0, import_fields.relationship)({ ref: "User.customerPayments", many: false }),
      supplier: (0, import_fields.relationship)({ ref: "Supplier.payments", many: false }),
      company: (0, import_fields.relationship)({ ref: "Company", many: false, access: { update: isSuperAdmin } }),
      chequeCreationDate: (0, import_fields.timestamp)(),
      chequeNumber: (0, import_fields.text)(),
      chequeWrittenAddress: (0, import_fields.text)(),
      extraFields: (0, import_fields.json)()
    }
  }),
  Shelf: (0, import_core.list)({
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isCompanyAdmin,
        query: isEmployee,
        update: isCompanyAdmin,
        delete: isGlobalAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isWorker,
        query: isIntern,
        update: isWorker,
        delete: isWorker
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
        }
      },
      afterOperation: async ({ operation, item, context }) => {
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
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isSuperAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isManager,
        query: isUser,
        update: isManager,
        delete: isGlobalAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
      taxCenter: (0, import_fields.text)(),
      contactMail: (0, import_fields.text)(),
      payments: (0, import_fields.relationship)({ ref: "Payment.supplier", many: true }),
      orderMail: (0, import_fields.text)(),
      balance: (0, import_fields.decimal)(),
      phone: (0, import_fields.text)(),
      orderTime: (0, import_fields.integer)(),
      extraFields: (0, import_fields.json)()
    }
  }),
  Tag: (0, import_core.list)({
    access: {
      filter: {
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isEmployee,
        query: isUser,
        update: isEmployee,
        delete: isManager
      }
    },
    hooks: {
      beforeOperation: async ({ operation, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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
        query: filterOnCompanyRelationOrCompanyAccountancyRelation,
        update: filterOnCompanyRelation,
        delete: isGlobalAdmin
      },
      operation: {
        query: isUser,
        create: isManager,
        update: isManager,
        delete: isGlobalAdmin
      }
    },
    hooks: {
      beforeOperation: async ({ operation, inputData, context, resolvedData }) => {
        if (operation === "create" || operation === "update") {
          resolvedData.company = setCompany(operation, context, resolvedData);
        }
        try {
          if (operation === "create" || operation === "update") {
            if (!resolvedData.company) {
              console.error("No company during user mutation");
              if (!resolvedData.accountancy) {
                console.error("No accountancy during user mutation");
                throw new Error("Company or Accountancy is required");
              }
            }
            let mail = inputData.email;
            let mailPart12 = mail.split("@").at(0);
            mailPart12 = mailPart12?.split("+").at(0);
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
      customerPayments: (0, import_fields.relationship)({ ref: "Payment.customer", many: true }),
      email2: (0, import_fields.text)(),
      isBlocked: (0, import_fields.checkbox)({ defaultValue: false }),
      isArchived: (0, import_fields.checkbox)({ defaultValue: false }),
      phone: (0, import_fields.text)(),
      noEmail: (0, import_fields.checkbox)({ defaultValue: false }),
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
      customerBalance: (0, import_fields.decimal)(),
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
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
      },
      operation: {
        create: isEmployee,
        query: isEmployee,
        update: isEmployee,
        delete: isManager
      }
    },
    hooks: {
      beforeOperation: async ({ operation, item, inputData, context, resolvedData }) => {
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
        }
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
        query: filterOnCompanyRelation,
        update: filterOnCompanyRelation,
        delete: filterOnCompanyRelation
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
        if (operation === "create") {
          resolvedData.company = setCompany(operation, context, resolvedData);
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

// lib/filesystem/getTempDir.ts
var import_os = __toESM(require("os"));
var getTempDir = () => {
  return import_os.default.tmpdir();
};

// lib/mail/sendAllFilesInDirectory.ts
var import_node_path = __toESM(require("node:path"));
var import_promises2 = require("node:fs/promises");
var MAX_EMAIL_SIZE = 8.9 * 1024 * 1024;
var sendAllFilesInDirectory = async ({ recipient, dirPath }) => {
  try {
    const files = await (0, import_promises2.readdir)(dirPath);
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const filePath = import_node_path.default.join(dirPath, file);
        const stats = await (0, import_promises2.stat)(filePath);
        return {
          path: filePath,
          size: stats.size,
          name: file
        };
      })
    );
    const batches = [];
    let currentBatch = [];
    let currentBatchSize = 0;
    for (const file of fileDetails) {
      if (currentBatchSize + file.size > MAX_EMAIL_SIZE && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }
      if (file.size > MAX_EMAIL_SIZE) {
        console.warn(`File ${file.name} exceeds the 7MB limit and may not be sent properly`);
      }
      currentBatch.push({ path: file.path });
      currentBatchSize += file.size;
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    for (let i = 0; i < batches.length; i++) {
      await sendEmailWithAttachments(batches[i], recipient);
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    return {
      success: true,
      fileCount: fileDetails.length,
      batchCount: batches.length
    };
  } catch (error) {
    console.error("Error sending files from directory:", error);
    return {
      success: false,
      error
    };
  }
};
async function sendEmailWithAttachments(attachments, recipient) {
  await sendSystemEmail({
    recipient,
    subject: `Documenten`,
    attachments: attachments.map((attachment) => {
      return {
        filename: attachment.path.replaceAll("\\", "/").split("/").at(-1),
        path: attachment.path
      };
    }),
    html: `<p>Beste, in bijlage alle gevraagde documenten.</p>`
  });
}

// keystone.ts
var serverCors = {
  origin: [
    "https://huseyinonal.com",
    "https://www.huseyinonal.com",
    "https://bm.huseyinonal.com",
    "https://acc.digitalforge.be",
    "http://localhost:3399",
    "https://dfa.huseyinonal.com",
    "https://hoc-portfolio.pages.dev"
  ],
  credentials: true
};
var keystone_default = withAuth(
  (0, import_core2.config)({
    db: {
      provider: "postgresql",
      url: process.env.DB,
      idField: { kind: "cuid" }
    },
    server: {
      port: 3399,
      cors: serverCors,
      extendExpressApp: (app, context) => {
        var cron = require("node-cron");
        const multer = require("multer");
        const cors = require("cors");
        app.set("trust proxy", true);
        app.use(cors(serverCors));
        app.options("*", cors(serverCors));
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
              query: "id isActive"
            });
            if (pinCheck && pinCheck.isActive) {
              res.status(200).json({ id: pinCheck.id });
            } else {
              const pinCheckAccountancy = await context.sudo().query.Accountancy.findOne({
                where: {
                  pincode: String(pin)
                },
                query: "id isActive"
              });
              if (pinCheckAccountancy && pinCheckAccountancy.isActive) {
                res.status(200).json({ id: pinCheckAccountancy.id });
              } else {
                res.status(404).json({ message: "Bad pin" });
              }
            }
          } catch (error) {
            console.error("Pin check error:", error);
            res.status(500).json({ error: "Pin check failed" });
            return;
          }
        });
        app.get("/rest/documents/xml", async (req, res) => {
          if (!req.query.id) {
            return res.status(400).json({ message: "No id provided" });
          }
          const keystoneContext = await context.withRequest(req, res);
          const documentID = req.query.id.toString();
          let document;
          try {
            document = await fetchDocumentByID({
              documentID,
              context: keystoneContext
            });
            if (document) {
              const xmlFile = (await writeAllXmlsToTempDir(`${getTempDir()}/${documentID}`, [document])).at(0);
              res.status(200).sendFile(xmlFile);
            } else {
              res.status(400).json({ error: "This document does not exist or you do not have access to it." });
            }
          } catch (error) {
            console.error("GET XML error:", error);
            res.status(500).json({ error: "An unknown error occured." });
          }
        });
        cron.schedule("*/5 * * * *", async () => {
          try {
            syncBolOrders({ context });
          } catch (error) {
            console.error("Error running cron job", error);
          }
        });
        cron.schedule("*/2 * * * *", async () => {
          try {
            const unhandledNotifications = await context.sudo().query.Notification.findMany({
              where: { handled: { equals: false } },
              query: "id instructions handled date"
            });
            unhandledNotifications.forEach(async (notification) => {
              try {
                if (notification.handled == false) {
                  if (new Date(notification.date).getTime() < (/* @__PURE__ */ new Date()).getTime()) {
                    context.sudo().query.Notification.updateOne({
                      where: { id: notification.id },
                      data: { handled: true }
                    });
                    if (notification.instructions.task == "sendDocumentEmail") {
                      sendDocumentEmail({ documentId: notification.instructions.args.documentId, context });
                    }
                  }
                }
              } catch (error) {
                console.error("Error running cron job", error);
              }
            });
          } catch (error) {
            console.error("Error running cron job", error);
          }
        });
        cron.schedule("10 12 * * 2", async () => {
          try {
            bulkSendDocuments({ docTypes: ["invoice", "credit_note"], context });
            bulkSendDocuments({ docTypes: ["purchase", "credit_note_incoming"], context });
          } catch (error) {
            console.error("Error starting bulk document sender", error);
          }
        });
        const generateTestPDF = async ({ id }) => {
          try {
            const postedDocument = await context.sudo().query.Document.findOne({
              query: "prefix number extras date externalId currency origin totalTax totalPaid totalToPay total deliveryDate type payments { value timestamp type } products { name reduction description price amount totalTax totalWithTaxAfterReduction tax } delAddress { street door zip city floor province country } docAddress { street door zip city floor province country } customer { email email2 firstName lastName phone customerCompany preferredLanguage customerTaxNumber } establishment { name documentExtras bankAccount1 bankAccount2 bankAccount3 taxID phone phone2 company { emailHost emailPort emailUser emailPassword emailUser } address { street door zip city floor province country } logo { url } }",
              where: {
                id
              }
            });
            let pdf;
            if (postedDocument.type === "invoice") {
              pdf = await generateInvoiceOut({ document: postedDocument });
            } else if (postedDocument.type === "credit_note") {
              pdf = await generateCreditNoteOut({ document: postedDocument });
            }
            if (!pdf) {
              throw new Error("No PDF generated");
            }
            (0, import_fs.mkdirSync)("./test", { recursive: true });
            (0, import_fs.writeFileSync)(`./test/${pdf.filename}`, new Uint8Array(pdf.content));
            console.info("Test PDF generated");
          } catch (error) {
            console.error("Error generating test pdf", error);
          }
        };
        generateTestPDF({ id: "cm5glkpe00039gx56xni3eab3" });
        generateTestPDF({ id: "cm655efqx005tbkceii8q4srg" });
        generateTestPDF({ id: "cm5o7jq5h00171076radma5m7" });
        generateTestPDF({ id: "cm6jvd8jr0012fzyf7do7p2rb" });
        generateTestPDF({ id: "cm6z0evlf000046uokgw38ksl" });
        const generateTestXML = async ({ id }) => {
          try {
            const doc = await fetchDocumentByID({ documentID: id, context, sudo: true });
            await writeAllXmlsToTempDir("./test", [doc]);
          } catch (error) {
            console.error("Error generating test xml", error);
          }
        };
        generateTestXML({ id: "cm5f6jlkt0004jyetrc2nfvcx" });
        generateTestXML({ id: "cm6jd1xop00bz1152hdifh8nb" });
        const dumpXmls = async ({
          types,
          companyID,
          recipient,
          period
        }) => {
          try {
            const docs = await fetchDocuments({
              companyID,
              docTypes: types,
              all: true,
              context,
              start: period?.from,
              end: period?.to
            });
            console.info("Found", docs.length, "documents");
            await (0, import_promises3.rm)(`./test/${companyID}`, { recursive: true, force: true });
            await (0, import_promises3.mkdir)(`./test/${companyID}`);
            await writeAllXmlsToTempDir(`./test/${companyID}`, docs);
            sendAllFilesInDirectory({
              recipient,
              dirPath: `./test/${companyID}`
            });
          } catch (error) {
            console.error("Error generating test xml", error);
          }
        };
        const dump = async () => {
          await dumpXmls({
            types: ["purchase", "credit_note_incoming"],
            companyID: "cm63oyuhn002zbkcezisd9sm5",
            recipient: "ocr-077080-22-A@import.octopus.be",
            period: {
              from: /* @__PURE__ */ new Date("2024-12-31"),
              to: /* @__PURE__ */ new Date("2025-04-01")
            }
          });
          await dumpXmls({
            types: ["invoice", "credit_note"],
            companyID: "cm63oyuhn002zbkcezisd9sm5",
            recipient: "ocr-077080-22-V@import.octopus.be",
            period: {
              from: /* @__PURE__ */ new Date("2024-12-31"),
              to: /* @__PURE__ */ new Date("2025-04-01")
            }
          });
        };
      }
    },
    lists,
    session,
    graphql: {
      cors: serverCors,
      bodyParser: {
        limit: "20mb"
      }
    }
  })
);
//# sourceMappingURL=config.js.map
