"use client"

import { useState, useTransition } from "react"

type Options<R> = {
  onSuccess?: (result: R) => void
  fallbackMessage?: string
}

/**
 * Owns the pending + error state around a single Server Action. The action is
 * run inside a transition; a thrown error is surfaced as a string (Server
 * Actions in this app `throw` on failure), and `onSuccess` fires only when the
 * action resolves.
 *
 * Deliberately routing-agnostic: `router.refresh()`, closing a dialog, and
 * resetting form fields all belong in the caller's `onSuccess`, not here.
 */
export function useServerAction<Args extends unknown[], R>(
  action: (...args: Args) => Promise<R>,
  options?: Options<R>,
): { run: (...args: Args) => void; isPending: boolean; error: string | null } {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (...args: Args) => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await action(...args)
        options?.onSuccess?.(result)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : (options?.fallbackMessage ?? "Action failed"),
        )
      }
    })
  }

  return { run, isPending, error }
}
