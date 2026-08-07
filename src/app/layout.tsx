import type { Metadata } from "next";
import { Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { env } from "@/lib/env";

// Every font declared here MUST be consumed by the `@theme inline` block in
// `globals.css` — `next/font/google` self-hosts each family it is asked for, so
// an unwired font is a real font file downloaded on every page load for nothing.
// (A `Geist` sans exposing `--font-geist-sans` used to live here and was doing
// exactly that; it is gone. Before adding a font, add its `--font-*` mapping to
// `@theme inline` too.)

// Feeds `--font-sans`, which `globals.css` maps to Tailwind's `font-sans`
// (i.e. the default body typeface).
const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

// Feeds `--font-geist-mono`, which `globals.css` maps to `--font-mono`
// (Tailwind's `font-mono`, used by code and other tabular text).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The strings below are deliberately generic BOILERPLATE PLACEHOLDERS. Grep for
// "Next.js Boilerplate" and replace every hit with the real product name, then
// rewrite the description — shipping with these values means shipping a site
// that describes itself as a template in search results and link previews.
const APP_NAME = "Next.js Boilerplate";
const APP_DESCRIPTION =
  "A Next.js starter with authentication, a Postgres/Drizzle data layer, and a themed shadcn/ui component set already wired together.";

export const metadata: Metadata = {
  // `metadataBase` is what turns the relative paths Next.js generates (OG and
  // Twitter images, canonical/alternate links) into the absolute URLs those
  // specs require. Without it Next.js falls back to a guess and warns at build
  // time. `env.NEXT_PUBLIC_APP_URL` is safe to read here because this is a
  // Server Component and `env.ts` guarantees the value: required in production,
  // defaulted to http://localhost:3000 everywhere else.
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  // The template lets a child page export `title: "Settings"` and get
  // "Settings | Next.js Boilerplate" for free; `default` covers pages (and the
  // root) that declare no title of their own.
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  openGraph: {
    type: "website",
    url: env.NEXT_PUBLIC_APP_URL,
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    // No `images` key here or in `openGraph`: this repo ships no OG image, and
    // pointing at a missing asset renders a broken preview — worse than the
    // plain text card crawlers fall back to. Add `src/app/opengraph-image.tsx`
    // and Next.js will wire the image tags in automatically.
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <body className={`${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
