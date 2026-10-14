import { toApiError } from "@/services/http";
import {
  ImportBatchSummary,
  ImportConfirmRequest,
  ImportPreviewRequest,
  ImportPreviewResponse,
} from "@/features/invoice-import/types";

export async function previewImport(payload: ImportPreviewRequest) {
  const response = await fetch("/api/imports/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response, "Não foi possível analisar a fatura.");
  }

  return (await response.json()) as ImportPreviewResponse;
}

export async function confirmImport(payload: ImportConfirmRequest) {
  const response = await fetch("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response, "Não foi possível importar a fatura.");
  }

  return (await response.json()) as {
    batch: ImportBatchSummary;
    created: number;
    replaced: boolean;
  };
}

export async function fetchImportBatches() {
  const response = await fetch("/api/imports");

  if (!response.ok) return [];

  const data = await response.json();

  return Array.isArray(data) ? (data as ImportBatchSummary[]) : [];
}

export async function undoImport(id: string) {
  const response = await fetch(`/api/imports/${id}`, { method: "DELETE" });

  if (!response.ok) {
    throw await toApiError(response, "Não foi possível desfazer a importação.");
  }

  return (await response.json()) as { message: string; removed: number };
}
