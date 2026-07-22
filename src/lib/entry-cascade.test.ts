import { describe, it, expect } from "vitest";

import { resolveEntry, reconcile } from "./entry-cascade";

// `resolveEntry` is the pure heart of the entry gate: it decides where a fresh
// request must go from three boolean probes, with no DB, env, or Next headers.
// Build a stub probe that always reports the given boolean.
function reads(value: boolean) {
  return () => Promise.resolve(value);
}

describe("resolveEntry", () => {
  it("redirects to /preflight when the DB is not ready", async () => {
    expect(
      await resolveEntry({
        dbReady: reads(false),
        hasAdmin: reads(true),
        hasSession: reads(true),
      }),
    ).toBe("/preflight");
  });

  it("redirects to /setup when ready but no admin exists", async () => {
    expect(
      await resolveEntry({
        dbReady: reads(true),
        hasAdmin: reads(false),
        hasSession: reads(true),
      }),
    ).toBe("/setup");
  });

  it("redirects to /auth/sign-in when ready and an admin exists but there is no session", async () => {
    expect(
      await resolveEntry({
        dbReady: reads(true),
        hasAdmin: reads(true),
        hasSession: reads(false),
      }),
    ).toBe("/auth/sign-in");
  });

  it("proceeds (null) when ready, an admin exists, and the caller is signed in", async () => {
    expect(
      await resolveEntry({
        dbReady: reads(true),
        hasAdmin: reads(true),
        hasSession: reads(true),
      }),
    ).toBeNull();
  });

  it("short-circuits: a down DB never probes for an admin or a session", async () => {
    // Lazy ordering invariant: once dbReady is false, the later probes must not
    // be consulted (querying a down DB further would be wasteful/erroneous).
    let adminCalled = false;
    let sessionCalled = false;

    const dest = await resolveEntry({
      dbReady: reads(false),
      hasAdmin: () => {
        adminCalled = true;
        return Promise.resolve(true);
      },
      hasSession: () => {
        sessionCalled = true;
        return Promise.resolve(true);
      },
    });

    expect(dest).toBe("/preflight");
    expect(adminCalled).toBe(false);
    expect(sessionCalled).toBe(false);
  });
});

// `reconcile` is the second pure invariant: given a resolved destination and the
// page actually being requested, it returns `null` to stay/render or the path to
// redirect to. A `null` destination (proceed) maps to the app root `/`.
describe("reconcile", () => {
  it("stays (null) when the page already matches the destination", () => {
    expect(reconcile("/preflight", "/preflight")).toBeNull();
    expect(reconcile("/setup", "/setup")).toBeNull();
    expect(reconcile("/auth/sign-in", "/auth/sign-in")).toBeNull();
  });

  it("stays (null) on the dashboard when the system says proceed", () => {
    expect(reconcile(null, "/")).toBeNull();
  });

  it("redirects to the destination when the request is on the wrong page", () => {
    expect(reconcile("/setup", "/preflight")).toBe("/setup");
    expect(reconcile("/auth/sign-in", "/setup")).toBe("/auth/sign-in");
  });

  it("bounces a proceed (null) destination off a gate page to the app root", () => {
    expect(reconcile(null, "/setup")).toBe("/");
    expect(reconcile(null, "/preflight")).toBe("/");
  });

  it("bounces the dashboard to the gate when the system isn't ready", () => {
    expect(reconcile("/preflight", "/")).toBe("/preflight");
  });
});
