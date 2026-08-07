import { describe, it, expect } from "vitest";

import { resolveEntry, reconcile } from "./entry-cascade";

// `resolveEntry` is the pure heart of the entry gate: it decides where a fresh
// request must go from two boolean probes, with no DB, env, or Next headers.
// Build a stub probe that always reports the given boolean.
function reads(value: boolean) {
  return () => Promise.resolve(value);
}

describe("resolveEntry", () => {
  it("redirects to /setup when no admin exists", async () => {
    expect(
      await resolveEntry({
        hasAdmin: reads(false),
        hasSession: reads(true),
      }),
    ).toBe("/setup");
  });

  it("redirects to /auth/sign-in when an admin exists but there is no session", async () => {
    expect(
      await resolveEntry({
        hasAdmin: reads(true),
        hasSession: reads(false),
      }),
    ).toBe("/auth/sign-in");
  });

  it("proceeds (null) when an admin exists and the caller is signed in", async () => {
    expect(
      await resolveEntry({
        hasAdmin: reads(true),
        hasSession: reads(true),
      }),
    ).toBeNull();
  });

  it("short-circuits: with no admin the session is never probed", async () => {
    // Lazy ordering invariant: once hasAdmin is false the destination is already
    // decided, so the session probe must not be consulted — it is the more
    // expensive question, and its answer could not change the outcome.
    let sessionCalled = false;

    const dest = await resolveEntry({
      hasAdmin: reads(false),
      hasSession: () => {
        sessionCalled = true;
        return Promise.resolve(true);
      },
    });

    expect(dest).toBe("/setup");
    expect(sessionCalled).toBe(false);
  });
});

// `reconcile` is the second pure invariant: given a resolved destination and the
// page actually being requested, it returns `null` to stay/render or the path to
// redirect to. A `null` destination (proceed) maps to the app root `/`.
describe("reconcile", () => {
  it("stays (null) when the page already matches the destination", () => {
    expect(reconcile("/setup", "/setup")).toBeNull();
    expect(reconcile("/auth/sign-in", "/auth/sign-in")).toBeNull();
  });

  it("stays (null) on the dashboard when the system says proceed", () => {
    expect(reconcile(null, "/")).toBeNull();
  });

  it("redirects to the destination when the request is on the wrong page", () => {
    expect(reconcile("/auth/sign-in", "/setup")).toBe("/auth/sign-in");
    expect(reconcile("/setup", "/auth/sign-in")).toBe("/setup");
  });

  it("bounces a proceed (null) destination off a gate page to the app root", () => {
    expect(reconcile(null, "/setup")).toBe("/");
    expect(reconcile(null, "/auth/sign-in")).toBe("/");
  });

  it("bounces the dashboard to the gate when no admin exists yet", () => {
    expect(reconcile("/setup", "/")).toBe("/setup");
  });
});
