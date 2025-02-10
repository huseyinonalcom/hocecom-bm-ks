interface PriceAmountParams {
  price: number;
  amount: number;
  taxIncluded: boolean;
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
  taxIncluded,
  tax = 0, // optional for when we need to calculate base from tax-included price
}: PriceAmountParams & { tax?: number }): number => {
  if (taxIncluded) {
    return Number((price * amount) / (1 + tax / 100));
  }
  return Number(price * amount);
};

export const calculateTotalWithoutTaxBeforeReduction = ({ price, amount, taxIncluded, tax = 0 }: PriceAmountParams & { tax?: number }): number => {
  return calculateBaseTotal({ price, amount, taxIncluded, tax });
};

export const calculateReductionAmount = ({ price, amount, taxIncluded, reduction, tax }: TaxParams): number => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax });
  return Number(total * (reduction / 100));
};

export const calculateTotalWithoutTaxAfterReduction = ({ price, amount, taxIncluded, reduction, tax }: TaxParams): number => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax });
  const reductionAmount = calculateReductionAmount({ price, amount, taxIncluded, reduction, tax });
  return Number((total - reductionAmount).toFixed(2));
};

export const calculateTaxAmount = ({ price, amount, taxIncluded, reduction, tax }: TaxParams): number => {
  const totalAfterReduction = Number(
    calculateTotalWithoutTaxAfterReduction({
      price,
      amount,
      taxIncluded,
      reduction,
      tax,
    }).toFixed(2)
  );
  return Number((totalAfterReduction * (tax / 100)).toFixed(2));
};

export const calculateTotalWithTaxBeforeReduction = ({ price, amount, taxIncluded, tax }: Omit<TaxParams, "reduction">): number => {
  if (taxIncluded) {
    return Number(price * amount);
  }
  const totalBeforeReduction = calculateTotalWithoutTaxBeforeReduction({
    price,
    amount,
    taxIncluded,
  });
  return Number(totalBeforeReduction * (1 + tax / 100));
};

export const calculateTotalWithTaxAfterReduction = ({ price, amount, taxIncluded, reduction, tax }: TaxParams): number => {
  const totalAfterReduction = calculateTotalWithoutTaxAfterReduction({
    price,
    amount,
    taxIncluded,
    reduction,
    tax,
  });
  return Number(totalAfterReduction * (1 + tax / 100));
};
