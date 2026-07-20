import { describe, it, expect } from "vitest";
import { APP_NAME } from "@/lib/health";

describe("health", () => {
  it("uygulama adını export eder", () => {
    expect(APP_NAME).toBe("Apart Oda Takip");
  });
});
