import { describe, expect, it } from "vitest";
import { getHimKoshConfig } from "./config";
import {
  mergeHimkoshConfig,
  parseOptionalNumber,
  trimMaybe,
  type HimkoshGatewaySettingValue,
} from "./gatewayConfig";

describe("himkosh gateway helpers", () => {
  it("trims values and treats blank strings as undefined", () => {
    expect(trimMaybe("  HP ")).toBe("HP");
    expect(trimMaybe("   ")).toBeUndefined();
    expect(trimMaybe(null)).toBeUndefined();
  });

  it("parses optional numeric inputs", () => {
    expect(parseOptionalNumber("42")).toBe(42);
    expect(parseOptionalNumber(3.14)).toBe(3.14);
    expect(parseOptionalNumber("not-a-number")).toBeUndefined();
    expect(parseOptionalNumber(undefined)).toBeUndefined();
  });

  it("merges overrides without mutating the base config", () => {
    const base = getHimKoshConfig();
    const overrides: HimkoshGatewaySettingValue = {
      merchantCode: "CUSTOM123",
      deptId: "999",
      serviceCode: "ABC",
      ddo: "SML10-002",
      head1: "9999-00-123-00",
      head2: "   ",
      head2Amount: 150,
      returnUrl: "https://example.com/callback",
    };

    const merged = mergeHimkoshConfig(base, overrides);

    expect(merged).not.toBe(base);
    expect(merged.merchantCode).toBe("CUSTOM123");
    expect(merged.deptId).toBe("999");
    expect(merged.serviceCode).toBe("ABC");
    expect(merged.ddo).toBe("SML10-002");
    expect(merged.heads.registrationFee).toBe("9999-00-123-00");
    expect(merged.heads.secondaryHead).toBeUndefined();
    expect(merged.heads.secondaryHeadAmount).toBe(150);
    expect(merged.returnUrl).toBe("https://example.com/callback");
    expect(base.merchantCode).not.toBe("CUSTOM123");
  });
});
import { describe, it, expect } from "vitest";
import { trimMaybe, parseOptionalNumber } from "./gatewayConfig";

describe("HimKosh gateway helpers", () => {
  it("trims string values safely", () => {
    expect(trimMaybe("  abc  ")).toBe("abc");
    expect(trimMaybe("")).toBeUndefined();
    expect(trimMaybe("   ")).toBeUndefined();
    expect(trimMaybe(null as unknown as string)).toBeUndefined();
  });

  it("parses optional numbers", () => {
    expect(parseOptionalNumber("123")).toBe(123);
    expect(parseOptionalNumber("0")).toBe(0);
    expect(parseOptionalNumber("abc")).toBeUndefined();
    expect(parseOptionalNumber(null as unknown as string)).toBeUndefined();
  });
});
