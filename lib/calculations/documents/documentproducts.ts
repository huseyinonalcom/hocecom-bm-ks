interface PriceAmountParams {
  price: number;
  amount: number;
  taxIncluded: boolean;
}

interface TaxParams extends PriceAmountParams {
  tax: number;
}

interface ReductionParams extends TaxParams {
  reduction: number;
  reductionType: "percentage" | "onTotal" | "onAmount";
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

export const calculateReductionAmount = ({ price, amount, taxIncluded, reduction, tax, reductionType }: ReductionParams): number => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax });
  switch (reductionType) {
    case "percentage":
      return Number(total * (reduction / 100));
    case "onTotal":
      return Number(reduction);
    case "onAmount":
      return Number(amount * reduction);
  }
};

export const calculateTotalWithoutTaxAfterReduction = ({ price, amount, taxIncluded, reduction, tax, reductionType }: ReductionParams): number => {
  const total = calculateTotalWithoutTaxBeforeReduction({ price, amount, taxIncluded, tax });
  const reductionAmount = calculateReductionAmount({ price, amount, taxIncluded, reduction, tax, reductionType });
  return Number((total - reductionAmount).toFixed(2));
};

export const calculateTaxAmount = ({ price, amount, taxIncluded, reduction, tax, reductionType }: ReductionParams): number => {
  const totalAfterReduction = calculateTotalWithoutTaxAfterReduction({
    price,
    amount,
    taxIncluded,
    reduction,
    tax,
    reductionType,
  });
  return Number(totalAfterReduction * (tax / 100));
};

export const calculateTotalWithTaxBeforeReduction = ({ price, amount, taxIncluded, tax }: TaxParams): number => {
  if (taxIncluded) {
    return Number(price * amount);
  }
  const totalBeforeReduction = calculateTotalWithoutTaxBeforeReduction({
    price,
    amount,
    taxIncluded,
    tax,
  });
  return Number(totalBeforeReduction * (1 + tax / 100));
};

export const calculateTotalWithTaxAfterReduction = ({ price, amount, taxIncluded, reduction, reductionType, tax }: ReductionParams): number => {
  const totalAfterReduction = calculateTotalWithoutTaxAfterReduction({
    price,
    amount,
    taxIncluded,
    reduction,
    tax,
    reductionType,
  });
  return Number(totalAfterReduction * (1 + tax / 100));
};
