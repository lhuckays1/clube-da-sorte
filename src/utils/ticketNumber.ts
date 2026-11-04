export function formatTicketNumber(index: number, total: number): string {
  const width = Math.max(2, String(Math.max(0, total - 1)).length);
  return String(index).padStart(width, "0");
}

