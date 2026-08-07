import Link from "next/link";
import { Button } from "@/components/ui/button";

// A plain Server Component: a 404 depends on nothing at runtime, so keeping it
// off the client keeps this route statically renderable.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            404 — Page not found
          </h1>
          <p className="text-muted-foreground text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
        </div>
        <div className="flex justify-center">
          {/* asChild so the Button styling wraps a real <a>, preserving
              next/link prefetching and normal link semantics. */}
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
