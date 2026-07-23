"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { SettingsCard } from "@/components/SettingsCard";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { Transaction } from "@/types/transaction";
import { formatCurrency } from "@/utils/formatters";
import {
  ActionButton,
  DangerButton,
  DataGrid,
  DetailItem,
  ExportActions,
  PageContent,
  SecurityList,
  SettingsGrid,
} from "./styles";

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalizedValue = String(value ?? "");

  return `"${normalizedValue.replaceAll('"', '""')}"`;
}

function toCsv(transactions: Transaction[]) {
  const header = [
    "id",
    "description",
    "amount",
    "category",
    "type",
    "paymentMethod",
    "notes",
    "date",
  ];
  const rows = transactions.map((transaction) =>
    [
      transaction.id,
      transaction.description,
      transaction.amount,
      transaction.category,
      transaction.type,
      transaction.paymentMethod,
      transaction.notes,
      transaction.date,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

export default function SettingsPage() {
  const router = useRouter();
  const { transactions } = useContext(TransactionsContext);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const totalStored = transactions.reduce(
    (acc, transaction) => acc + transaction.amount,
    0,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const response = await fetch("/api/me");

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (isMounted) {
        setUser(data.user);
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleExportJson() {
    downloadFile(
      "transacoes.json",
      JSON.stringify(transactions, null, 2),
      "application/json;charset=utf-8",
    );
  }

  function handleExportCsv() {
    downloadFile("transacoes.csv", toCsv(transactions), "text/csv;charset=utf-8");
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Configurações"
        title="Conta e dados"
        subtitle="Gerencie preferências simples, exporte seus registros e encerre a sessão com segurança."
      />

      <PageContent>
        <SettingsGrid>
          <SettingsCard
            title="Perfil"
            description="Informações básicas da sessão atual."
          >
            <DataGrid>
              <DetailItem>
                <span>Conta</span>
                <strong>{user?.name || "Usuário autenticado"}</strong>
              </DetailItem>
              <DetailItem>
                <span>E-mail</span>
                <strong>{user?.email || "Carregando..."}</strong>
              </DetailItem>
              <DetailItem>
                <span>Moeda padrão</span>
                <strong>Real brasileiro (BRL)</strong>
              </DetailItem>
              <DetailItem>
                <span>Transações carregadas</span>
                <strong>{transactions.length}</strong>
              </DetailItem>
              <DetailItem>
                <span>Saldo em memória</span>
                <strong>{formatCurrency(totalStored)}</strong>
              </DetailItem>
            </DataGrid>
          </SettingsCard>

          <SettingsCard
            title="Exportar dados"
            description="Baixe uma cópia simples das transações carregadas no app."
          >
            <ExportActions>
              <ActionButton type="button" onClick={handleExportJson}>
                Exportar JSON
              </ActionButton>
              <ActionButton type="button" onClick={handleExportCsv}>
                Exportar CSV
              </ActionButton>
            </ExportActions>
          </SettingsCard>

          <SettingsCard
            title="Segurança"
            description="O acesso usa sessão assinada em cookie httpOnly."
          >
            <SecurityList>
              <li>Cookie de sessão assinado com expiração de 30 dias.</li>
              <li>reCAPTCHA v3 permanece ativo apenas no login.</li>
              <li>Ao sair, a sessão local é removida pela API de logout.</li>
            </SecurityList>
            <DangerButton type="button" onClick={handleLogout}>
              Sair da conta
            </DangerButton>
          </SettingsCard>
        </SettingsGrid>
      </PageContent>
    </AppShell>
  );
}
