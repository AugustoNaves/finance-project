import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { invalidBodyResponse, readJsonBody } from "@/lib/http";
import { type ImportConfirmItemInput, validateImportConfirmInput } from "@/lib/importValidators";
import { formatInstallment, normalizeMerchant } from "@/features/invoice-import/normalize";
import { formatDate } from "@/utils/formatters";

const IMPORT_PAYMENT_METHOD = "Cartão de crédito";
const TRANSACTION_TIMEOUT_MS = 30000;
const TRANSACTION_MAX_WAIT_MS = 10000;

const batchSummarySelect = {
  id: true,
  fileName: true,
  issuer: true,
  referenceMonth: true,
  dueDate: true,
  statedTotal: true,
  importedTotal: true,
  itemCount: true,
  createdAt: true,
} as const;

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const batches = await prisma.importBatch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: batchSummarySelect,
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error("Erro no GET /api/imports:", error);
    return NextResponse.json(
      { error: "Erro ao buscar importações." },
      { status: 500 },
    );
  }
}

function buildImportNotes(baseNotes: string, item: ImportConfirmItemInput) {
  const parts = [baseNotes];

  if (item.installment) {
    parts.push(`parcela ${formatInstallment(item.installment)}`);
  }

  if (item.purchaseDate && item.purchaseDate !== item.date) {
    parts.push(`compra em ${formatDate(`${item.purchaseDate}T00:00:00.000Z`)}`);
  }

  return parts.join(" — ");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await readJsonBody(request);

    if (!body) {
      return invalidBodyResponse();
    }

    const { data, error, invalidItems } = validateImportConfirmInput(body);

    if (error !== undefined) {
      return NextResponse.json(
        invalidItems ? { error, invalidItems } : { error },
        { status: 400 },
      );
    }

    const [year, month] = data.referenceMonth.split("-");
    const baseNotes = `Importado da fatura ${data.issuer ?? "de cartão"} ${month}/${year}`;
    const netTotal = data.items.reduce(
      (total, item) => total + (item.type === "outcome" ? item.amount : -item.amount),
      0,
    );
    const importedTotal = Math.round(netTotal * 100) / 100;

    const result = await prisma.$transaction(
      async (tx) => {
        let replaced = false;

        if (data.replaceTransactionId) {
          const deleted = await tx.transaction.deleteMany({
            where: { id: data.replaceTransactionId, userId: user.id },
          });

          replaced = deleted.count > 0;
        }

        const batch = await tx.importBatch.create({
          data: {
            fileName: data.fileName,
            fileHash: data.fileHash,
            issuer: data.issuer,
            referenceMonth: data.referenceMonth,
            dueDate: data.dueDate ? toUtcDate(data.dueDate) : null,
            statedTotal: data.statedTotal,
            importedTotal,
            itemCount: data.items.length,
            userId: user.id,
          },
          select: batchSummarySelect,
        });

        for (const item of data.items) {
          const transaction = await tx.transaction.create({
            data: {
              description: item.description,
              amount: item.type === "outcome" ? -item.amount : item.amount,
              category: item.category,
              type: item.type,
              date: toUtcDate(item.date),
              paymentMethod: IMPORT_PAYMENT_METHOD,
              notes: buildImportNotes(baseNotes, item),
              userId: user.id,
            },
          });

          await tx.importBatchItem.create({
            data: { batchId: batch.id, transactionId: transaction.id },
          });
        }

        for (const rule of data.rules) {
          const pattern = normalizeMerchant(rule.pattern);

          if (!pattern) {
            continue;
          }

          await tx.categoryRule.upsert({
            where: { userId_pattern: { userId: user.id, pattern } },
            update: { category: rule.category, type: rule.type },
            create: {
              pattern,
              category: rule.category,
              type: rule.type,
              userId: user.id,
            },
          });
        }

        return { batch, replaced };
      },
      { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_MAX_WAIT_MS },
    );

    return NextResponse.json(
      { batch: result.batch, created: data.items.length, replaced: result.replaced },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro no POST /api/imports:", error);
    return NextResponse.json(
      { error: "Erro ao importar a fatura." },
      { status: 500 },
    );
  }
}
