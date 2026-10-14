import type { Installment } from "./types";

const ACQUIRER_PREFIX = /^(PAG|MP|IFD|PG|EC|SUMUP|STONE|CIELO|PAYPAL|GOOGLE|APL|EBN|DL|PICPAY|MERCADOPAGO)\s*\*\s*/;
const INSTALLMENT_SUFFIX = /\s+(?:-\s*)?(?:PARC(?:ELA)?\.?\s*)?\d{1,2}\s*(?:\/|DE)\s*\d{1,2}\s*$/;
const COUNTRY_SUFFIX = /\s+(?:BR|BRA|BRASIL)$/;

export function normalizeMerchant(description: string) {
  let value = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

  value = value.replace(INSTALLMENT_SUFFIX, "").trim();
  value = value.replace(ACQUIRER_PREFIX, "").trim();

  const withoutCountry = value.replace(COUNTRY_SUFFIX, "").trim();

  if (withoutCountry.length >= 3) {
    value = withoutCountry;
  }

  return value.replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function buildFingerprint(date: string, description: string, amount: number) {
  return `${date.slice(0, 10)}|${normalizeMerchant(description)}|${Math.abs(amount).toFixed(2)}`;
}

export function getEffectiveDate(
  purchaseDate: string | null,
  installment: Installment | null,
  referenceMonth: string,
  useInvoiceMonth = false,
) {
  const [year, month] = referenceMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const purchaseDay = purchaseDate ? Number(purchaseDate.slice(8, 10)) : lastDay;
  const moveToInvoiceMonth =
    !purchaseDate || useInvoiceMonth || (installment !== null && installment.current > 1);

  if (!moveToInvoiceMonth) {
    return purchaseDate as string;
  }

  const day = String(Math.min(purchaseDay, lastDay)).padStart(2, "0");

  return `${referenceMonth}-${day}`;
}

export function formatInstallment(installment: Installment | null | undefined) {
  return installment ? `${installment.current}/${installment.total}` : "";
}
