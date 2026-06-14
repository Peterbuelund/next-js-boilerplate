import { describe, it, expect } from "vitest";

import { isReady } from "./system-readiness";

// `isReady` is the pure projection at the heart of the readiness probe: it
// decides "is the system ready" from a `ReadinessReport`, with no DB and no
// timeout race. The system is ready ONLY when both flags hold.
describe("isReady", () => {
  it("is ready when connected and schema is applied", () => {
    expect(isReady({ connected: true, schemaApplied: true })).toBe(true);
  });

  it("is not ready when connected but the schema is not applied", () => {
    expect(isReady({ connected: true, schemaApplied: false })).toBe(false);
  });

  it("is not ready when neither connected nor schema applied", () => {
    expect(isReady({ connected: false, schemaApplied: false })).toBe(false);
  });

  it("is not ready when schema applied but not connected (defensive)", () => {
    // A nonsensical report (schema can't be applied without a connection) still
    // denies, because readiness requires the connection flag too.
    expect(isReady({ connected: false, schemaApplied: true })).toBe(false);
  });
});
