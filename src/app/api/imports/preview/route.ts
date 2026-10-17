import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { invalidBodyResponse, readJsonBody } from "@/lib/http";
import { validateImportPreviewInput } from "@/lib/importValidators";
import { buildHistoryIndex, suggestCategory } from "@/features/invoice-import/categorize";
import {
  buildFingerprint,
  getEffectiveDate,
  normalizeMerchant,
} from "@/features/invoice-import/normalize";
import type {
  ImportEntryType,
  ImportPreviewItem,
  ImportPreviewResponse,
} from "@/features/invoice-import/types";

const LUMP_TOLERANCE = 0.01;
const FLOAT_EPSILON = 1e-9;

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function resolveType(type: string | null, amount: number) {
  return type ?? (amount > 0 ? "income" : "outcome");
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

    const { data, error, invalidItems } = validateImportPreviewInput(body);

    if (error !== undefined) {
      return NextResponse.json(
        invalidItems ? { error, invalidItems } : { error },
        { status: 400 },
      );
    }

    const [categories, rules, transactions, existingBatch] = await Promise.all([
      prisma.category.findMany({
        where: { userId: user.id },
        select: { name: true, type: true },
      }),
      prisma.categoryRule.findMany({
        where: { userId: user.id },
        select: { pattern: true, category: true, type: true },
      }),
      prisma.transaction.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          description: true,
          amount: true,
          category: true,
          type: true,
          date: true,
        },
      }),
      prisma.importBatch.findFirst({
        where: { userId: user.id, fileHash: data.fileHash },
        orderBy: { createdAt: "desc" },
        select: { id: true, fileName: true, createdAt: true },
      }),
    ]);

    const history = buildHistoryIndex(transactions);
    const existingByFingerprint = new Map<string, (typeof transactions)[number]>();

    for (const transaction of transactions) {
      const fingerprint = buildFingerprint(
        toDateString(transaction.date),
        transaction.description,
        transaction.amount,
      );

      if (!existingByFingerprint.has(fingerprint)) {
        existingByFingerprint.set(fingerprint, transaction);
      }
    }

    const items: ImportPreviewItem[] = data.items.map((item, index) => {
      const date = getEffectiveDate(
        item.date,
        item.installment,
        data.referenceMonth,
        data.useInvoiceMonth,
      );
      const merchant = normalizeMerchant(item.description);
      const type: ImportEntryType = item.kind === "credit" ? "income" : "outcome";
      const suggestion = suggestCategory({ merchant, type, rules, history, categories });
      const duplicate =
        existingByFingerprint.get(buildFingerprint(date, item.description, item.amount)) ??
        (item.date ? existingByFingerprint.get(buildFingerprint(item.date, item.description, item.amount)) : undefined);
      const duplicateOf = duplicate
        ? {
            id: duplicate.id,
            description: duplicate.description,
            date: toDateString(duplicate.date),
          }
        : null;

      return {
        index,
        date,
        purchaseDate: item.date,
        description: item.description,
        merchant,
        amount: item.amount,
        type,
        kind: item.kind,
        installment: item.installment,
        category: suggestion.category,
        suggestionSource: suggestion.source,
        include: item.kind !== "payment" && duplicateOf === null,
        duplicateOf,
      };
    });

    let lumpCandidate: ImportPreviewResponse["lumpCandidate"] = null;

    if (data.statedTotal !== null) {
      const statedTotal = data.statedTotal;
      const [year, month] = data.referenceMonth.split("-").map(Number);
      const candidates = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          importItem: null,
          date: {
            gte: new Date(Date.UTC(year, month - 2, 1)),
            lt: new Date(Date.UTC(year, month + 1, 1)),
          },
        },
        orderBy: { date: "desc" },
        select: { id: true, description: true, amount: true, type: true, date: true },
      });
      const match = candidates.find(
        (candidate) =>
          resolveType(candidate.type, candidate.amount) === "outcome" &&
          Math.abs(Math.abs(candidate.amount) - statedTotal) <= LUMP_TOLERANCE + FLOAT_EPSILON,
      );

      if (match) {
        lumpCandidate = {
          id: match.id,
          description: match.description,
          amount: match.amount,
          date: toDateString(match.date),
        };
      }
    }

    const response: ImportPreviewResponse = {
      alreadyImported: existingBatch
        ? {
            id: existingBatch.id,
            fileName: existingBatch.fileName,
            createdAt: existingBatch.createdAt.toISOString(),
          }
        : null,
      lumpCandidate,
      items,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro no POST /api/imports/preview:", error);
    return NextResponse.json(
      { error: "Erro ao analisar a fatura." },
      { status: 500 },
    );
  }
}
