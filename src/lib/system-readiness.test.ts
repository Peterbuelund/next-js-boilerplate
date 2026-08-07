import { describe, it, expect } from "vitest";

import {
  isReady,
  readinessChecklist,
  type ReadinessReport,
} from "./system-readiness";

// A fully-ready report; each test overrides only the flag it is about, so
// adding a future readiness flag does not require touching every fixture.
const ready: ReadinessReport = {
  connected: true,
  schemaApplied: true,
  migrationsUpToDate: true,
};

// Every combination of the report's flags — the shared table behind both the
// `isReady` truth test and the checklist/button agreement invariant.
const allReports: ReadinessReport[] = [true, false].flatMap((connected) =>
  [true, false].flatMap((schemaApplied) =>
    [true, false].map((migrationsUpToDate) => ({
      connected,
      schemaApplied,
      migrationsUpToDate,
    })),
  ),
);

// `isReady` is the pure projection at the heart of the readiness probe: it
// decides "is the system ready" from a `ReadinessReport`, with no DB and no
// timeout race. The system is ready ONLY when every flag holds.
describe("isReady", () => {
  it("is ready when connected, migrated and up to date", () => {
    expect(isReady(ready)).toBe(true);
  });

  it("is not ready when connected but the schema is not applied", () => {
    expect(isReady({ ...ready, schemaApplied: false })).toBe(false);
  });

  it("is not ready when the schema exists but migrations are behind", () => {
    // The "pulled new code, forgot to migrate" state: the `user` table is there
    // so the schema check passes, but a later migration has not been applied.
    expect(isReady({ ...ready, migrationsUpToDate: false })).toBe(false);
  });

  it("is not ready when the DB is down", () => {
    expect(
      isReady({
        connected: false,
        schemaApplied: false,
        migrationsUpToDate: false,
      }),
    ).toBe(false);
  });

  it("is not ready when disconnected, whatever else claims to hold", () => {
    // A nonsensical report (nothing can be applied without a connection) still
    // denies, because readiness requires the connection flag too.
    expect(isReady({ ...ready, connected: false })).toBe(false);
  });

  it("is ready only for the one all-true report", () => {
    expect(allReports.filter(isReady)).toEqual([ready]);
  });
});

// `readinessChecklist` is the pure projection that turns a ReadinessReport into
// the operator-facing steps the error boundary's checklist renders. It is the
// single home for the operator-facing labels; the report itself carries no copy.
describe("readinessChecklist", () => {
  it("marks every row ok when the system is ready", () => {
    expect(readinessChecklist(ready).map((s) => s.ok)).toEqual([true, true]);
  });

  it("fails both rows when the DB is down", () => {
    const steps = readinessChecklist({
      connected: false,
      schemaApplied: false,
      migrationsUpToDate: false,
    });
    expect(steps.map((s) => s.ok)).toEqual([false, false]);
  });

  it("fails only the migrations row when the DB is healthy but behind", () => {
    // The case that earns migrations its own row: the database is reachable and
    // migrated, so the fix is `pnpm db:migrate` rather than anything to do with
    // the connection.
    const steps = readinessChecklist({ ...ready, migrationsUpToDate: false });
    expect(steps.find((s) => s.key === "database")?.ok).toBe(true);
    expect(steps.find((s) => s.key === "migrations")?.ok).toBe(false);
  });

  it("folds an unmigrated schema into the database row, not the migrations row", () => {
    const steps = readinessChecklist({ ...ready, schemaApplied: false });
    expect(steps.find((s) => s.key === "database")?.ok).toBe(false);
  });

  it("never disagrees with the flag that gates the Continue button", () => {
    // The regression this guards: a checklist reading all-green while `isReady`
    // is false hides the Continue button with nothing on screen explaining why.
    for (const report of allReports) {
      const allGreen = readinessChecklist(report).every((s) => s.ok);
      expect(allGreen).toBe(isReady(report));
    }
  });

  it("exposes stable keys and labels, and nothing else, on every row", () => {
    const steps = readinessChecklist(ready);
    expect(steps.map((s) => s.key)).toEqual(["database", "migrations"]);
    expect(steps.map((s) => s.label)).toEqual([
      "Database ready",
      "Migrations up to date",
    ]);
    // The wire contract carries no operator copy beyond the label — guards
    // against remediation strings creeping back into the endpoint.
    expect(steps.every((s) => Object.keys(s).length === 3)).toBe(true);
  });
});
