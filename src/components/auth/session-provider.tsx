"use client";

import { ReactNode } from "react";

export function SessionProvider({ children }: { children: ReactNode }) {
  // Better Auth's client already handles session state via nano-store
  // This provider exists for future auth-related context if needed
  return <>{children}</>;
}
