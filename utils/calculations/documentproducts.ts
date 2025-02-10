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
    return Number(((price * amount) / (1 + tax / 100)).toFixed(2));
  }
  return Number((price * amount).toFixed(2));
};

export const calculateTotalWithoutTaxBeforeReduction = ({ price, amount, taxIncluded, tax = 0 }: PriceAmountParams & { tax?: number }): number => {
  return Number(calculateBaseTotal({ price, amount, taxIncluded, tax }).toFixed(2));
};

export const calculateReductionAmount = ({ price, amount, taxIncluded, reduction, tax }: TaxParams): number => {
  const total = Number(calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax }).toFixed(2));
  return Number((total * (reduction / 100)).toFixed(2));
};

export const calculateTotalWithoutTaxAfterReduction = ({ price, amount, taxIncluded, reduction, tax }: TaxParams): number => {
  const total = Number(calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax }).toFixed(2));
  const reductionAmount = Number(calculateReductionAmount({ price, amount, taxIncluded, reduction, tax }).toFixed(2));
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
    return Number((price * amount).toFixed(2));
  }
  const totalBeforeReduction = Number(
    calculateTotalWithoutTaxBeforeReduction({
      price,
      amount,
      taxIncluded,
    }).toFixed(2)
  );
  return Number((totalBeforeReduction * (1 + tax / 100)).toFixed(2));
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
