import type { Metadata } from "next";
import { db } from "@/lib/db";
import { isInviteRedeemable } from "@/lib/admin-invite";
import { InviteForm, InvalidInviteCard } from "@/components/auth/invite-form";

// See `src/app/(app)/page.tsx` for why every page in this app is noindexed —
// doubly so here, where the URL carries a single-use invite token in its query
// string that must never reach a search index.
export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
};

// NOT gated by `enforceEntry`: the first administrator already exists by the
// time this link is used, but has no session and no known password yet — the
// token is the only credential. Awaiting `searchParams` makes this render
// per-request, so the redeemable check always reflects current DB state.
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {(await isInviteRedeemable(db, value)) ? (
        <InviteForm token={value} />
      ) : (
        <InvalidInviteCard />
      )}
    </div>
  );
}
