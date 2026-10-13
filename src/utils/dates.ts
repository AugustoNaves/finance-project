function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getLocalMonthKey(date = new Date()) {
  return getLocalDateKey(date).slice(0, 7);
}

export function getDateKey(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

export function getMonthKey(value: string | Date) {
  return getDateKey(value).slice(0, 7);
}

export function dateKeyToISOString(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`).toISOString();
}
