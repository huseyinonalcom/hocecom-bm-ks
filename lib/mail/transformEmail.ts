export const transformEmail = ({ email, companyId }: { email: string; companyId: string }) => {
  let parts = email.split("@");
  let localPart = parts[0].split("+")[0];
  let domainPart = parts[1];
  return localPart + "+" + companyId + "@" + domainPart;
};

export const reverseTransformEmail = (email: string) => {
  let [localPart, domainPart] = email.split("@");
  let originalLocalPart = localPart.split("+")[0];
  return originalLocalPart + "@" + domainPart;
};
