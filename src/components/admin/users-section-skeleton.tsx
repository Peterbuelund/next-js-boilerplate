import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * The placeholder that stands in for the admin users table while the query that
 * feeds it is still in flight.
 *
 * It lives here, rather than inline in a fallback, because two different
 * boundaries need the exact same shape:
 *   - `src/app/admin/loading.tsx`, the route-level fallback covering the auth
 *     guard's round trips before the page can render anything at all; and
 *   - the `<Suspense>` boundary inside `src/app/admin/page.tsx`, which lets the
 *     sidebar and header stream immediately while only the table waits on
 *     Postgres.
 * Those two hand off to each other in sequence, so any divergence between them
 * would show up as a visible jolt mid-load. One component, one shape.
 *
 * The outer `flex gap-6 p-6` and the fixed-width nav column mirror AdminPanel's
 * own two-column layout so the real table lands exactly where the skeleton sat.
 */
export function UsersSectionSkeleton() {
  return (
    <div className="flex gap-6 p-6">
      <div className="w-40 shrink-0 space-y-1" aria-hidden="true">
        <Skeleton className="h-9 w-full rounded-4xl" />
        <Skeleton className="h-9 w-full rounded-4xl" />
      </div>
      {/* aria-busy + a polite live region so a screen reader announces the wait
          instead of reading a page with nothing in it. */}
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className="min-w-0 flex-1"
      >
        <span className="sr-only">Loading users</span>
        <Card>
          {/* CardHeader: title + description on the left, "Add user" on the right. */}
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="space-y-3 px-6 pb-6">
              {/* One placeholder row per table row. Five is an arbitrary but
                  plausible count: enough to read as a table, few enough that
                  a smaller real result set does not collapse the page. */}
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4"
                  aria-hidden="true"
                >
                  {/* Name / Email / Role / Joined / Actions — the five columns. */}
                  <Skeleton className="h-4 w-[22%] rounded-md" />
                  <Skeleton className="h-4 w-[30%] rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="ml-auto size-8 rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
