"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Head, Heading, Root } from "./styles";

interface LedgerSectionProps {
  title: string;
  action?: { label: string; href?: string; onClick?: () => void };
  children: ReactNode;
}

export function LedgerSection({ title, action, children }: LedgerSectionProps) {
  return (
    <Root>
      <Head>
        <Heading>{title}</Heading>
        {action?.href && <Link href={action.href}>{action.label}</Link>}
        {action && !action.href && (
          <button type="button" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </Head>
      {children}
    </Root>
  );
}
