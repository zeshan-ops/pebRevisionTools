import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { buildSearchIndex } from "@/lib/search-index";

// Fonts are loaded here (never as a bare family name) and bound directly to
// the token names design-system.md defines, with the documented fallback
// stacks. next/font handles metric-matched fallback + font-display: swap.
const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "PEB Revision — FC4",
    template: "%s · PEB Revision",
  },
  description: "Revision tool for the PEB FC4 Design and Copyright Law exam.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchIndex = await buildSearchIndex();

  return (
    <html
      lang="en"
      className={`${sourceSerif4.variable} ${inter.variable} ${ibmPlexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="font-serif text-lg font-semibold tracking-tight text-ink hover:text-accent transition-colors duration-(--dur-fast)"
            >
              FC4 <span className="text-ink-faint font-normal">· Design &amp; Copyright</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/content"
                className="rounded-sm px-3 py-1.5 text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors duration-(--dur-fast)"
              >
                Content
              </Link>
              <Link
                href="/practice"
                className="rounded-sm px-3 py-1.5 text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors duration-(--dur-fast)"
              >
                Practice
              </Link>
              <Link
                href="/review"
                className="rounded-sm px-3 py-1.5 text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors duration-(--dur-fast)"
              >
                Review
              </Link>
              <div className="mx-1 h-5 w-px bg-rule" aria-hidden />
              <CommandPalette index={searchIndex} />
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-rule py-6">
          <div className="mx-auto max-w-5xl px-4 text-xs text-ink-faint sm:px-6">
            Local revision tool. Not affiliated with the Patent Examination Board.
          </div>
        </footer>
      </body>
    </html>
  );
}
