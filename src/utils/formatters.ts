export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatMonthYear(value: Date) {
  return value.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function formatSignedAmount(value: number) {
  const absolute = Math.abs(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (value > 0) return `+${absolute}`;
  if (value < 0) return `−${absolute}`;
  return absolute;
}

export function formatPlainAmount(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDayHeading(value: string | Date) {
  return new Date(value).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function parseAmountInput(value: string) {
  const compact = value.replace(/\s|R\$/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;

  return Number(normalized);
}
