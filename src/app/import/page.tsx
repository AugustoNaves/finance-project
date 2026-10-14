"use client";

import Link from "next/link";
import { ChangeEvent, useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CategoryForm } from "@/components/CategoryForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { PageHeader } from "@/components/PageHeader";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { formatInstallment } from "@/features/invoice-import/normalize";
import { parseInvoice } from "@/features/invoice-import/parseInvoice";
import {
  extractPdfLines,
  hashFile,
  MAX_PDF_BYTES,
  PdfPasswordError,
} from "@/features/invoice-import/pdfText";
import {
  ImportBatchSummary,
  ImportEntryType,
  ImportPreviewItem,
  ImportPreviewResponse,
  ParsedInvoice,
} from "@/features/invoice-import/types";
import { createCategory, fetchCategories } from "@/services/categories";
import { getErrorMessage } from "@/services/http";
import {
  confirmImport,
  fetchImportBatches,
  previewImport,
  undoImport,
} from "@/services/imports";
import { Category, CategoryPayload } from "@/types/category";
import { getLocalMonthKey } from "@/utils/dates";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  Badge,
  BatchList,
  Button,
  CheckLabel,
  Field,
  Footer,
  InlineButton,
  Input,
  Notice,
  PageContent,
  Row,
  Section,
  Select,
  SummaryGrid,
  Table,
  TableWrapper,
  UploadArea,
} from "./styles";

interface PreviewRow extends ImportPreviewItem {
  remember: boolean;
  suggestedCategory: string | null;
}

interface LoadedFile {
  name: string;
  hash: string;
  invoice: ParsedInvoice;
}

const SOURCE_LABELS = {
  rule: "regra sua",
  history: "histórico",
  keyword: "palavra-chave",
};

const KIND_LABELS = {
  purchase: "",
  credit: "estorno/crédito",
  payment: "pagamento da fatura",
  fee: "encargo",
};

function roundCents(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, monthNumber - 1, 1),
  );
}

function isRowPending(row: PreviewRow) {
  return (
    row.include &&
    (!row.category ||
      !row.description.trim() ||
      !(row.amount > 0) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date))
  );
}

export default function ImportPage() {
  const { refreshTransactions } = useContext(TransactionsContext);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<ImportBatchSummary[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [referenceMonth, setReferenceMonth] = useState(getLocalMonthKey());
  const [useInvoiceMonth, setUseInvoiceMonth] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [replaceLump, setReplaceLump] = useState(false);
  const [acceptDifference, setAcceptDifference] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [batchToUndo, setBatchToUndo] = useState<ImportBatchSummary | null>(null);
  const [categoryModal, setCategoryModal] = useState<{
    rowIndex: number;
    type: ImportEntryType;
    previousCategory: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      const [categoryData, batchData] = await Promise.all([
        fetchCategories().catch(() => []),
        fetchImportBatches().catch(() => []),
      ]);

      if (active) {
        setCategories(categoryData);
        setBatches(batchData);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  function resetPreview() {
    setLoaded(null);
    setPreview(null);
    setRows([]);
    setPendingFile(null);
    setPassword("");
    setNeedsPassword(false);
    setReplaceLump(false);
    setAcceptDifference(false);
    setUseInvoiceMonth(false);
    setCategoryModal(null);
  }

  async function loadPreview(file: LoadedFile, month: string, invoiceMonth: boolean) {
    const response = await previewImport({
      fileName: file.name,
      fileHash: file.hash,
      issuer: file.invoice.issuer,
      referenceMonth: month,
      dueDate: file.invoice.dueDate,
      statedTotal: file.invoice.statedTotal,
      useInvoiceMonth: invoiceMonth,
      items: file.invoice.items.map((item) => ({
        date: item.date,
        description: item.description,
        amount: item.amount,
        kind: item.kind,
        installment: item.installment,
      })),
    });

    setPreview(response);
    setRows(
      response.items.map((item) => ({
        ...item,
        remember: false,
        suggestedCategory: item.category,
      })),
    );
    setReplaceLump(false);
    setAcceptDifference(false);
  }

  async function processFile(file: File, filePassword?: string) {
    setError("");
    setSuccess("");

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Envie um arquivo PDF.");
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setError("O arquivo é maior que 10 MB.");
      return;
    }

    setBusy(true);

    try {
      const data = await file.arrayBuffer();
      const hash = await hashFile(data);
      const pages = await extractPdfLines(data, filePassword);
      const invoice = parseInvoice(pages);

      if (invoice.items.length === 0) {
        setError(
          invoice.warnings[0] ??
            "Nenhum lançamento reconhecido. O PDF pode ser digitalizado (imagem) ou de um layout não suportado.",
        );
        setPendingFile(null);
        setNeedsPassword(false);
        return;
      }

      const month = invoice.referenceMonth ?? getLocalMonthKey();
      const nextLoaded = { name: file.name, hash, invoice };

      await loadPreview(nextLoaded, month, false);
      setLoaded(nextLoaded);
      setReferenceMonth(month);
      setUseInvoiceMonth(false);
      setPendingFile(null);
      setNeedsPassword(false);
      setPassword("");
    } catch (processError) {
      if (processError instanceof PdfPasswordError) {
        setPendingFile(file);
        setNeedsPassword(true);
        setError(processError.message);
      } else {
        setError(getErrorMessage(processError, "Não foi possível ler o PDF."));
      }
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (file) {
      processFile(file);
    }
  }

  async function refreshPreview(month: string, invoiceMonth: boolean) {
    if (!loaded || !/^\d{4}-\d{2}$/.test(month)) return;

    setError("");
    setBusy(true);

    try {
      await loadPreview(loaded, month, invoiceMonth);
    } catch (previewError) {
      setError(getErrorMessage(previewError, "Não foi possível analisar a fatura."));
    } finally {
      setBusy(false);
    }
  }

  function updateRow(index: number, changes: Partial<PreviewRow>) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.index === index ? { ...row, ...changes } : row)),
    );
  }

  function handleTypeChange(row: PreviewRow, type: ImportEntryType) {
    updateRow(row.index, { type, category: null, remember: false });
  }

  function handleCategoryChange(row: PreviewRow, value: string) {
    if (value === "__new__") {
      setCategoryModal({
        rowIndex: row.index,
        type: row.type,
        previousCategory: row.category,
      });
      return;
    }

    updateRow(row.index, {
      category: value || null,
      suggestionSource: null,
    });
  }

  function handleCloseCategoryModal() {
    if (categoryModal) {
      updateRow(categoryModal.rowIndex, {
        category: categoryModal.previousCategory,
      });
      setCategoryModal(null);
    }
  }

  async function handleCreateInlineCategory(payload: CategoryPayload) {
    if (!categoryModal) return;

    const created = await createCategory(payload);

    setCategories((prev) => {
      const exists = prev.some(
        (category) => category.id === created.id || category.name === created.name,
      );
      return exists ? prev : [...prev, created];
    });

    updateRow(categoryModal.rowIndex, {
      category: created.name,
      suggestionSource: null,
      ...(created.type === "outcome" || created.type === "income" ? { type: created.type } : {}),
    });

    setCategoryModal(null);
  }

  function applyCategoryToMerchant(row: PreviewRow) {
    setRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.merchant === row.merchant && currentRow.type === row.type
          ? { ...currentRow, category: row.category }
          : currentRow,
      ),
    );
  }

  async function handleConfirm() {
    if (!loaded) return;

    const included = rows.filter((row) => row.include);
    const rules = new Map<string, { pattern: string; category: string; type: ImportEntryType }>();

    for (const row of included) {
      if (row.remember && row.category && row.merchant) {
        rules.set(row.merchant, {
          pattern: row.merchant,
          category: row.category,
          type: row.type,
        });
      }
    }

    setError("");
    setBusy(true);

    try {
      const result = await confirmImport({
        fileName: loaded.name,
        fileHash: loaded.hash,
        issuer: loaded.invoice.issuer,
        referenceMonth,
        dueDate: loaded.invoice.dueDate,
        statedTotal: loaded.invoice.statedTotal,
        replaceTransactionId: replaceLump ? (preview?.lumpCandidate?.id ?? null) : null,
        rules: Array.from(rules.values()),
        items: included.map((row) => ({
          date: row.date,
          description: row.description.trim(),
          amount: row.amount,
          type: row.type,
          category: row.category ?? "",
          installment: row.installment,
        })),
      });

      await refreshTransactions();
      setBatches(await fetchImportBatches());
      resetPreview();
      setSuccess(
        `${result.created} transação(ões) registrada(s) a partir de ${result.batch.fileName}.`,
      );
    } catch (confirmError) {
      setError(getErrorMessage(confirmError, "Não foi possível importar a fatura."));
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!batchToUndo) return;

    const result = await undoImport(batchToUndo.id);

    await refreshTransactions();
    setBatches((currentBatches) =>
      currentBatches.filter((batch) => batch.id !== batchToUndo.id),
    );
    setBatchToUndo(null);
    setError("");
    setSuccess(`Importação desfeita: ${result.removed} transação(ões) removida(s).`);
  }

  const includedRows = rows.filter((row) => row.include);
  const includedTotal = roundCents(
    includedRows.reduce(
      (acc, row) => acc + (row.type === "outcome" ? row.amount : -row.amount),
      0,
    ),
  );
  const statedTotal = loaded?.invoice.statedTotal ?? null;
  const difference = statedTotal === null ? null : roundCents(includedTotal - statedTotal);
  const hasDifference = difference !== null && difference !== 0;
  const pendingCount = rows.filter(isRowPending).length;
  const canConfirm =
    includedRows.length > 0 && pendingCount === 0 && (!hasDifference || acceptDifference) && !busy;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Importar"
        title="Fatura por PDF"
        subtitle="Envie a fatura do cartão, confira os lançamentos e as categorias sugeridas e registre tudo de uma vez."
      />

      <PageContent>
        {error && (
          <Notice $variant="error" role="alert">
            {error}
          </Notice>
        )}

        {success && (
          <Notice $variant="success" role="status">
            {success} <Link href="/transactions">Ver transações</Link>
          </Notice>
        )}

        {!loaded && (
          <Section>
            <h2>1. Enviar fatura</h2>
            <p>
              O arquivo é lido no seu navegador e não é enviado nem armazenado; só os
              lançamentos que você confirmar são gravados.
            </p>

            <UploadArea>
              <strong>{busy ? "Lendo o PDF..." : "Selecionar PDF da fatura"}</strong>
              <span>PDF com texto selecionável, até 10 MB</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                aria-label="Arquivo PDF da fatura"
                disabled={busy}
                onChange={handleFileChange}
              />
            </UploadArea>

            {needsPassword && pendingFile && (
              <Row>
                <Field>
                  Senha do PDF
                  <Input
                    type="password"
                    value={password}
                    autoComplete="off"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  disabled={busy || !password}
                  onClick={() => processFile(pendingFile, password)}
                >
                  Abrir PDF
                </Button>
              </Row>
            )}
          </Section>
        )}

        {loaded && preview && (
          <Section>
            <h2>2. Conferir lançamentos</h2>
            <p>
              Ajuste o que for preciso. Só as linhas marcadas em &quot;Incluir&quot; serão
              registradas, como {" "}
              <strong>Cartão de crédito</strong>.
            </p>

            <SummaryGrid>
              <div>
                <dt>Arquivo</dt>
                <dd>{loaded.name}</dd>
              </div>
              <div>
                <dt>Emissor</dt>
                <dd>{loaded.invoice.issuer ?? "Não identificado"}</dd>
              </div>
              <div>
                <dt>Vencimento</dt>
                <dd>{loaded.invoice.dueDate ? formatDate(loaded.invoice.dueDate) : "—"}</dd>
              </div>
              <div>
                <dt>Total impresso na fatura</dt>
                <dd>{statedTotal === null ? "Não encontrado" : formatCurrency(statedTotal)}</dd>
              </div>
              <div>
                <dt>Lançamentos lidos</dt>
                <dd>{rows.length}</dd>
              </div>
            </SummaryGrid>

            <Row>
              <Field>
                Mês de referência
                <Input
                  type="month"
                  value={referenceMonth}
                  disabled={busy}
                  onChange={(event) => {
                    setReferenceMonth(event.target.value);
                    refreshPreview(event.target.value, useInvoiceMonth);
                  }}
                />
              </Field>
              <CheckLabel>
                <input
                  type="checkbox"
                  checked={useInvoiceMonth}
                  disabled={busy}
                  onChange={(event) => {
                    setUseInvoiceMonth(event.target.checked);
                    refreshPreview(referenceMonth, event.target.checked);
                  }}
                />
                Lançar tudo no mês da fatura ({formatMonth(referenceMonth)})
              </CheckLabel>
            </Row>

            {loaded.invoice.warnings.map((warning) => (
              <Notice key={warning} $variant="warning">
                {warning}
              </Notice>
            ))}

            {preview.alreadyImported && (
              <Notice $variant="warning" role="alert">
                Esta fatura já foi importada em{" "}
                {new Date(preview.alreadyImported.createdAt).toLocaleDateString("pt-BR")}. As
                linhas iguais às já registradas vêm desmarcadas.
              </Notice>
            )}

            {preview.lumpCandidate && (
              <Notice $variant="info">
                Você já registrou esta fatura como um lançamento único: &quot;
                {preview.lumpCandidate.description}&quot; (
                {formatCurrency(Math.abs(preview.lumpCandidate.amount))}, em{" "}
                {formatDate(preview.lumpCandidate.date)}). Sem substituir, o gasto será contado
                duas vezes.
                <label>
                  <input
                    type="checkbox"
                    checked={replaceLump}
                    onChange={(event) => setReplaceLump(event.target.checked)}
                  />
                  Substituir esse lançamento pelo detalhamento
                </label>
              </Notice>
            )}

            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th>Incluir</th>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Parcela</th>
                    <th>Valor</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const options = categories.filter(
                      (category) => category.type === row.type,
                    );
                    const sameMerchant = rows.filter(
                      (otherRow) =>
                        otherRow.index !== row.index &&
                        otherRow.merchant === row.merchant &&
                        otherRow.type === row.type &&
                        otherRow.category !== row.category,
                    ).length;
                    const categoryChanged =
                      !!row.category && row.category !== row.suggestedCategory;
                    const label = `linha ${row.index + 1}`;

                    return (
                      <tr key={row.index} data-excluded={!row.include}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Incluir ${label}`}
                            checked={row.include}
                            onChange={(event) =>
                              updateRow(row.index, { include: event.target.checked })
                            }
                          />
                        </td>
                        <td>
                          <Input
                            type="date"
                            aria-label={`Data da ${label}`}
                            value={row.date}
                            onChange={(event) =>
                              updateRow(row.index, { date: event.target.value })
                            }
                          />
                        </td>
                        <td>
                          <Input
                            type="text"
                            aria-label={`Descrição da ${label}`}
                            value={row.description}
                            onChange={(event) =>
                              updateRow(row.index, { description: event.target.value })
                            }
                          />
                          {KIND_LABELS[row.kind] && (
                            <Badge $tone="muted">{KIND_LABELS[row.kind]}</Badge>
                          )}
                          {row.duplicateOf && (
                            <Badge $tone="yellow">
                              possível duplicata de {formatDate(row.duplicateOf.date)}
                            </Badge>
                          )}
                        </td>
                        <td>{formatInstallment(row.installment) || "—"}</td>
                        <td>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            aria-label={`Valor da ${label}`}
                            value={row.amount}
                            onChange={(event) =>
                              updateRow(row.index, { amount: Number(event.target.value) })
                            }
                          />
                        </td>
                        <td>
                          <Select
                            aria-label={`Tipo da ${label}`}
                            value={row.type}
                            onChange={(event) =>
                              handleTypeChange(row, event.target.value as ImportEntryType)
                            }
                          >
                            <option value="outcome">Despesa</option>
                            <option value="income">Receita</option>
                          </Select>
                        </td>
                        <td>
                          <Select
                            aria-label={`Categoria da ${label}`}
                            value={
                              categoryModal?.rowIndex === row.index
                                ? "__new__"
                                : (row.category ?? "")
                            }
                            onChange={(event) =>
                              handleCategoryChange(row, event.target.value)
                            }
                          >
                            <option value="">Selecione uma categoria</option>
                            {row.category &&
                              !options.some(
                                (category) => category.name === row.category,
                              ) && (
                                <option value={row.category}>{row.category}</option>
                              )}
                            {options.map((category) => (
                              <option key={category.id} value={category.name}>
                                {category.name}
                              </option>
                            ))}
                            <option value="__new__">+ Nova categoria...</option>
                          </Select>
                          {row.suggestionSource && (
                            <Badge $tone="green">{SOURCE_LABELS[row.suggestionSource]}</Badge>
                          )}
                          {row.include && !row.category && (
                            <Badge $tone="red">sem categoria</Badge>
                          )}
                          {row.category && sameMerchant > 0 && (
                            <InlineButton
                              type="button"
                              onClick={() => applyCategoryToMerchant(row)}
                            >
                              Aplicar às outras {sameMerchant} de {row.merchant}
                            </InlineButton>
                          )}
                          {categoryChanged && (
                            <CheckLabel>
                              <input
                                type="checkbox"
                                checked={row.remember}
                                onChange={(event) =>
                                  updateRow(row.index, { remember: event.target.checked })
                                }
                              />
                              Lembrar para as próximas faturas
                            </CheckLabel>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrapper>

            {hasDifference && (
              <Notice $variant="warning" role="alert">
                A soma das linhas incluídas ({formatCurrency(includedTotal)}) difere do total
                impresso na fatura ({formatCurrency(statedTotal ?? 0)}) em{" "}
                {formatCurrency(Math.abs(difference ?? 0))}. Confira se o PDF foi lido por
                inteiro.
                <label>
                  <input
                    type="checkbox"
                    checked={acceptDifference}
                    onChange={(event) => setAcceptDifference(event.target.checked)}
                  />
                  Registrar mesmo com a diferença
                </label>
              </Notice>
            )}

            {difference === 0 && (
              <Notice $variant="success">
                A soma das linhas incluídas confere com o total da fatura.
              </Notice>
            )}

            {categories.length === 0 && (
              <Notice $variant="warning">
                Você ainda não tem categorias. <Link href="/categories">Crie categorias</Link>{" "}
                antes de importar.
              </Notice>
            )}

            <Footer>
              <p>
                {includedRows.length} de {rows.length} linha(s) incluída(s) •{" "}
                {formatCurrency(includedTotal)}
                {pendingCount > 0 && ` • ${pendingCount} pendência(s) para resolver`}
              </p>
              <div>
                <Button type="button" $variant="ghost" disabled={busy} onClick={resetPreview}>
                  Cancelar
                </Button>
                <Button type="button" disabled={!canConfirm} onClick={handleConfirm}>
                  Registrar {includedRows.length} transação(ões)
                </Button>
              </div>
            </Footer>
          </Section>
        )}

        <Section>
          <h2>Importações anteriores</h2>
          {batches.length === 0 ? (
            <p>Nenhuma fatura importada ainda.</p>
          ) : (
            <BatchList>
              {batches.map((batch) => (
                <li key={batch.id}>
                  <div>
                    <strong>
                      {batch.issuer ?? "Fatura"} • {formatMonth(batch.referenceMonth)}
                    </strong>
                    <span>
                      {batch.fileName} • {batch.itemCount} lançamento(s) •{" "}
                      {formatCurrency(batch.importedTotal)} • importada em{" "}
                      {new Date(batch.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <Button type="button" $variant="ghost" onClick={() => setBatchToUndo(batch)}>
                    Desfazer importação
                  </Button>
                </li>
              ))}
            </BatchList>
          )}
        </Section>
      </PageContent>

      <ConfirmDialog
        isOpen={!!batchToUndo}
        onClose={() => setBatchToUndo(null)}
        title="Desfazer importação"
        message={
          batchToUndo
            ? `Todas as ${batchToUndo.itemCount} transações importadas de ${batchToUndo.fileName} serão excluídas. Deseja continuar?`
            : ""
        }
        confirmLabel="Desfazer importação"
        onConfirm={handleUndo}
      />

      <Modal
        isOpen={!!categoryModal}
        onClose={handleCloseCategoryModal}
        title="Nova categoria"
        maxWidth="420px"
      >
        {categoryModal && (
          <CategoryForm
            key={`inline-category-${categoryModal.rowIndex}`}
            submitLabel="Criar categoria"
            initialValues={{
              name: "",
              type: categoryModal.type,
              color: "#00c48c",
              icon: "",
            }}
            onSubmit={handleCreateInlineCategory}
          />
        )}
      </Modal>
    </AppShell>
  );
}
