// Shared by anything that renders a "YYYY-MM-DD" date string from the API
// (applications, reminders, calendar). I build the Date from its parts
// rather than `new Date(dateString)` -- the latter parses as UTC midnight,
// which can display as the PREVIOUS day once toLocaleDateString renders it
// in a timezone behind UTC.
export function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
