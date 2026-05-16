import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { Navbar } from "@/components/layout/navbar";
import { auth } from "@/lib/auth";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "Repositorio académico de proyectos de grado, investigación y aula de la Universidad Popular del Cesar.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://unihaven.vercel.app",
  ),
  applicationName: "UniHaven",
  title: "UniHaven — Universidad Popular del Cesar",
  description: siteDescription,
  openGraph: {
    title: "UniHaven",
    description: siteDescription,
    siteName: "UniHaven",
    type: "website",
    locale: "es_CO",
  },
  twitter: {
    card: "summary",
    title: "UniHaven",
    description: siteDescription,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers session={session}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Universidad Popular del Cesar · UniHaven
          </footer>
        </Providers>
      </body>
    </html>
  );
}

