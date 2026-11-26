import { describe, it, expect } from "vitest";

import { parseDevHosts } from "./dev-hosts";

describe("parseDevHosts", () => {
  it("returns no hosts when the variable is unset or blank", () => {
    expect(parseDevHosts(undefined)).toEqual([]);
    expect(parseDevHosts("  ")).toEqual([]);
  });

  it("trims entries and drops empty ones", () => {
    expect(parseDevHosts(" my-machine , 192.168.1.20,,")).toEqual([
      "my-machine",
      "192.168.1.20",
    ]);
  });
});
