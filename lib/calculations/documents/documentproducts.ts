interface TaxParams {
  tax: number;
  price: number;
  amount: number;
  taxIncluded: boolean;
}

interface ReductionParams extends TaxParams {
  reduction: number;
  reductionType: "percentage" | "onTotal" | "onAmount";
}

export const calculateBaseTotal = ({ price, amount, taxIncluded, tax }: TaxParams): number => {
  if (taxIncluded) {
    return Number((price * amount) / (1 + tax / 100));
  }
  return Number(price * amount);
};

export const calculateTotalWithoutTaxBeforeReduction = ({ price, amount, taxIncluded, tax }: TaxParams): number => {
  return calculateBaseTotal({ price, amount, taxIncluded, tax });
};

export const calculateReductionAmount = ({ price, amount, taxIncluded, reduction, tax, reductionType }: ReductionParams): number => {
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
        return Number((amount * reduction) / (1 + tax / 100));
      } else {
        return Number(amount * reduction);
      }
    default:
      return Number(total * (reduction / 100));
  }
};

export const calculateTotalWithoutTaxAfterReduction = ({ price, amount, taxIncluded, reduction, tax, reductionType }: ReductionParams): number => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax });
  const reductionAmount = calculateReductionAmount({ price, amount, taxIncluded, reduction, tax, reductionType });

  return Number(total - reductionAmount);
};

export const calculateTaxAmount = ({ price, amount, taxIncluded, reduction, tax, reductionType }: ReductionParams): number => {
  const totalWithoutTaxAfterReduction = calculateTotalWithoutTaxAfterReduction({
    price,
    amount,
    taxIncluded,
    reduction,
    tax,
    reductionType,
  });
  return Number(totalWithoutTaxAfterReduction * (tax / 100));
};

export const calculateTotalWithTaxBeforeReduction = ({ price, amount, taxIncluded, tax }: TaxParams): number => {
  const totalWithoutTaxBeforeReduction = calculateTotalWithoutTaxBeforeReduction({
    price,
    amount,
    taxIncluded,
    tax,
  });
  return Number(totalWithoutTaxBeforeReduction * (1 + tax / 100));
};

export const calculateTotalWithTaxAfterReduction = ({ price, amount, taxIncluded, reduction, reductionType, tax }: ReductionParams): number => {
  const totalWithoutTaxAfterReduction = calculateTotalWithoutTaxAfterReduction({ price, amount, taxIncluded, reduction, tax, reductionType });
  return Number(totalWithoutTaxAfterReduction) * (1 + tax / 100);
};
