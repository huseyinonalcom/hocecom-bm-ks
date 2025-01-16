import { Session } from "../../functions";
import { isGlobalAdmin } from "./rbac";

export const filterOnIdCopmany = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else {
      return { id: { equals: session.data.company?.id } };
    }
  } catch (error) {
    console.error("filterOnIdCopmany error:", error);
    return false;
  }
};
export const filterOnCompany = ({ session }: { session?: Session }) => {
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

export const filterOnIdAccountancyOrCompanyAccountancy = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else if (session.data.company?.accountancy?.id) {
      return { id: { equals: session.data.company.accountancy.id } };
    } else {
      return filterOnIdAccountancy({ session });
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};

export const filterOnIdCompanyOrCompanyAccountancy = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else if (session.data.company?.id) {
      return { company: { id: { equals: session.data.company?.id } } };
    } else if (session.data.company?.accountancy?.id) {
      return { accountancy: { id: { equals: session.data.company.accountancy.id } } };
    } else {
      return false;
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return false;
  }
};

export const filterOnAccountancyOrCompany = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else {
      return { OR: [{ accountancy: { id: { equals: session.data.accountancy?.id } } }, { company: { id: { equals: session.data.company?.id } } }] };
    }
  } catch (error) {
    console.error("companyCompanyFilter error:", error);
    return false;
  }
};

export const companyFilter = ({
  session,
  accountancyCheckType,
}: {
  session?: Session;
  accountancyCheckType?: "onCompany" | "onAccountancy" | "onAccountancyAndCompany";
}) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else if (!session.data.company) {
      return accountancyFilter({ session, accountancyCheckType: accountancyCheckType ?? "onAccountancy" });
    } else {
      return { company: { id: { equals: session.data.company.id } } };
    }
  } catch (error) {
    console.error("companyFilter error:", error);
    return accountancyFilter({ session, accountancyCheckType: accountancyCheckType ?? "onAccountancy" });
  }
};

export const companyCompanyFilter = ({ session }: { session?: Session }) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else if (!session.data.company) {
      return accountancyFilter({ session, accountancyCheckType: "onAccountancy" });
    } else {
      return {
        OR: [{ users: { some: { id: { equals: session.data.id } } } }, { owner: { id: { equals: session.data.id } } }],
      };
    }
  } catch (error) {
    console.error("companyCompanyFilter error:", error);
    return accountancyFilter({ session, accountancyCheckType: "onAccountancy" });
  }
};

export const accountancyFilter = ({
  session,
  accountancyCheckType,
}: {
  session?: Session;
  accountancyCheckType: "onCompany" | "onAccountancy" | "onAccountancyAndCompany";
}) => {
  if (!session) return false;
  try {
    if (isGlobalAdmin({ session })) {
      return true;
    } else {
      if (accountancyCheckType === "onAccountancy") {
        return {
          accountancy: { id: { equals: session.data.accountancy?.id ?? "a" } },
        };
      } else if (accountancyCheckType === "onAccountancyAndCompany") {
        return {
          OR: [
            { accountancy: { id: { equals: session.data.accountancy?.id ?? "a" } } },
            { company: { accountancy: { id: { equals: session.data.accountancy?.id ?? "a" } } } },
          ],
        };
      } else {
        return {
          company: { accountancy: { id: { equals: session.data.accountancy?.id ?? "a" } } },
        };
      }
    }
  } catch (error) {
    console.error("accountancyFilter error:", error);
    return false;
  }
};
