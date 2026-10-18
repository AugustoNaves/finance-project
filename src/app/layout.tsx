import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Literata, Public_Sans } from "next/font/google";
import StyledComponentsRegistry from "@/lib/registry";
import { GlobalStyle } from "@/styles/global";
import { TransactionsProvider } from "@/contexts/TransactionsContenxt";
import { EntrySheetProvider } from "@/contexts/EntrySheetContext";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const literata = Literata({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-literata",
});

const splashScreens = [
  { width: 375, height: 667, ratio: 2, file: "750x1334" },
  { width: 375, height: 812, ratio: 3, file: "1125x2436" },
  { width: 390, height: 844, ratio: 3, file: "1170x2532" },
  { width: 393, height: 852, ratio: 3, file: "1179x2556" },
  { width: 430, height: 932, ratio: 3, file: "1290x2796" },
];

const startupImage = splashScreens.flatMap(({ width, height, ratio, file }) =>
  (["light", "dark"] as const).map((theme) => ({
    url: `/splash/splash-${file}-${theme}.png`,
    media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait) and (prefers-color-scheme: ${theme})`,
  })),
);

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "Finance App",
  description: "Suas contas do mês, num caderno que cabe no bolso.",
  applicationName: "Finance App",
  appleWebApp: {
    capable: true,
    title: "Finance App",
    statusBarStyle: "default",
    startupImage,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#121815" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${literata.variable} ${publicSans.variable}`}>
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>
          <GlobalStyle />
          <TransactionsProvider>
            <EntrySheetProvider>{children}</EntrySheetProvider>
          </TransactionsProvider>
        </StyledComponentsRegistry>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
