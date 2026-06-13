import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db!, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      // TODO: integrate an email provider (e.g. Resend, Nodemailer)
      // For now, log the reset URL so it can be used during development
      console.log(`Password reset link for ${user.email}: ${url}`);
    },
  },
  experimental: {
    joins: true,
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const [row] = await db!
            .select({ role: schema.user.role })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
            .limit(1);
          if (row?.role === "disabled") {
            throw new APIError("FORBIDDEN", { message: "Account disabled" });
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
