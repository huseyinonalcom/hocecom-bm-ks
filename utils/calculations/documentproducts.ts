interface PriceAmountParams {
  price: number;
  amount: number;
  isTaxIncluded: boolean;
}

interface ReductionParams extends PriceAmountParams {
  reduction: number;
}

interface TaxParams extends ReductionParams {
  tax: number;
}

export const calculateBaseTotal = ({
  price,
  amount,
  isTaxIncluded,
  tax = 0, // optional for when we need to calculate base from tax-included price
}: PriceAmountParams & { tax?: number }): number => {
  if (isTaxIncluded) {
    return Number(((price * amount) / (1 + tax / 100)).toFixed(2));
  }
  return Number((price * amount).toFixed(2));
};

export const calculateTotalWithoutTaxBeforeReduction = ({ price, amount, isTaxIncluded, tax = 0 }: PriceAmountParams & { tax?: number }): number => {
  return calculateBaseTotal({ price, amount, isTaxIncluded, tax });
};

export const calculateReductionAmount = ({ price, amount, isTaxIncluded, reduction, tax }: TaxParams): number => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, isTaxIncluded, tax });
  return Number((total * (reduction / 100)).toFixed(2));
};

export const calculateTotalWithoutTaxAfterReduction = ({ price, amount, isTaxIncluded, reduction, tax }: TaxParams): number => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, isTaxIncluded, tax });
  const reductionAmount = calculateReductionAmount({ price, amount, isTaxIncluded, reduction, tax });
  return Number((total - reductionAmount).toFixed(2));
};

export const calculateTaxAmount = ({ price, amount, isTaxIncluded, reduction, tax }: TaxParams): number => {
  const totalAfterReduction = calculateTotalWithoutTaxAfterReduction({
    price,
    amount,
    isTaxIncluded,
    reduction,
    tax,
  });
  return Number((totalAfterReduction * (tax / 100)).toFixed(2));
};

export const calculateTotalWithTaxBeforeReduction = ({ price, amount, isTaxIncluded, tax }: Omit<TaxParams, "reduction">): number => {
  if (isTaxIncluded) {
    return Number((price * amount).toFixed(2));
  }
  const totalBeforeReduction = calculateTotalWithoutTaxBeforeReduction({
    price,
    amount,
    isTaxIncluded,
  });
  return Number((totalBeforeReduction * (1 + tax / 100)).toFixed(2));
};

export const calculateTotalWithTaxAfterReduction = ({ price, amount, isTaxIncluded, reduction, tax }: TaxParams): number => {
  const totalAfterReduction = calculateTotalWithoutTaxAfterReduction({
    price,
    amount,
    isTaxIncluded,
    reduction,
    tax,
  });
  return Number((totalAfterReduction * (1 + tax / 100)).toFixed(2));
};
