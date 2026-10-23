import type { FundRole } from "./format";
import { ROLE_LABELS } from "./format";

/**
 * Permission catalogue shown in the admin "permissions matrix" screen.
 * The database enforces ROLES (not custom permission sets), so the checkbox UI
 * maps a checked set back to the closest built-in role before saving.
 */

export const PERMISSIONS = [
  { key: "members", label: "إدارة الأعضاء (إضافة وتعديل)" },
  { key: "arrears", label: "تسجيل سداد الاشتراكات" },
  { key: "donations", label: "سندات التبرعات والإيرادات" },
  { key: "dues", label: "توليد استحقاقات الشهر" },
  { key: "requests", label: "إنشاء طلبات الصرف" },
  { key: "approve", label: "اعتماد طلبات الصرف أو رفضها" },
  { key: "disburse", label: "الصرف الفعلي للأموال" },
  { key: "reports", label: "عرض التقارير المالية" },
  { key: "admin", label: "الإعدادات وإدارة المستخدمين" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ROLE_PERMISSIONS: Record<FundRole, PermissionKey[]> = {
  admin: ["members", "arrears", "donations", "dues", "requests", "approve", "disburse", "reports", "admin"],
  accountant: ["members", "arrears", "donations", "dues", "requests", "reports"],
  treasurer: ["arrears", "donations", "requests", "approve", "disburse", "reports"],
  board_member: ["approve", "reports"],
  member: [],
};

export const ASSIGNABLE_ROLES: FundRole[] = ["admin", "accountant", "treasurer", "board_member", "member"];

/** Find the exact role matching a checked permission set, otherwise the closest one. */
export function roleFromPermissions(checked: Set<PermissionKey>): { exact: boolean; role: FundRole } {
  for (const role of ASSIGNABLE_ROLES) {
    const want = new Set<string>(ROLE_PERMISSIONS[role]);
    if (want.size === checked.size && [...want].every((k) => checked.has(k as PermissionKey))) {
      return { exact: true, role };
    }
  }
  // Closest = role covering the most checked permissions.
  // Ties go to the LEAST privileged role (never suggest admin for a partial set).
  let best: FundRole = "member";
  let bestScore = -1;
  for (const role of [...ASSIGNABLE_ROLES].reverse()) {
    const want = new Set(ROLE_PERMISSIONS[role]);
    let score = 0;
    for (const k of checked) if (want.has(k)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = role;
    }
  }
  return { exact: false, role: best };
}

export function roleLabel(role: FundRole): string {
  return ROLE_LABELS[role];
}
