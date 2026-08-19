import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "paintsaas Paint Shop ERP",
  description:
    "Inventory, billing, accounts, cash memos, and analytics for paint retailers. Explore the interactive ERP preview and start your pilot.",
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${workSans.variable} bg-white antialiased`}>
      <body className={`${workSans.className} bg-white`}>{children}</body>
    </html>
  );
}
