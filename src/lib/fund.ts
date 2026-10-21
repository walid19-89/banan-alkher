import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FundRole } from "./format";

export type Me = {
  user_id: string;
  full_name: string;
  email: string | null;
  role: FundRole;
  active: boolean;
  linked_member_id: string | null;
};

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("fund_user_profiles").select("*").eq("user_id", u.user.id).maybeSingle(),
      supabase.from("fund_user_roles").select("role").eq("user_id", u.user.id).maybeSingle(),
    ]);
    return {
      user_id: u.user.id,
      full_name: p?.full_name ?? u.user.email ?? "",
      email: p?.email ?? u.user.email ?? null,
      role: (r?.role as FundRole) ?? "member",
      active: p?.active ?? true,
      linked_member_id: p?.linked_member_id ?? null,
    };
  },
});

export function useMe() {
  return useQuery(meQuery);
}

export function can(me: Me | null | undefined, roles: FundRole[]) {
  return !!me && me.active && roles.includes(me.role);
}

export const STAFF: FundRole[] = ["admin", "accountant", "treasurer", "board_member"];

export const brandingQuery = queryOptions({
  queryKey: ["branding"],
  queryFn: async () => {
    const { data } = await supabase.rpc("fund_public_branding");
    return (data as { fund_name: string; logo_url: string | null } | null) ?? null;
  },
  staleTime: 60_000,
});

export function useBranding() {
  return useQuery(brandingQuery);
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("fund_settings").select("*").limit(1).single();
    if (error) throw error;
    return data;
  },
});

export type Summary = {
  opening_balance: number;
  cash_balance: number;
  committed: number;
  net_available: number;
  total_revenue: number;
  total_paid_expenses: number;
  arrears: number;
  pending_requests: number;
  approved_requests: number;
  rev_subscriptions: number;
  rev_general_donations: number;
  rev_restricted_donations: number;
  active_members: number;
  expenses_by_category: Record<string, number>;
};

export const summaryQuery = queryOptions({
  queryKey: ["summary"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("fund_summary");
    if (error) throw error;
    return data as unknown as Summary;
  },
});

/** Upload a file to the private documents bucket; returns the storage path. */
export async function uploadDoc(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("fund-documents").upload(path, file);
  if (error) throw error;
  return path;
}

export async function openDoc(path: string) {
  const { data, error } = await supabase.storage.from("fund-documents").createSignedUrl(path, 300);
  if (error || !data) throw error ?? new Error("تعذر فتح المرفق");
  window.open(data.signedUrl, "_blank");
}

/** Resize an image file to a small PNG data URL (used for the fund logo so it can show on the login page). */
export function imageToDataUrl(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "حدث خطأ غير متوقع";
}
