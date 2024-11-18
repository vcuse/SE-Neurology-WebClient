import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neurology WebClient",
  description: "meow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}> // TODO find a better fix for hydration warnings
        <div className={inter.className}>
          {children}
        </div>
      </body>
    </html>
  );
}
