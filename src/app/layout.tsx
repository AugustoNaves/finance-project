import "./globals.css";
import StyledComponentsRegistry from "@/lib/registry";
import { GlobalStyle } from "@/styles/global";
import { TransactionsProvider } from "@/contexts/TransactionsContenxt"; // <-- Importação nova

export const metadata = {
  title: "Finanças Pessoais",
  description: "Controle financeiro simplificado",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>
          <GlobalStyle />
          {/* Envolvendo a aplicação inteira com o Provider */}
          <TransactionsProvider>{children}</TransactionsProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
