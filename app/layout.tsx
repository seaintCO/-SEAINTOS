import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Altair OS",
  description: "Cute AI assistant with voice and animated face",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
