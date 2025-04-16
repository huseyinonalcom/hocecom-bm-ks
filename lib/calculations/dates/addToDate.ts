export function addDaysToDate(dateStr: string, daysToAdd: number) {
  const date = new Date(dateStr);

  date.setDate(date.getDate() + daysToAdd);

  return date;
}
