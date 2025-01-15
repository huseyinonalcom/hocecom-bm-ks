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
    id: string;
    role: Role;
    permissions: any;
    isBlocked: boolean;
    company?: {
      id: string;
    };
    accountancy?: {
      id: string;
    };
  };
};

export const isSuperAdmin = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "superadmin") return true;

  return false;
};

export const isGlobalAdmin = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "global_admin" || isSuperAdmin({ session })) return !session.data.isBlocked;

  return false;
};

export const isAdminAccountantOwner = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "admin_accountant" || isGlobalAdmin({ session })) return !session.data.isBlocked;

  return false;
};

export const isAdminAccountantManager = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "admin_accountant_manager" || isAdminAccountantOwner({ session })) return !session.data.isBlocked;

  return false;
};
export const isOwner = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "owner" || isAdminAccountantManager({ session })) return !session.data.isBlocked;

  return false;
};

export const isCompanyAdmin = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "company_admin" || isOwner({ session })) return !session.data.isBlocked;

  return false;
};
export const isAdminAccountantEmployee = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "admin_accountant_employee" || isAdminAccountantManager({ session })) return !session.data.isBlocked;

  return false;
};

export const isGeneralManager = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "general_manager" || isCompanyAdmin({ session })) return !session.data.isBlocked;

  return false;
};
export const isManager = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "manager" || isGeneralManager({ session })) return !session.data.isBlocked;

  return false;
};

export const isAccountant = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "accountant" || isManager({ session })) return !session.data.isBlocked;

  return false;
};

export const isAdminAccountantIntern = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "admin_accountant_intern" || isAdminAccountantEmployee({ session })) return !session.data.isBlocked;

  return false;
};

export const isEmployee = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "employee" || isAccountant({ session })) return !session.data.isBlocked;

  return false;
};

export const isIntern = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "intern" || isEmployee({ session })) return !session.data.isBlocked;

  return false;
};

export const isWorker = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "worker" || isIntern({ session })) return !session.data.isBlocked;

  return false;
};

export const isUser = ({ session }: { session?: Session }) => {
  if (!session) return false;

  if (session.data.role == "customer" || isWorker({ session })) return !session.data.isBlocked;

  return false;
};
