"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CategoryForm } from "@/components/CategoryForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImportAmountInput } from "@/components/ImportAmountInput";
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
import { formatCurrency, formatDate, formatMonthYear } from "@/utils/formatters";
import {
  AmountCell,
  Batch,
  BatchMain,
  Batches,
  BatchTotal,
  CategoryCell,
  CategoryPick,
  CategorySelect,
  Check,
  DateInput,
  DescriptionInput,
  Dot,
  DropZone,
  Extra,
  Field,
  Flags,
  Footer,
  Hint,
  Info,
  Input,
  Line,
  LineCheck,
  Lines,
  LinesHead,
  LinkButton,
  Meta,
  MonthHint,
  MonthRow,
  Notice,
  PageContent,
  Parcel,
  PasswordRow,
  PrimaryButton,
  Quiet,
  QuietButton,
  Step,
  StepHead,
  StepNumber,
  Tag,
  Totals,
  TypeSelect,
  UndoButton,
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

type BatchesState = "loading" | "ready" | "error";

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

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  return formatMonthYear(new Date(year, monthNumber - 1, 1));
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
  const [batchesState, setBatchesState] = useState<BatchesState>("loading");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [referenceMonth, setReferenceMonth] = useState(getLocalMonthKey());
  const [useInvoiceMonth, setUseInvoiceMonth] = useState(true);
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
        fetchImportBatches().catch(() => null),
      ]);

      if (active) {
        setCategories(categoryData);
        setBatches(batchData ?? []);
        setBatchesState(batchData ? "ready" : "error");
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
    setUseInvoiceMonth(true);
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

      await loadPreview(nextLoaded, month, true);
      setLoaded(nextLoaded);
      setReferenceMonth(month);
      setUseInvoiceMonth(true);
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

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!busy) setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file && !busy) {
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
          purchaseDate: row.purchaseDate,
          description: row.description.trim(),
          amount: row.amount,
          type: row.type,
          category: row.category ?? "",
          installment: row.installment,
        })),
      });

      await refreshTransactions();
      setBatches(await fetchImportBatches());
      setBatchesState("ready");
      resetPreview();
      setSuccess(
        `${plural(result.created, "lançamento importado", "lançamentos importados")} de ${result.batch.fileName}.`,
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
    setSuccess(
      `Importação desfeita: ${plural(result.removed, "lançamento removido", "lançamentos removidos")}.`,
    );
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
  const categoryColors = new Map(
    categories.map((category) => [`${category.type}:${category.name}`, category.color ?? null]),
  );

  return (
    <AppShell>
      <PageHeader title="Importar fatura" />

      <PageContent>
        {error && (
          <Notice $tone="error" role="alert">
            {error}
          </Notice>
        )}

        {success && (
          <Notice $tone="success" role="status">
            <span>
              {success} <Link href="/transactions">Ver lançamentos</Link>
            </span>
          </Notice>
        )}

        {!loaded && (
          <Step>
            <StepHead>
              <StepNumber aria-hidden="true">1</StepNumber>
              Enviar o PDF
            </StepHead>

            <DropZone
              $active={dragging}
              $busy={busy}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <strong aria-live="polite">
                {busy ? "Lendo o PDF…" : "Selecionar ou soltar o PDF da fatura"}
              </strong>
              <span>PDF com texto selecionável, até 10 MB</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                aria-label="Arquivo PDF da fatura"
                disabled={busy}
                onChange={handleFileChange}
              />
            </DropZone>

            <Hint>
              O PDF é lido neste aparelho e não é enviado. Só os lançamentos que você
              confirmar são gravados.
            </Hint>

            {needsPassword && pendingFile && (
              <PasswordRow>
                <Field>
                  <span>Senha do PDF</span>
                  <Input
                    type="password"
                    value={password}
                    autoComplete="off"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <PrimaryButton
                  type="button"
                  disabled={busy || !password}
                  onClick={() => processFile(pendingFile, password)}
                >
                  Abrir PDF
                </PrimaryButton>
              </PasswordRow>
            )}
          </Step>
        )}

        {loaded && preview && (
          <Step>
            <StepHead>
              <StepNumber aria-hidden="true">2</StepNumber>
              Conferir os lançamentos
            </StepHead>

            <Meta>
              <div>
                <dt>Emissor</dt>
                <dd>{loaded.invoice.issuer ?? "Não identificado"}</dd>
              </div>
              <div>
                <dt>Vencimento</dt>
                <dd>{loaded.invoice.dueDate ? formatDate(loaded.invoice.dueDate) : "—"}</dd>
              </div>
              <div>
                <dt>Lançamentos lidos</dt>
                <dd>{rows.length}</dd>
              </div>
              <div>
                <dt>Arquivo</dt>
                <dd>{loaded.name}</dd>
              </div>
            </Meta>

            <MonthRow>
              <Field>
                <span>Mês da fatura (vencimento)</span>
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
              <Check>
                <input
                  type="checkbox"
                  checked={!useInvoiceMonth}
                  disabled={busy}
                  onChange={(event) => {
                    const invoiceMonth = !event.target.checked;

                    setUseInvoiceMonth(invoiceMonth);
                    refreshPreview(referenceMonth, invoiceMonth);
                  }}
                />
                Usar a data de cada compra
              </Check>
            </MonthRow>

            <MonthHint>
              {useInvoiceMonth
                ? `Tudo entra em ${formatMonth(referenceMonth)}, o mês em que a fatura vence e o dinheiro sai da sua conta. A data de cada compra fica guardada na observação do lançamento.`
                : `Cada compra entra no mês em que foi feita; parcelas a partir da 2ª entram em ${formatMonth(referenceMonth)}. Assim o mês mostra quando você gastou, não quando pagou.`}
            </MonthHint>

            {loaded.invoice.warnings.map((warning) => (
              <Notice key={warning} $tone="warning">
                {warning}
              </Notice>
            ))}

            {preview.alreadyImported && (
              <Notice $tone="warning" role="alert">
                Esta fatura já foi importada em {formatDate(preview.alreadyImported.createdAt)}.
                As linhas iguais às já registradas vêm desmarcadas.
              </Notice>
            )}

            {preview.lumpCandidate && (
              <Notice $tone="info">
                <span>
                  Você já registrou esta fatura como um lançamento único: &quot;
                  {preview.lumpCandidate.description}&quot; (
                  {formatCurrency(Math.abs(preview.lumpCandidate.amount))}, em{" "}
                  {formatDate(preview.lumpCandidate.date)}). Sem substituir, o gasto conta duas
                  vezes.
                </span>
                <Check>
                  <input
                    type="checkbox"
                    checked={replaceLump}
                    onChange={(event) => setReplaceLump(event.target.checked)}
                  />
                  Substituir esse lançamento pelo detalhamento
                </Check>
              </Notice>
            )}

            {categories.length === 0 && (
              <Notice $tone="warning">
                <span>
                  Você ainda não tem categorias.{" "}
                  <Link href="/categories">Criar categorias</Link> antes de importar.
                </span>
              </Notice>
            )}

            <Hint>
              Desmarque o que não quer importar. Tudo entra como Cartão de crédito.
            </Hint>

            <Lines>
              <LinesHead aria-hidden="true">
                <span />
                <span>Data</span>
                <span>Descrição</span>
                <span>Parc.</span>
                <span>Tipo</span>
                <span>Categoria</span>
                <span>Valor</span>
              </LinesHead>

              {rows.map((row) => {
                const options = categories.filter((category) => category.type === row.type);
                const sameMerchant = rows.filter(
                  (otherRow) =>
                    otherRow.index !== row.index &&
                    otherRow.merchant === row.merchant &&
                    otherRow.type === row.type &&
                    otherRow.category !== row.category,
                ).length;
                const categoryChanged = !!row.category && row.category !== row.suggestedCategory;
                const missingCategory = row.include && !row.category;
                const installment = formatInstallment(row.installment);
                const label = `linha ${row.index + 1}`;
                const outcome = row.type === "outcome";

                return (
                  <Line key={row.index} $excluded={!row.include} data-excluded={!row.include}>
                    <LineCheck>
                      <input
                        type="checkbox"
                        aria-label={`Incluir ${label}`}
                        checked={row.include}
                        onChange={(event) =>
                          updateRow(row.index, { include: event.target.checked })
                        }
                      />
                    </LineCheck>

                    <DescriptionInput
                      type="text"
                      aria-label={`Descrição da ${label}`}
                      value={row.description}
                      onChange={(event) =>
                        updateRow(row.index, { description: event.target.value })
                      }
                    />

                    <AmountCell $outcome={outcome}>
                      <span aria-hidden="true">{outcome ? "−" : "+"}</span>
                      <ImportAmountInput
                        label={`Valor da ${label}`}
                        value={row.amount}
                        onChange={(amount) => updateRow(row.index, { amount })}
                      />
                    </AmountCell>

                    <Info>
                      <DateInput
                        type="date"
                        aria-label={`Data da ${label}`}
                        value={row.date}
                        onChange={(event) => updateRow(row.index, { date: event.target.value })}
                      />
                      <Parcel data-empty={!installment}>{installment || "—"}</Parcel>
                      <Flags>
                        {KIND_LABELS[row.kind] && <Tag $tone="muted">{KIND_LABELS[row.kind]}</Tag>}
                        {row.purchaseDate && row.purchaseDate !== row.date && (
                          <Tag $tone="muted">compra em {formatDate(`${row.purchaseDate}T00:00:00.000Z`)}</Tag>
                        )}
                        {row.duplicateOf && (
                          <Tag $tone="amber">
                            possível duplicata de {formatDate(row.duplicateOf.date)}
                          </Tag>
                        )}
                        {row.suggestionSource && (
                          <Tag $tone="green">{SOURCE_LABELS[row.suggestionSource]}</Tag>
                        )}
                        {missingCategory && <Tag $tone="red">sem categoria</Tag>}
                      </Flags>
                    </Info>

                    <CategoryCell>
                      <CategoryPick>
                        <Dot
                          aria-hidden="true"
                          $color={
                            row.category
                              ? (categoryColors.get(`${row.type}:${row.category}`) ?? null)
                              : null
                          }
                        />
                        <CategorySelect
                          aria-label={`Categoria da ${label}`}
                          $missing={missingCategory}
                          value={
                            categoryModal?.rowIndex === row.index ? "__new__" : (row.category ?? "")
                          }
                          onChange={(event) => handleCategoryChange(row, event.target.value)}
                        >
                          <option value="">Selecione uma categoria</option>
                          {row.category &&
                            !options.some((category) => category.name === row.category) && (
                              <option value={row.category}>{row.category}</option>
                            )}
                          {options.map((category) => (
                            <option key={category.id} value={category.name}>
                              {category.name}
                            </option>
                          ))}
                          <option value="__new__">+ Nova categoria...</option>
                        </CategorySelect>
                      </CategoryPick>
                      <TypeSelect
                        aria-label={`Tipo da ${label}`}
                        value={row.type}
                        onChange={(event) =>
                          handleTypeChange(row, event.target.value as ImportEntryType)
                        }
                      >
                        <option value="outcome">Gasto</option>
                        <option value="income">Receita</option>
                      </TypeSelect>
                    </CategoryCell>

                    <Extra>
                      {row.category && sameMerchant > 0 && (
                        <LinkButton type="button" onClick={() => applyCategoryToMerchant(row)}>
                          Aplicar às outras {sameMerchant} de {row.merchant}
                        </LinkButton>
                      )}
                      {categoryChanged && (
                        <Check>
                          <input
                            type="checkbox"
                            checked={row.remember}
                            onChange={(event) =>
                              updateRow(row.index, { remember: event.target.checked })
                            }
                          />
                          Lembrar para as próximas faturas
                        </Check>
                      )}
                    </Extra>
                  </Line>
                );
              })}
            </Lines>

            <Totals aria-label="Totais">
              <div>
                <dt>Total da fatura</dt>
                <dd>{statedTotal === null ? "Não encontrado" : formatCurrency(statedTotal)}</dd>
              </div>
              {hasDifference && (
                <div>
                  <dt>Diferença</dt>
                  <dd data-tone="red">{formatCurrency(Math.abs(difference ?? 0))}</dd>
                </div>
              )}
              <div data-total>
                <dt>
                  Selecionados ({includedRows.length} de {rows.length})
                </dt>
                <dd>{formatCurrency(includedTotal)}</dd>
              </div>
            </Totals>

            {hasDifference && (
              <Notice $tone="warning" role="alert">
                <span>
                  A soma das linhas incluídas ({formatCurrency(includedTotal)}) difere do total
                  impresso na fatura ({formatCurrency(statedTotal ?? 0)}) em{" "}
                  {formatCurrency(Math.abs(difference ?? 0))}. Confira se o PDF foi lido por
                  inteiro.
                </span>
                <Check>
                  <input
                    type="checkbox"
                    checked={acceptDifference}
                    onChange={(event) => setAcceptDifference(event.target.checked)}
                  />
                  Importar mesmo com a diferença
                </Check>
              </Notice>
            )}

            {difference === 0 && (
              <Notice $tone="success">
                A soma das linhas incluídas confere com o total da fatura.
              </Notice>
            )}

            <Footer>
              {pendingCount > 0 ? (
                <p data-pending>
                  {plural(pendingCount, "pendência", "pendências")} para resolver antes de
                  importar
                </p>
              ) : (
                <p>
                  {plural(includedRows.length, "lançamento selecionado", "lançamentos selecionados")}
                </p>
              )}
              <div>
                <QuietButton type="button" disabled={busy} onClick={resetPreview}>
                  Cancelar
                </QuietButton>
                <PrimaryButton type="button" disabled={!canConfirm} onClick={handleConfirm}>
                  {busy
                    ? "Importando…"
                    : `Importar ${plural(includedRows.length, "lançamento", "lançamentos")}`}
                </PrimaryButton>
              </div>
            </Footer>
          </Step>
        )}

        <Step>
          <StepHead>
            <StepNumber aria-hidden="true">{loaded ? 3 : 2}</StepNumber>
            Importações anteriores
          </StepHead>

          {batchesState === "loading" && <Quiet>Carregando importações…</Quiet>}

          {batchesState === "error" && (
            <Notice $tone="error" role="alert">
              Não foi possível carregar as importações anteriores.
            </Notice>
          )}

          {batchesState === "ready" && batches.length === 0 && (
            <Quiet>Nenhuma fatura importada ainda.</Quiet>
          )}

          {batches.length > 0 && (
            <Batches>
              {batches.map((batch) => (
                <Batch key={batch.id}>
                  <BatchMain>
                    <strong>
                      {formatMonth(batch.referenceMonth)} · {batch.issuer ?? "Fatura"}
                    </strong>
                    <span>
                      {batch.fileName} · {plural(batch.itemCount, "lançamento", "lançamentos")} ·
                      importada em {formatDate(batch.createdAt)}
                    </span>
                  </BatchMain>
                  <BatchTotal>{formatCurrency(batch.importedTotal)}</BatchTotal>
                  <UndoButton
                    type="button"
                    aria-label={`Desfazer importação de ${batch.fileName}`}
                    onClick={() => setBatchToUndo(batch)}
                  >
                    Desfazer
                  </UndoButton>
                </Batch>
              ))}
            </Batches>
          )}
        </Step>
      </PageContent>

      <ConfirmDialog
        isOpen={!!batchToUndo}
        onClose={() => setBatchToUndo(null)}
        title="Desfazer importação"
        message={
          batchToUndo
            ? `${plural(batchToUndo.itemCount, "lançamento importado", "lançamentos importados")} de ${batchToUndo.fileName} ${batchToUndo.itemCount === 1 ? "será excluído" : "serão excluídos"}.`
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
            defaultType={categoryModal.type}
            onSubmit={handleCreateInlineCategory}
          />
        )}
      </Modal>
    </AppShell>
  );
}
