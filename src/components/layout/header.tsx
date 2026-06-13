// components/header.tsx
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title: string
  className?: string
}

export function Header({ title, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
    </header>
  )
}
