import type { Metadata } from "next";
import { Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
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
// Exported because `opengraph-image.tsx` renders the same two strings onto the
// social card — a card that disagreed with the `<title>`/`<meta description>`
// would be a second place to forget during the rename above.
export const APP_NAME = "Next.js Boilerplate";
export const APP_DESCRIPTION =
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
    // Still no explicit `images` key here or in `openGraph`, and that is
    // correct: `src/app/opengraph-image.tsx` exists, and Next.js discovers that
    // file convention and injects both `og:image` and `twitter:image` (plus
    // their type/size/alt tags) automatically. Setting `images` by hand here
    // would shadow the generated tags with a URL nothing guarantees exists.
    // `summary_large_image` is what upgrades that generated 1200x630 card from
    // a thumbnail to the full-width preview it was sized for.
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
