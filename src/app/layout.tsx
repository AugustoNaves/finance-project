import "./globals.css";
import StyledComponentsRegistry from "@/lib/registry";
import { GlobalStyle } from "@/styles/global";

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
      <body>
        <StyledComponentsRegistry>
          <GlobalStyle />
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
