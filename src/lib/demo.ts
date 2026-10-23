import { FUND_NAME } from "./format";
import type { Database } from "@/integrations/supabase/types";

/**
 * Demo (preview) mode — lets anyone browse the whole app with realistic MOCK data,
 * without touching the real database. Activated from the auth page button or ?demo=1.
 * All reads are served locally; all writes return a friendly "demo" error.
 */

export const DEMO_STORAGE_KEY = "banan_demo_mode";
export const DEMO_WRITE_MSG = "وضع العرض التجريبي: الحفظ والتعديل معطّلان — البيانات المعروضة وهمية للمعاينة فقط";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const qs = new URLSearchParams(window.location.search).get("demo");
    if (qs === "1") {
      window.localStorage.setItem(DEMO_STORAGE_KEY, "1");
      return true;
    }
    if (qs === "0") {
      window.localStorage.removeItem(DEMO_STORAGE_KEY);
      return false;
    }
    return window.localStorage.getItem(DEMO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function enterDemoMode() {
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function exitDemoMode() {
  try {
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.location.assign("/auth");
}

/* ------------------------------------------------------------------ */
/* Mock dataset                                                        */
/* ------------------------------------------------------------------ */

const iso = (d: string) => d;
const NOW = new Date().toISOString();

const demoSettings = {
  id: "demo-settings",
  fund_name: FUND_NAME,
  logo_url: null,
  currency: "ر.ي",
  default_monthly_fee: 2000,
  opening_balance: 150000,
  allow_self_approval: false,
  updated_at: NOW,
};

const demoMembers = [
  { id: "m1", member_no: 1, full_name: "أحمد علي محمد الشميري", phone: "0771234567", address: "الغدير", monthly_fee: 2000, joined_on: iso("2025-01-10"), active: true, notes: null, created_at: NOW },
  { id: "m2", member_no: 2, full_name: "عبدالرحمن صالح المقطري", phone: "0733221100", address: "مقبنة", monthly_fee: 2000, joined_on: iso("2025-02-14"), active: true, notes: null, created_at: NOW },
  { id: "m3", member_no: 3, full_name: "محمد يحيى العريقي", phone: "0714556677", address: "الغدير", monthly_fee: 3000, joined_on: iso("2025-03-02"), active: true, notes: "اشتراك مضاعف", created_at: NOW },
  { id: "m4", member_no: 4, full_name: "وليد قائد السامعي", phone: "0770099887", address: "تعزيز", monthly_fee: 2000, joined_on: iso("2025-05-20"), active: true, notes: null, created_at: NOW },
  { id: "m5", member_no: 5, full_name: "سامي عبده الحيدري", phone: "0718334455", address: "الغدير", monthly_fee: 2000, joined_on: iso("2025-08-01"), active: false, notes: "موقوف مؤقتاً", created_at: NOW },
  { id: "m6", member_no: 6, full_name: "فهد ناصر الجنيد", phone: "0739667788", address: "مقبنة", monthly_fee: 2500, joined_on: iso("2026-01-15"), active: true, notes: null, created_at: NOW },
  { id: "m7", member_no: 7, full_name: "طلال فؤاد الشعبي", phone: "0772334455", address: "الغدير", monthly_fee: 2000, joined_on: iso("2026-02-11"), active: true, notes: null, created_at: NOW },
  { id: "m8", member_no: 8, full_name: "نبيل غمدان المروني", phone: "0712001122", address: "وادي القاضي", monthly_fee: 2000, joined_on: iso("2026-04-05"), active: true, notes: null, created_at: NOW },
];

const MONTHS = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

function subsForMember(m: (typeof demoMembers)[number], idx: number) {
  return MONTHS.map((mo, i) => {
    const amount = m.monthly_fee;
    // Older months are paid, middle mixed, last two unpaid/partial depending on member.
    let status = "unpaid";
    let paid_amount = 0;
    if (i <= 2 || m.active === false) {
      status = "paid";
      paid_amount = amount;
    } else if (i === 3) {
      status = idx % 3 === 0 ? "paid" : idx % 3 === 1 ? "partial" : "unpaid";
      paid_amount = status === "paid" ? amount : status === "partial" ? Math.round(amount / 2) : 0;
    } else if (i === 4 && idx % 2 === 0) {
      status = "paid";
      paid_amount = amount;
    }
    return {
      id: `s-${m.id}-${mo}`,
      member_id: m.id,
      due_month: `${mo}-01`,
      amount,
      paid_amount,
      status,
      created_at: NOW,
    };
  });
}

const demoSubs = demoMembers.flatMap((m, idx) => subsForMember(m, idx));

const demoReceipts = [
  { id: "r1", receipt_no: 1, receipt_type: "subscription", receipt_date: iso("2026-05-03"), member_id: "m1", donor_name: "أحمد علي محمد الشميري", amount: 4000, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: "اشتراك مايو ويونيو", attachment_url: null, created_by: "u2", created_at: NOW },
  { id: "r2", receipt_no: 2, receipt_type: "subscription", receipt_date: iso("2026-05-05"), member_id: "m2", donor_name: "عبدالرحمن صالح المقطري", amount: 4000, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: null, attachment_url: null, created_by: "u2", created_at: NOW },
  { id: "r3", receipt_no: 3, receipt_type: "donation", receipt_date: iso("2026-05-12"), member_id: null, donor_name: "تاجر تعز للتجارة", amount: 100000, payment_method: "bank_transfer", is_restricted: true, restricted_purpose: "إعمار دار أسرة متعففة", notes: "تبرع مقيد", attachment_url: null, created_by: "u2", created_at: NOW },
  { id: "r4", receipt_no: 4, receipt_type: "subscription", receipt_date: iso("2026-06-04"), member_id: "m3", donor_name: "محمد يحيى العريقي", amount: 6000, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: "اشتراك يونيو", attachment_url: null, created_by: "u3", created_at: NOW },
  { id: "r5", receipt_no: 5, receipt_type: "donation", receipt_date: iso("2026-06-18"), member_id: null, donor_name: "مجهول", amount: 50000, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: null, attachment_url: null, created_by: "u3", created_at: NOW },
  { id: "r6", receipt_no: 6, receipt_type: "subscription", receipt_date: iso("2026-07-02"), member_id: "m1", donor_name: "أحمد علي محمد الشميري", amount: 2000, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: null, attachment_url: null, created_by: "u2", created_at: NOW },
  { id: "r7", receipt_no: 7, receipt_type: "other", receipt_date: iso("2026-07-21"), member_id: null, donor_name: "أرباح استثمار مؤقت", amount: 12500, payment_method: "bank_transfer", is_restricted: false, restricted_purpose: null, notes: "فوائد وديعة", attachment_url: null, created_by: "u1", created_at: NOW },
  { id: "r8", receipt_no: 8, receipt_type: "subscription", receipt_date: iso("2026-08-06"), member_id: "m4", donor_name: "وليد قائد السامعي", amount: 4000, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: null, attachment_url: null, created_by: "u3", created_at: NOW },
  { id: "r9", receipt_no: 9, receipt_type: "donation", receipt_date: iso("2026-08-25"), member_id: null, donor_name: "أسرة آل ذياب", amount: 75000, payment_method: "cash", is_restricted: true, restricted_purpose: "أجور صرف صحي للحارة", notes: null, attachment_url: null, created_by: "u2", created_at: NOW },
  { id: "r10", receipt_no: 10, receipt_type: "subscription", receipt_date: iso("2026-09-07"), member_id: "m6", donor_name: "فهد ناصر الجنيد", amount: 2500, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: null, attachment_url: null, created_by: "u2", created_at: NOW },
  { id: "r11", receipt_no: 11, receipt_type: "subscription", receipt_date: iso("2026-09-09"), member_id: "m2", donor_name: "عبدالرحمن صالح المقطري", amount: 2000, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: "سداد جزئي", attachment_url: null, created_by: "u2", created_at: NOW },
  { id: "r12", receipt_no: 12, receipt_type: "donation", receipt_date: iso("2026-10-01"), member_id: null, donor_name: "محسن الحاشدي", amount: 200000, payment_method: "bank_transfer", is_restricted: true, restricted_purpose: "كفالة إيجار مقر الصندوق", notes: "تبرع سنوي", attachment_url: null, created_by: "u1", created_at: NOW },
  { id: "r13", receipt_no: 13, receipt_type: "subscription", receipt_date: iso("2026-10-12"), member_id: "m7", donor_name: "طلال فؤاد الشعبي", amount: 4000, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: null, attachment_url: null, created_by: "u3", created_at: NOW },
  { id: "r14", receipt_no: 14, receipt_type: "donation", receipt_date: iso("2026-10-18"), member_id: null, donor_name: "زكاة عامة", amount: 150000, payment_method: "cash", is_restricted: false, restricted_purpose: null, notes: null, attachment_url: null, created_by: "u2", created_at: NOW },
];

const demoExpenses = [
  { id: "e1", request_no: 1, requested_date: iso("2026-05-20"), category: "social_aid", beneficiary_name: "أسرة عبدالله السوفي", beneficiary_phone: "0773344556", description: "مساعدة شهرية لأسرة يتيم", amount: 30000, status: "paid", created_by: "u2", disbursed_at: iso("2026-05-24") + "T10:00:00Z", voucher_no: 1, notes: null, attachment_url: null },
  { id: "e2", request_no: 2, requested_date: iso("2026-06-10"), category: "medical_aid", beneficiary_name: "أم سارة الشرعبي", beneficiary_phone: "0712233445", description: "أدوية وعلاج مستمر", amount: 45000, status: "paid", created_by: "u3", disbursed_at: iso("2026-06-13") + "T09:30:00Z", voucher_no: 2, notes: null, attachment_url: null },
  { id: "e3", request_no: 3, requested_date: iso("2026-07-15"), category: "emergency_aid", beneficiary_name: "أسرة آل قدحي", beneficiary_phone: "0733445566", description: "إصلاح منزل متضرر من السيول", amount: 80000, status: "approved", created_by: "u2", disbursed_at: null, voucher_no: null, notes: null, attachment_url: null },
  { id: "e4", request_no: 4, requested_date: iso("2026-08-30"), category: "operational", beneficiary_name: "مقر الصندوق", beneficiary_phone: null, description: "فاتورة كهرباء وماء المقر", amount: 9500, status: "pending", created_by: "u3", disbursed_at: null, voucher_no: null, notes: null, attachment_url: null },
  { id: "e5", request_no: 5, requested_date: iso("2026-09-25"), category: "charitable_aid", beneficiary_name: "أسرة الحاج علي", beneficiary_phone: "0778899001", description: "كسوة عيد لأطفال الأسرة", amount: 25000, status: "pending", created_by: "u2", disbursed_at: null, voucher_no: null, notes: null, attachment_url: null },
  { id: "e6", request_no: 6, requested_date: iso("2026-10-08"), category: "operational", beneficiary_name: "مقر الصندوق", beneficiary_phone: null, description: "شراء خزانة ملفات", amount: 30000, status: "rejected", created_by: "u4", disbursed_at: null, voucher_no: null, notes: "غير ضروري حالياً", attachment_url: null },
];

const demoApprovals = [
  { id: "a1", request_id: "e1", approver_id: "u1", approver_name: "مدير النظام", decision: "approved", notes: null, created_at: "2026-05-21T08:00:00Z" },
  { id: "a2", request_id: "e1", approver_id: "u4", approver_name: "عضو المجلس", decision: "approved", notes: null, created_at: "2026-05-22T09:00:00Z" },
  { id: "a3", request_id: "e2", approver_id: "u1", approver_name: "مدير النظام", decision: "approved", notes: null, created_at: "2026-06-11T10:00:00Z" },
  { id: "a4", request_id: "e2", approver_id: "u4", approver_name: "عضو المجلس", decision: "approved", notes: "مرفق تقرير طبي", created_at: "2026-06-12T11:00:00Z" },
  { id: "a5", request_id: "e3", approver_id: "u1", approver_name: "مدير النظام", decision: "approved", notes: null, created_at: "2026-07-16T08:30:00Z" },
  { id: "a6", request_id: "e6", approver_id: "u1", approver_name: "مدير النظام", decision: "rejected", notes: "غير ضروري حالياً", created_at: "2026-10-09T09:00:00Z" },
];

const demoProfiles = [
  { user_id: "u1", full_name: "مدير النظام", email: "admin@banan.example", active: true, linked_member_id: null, created_at: NOW },
  { user_id: "u2", full_name: "كريم المحاسب", email: "accountant@banan.example", active: true, linked_member_id: "m1", created_at: NOW },
  { user_id: "u3", full_name: "سعيد أمين الصندوق", email: "treasurer@banan.example", active: true, linked_member_id: "m2", created_at: NOW },
  { user_id: "u4", full_name: "د. منير عضو المجلس", email: "board@banan.example", active: true, linked_member_id: null, created_at: NOW },
];

const demoRoles = [
  { user_id: "u1", role: "admin", updated_at: NOW },
  { user_id: "u2", role: "accountant", updated_at: NOW },
  { user_id: "u3", role: "treasurer", updated_at: NOW },
  { user_id: "u4", role: "board_member", updated_at: NOW },
];

const demoAudit = [
  { id: "g1", action: "expense_disbursed", entity_type: "fund_expense_requests", entity_id: "e2", actor_id: "u3", actor_name: "سعيد أمين الصندوق", details: "تم صرف 45000 للطلب ER-0002", created_at: "2026-06-13T09:30:00Z" },
  { id: "g2", action: "expense_approved", entity_type: "fund_expense_requests", entity_id: "e3", actor_id: "u1", actor_name: "مدير النظام", details: null, created_at: "2026-07-16T08:30:00Z" },
  { id: "g3", action: "member_created", entity_type: "fund_members", entity_id: "m8", actor_id: "u1", actor_name: "مدير النظام", details: "نبيل غمدان المروني", created_at: "2026-04-05T12:00:00Z" },
  { id: "g4", action: "dues_generated", entity_type: "fund_subscriptions", entity_id: null, actor_id: "u2", actor_name: "كريم المحاسب", details: "توليد استحقاقات شهر 2026-10", created_at: "2026-10-01T08:00:00Z" },
  { id: "g5", action: "settings_updated", entity_type: "fund_settings", entity_id: "demo-settings", actor_id: "u1", actor_name: "مدير النظام", details: "تحديث الرصيد الافتتاحي", created_at: "2026-03-01T10:00:00Z" },
  { id: "g6", action: "role_updated", entity_type: "fund_user_roles", entity_id: "u4", actor_id: "u1", actor_name: "مدير النظام", details: "تعيين الدور: عضو مجلس الإدارة", created_at: "2026-03-02T10:00:00Z" },
  { id: "g7", action: "expense_rejected", entity_type: "fund_expense_requests", entity_id: "e6", actor_id: "u1", actor_name: "مدير النظام", details: "غير ضروري حالياً", created_at: "2026-10-09T09:00:00Z" },
  { id: "g8", action: "receipt_created", entity_type: "fund_receipts", entity_id: "r12", actor_id: "u1", actor_name: "مدير النظام", details: "سند قبض رقم 12", created_at: "2026-10-01T14:00:00Z" },
];

function buildSummary() {
  const totalRevenue = demoReceipts.reduce((s, r) => s + Number(r.amount), 0);
  const paidExpenses = demoExpenses.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
  const committed = demoExpenses.filter((e) => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0);
  const arrears = demoSubs.reduce((s, x) => s + (Number(x.amount) - Number(x.paid_amount)), 0);
  const cash = Number(demoSettings.opening_balance) + totalRevenue - paidExpenses;
  const byCategory: Record<string, number> = {};
  for (const e of demoExpenses.filter((x) => x.status === "paid")) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
  }
  return {
    opening_balance: Number(demoSettings.opening_balance),
    cash_balance: cash,
    committed,
    net_available: cash - committed,
    total_revenue: totalRevenue,
    total_paid_expenses: paidExpenses,
    arrears,
    pending_requests: demoExpenses.filter((e) => e.status === "pending").length,
    approved_requests: demoExpenses.filter((e) => e.status === "approved").length,
    rev_subscriptions: demoReceipts.filter((r) => r.receipt_type === "subscription").reduce((s, r) => s + Number(r.amount), 0),
    rev_general_donations: demoReceipts.filter((r) => r.receipt_type !== "subscription" && !r.is_restricted).reduce((s, r) => s + Number(r.amount), 0),
    rev_restricted_donations: demoReceipts.filter((r) => r.is_restricted).reduce((s, r) => s + Number(r.amount), 0),
    active_members: demoMembers.filter((m) => m.active).length,
    expenses_by_category: byCategory,
  };
}

const MOCK_TABLES: Record<string, unknown[]> = {
  fund_members: demoMembers,
  fund_subscriptions: demoSubs,
  fund_receipts: demoReceipts,
  fund_expense_requests: demoExpenses,
  fund_expense_approvals: demoApprovals,
  fund_user_profiles: demoProfiles,
  fund_user_roles: demoRoles,
  fund_audit_logs: demoAudit,
  fund_settings: [demoSettings],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const demoUser = {
  id: "u1",
  aud: "authenticated",
  role: "authenticated",
  email: "admin@banan.example",
  phone: "",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "مدير النظام" },
  identities: [],
  created_at: "2026-01-01T00:00:00Z",
  last_sign_in_at: NOW,
  updated_at: NOW,
};

const CHAIN_METHODS = [
  "select", "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
  "contains", "containedBy", "or", "not", "match", "textSearch", "order", "limit",
  "range", "csv", "explain", "throwOnError", "then", // then handled separately
];
const WRITE_METHODS = ["insert", "update", "upsert", "delete"];

/** Chainable thenable that answers reads from mock data and rejects writes with DEMO_WRITE_MSG. */
function tableBuilder(table: string) {
  const state = { write: false, single: false, maybe: false };
  const finish = async () => {
    await sleep(120);
    if (state.write) {
      return { data: null, error: { message: DEMO_WRITE_MSG, code: "42501", details: null, hint: null } };
    }
    const rows = MOCK_TABLES[table] ?? [];
    if (state.single) {
      return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: "No rows found", code: "PGRST116", details: null, hint: null } };
    }
    if (state.maybe) return { data: rows[0] ?? null, error: null };
    return { data: rows.map((r) => ({ ...(r as object) })), error: null };
  };

  const proxy: any = new Proxy(function () {} as unknown as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === "then") return (res: unknown, rej: unknown) => finish().then(res as never, rej as never);
      if (prop === "catch") return (rej: unknown) => finish().catch(rej as never);
      if (prop === "finally") return (fn: () => void) => finish().finally(fn);
      if (prop === "single") return () => { state.single = true; return proxy; };
      if (prop === "maybeSingle") return () => { state.maybe = true; return proxy; };
      if (typeof prop === "string" && WRITE_METHODS.includes(prop)) {
        return () => { state.write = true; return proxy; };
      }
      if (typeof prop === "string" && CHAIN_METHODS.includes(prop)) return () => proxy;
      return undefined;
    },
  });
  return proxy;
}

function rpcBuilder(fn: string) {
  return async () => {
    await sleep(150);
    if (fn === "fund_summary") return { data: buildSummary(), error: null };
    if (fn === "fund_public_branding") return { data: { fund_name: FUND_NAME, logo_url: null }, error: null };
    return { data: null, error: { message: DEMO_WRITE_MSG, code: "42501", details: null, hint: null } };
  };
}

type RealClient = import("@supabase/supabase-js").SupabaseClient<Database>;

/** Wrap the real Supabase client so demo mode never touches the network. */
export function createDemoSupabase(getReal: () => RealClient): RealClient {
  const demo = {
    from(table: string) {
      return tableBuilder(table);
    },
    rpc(fn: string) {
      return rpcBuilder(fn)();
    },
    auth: new Proxy({} as RealClient["auth"], {
      get(_t, prop) {
        if (prop === "getUser") return async () => ({ data: { user: demoUser as never }, error: null });
        if (prop === "getSession") return async () => ({ data: { session: null as never }, error: null });
        if (prop === "signOut") return async () => ({ error: null });
        return Reflect.get(getReal().auth, prop);
      },
    }),
    storage: new Proxy({} as RealClient["storage"], {
      get(_t, prop) {
        if (prop === "from") {
          return () => ({
            upload: async () => ({ data: null, error: { message: DEMO_WRITE_MSG } }),
            remove: async () => ({ data: null, error: { message: DEMO_WRITE_MSG } }),
            createSignedUrl: async () => ({ data: null, error: { message: DEMO_WRITE_MSG } }),
            getPublicUrl: () => ({ data: { publicUrl: "" } }),
          });
        }
        return Reflect.get(getReal().storage, prop);
      },
    }),
  };

  return new Proxy({} as RealClient, {
    get(_t, prop) {
      if (prop in demo) return Reflect.get(demo, prop);
      return Reflect.get(getReal(), prop);
    },
  });
}
