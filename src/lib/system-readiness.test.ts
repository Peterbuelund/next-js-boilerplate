import { describe, it, expect } from "vitest";

import { isReady, readinessChecklist } from "./system-readiness";

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

// `readinessChecklist` is the pure projection that turns a ReadinessReport into
// the operator-facing steps the error boundary's checklist renders. It is the single
// home for remediation copy; the report itself carries no operator messages.
describe("readinessChecklist", () => {
  it("marks both steps ok with no remediation when the system is ready", () => {
    const steps = readinessChecklist({ connected: true, schemaApplied: true });
    expect(steps.map((s) => s.ok)).toEqual([true, true]);
    expect(steps.every((s) => s.detail === undefined)).toBe(true);
  });

  it("flags only the schema step (with the migrate remediation) when connected but unmigrated", () => {
    const steps = readinessChecklist({ connected: true, schemaApplied: false });
    const connected = steps.find((s) => s.key === "db-connected");
    const schemaStep = steps.find((s) => s.key === "db-schema");
    expect(connected?.ok).toBe(true);
    expect(connected?.detail).toBeUndefined();
    expect(schemaStep?.ok).toBe(false);
    expect(schemaStep?.detail).toBe("Run: pnpm db:migrate");
  });

  it("gives the schema step its OWN remediation when the DB is down, not the connect message", () => {
    const steps = readinessChecklist({ connected: false, schemaApplied: false });
    const connected = steps.find((s) => s.key === "db-connected");
    const schemaStep = steps.find((s) => s.key === "db-schema");
    expect(connected?.ok).toBe(false);
    expect(connected?.detail).toContain("Database not connected");
    expect(schemaStep?.ok).toBe(false);
    expect(schemaStep?.detail).toBe("Run: pnpm db:migrate");
  });
});
