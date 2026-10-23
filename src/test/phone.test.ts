import { describe, expect, it } from "vitest";
import { intlPhone, whatsappLink } from "@/lib/format";

describe("intlPhone (Yemen +967 normalization)", () => {
  it("keeps already-international numbers", () => {
    expect(intlPhone("967771234567")).toBe("967771234567");
    expect(intlPhone("+967 771 234 567")).toBe("967771234567");
  });

  it("converts local 0-prefix numbers", () => {
    expect(intlPhone("0771234567")).toBe("967771234567");
    expect(intlPhone("05 123456")).toBe("9675123456");
  });

  it("converts 00 international prefix", () => {
    expect(intlPhone("00967771234567")).toBe("967771234567");
  });

  it("strips formatting characters", () => {
    expect(intlPhone("(+967) 4-123456")).toBe("9674123456");
  });

  it("returns null for empty or garbage", () => {
    expect(intlPhone(null)).toBeNull();
    expect(intlPhone("")).toBeNull();
    expect(intlPhone("abc")).toBeNull();
    expect(intlPhone("123")).toBeNull();
  });

  it("builds a wa.me link with an encoded message", () => {
    const link = whatsappLink("0771234567", "أحمد");
    expect(link).toMatch(/^https:\/\/wa\.me\/967771234567\?text=/);
    expect(link).toContain(encodeURIComponent("أحمد"));
  });

  it("returns null link when phone is invalid", () => {
    expect(whatsappLink("لا يوجد", "أحمد")).toBeNull();
  });
});
