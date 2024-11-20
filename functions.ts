export type Role =
  | "superadmin"
  | "global_admin"
  | "admin_accountant"
  | "admin_accountant_manager"
  | "owner"
  | "company_admin"
  | "admin_accountant_employee"
  | "general_manager"
  | "manager"
  | "accountant"
  | "admin_accountant_intern"
  | "employee"
  | "intern"
  | "worker"
  | "customer";

export type Session = {
  itemId: string;
  data: {
    isBlocked: boolean;
    username: string;
    company?: string;
    accountancy?: string;
    role: Role;
    permissions: any;
  };
};

export const isSuperAdmin = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "superadmin") return true;

  return false;
};

export const isGlobalAdmin = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isSuperAdmin({ session }) || session.data.role == "global_admin") return true;

  return !session.data.isBlocked;
};

export const isAdminAccountantOwner = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isGlobalAdmin({ session }) || session.data.role == "admin_accountant") return true;

  return !session.data.isBlocked;
};

export const isAdminAccountantManager = ({ session }: { session?: Session }) => {
  console.log(session);
  if (!session) return false;

  if (isAdminAccountantOwner({ session }) || session.data.role == "admin_accountant_manager") return true;

  return !session.data.isBlocked;
};

export const isOwner = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isAdminAccountantManager({ session }) || session.data.role == "owner") return true;

  return !session.data.isBlocked;
};

export const isCompanyAdmin = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isOwner({ session }) || session.data.role == "company_admin") return true;

  return !session.data.isBlocked;
};

export const isAdminAccountantEmployee = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isAdminAccountantManager({ session }) || session.data.role == "admin_accountant_employee") return true;

  return !session.data.isBlocked;
};

export const isGeneralManager = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isCompanyAdmin({ session }) || session.data.role == "general_manager") return true;

  return !session.data.isBlocked;
};

export const isManager = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isGeneralManager({ session }) || session.data.role == "manager") return true;

  return !session.data.isBlocked;
};

export const isAccountant = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isManager({ session }) || session.data.role == "accountant") return true;

  return !session.data.isBlocked;
};

export const isAdminAccountantIntern = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isAdminAccountantEmployee({ session }) || session.data.role == "admin_accountant_intern") return true;

  return !session.data.isBlocked;
};

export const isEmployee = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isAccountant({ session }) || session.data.role == "employee") return true;

  return !session.data.isBlocked;
};

export const isIntern = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isEmployee({ session }) || session.data.role == "intern") return true;

  return !session.data.isBlocked;
};

export const isWorker = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isIntern({ session }) || session.data.role == "worker") return true;

  return !session.data.isBlocked;
};

export const isUser = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (isWorker({ session }) || session.data.role == "customer") return true;

  return !session.data.isBlocked;
};
