import { Session } from "../../functions";
import { isGlobalAdmin } from "./rbac";

/** Allow users of company to access list with relation to company */
export const filterOnCompanyRelation = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else {
      return { company: { id: { equals: session.data.company?.id } } };
    }
  } catch (error) {
    console.error("filterOnCompany error:", error);
    return false;
  }
};

/** Allow users of company or users of related accountancy to access list with relation to company */
export const filterOnCompanyRelationOrCompanyAccountancyRelation = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else if (session.data.company?.id) {
      return { company: { id: { equals: session.data.company?.id } } };
    } else if (session.data.accountancy?.id) {
      return { company: { accountancy: { id: { equals: session.data.accountancy.id } } } };
    } else {
      return false;
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};

/** Allow users of company or users of related accountancy to access company */
export const filterOnIdCompanyOrCompanyAccountancyRelation = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else if (session.data.company?.id) {
      return { id: { equals: session.data.company.id } };
    } else if (session.data.accountancy?.id) {
      return { accountancy: { id: { equals: session.data.accountancy.id } } };
    } else {
      return false;
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};

/** Allow users of accountancy to access accountancy */
export const filterOnIdAccountancy = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else {
      return { id: { equals: session.data.accountancy?.id } };
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};

/** Allow users of accountancy or users of related company to access accountancy */
export const filterOnIdAccountancyOrAccountancyCompanyRelation = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else if (session.data.company?.accountancy?.id) {
      return { id: { equals: session.data.company.accountancy.id } };
    } else if (session.data.accountancy?.id) {
      return { id: { equals: session.data.accountancy.id } };
    } else {
      return false;
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};
