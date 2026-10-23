import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];

export type Member = PublicTables["fund_members"]["Row"];
export type Subscription = PublicTables["fund_subscriptions"]["Row"];
export type Receipt = PublicTables["fund_receipts"]["Row"];
export type ExpenseRequest = PublicTables["fund_expense_requests"]["Row"];
export type ExpenseApproval = PublicTables["fund_expense_approvals"]["Row"];
export type UserProfile = PublicTables["fund_user_profiles"]["Row"];
export type UserRole = PublicTables["fund_user_roles"]["Row"];
export type AuditLog = PublicTables["fund_audit_logs"]["Row"];
export type FundSettings = PublicTables["fund_settings"]["Row"];

/** Invalidate every cached fund list after a write, so all pages refresh together. */
export function useInvalidateFund() {
  const qc = useQueryClient();
  return () => {
    [
      "summary",
      "members",
      "subs",
      "receipts",
      "expenses",
      "approvals",
      "audit",
      "settings",
      "users",
    ].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
  };
}

export const membersQuery = queryOptions({
  queryKey: ["members", "list"],
  queryFn: async (): Promise<Member[]> => {
    const { data, error } = await supabase.from("fund_members").select("*").order("member_no");
    if (error) throw error;
    return data ?? [];
  },
});

export const subscriptionsQuery = queryOptions({
  queryKey: ["subs", "all"],
  queryFn: async (): Promise<Subscription[]> => {
    const { data, error } = await supabase
      .from("fund_subscriptions")
      .select("*")
      .order("due_month", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const receiptsQuery = queryOptions({
  queryKey: ["receipts", "list"],
  queryFn: async (): Promise<Receipt[]> => {
    const { data, error } = await supabase
      .from("fund_receipts")
      .select("*")
      .order("receipt_date", { ascending: false })
      .order("receipt_no", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const expensesQuery = queryOptions({
  queryKey: ["expenses", "list"],
  queryFn: async (): Promise<ExpenseRequest[]> => {
    const { data, error } = await supabase
      .from("fund_expense_requests")
      .select("*")
      .order("requested_date", { ascending: false })
      .order("request_no", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const approvalsQuery = queryOptions({
  queryKey: ["approvals", "list"],
  queryFn: async (): Promise<ExpenseApproval[]> => {
    const { data, error } = await supabase
      .from("fund_expense_approvals")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const userProfilesQuery = queryOptions({
  queryKey: ["users", "profiles"],
  queryFn: async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase
      .from("fund_user_profiles")
      .select("*")
      .order("created_at");
    if (error) throw error;
    return data ?? [];
  },
});

export const userRolesQuery = queryOptions({
  queryKey: ["users", "roles"],
  queryFn: async (): Promise<UserRole[]> => {
    const { data, error } = await supabase.from("fund_user_roles").select("*");
    if (error) throw error;
    return data ?? [];
  },
});

export const auditLogsQuery = queryOptions({
  queryKey: ["audit", "list"],
  queryFn: async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from("fund_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return data ?? [];
  },
});

/** Total unpaid amount for one member, based on their subscription rows. */
export function memberArrears(subs: Subscription[], memberId: string): number {
  return subs
    .filter((s) => s.member_id === memberId)
    .reduce((sum, s) => sum + (Number(s.amount) - Number(s.paid_amount)), 0);
}
