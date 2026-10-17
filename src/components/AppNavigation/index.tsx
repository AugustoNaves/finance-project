"use client";

import { usePathname } from "next/navigation";
import { useContext, useState } from "react";
import { Modal } from "@/components/CustomModal";
import { EntrySheetContext } from "@/contexts/EntrySheetContext";
import {
  Brand,
  BrandMark,
  MoreLink,
  MoreList,
  LogoutButton,
  PlusTab,
  RegisterButton,
  Side,
  SideGroup,
  SideItem,
  SideLogout,
  Tab,
  TabBar,
  TabButton,
} from "./styles";

const dailyItems = [
  { label: "Mês", href: "/", icon: "month" },
  { label: "Lançamentos", href: "/transactions", icon: "entries" },
  { label: "Planejar", href: "/planning", icon: "plan" },
] as const;

const organizeItems = [
  { label: "Importar fatura", href: "/import" },
  { label: "Categorias e regras", href: "/categories" },
  { label: "Investimentos", href: "/investments" },
  { label: "Relatórios", href: "/reports" },
  { label: "Configurações", href: "/settings" },
  { label: "Como usar", href: "/ajuda" },
];

const iconPaths = {
  month:
    "M4 7h16M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M8 2.5v3M16 2.5v3M7.5 11h9M7.5 15h5",
  entries: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  plan: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 12h.01",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  plus: "M12 5v14M5 12h14",
};

function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 2.6 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/planning") return pathname.startsWith("/planning") || pathname.startsWith("/budgets");
  return pathname.startsWith(href);
}

async function logout() {
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
}

export function AppNavigation() {
  const pathname = usePathname();
  const { openNewEntry } = useContext(EntrySheetContext);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = organizeItems.some((item) => isActivePath(pathname, item.href));

  return (
    <>
      <Side>
        <Brand href="/" aria-label="Finance-app, ir para o mês">
          <BrandMark aria-hidden="true">F</BrandMark>
          <span>Finance-app</span>
        </Brand>

        <RegisterButton type="button" onClick={() => openNewEntry()}>
          + Registrar
        </RegisterButton>

        <SideGroup aria-label="Dia a dia">
          <p aria-hidden="true">Dia a dia</p>
          {dailyItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <SideItem key={item.href} href={item.href} $active={active} aria-current={active ? "page" : undefined}>
                {item.label}
              </SideItem>
            );
          })}
        </SideGroup>

        <SideGroup aria-label="Organizar">
          <p aria-hidden="true">Organizar</p>
          {organizeItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <SideItem key={item.href} href={item.href} $active={active} aria-current={active ? "page" : undefined}>
                {item.label}
              </SideItem>
            );
          })}
        </SideGroup>

        <SideLogout type="button" onClick={logout}>
          Sair
        </SideLogout>
      </Side>

      <TabBar aria-label="Navegação principal">
        {dailyItems.slice(0, 2).map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Tab key={item.href} href={item.href} $active={active} aria-current={active ? "page" : undefined}>
              <Icon name={item.icon} />
              {item.label}
            </Tab>
          );
        })}
        <PlusTab type="button" aria-label="Registrar" onClick={() => openNewEntry()}>
          <Icon name="plus" />
        </PlusTab>
        <Tab
          href="/planning"
          $active={isActivePath(pathname, "/planning")}
          aria-current={isActivePath(pathname, "/planning") ? "page" : undefined}
        >
          <Icon name="plan" />
          Planejar
        </Tab>
        <TabButton
          type="button"
          $active={moreActive}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          onClick={() => setMoreOpen(true)}
        >
          <Icon name="more" />
          Mais
        </TabButton>
      </TabBar>

      <Modal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Mais" maxWidth="420px">
        <MoreList aria-label="Mais opções">
          {organizeItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <li key={item.href}>
                <MoreLink
                  href={item.href}
                  $active={active}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMoreOpen(false)}
                >
                  {item.label}
                  <span aria-hidden="true">›</span>
                </MoreLink>
              </li>
            );
          })}
          <li>
            <LogoutButton type="button" onClick={logout}>
              Sair
            </LogoutButton>
          </li>
        </MoreList>
      </Modal>
    </>
  );
}
