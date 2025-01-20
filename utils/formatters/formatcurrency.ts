export const formatCurrency = (value: number, currency: string) => {
  console.log(currency);
  console.log(value);
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency,
  }).format(value);
};
