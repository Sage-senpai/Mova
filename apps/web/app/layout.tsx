import type { Metadata } from "next";
import "./globals.css";
import { PollarClientProvider } from "./components/PollarClientProvider";

export const metadata: Metadata = {
  title: "MOVA",
  description: "Payments, without the routing problem.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink font-sans text-paper antialiased">
        <PollarClientProvider>{children}</PollarClientProvider>
      </body>
    </html>
  );
}
