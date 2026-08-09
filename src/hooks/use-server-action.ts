"use client"

import { useState, useTransition } from "react"
import type { ActionResult } from "@/lib/action-result"

type Options<R> = {
  onSuccess?: (result: R) => void
  fallbackMessage?: string
}

/**
 * Owns the pending + error state around a single Server Action. The action is
 * run inside a transition and is expected to report expected failures as a
 * value — `{ ok: false, error }` — which is surfaced verbatim; `onSuccess`
 * fires only for `{ ok: true }`, with the action's payload.
 *
 * The `catch` is still here, but it now means something narrower: the action
 * threw, which in this app signals an *unexpected* fault. Next redacts those
 * messages in production builds, so the thrown message is not worth rendering
 * — `options.fallbackMessage` is shown instead.
 *
 * Deliberately routing-agnostic: `router.refresh()`, closing a dialog, and
 * resetting form fields all belong in the caller's `onSuccess`, not here.
 */
export function useServerAction<Args extends unknown[], R>(
  action: (...args: Args) => Promise<ActionResult<R>>,
  options?: Options<R>,
): { run: (...args: Args) => void; isPending: boolean; error: string | null } {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (...args: Args) => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await action(...args)
        if (!result.ok) {
          setError(result.error)
          return
        }
        options?.onSuccess?.(result.data)
      } catch {
        setError(options?.fallbackMessage ?? "Action failed")
      }
    })
  }

  return { run, isPending, error }
}
