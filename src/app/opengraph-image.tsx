import { ImageResponse } from "next/og";
import { APP_NAME, APP_DESCRIPTION } from "./layout";

// The `opengraph-image` file convention: exporting `size`, `contentType`, `alt`
// and a default image-producing function is enough for Next.js to render this
// at build time and inject the matching `og:image*` tags — and, because the
// root layout sets `twitter.card`, the `twitter:image*` tags too. Nothing
// imports this file; do not add `images` to the layout's metadata by hand.

// `alt` is the accessible description crawlers and screen readers surface next
// to the card. It is a required export, not decoration.
export const alt = APP_NAME;

// 1200x630 is the 1.91:1 ratio Open Graph and Twitter's `summary_large_image`
// both crop to. Rendering at any other aspect means letting each platform pick
// its own crop of the text below.
export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

// Copy comes from the root layout so the card, the `<title>` and the
// `<meta name="description">` cannot drift apart — see the placeholder warning
// there before shipping this.
export default async function Image() {
  return new ImageResponse(
    (
      // Satori (what powers ImageResponse) implements a SUBSET of CSS: no
      // classes, no stylesheets, no Tailwind tokens — inline styles only — and
      // any element with more than one child needs an explicit `display: flex`
      // because there is no block layout to fall back on. Colors are hardcoded
      // hex rather than theme variables for the same reason: `globals.css`
      // never reaches this renderer, and a social card has no light/dark mode
      // to respond to anyway.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          // Dark ground, roughly matching the app's dark theme surface, so the
          // card reads as part of the product rather than a default white box.
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        {/* A short accent bar instead of a logo: this repo vendors no mark, and
            an embedded image would need a font/asset fetch this file avoids. */}
        <div
          style={{
            width: "72px",
            height: "8px",
            borderRadius: "4px",
            backgroundColor: "#fafafa",
            marginBottom: "48px",
          }}
        />
        <div
          style={{
            fontSize: "76px",
            fontWeight: 700,
            // Satori has no `line-height: normal`, so leading is set explicitly
            // to keep a two-line product name from colliding with itself.
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
          }}
        >
          {APP_NAME}
        </div>
        <div
          style={{
            marginTop: "28px",
            fontSize: "34px",
            lineHeight: 1.4,
            // Dimmed rather than shrunk further: below ~30px the description
            // stops being legible in a feed-sized preview thumbnail.
            color: "#a1a1aa",
            // Caps the tagline at a comfortable measure instead of letting it
            // run the full 1040px of usable width.
            maxWidth: "880px",
          }}
        >
          {APP_DESCRIPTION}
        </div>
      </div>
    ),
    size,
  );
}
