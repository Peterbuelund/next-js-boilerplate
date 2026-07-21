import { describe, it, expect } from "vitest";

import { parseEnv } from "./env";

// `parseEnv` is the pure heart of the environment contract: it validates a raw
// env bag and returns the typed, defaulted result, throwing on any violation.
// We drive it with fixtures rather than the real `process.env` so the tests are
// deterministic and never depend on the machine they run on.
const valid = {
  POSTGRES_URL: "postgres://user:pass@localhost:5432/app",
  BETTER_AUTH_SECRET: "super-secret",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  NODE_ENV: "production",
};

// Drop one key from a fixture without leaving an unused binding behind.
function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K,
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => k !== key),
  ) as Omit<T, K>;
}

describe("parseEnv", () => {
  it("returns typed values for a valid full env", () => {
    const env = parseEnv(valid);
    expect(env).toMatchObject({
      POSTGRES_URL: "postgres://user:pass@localhost:5432/app",
      BETTER_AUTH_SECRET: "super-secret",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
      NODE_ENV: "production",
    });
  });

  it("throws when POSTGRES_URL is missing", () => {
    expect(() => parseEnv(omit(valid, "POSTGRES_URL"))).toThrow(/POSTGRES_URL/);
  });

  it("throws when BETTER_AUTH_SECRET is missing", () => {
    expect(() => parseEnv(omit(valid, "BETTER_AUTH_SECRET"))).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("defaults NEXT_PUBLIC_APP_URL to localhost when omitted in development", () => {
    const env = parseEnv({
      POSTGRES_URL: valid.POSTGRES_URL,
      BETTER_AUTH_SECRET: valid.BETTER_AUTH_SECRET,
      NODE_ENV: "development",
    });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("throws when NEXT_PUBLIC_APP_URL is omitted in production", () => {
    expect(() => parseEnv(omit(valid, "NEXT_PUBLIC_APP_URL"))).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
  });
});
