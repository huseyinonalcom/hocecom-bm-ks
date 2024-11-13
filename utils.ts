export const calculateDate = ({ number, unit, startDate }: { number: number; unit: string; startDate: Date }) => {
  const date = startDate;
  switch (unit.toLowerCase()) {
    case "gün":
      date.setDate(date.getDate() + number);
      break;
    case "hafta":
      date.setDate(date.getDate() + number * 7);
      break;
    case "ay":
      date.setMonth(date.getMonth() + number);
      break;
    case "yıl":
      date.setFullYear(date.getFullYear() + number);
      break;
    default:
      throw new Error('Invalid unit. Use "day", "month", or "year".');
  }
  return date;
};
