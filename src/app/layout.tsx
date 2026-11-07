import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conecta Digital Prospector",
  description: "CRM de prospecção com Central de Abordagem Comercial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
