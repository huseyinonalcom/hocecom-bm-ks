export const dateFormatBe = (date: string) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-FR");
};

export const dateFormatOnlyDate = (date: string) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};
