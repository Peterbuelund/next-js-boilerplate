import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title: string
  /** One line under the title saying what the page is for. */
  description?: string
  /** The page's primary action, set at the right-hand end of the title row. */
  action?: ReactNode
  className?: string
}

/**
 * The one header a page gets.
 *
 * It carries the page's own title and action rather than sitting as a strip of
 * chrome above them, so a page has a single heading instead of the app bar and
 * the page heading saying the same word twice. The top padding is heavier than
 * the bottom: nothing holds the title off the top of the window any more.
 */
export function Header({ title, description, action, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-end justify-between gap-5 border-b px-6 pt-8 pb-5 lg:px-8",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {action}
    </header>
  )
}
