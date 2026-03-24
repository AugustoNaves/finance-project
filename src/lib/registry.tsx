"use client";

import React, { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";

export default function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cria a folha de estilos apenas uma vez
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  // Injeta os estilos no HTML gerado pelo servidor
  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    styledComponentsStyleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  // Se já estiver no navegador (client-side), apenas renderiza as crianças
  if (typeof window !== "undefined") return <>{children}</>;

  // Renderização no servidor
  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
      {children}
    </StyleSheetManager>
  );
}
