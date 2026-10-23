import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS, roleFromPermissions, type PermissionKey } from "@/lib/permissions";

const set = (keys: PermissionKey[]) => new Set(keys);

describe("permission matrix", () => {
  it("has consistent permission keys across roles", () => {
    const valid = new Set(PERMISSIONS.map((p) => p.key as string));
    for (const [, perms] of Object.entries(ROLE_PERMISSIONS)) {
      for (const k of perms) expect(valid.has(k)).toBe(true);
    }
  });

  it("maps exact permission sets back to their role", () => {
    expect(roleFromPermissions(set(ROLE_PERMISSIONS.admin)).exact).toBe(true);
    expect(roleFromPermissions(set(ROLE_PERMISSIONS.admin)).role).toBe("admin");
    expect(roleFromPermissions(set(ROLE_PERMISSIONS.treasurer)).role).toBe("treasurer");
    expect(roleFromPermissions(set(ROLE_PERMISSIONS.member)).role).toBe("member");
  });

  it("suggests the closest role for arbitrary combinations", () => {
    // approve + reports + disburse but no admin → closest is treasurer
    const r = roleFromPermissions(set(["approve", "reports", "disburse"]));
    expect(r.exact).toBe(false);
    expect(r.role).toBe("treasurer");
  });

  it("admin is the only role with the admin permission", () => {
    for (const role of ["accountant", "treasurer", "board_member", "member"] as const) {
      expect(ROLE_PERMISSIONS[role]).not.toContain("admin");
    }
  });
});
