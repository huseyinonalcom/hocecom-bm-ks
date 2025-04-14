export const formatCurrency = (value: number, currency: string) => {
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
    currency,
  }).format(value);
};
