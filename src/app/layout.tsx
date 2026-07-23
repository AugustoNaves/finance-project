import "./globals.css";
import { DM_Sans } from "next/font/google";
import StyledComponentsRegistry from "@/lib/registry";
import { GlobalStyle } from "@/styles/global";
import { TransactionsProvider } from "@/contexts/TransactionsContenxt"; // <-- Importação nova

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

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
    <html lang="pt-BR" className={dmSans.variable}>
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>
          <GlobalStyle />
          <TransactionsProvider>{children}</TransactionsProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
