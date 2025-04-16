export function getMondayAndSundayTwoWeeksAgo(): { monday: Date; sunday: Date } {
  const today = new Date();

  const dayOfWeek = today.getDay();

  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const mondayTwoWeeksAgo = new Date(mondayThisWeek);
  mondayTwoWeeksAgo.setDate(mondayTwoWeeksAgo.getDate() - 7);

  const sundayTwoWeeksAgo = new Date(mondayTwoWeeksAgo);
  sundayTwoWeeksAgo.setDate(mondayTwoWeeksAgo.getDate() + 6);

  return { monday: mondayTwoWeeksAgo, sunday: sundayTwoWeeksAgo };
}
