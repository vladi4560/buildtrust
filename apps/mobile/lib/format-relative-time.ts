const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Short relative stamp for conversation list rows ("2m", "3h", "Mon", "3/14").
export function formatRelativeTime(date: Date | string): string {
  const value = new Date(date);
  const diff = Date.now() - value.getTime();

  if (diff < MINUTE) return "Now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return value.toLocaleDateString("en-US", { weekday: "short" });
  return value.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

// Day-separator label for the chat thread ("Today", "Yesterday", "March 14").
export function formatDaySeparator(date: Date | string): string {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(value, today)) return "Today";
  if (isSameDay(value, yesterday)) return "Yesterday";
  return value.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatMessageTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
