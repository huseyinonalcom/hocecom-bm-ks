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
      accountancy?: {
        id: string;
      };
    };
    accountancy?: {
      id: string;
    };
  };
};
