import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root-level Suspense fallback for the App Router.
 *
 * Scope, precisely: this now covers the centered-card gate routes — `/setup`,
 * `/auth/sign-in` and `/auth/sign-up` — plus any future segment that does not
 * declare its own `loading.tsx`. The two routes that render the sidebar layout
 * each own a shape-matched fallback instead: `/admin` via
 * `src/app/admin/loading.tsx`, and `/` via `src/app/(app)/loading.tsx`. `/` had
 * to be moved into the parenthesised `(app)` route group to get one, because a
 * page in the root segment inherits *this* file as its fallback; the group is
 * stripped from the URL, so `/` is unchanged.
 *
 * It covers the awaited work those gate pages do before they can render a
 * single byte: the entry cascade (`hasAdmin`, then `getSession` — a DB query
 * followed by a session lookup) on `/setup` and `/auth/sign-in`, plus the
 * `hasAdmin` probe on `/auth/sign-up`. Those pages are all
 * `export const dynamic = "force-dynamic"`, so there is no prerendered shell to
 * fall back on; without this file the user stares at the previous page (or at
 * nothing on a cold navigation) for the length of two round trips.
 *
 * The shape here mirrors the centered card shell those gate pages share
 * (`min-h-screen flex items-center justify-center p-4` wrapping a ~max-w-md
 * card), so the swap to real content is a fill-in rather than a re-layout.
 *
 * A Server Component on purpose: a pulse animation is pure CSS, so this needs
 * no client bundle at all.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* aria-busy + a polite live region so a screen reader announces the wait
          rather than reading an empty page. */}
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <span className="sr-only">Loading</span>

        {/* Card header: title line + supporting copy. */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/2 rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>

        {/* Two labelled fields — the floor shared by every gate form. */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>

        {/* Submit button. */}
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
