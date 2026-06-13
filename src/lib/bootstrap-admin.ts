import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { provision } from "@/lib/users";

export async function bootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  if (!email || !password || !name) {
    console.log("[bootstrap-admin] Skipped: ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_NAME not set");
    return;
  }

  if (!db) {
    console.log("[bootstrap-admin] Skipped: database not configured");
    return;
  }

  const [existing] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    if (existing.role === "admin") {
      console.log(`[bootstrap-admin] Admin already present for ${email}`);
      return;
    }
    await db
      .update(user)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(user.id, existing.id));
    console.log(`[bootstrap-admin] Promoted existing user ${email} to admin`);
    return;
  }

  await provision({ name, email, password, role: "admin" });
  console.log(`[bootstrap-admin] Admin created for ${email}`);
}
