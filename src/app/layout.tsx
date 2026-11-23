import type { Metadata } from "next";
import "./globals.css";

// Metadados globais compartilhados pelas páginas do App Router.
export const metadata: Metadata = {
  title: "Emprego Certo — seu próximo passo profissional",
  description: "Encontre oportunidades transparentes e acompanhe sua evolução profissional.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Define português do Brasil para leitor de tela, corretor e formatação do navegador.
  return <html lang="pt-BR"><body>{children}</body></html>;
}
