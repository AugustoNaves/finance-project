"use client";

import { ReactNode } from "react";
import { AppNavigation } from "@/components/AppNavigation";
import { Shell, ShellContent } from "./styles";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <Shell>
      <AppNavigation />
      <ShellContent>{children}</ShellContent>
    </Shell>
  );
}
