import { describe, it, expect } from "vitest";

import { userInputSchema, userUpdateSchema } from "./user-schema";

describe("userInputSchema", () => {
  const valid = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "password123",
    role: "user",
  };

  it("accepts a valid input", () => {
    expect(userInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(userInputSchema.safeParse({ ...valid, name: "" }).success).toBe(
      false,
    );
  });

  it("rejects a whitespace-only name", () => {
    expect(userInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(
      false,
    );
  });

  it("rejects an email without '@'", () => {
    expect(
      userInputSchema.safeParse({ ...valid, email: "ada.example.com" }).success,
    ).toBe(false);
  });

  it("rejects an empty email", () => {
    expect(userInputSchema.safeParse({ ...valid, email: "" }).success).toBe(
      false,
    );
  });

  it("rejects a whitespace-only email", () => {
    expect(userInputSchema.safeParse({ ...valid, email: "   " }).success).toBe(
      false,
    );
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(
      userInputSchema.safeParse({ ...valid, password: "short77" }).success,
    ).toBe(false);
  });

  it("rejects an invalid role", () => {
    expect(
      userInputSchema.safeParse({ ...valid, role: "superuser" }).success,
    ).toBe(false);
  });
});

describe("userUpdateSchema", () => {
  it("accepts a partial update with only userId and name", () => {
    expect(
      userUpdateSchema.safeParse({ userId: "u1", name: "Grace" }).success,
    ).toBe(true);
  });

  it("accepts an update with all optional fields omitted", () => {
    expect(userUpdateSchema.safeParse({ userId: "u1" }).success).toBe(true);
  });

  it("rejects an empty userId", () => {
    expect(userUpdateSchema.safeParse({ userId: "" }).success).toBe(false);
  });

  it("rejects a newPassword shorter than 8 characters", () => {
    expect(
      userUpdateSchema.safeParse({ userId: "u1", newPassword: "short77" })
        .success,
    ).toBe(false);
  });
});
