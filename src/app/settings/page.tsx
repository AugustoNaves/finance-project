"use client";

import { useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LedgerSection } from "@/components/LedgerSection";
import { PageHeader } from "@/components/PageHeader";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { Transaction } from "@/types/transaction";
import { formatPlainAmount } from "@/utils/formatters";
import {
  Details,
  ExportActions,
  InstallSteps,
  LogoutButton,
  Note,
  OutlineButton,
} from "./styles";

type Profile = { name: string; email: string };
type ProfileState = { status: "loading" } | { status: "ready"; user: Profile } | { status: "error" };

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

function money(value: number) {
  return `${value < 0 ? "−" : ""}R$ ${formatPlainAmount(Math.abs(value))}`;
}

export default function SettingsPage() {
  const { transactions } = useContext(TransactionsContext);
  const [profile, setProfile] = useState<ProfileState>({ status: "loading" });
  const [leaving, setLeaving] = useState(false);
  const totalStored = transactions.reduce((acc, transaction) => acc + transaction.amount, 0);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/me");

        if (!response.ok) throw new Error("Falha ao carregar o perfil");

        const data = await response.json();

        if (isMounted) setProfile({ status: "ready", user: data.user });
      } catch {
        if (isMounted) setProfile({ status: "error" });
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
    setLeaving(true);
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  const user = profile.status === "ready" ? profile.user : null;
  const unavailable = profile.status === "error" ? "Indisponível" : "Carregando…";

  return (
    <AppShell>
      <PageHeader title="Configurações" />

      <LedgerSection title="Perfil">
        <Details>
          <div>
            <dt>Nome</dt>
            <dd>{user?.name || unavailable}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{user?.email || unavailable}</dd>
          </div>
          <div>
            <dt>Moeda</dt>
            <dd>Real brasileiro (BRL)</dd>
          </div>
          <div>
            <dt>Lançamentos</dt>
            <dd data-figure>{transactions.length}</dd>
          </div>
          <div>
            <dt>Saldo acumulado</dt>
            <dd data-figure>{money(totalStored)}</dd>
          </div>
        </Details>
      </LedgerSection>

      <LedgerSection title="Exportar dados">
        <Note>Baixe uma cópia de todos os seus lançamentos.</Note>
        <ExportActions>
          <OutlineButton type="button" onClick={handleExportCsv}>
            Exportar CSV
          </OutlineButton>
          <OutlineButton type="button" onClick={handleExportJson}>
            Exportar JSON
          </OutlineButton>
        </ExportActions>
      </LedgerSection>

      <LedgerSection title="Instalar o app" action={{ label: "Como usar o app", href: "/ajuda", newTab: true }}>
        <InstallSteps>
          <li>
            <b>iPhone</b>
            <span>No Safari, toque em Compartilhar → Adicionar à Tela de Início.</span>
          </li>
          <li>
            <b>Android</b>
            <span>No Chrome, abra o menu ⋮ → Instalar app.</span>
          </li>
        </InstallSteps>
      </LedgerSection>

      <LedgerSection title="Sessão">
        <Note>A sessão fica salva neste aparelho por 30 dias.</Note>
        <LogoutButton type="button" onClick={handleLogout} disabled={leaving}>
          {leaving ? "Saindo…" : "Sair da conta"}
        </LogoutButton>
      </LedgerSection>
    </AppShell>
  );
}
