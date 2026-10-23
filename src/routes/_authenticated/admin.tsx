import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ImagePlus,
  Save,
  ShieldCheck,
  Users,
  Wallet,
  History,
  Trash2,
  DatabaseBackup,
  UserPlus,
  Grid3X3,
  Mail,
  Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, Empty, Field, PageHeader, Pill, tableCls } from "@/components/fund/ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FundEmblem } from "@/components/fund/Brand";
import { errMsg, imageToDataUrl, settingsQuery, useMe, can } from "@/lib/fund";
import {
  exportCSV,
  fmtDateTime,
  ROLE_LABELS,
  todayISO,
  CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  METHOD_LABELS,
  RECEIPT_TYPE_LABELS,
  SUB_STATUS_LABELS,
  type FundRole,
} from "@/lib/format";
import { PERMISSIONS, ROLE_PERMISSIONS, roleFromPermissions, type PermissionKey } from "@/lib/permissions";
import { ROLE_LABELS as RL } from "@/lib/format";
import {
  auditLogsQuery,
  membersQuery,
  useInvalidateFund,
  userProfilesQuery,
  userRolesQuery,
  type UserProfile,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "الإدارة والإعدادات | صندوق بنان الخير للبنيان" }] }),
  component: AdminPage,
});

const ROLES: FundRole[] = ["admin", "accountant", "treasurer", "board_member", "member"];

function AdminPage() {
  const { data: me } = useMe();
  const { data: settings } = useQuery(settingsQuery);
  const { data: profiles = [] } = useQuery(userProfilesQuery);
  const { data: roles = [] } = useQuery(userRolesQuery);
  const { data: members = [] } = useQuery(membersQuery);
  const { data: logs = [] } = useQuery(auditLogsQuery);
  const inv = useInvalidateFund();
  const isAdmin = can(me, ["admin"]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإدارة والإعدادات"
        desc="بيانات الصندوق، صلاحيات المستخدمين، وسجل التغييرات"
      />

      {!isAdmin && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">
          <b>وضع العرض فقط:</b> تعديل الإعدادات والصلاحيات متاح لمدير النظام فقط.
        </div>
      )}

      <SettingsCard isAdmin={isAdmin} />
      <UsersCard
        isAdmin={isAdmin}
        profiles={profiles}
        roles={roles}
        members={members}
        onChange={inv}
      />
      <PermissionsCard isAdmin={isAdmin} profiles={profiles} roles={roles} onChange={inv} />
      {isAdmin && <BackupCard />}

      <Card title="سجل التغييرات (Audit Log)">
        <p className="mb-3 text-xs text-muted-foreground">
          كل إضافة أو تعديل أو اعتماد يُسجَّل تلقائيًا هنا لمحاسبة الجميع وحماية أموال الصندوق.
        </p>
        {logs.length === 0 ? (
          <Empty>لا توجد حركات مسجلة بعد</Empty>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className={tableCls}>
              <thead>
                <tr>
                  <th>التاريخ والوقت</th>
                  <th>المستخدم</th>
                  <th>الإجراء</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="tabular whitespace-nowrap text-xs">
                      {fmtDateTime(l.created_at)}
                    </td>
                    <td className="text-xs font-semibold">{l.actor_name ?? "—"}</td>
                    <td>
                      <Pill tone={actionTone(l.action)}>{actionLabel(l.action)}</Pill>
                    </td>
                    <td className="text-xs">{l.details ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    insert: "إضافة",
    update: "تعديل",
    delete: "حذف",
    approve: "اعتماد",
    reject: "رفض",
    disburse: "صرف",
    generate_dues: "توليد استحقاقات",
  };
  return map[action] ?? action;
}

function actionTone(action: string): "success" | "warning" | "danger" | "muted" | "primary" {
  if (action === "insert") return "success";
  if (action === "delete" || action === "reject") return "danger";
  if (action === "approve" || action === "disburse") return "primary";
  if (action === "update") return "warning";
  return "muted";
}

function SettingsCard({ isAdmin }: { isAdmin: boolean }) {
  const { data: settings } = useQuery(settingsQuery);
  const inv = useInvalidateFund();
  const [f, setF] = useState({
    fund_name: "",
    currency: "ريال يمني",
    default_monthly_fee: "1000",
    opening_balance: "0",
    allow_self_approval: false,
    logo_url: "",
  });

  useEffect(() => {
    if (!settings) return;
    setF({
      fund_name: settings.fund_name,
      currency: settings.currency,
      default_monthly_fee: String(settings.default_monthly_fee),
      opening_balance: String(settings.opening_balance),
      allow_self_approval: settings.allow_self_approval,
      logo_url: settings.logo_url ?? "",
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (!settings) throw new Error("لم يتم العثور على إعدادات الصندوق");
      const { error } = await supabase
        .from("fund_settings")
        .update({
          fund_name: f.fund_name.trim(),
          currency: f.currency.trim() || "ريال يمني",
          default_monthly_fee: Number(f.default_monthly_fee),
          opening_balance: Number(f.opening_balance),
          allow_self_approval: f.allow_self_approval,
          logo_url: f.logo_url || null,
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الصندوق");
      inv();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  async function pickLogo(file: File | null) {
    if (!file) return;
    try {
      const url = await imageToDataUrl(file, 320);
      setF((prev) => ({ ...prev, logo_url: url }));
      toast.success("تم تجهيز الشعار — اضغط حفظ لتثبيته");
    } catch {
      toast.error("تعذر قراءة الصورة");
    }
  }

  return (
    <Card title="بيانات الصندوق">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 p-4 text-center">
          {f.logo_url ? (
            <img
              src={f.logo_url}
              alt="شعار الصندوق"
              className="h-28 w-28 rounded-full bg-card object-contain p-1"
            />
          ) : (
            <FundEmblem className="h-28 w-28" />
          )}
          <label className="w-full">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={!isAdmin}
              onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
            />
            <span
              className={
                isAdmin
                  ? "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
                  : "inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-input bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground"
              }
            >
              <ImagePlus className="h-4 w-4" /> تغيير الشعار
            </span>
          </label>
          {f.logo_url && isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setF((prev) => ({ ...prev, logo_url: "" }))}
            >
              <Trash2 /> إزالة الشعار
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">يظهر في رأس الصفحات والسندات المطبوعة</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="اسم الصندوق" className="md:col-span-2">
            <Input
              disabled={!isAdmin}
              value={f.fund_name}
              onChange={(e) => setF({ ...f, fund_name: e.target.value })}
            />
          </Field>
          <Field label="العملة">
            <Input
              disabled={!isAdmin}
              value={f.currency}
              onChange={(e) => setF({ ...f, currency: e.target.value })}
            />
          </Field>
          <Field label="الاشتراك الشهري الافتراضي (ر.ي)">
            <Input
              type="number"
              min={0}
              disabled={!isAdmin}
              value={f.default_monthly_fee}
              onChange={(e) => setF({ ...f, default_monthly_fee: e.target.value })}
            />
          </Field>
          <Field label="الرصيد الافتتاحي للصندوق (ر.ي)">
            <Input
              type="number"
              disabled={!isAdmin}
              value={f.opening_balance}
              onChange={(e) => setF({ ...f, opening_balance: e.target.value })}
            />
          </Field>
          <label className="flex items-center justify-between gap-3 self-end rounded-lg border p-3 text-sm font-semibold">
            السماح باعتماد الطلب من منشئه
            <Switch
              disabled={!isAdmin}
              checked={f.allow_self_approval}
              onCheckedChange={(v) => setF({ ...f, allow_self_approval: v })}
            />
          </label>
          <div className="md:col-span-2 rounded-lg bg-gold-soft/60 p-3 text-xs text-muted-foreground">
            <b className="text-foreground">تنبيه:</b> الرصيد الافتتاحي يُضاف إلى النقد المتاح. عدّله
            فقط عند بداية تشغيل النظام أو عند جرد فعلي.
          </div>
          {isAdmin && (
            <div className="md:col-span-2">
              <Button disabled={save.isPending} onClick={() => save.mutate()}>
                <Save /> حفظ الإعدادات
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function UsersCard({
  isAdmin,
  profiles,
  roles,
  members,
  onChange,
}: {
  isAdmin: boolean;
  profiles: UserProfile[];
  roles: { user_id: string; role: string; updated_at: string }[];
  members: { id: string; member_no: string | null; full_name: string }[];
  onChange: () => void;
}) {
  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("fund_user_roles")
        .update({ role })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث الصلاحية");
      onChange();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const updateProfile = useMutation({
    mutationFn: async (payload: {
      userId: string;
      active?: boolean;
      linked_member_id?: string | null;
    }) => {
      const { userId, ...rest } = payload;
      const { error } = await supabase
        .from("fund_user_profiles")
        .update(rest)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث بيانات المستخدم");
      onChange();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const roleOf = (userId: string) => roles.find((r) => r.user_id === userId)?.role ?? "member";

  return (
    <Card title="المستخدمون والصلاحيات">
      <p className="mb-3 text-xs text-muted-foreground">
        <ShieldCheck className="me-1 inline h-3.5 w-3.5" />
        أعطِ كل شخص الصلاحية التي يحتاجها فقط: المحاسب للقيود، أمين الصندوق للصرف، أعضاء المجلس
        للاعتماد.
      </p>
      {profiles.length === 0 ? (
        <Empty>لا يوجد مستخدمون بعد</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className={tableCls}>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد الإلكتروني</th>
                <th>الصلاحية</th>
                <th>مرتبط بعضو</th>
                <th>نشط</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.user_id}>
                  <td className="font-semibold">{p.full_name}</td>
                  <td dir="ltr" className="text-xs">
                    {p.email ?? "—"}
                  </td>
                  <td className="min-w-[150px]">
                    <Select
                      value={roleOf(p.user_id)}
                      disabled={!isAdmin}
                      onValueChange={(v) => updateRole.mutate({ userId: p.user_id, role: v })}
                      dir="rtl"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="min-w-[180px]">
                    <Select
                      value={p.linked_member_id ?? "none"}
                      disabled={!isAdmin}
                      onValueChange={(v) =>
                        updateProfile.mutate({
                          userId: p.user_id,
                          linked_member_id: v === "none" ? null : v,
                        })
                      }
                      dir="rtl"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="غير مرتبط" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">غير مرتبط</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.member_no ?? ""} — {m.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <Switch
                      disabled={!isAdmin}
                      checked={p.active}
                      onCheckedChange={(v) =>
                        updateProfile.mutate({ userId: p.user_id, active: v })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
        <p className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> العضو العادي يرى حسابه واشتراكاته فقط.
        </p>
        <p className="flex items-center gap-1">
          <Wallet className="h-3.5 w-3.5" /> الصرف الفعلي محصور بمدير النظام وأمين الصندوق.
        </p>
        <p className="flex items-center gap-1">
          <History className="h-3.5 w-3.5" /> كل تغيير في الصلاحيات يُسجَّل في سجل التغييرات.
        </p>
      </div>
    </Card>
  );
}

/** Full CSV backup: exports every main table as a separate file, admin only. */
function BackupCard() {
  const [busy, setBusy] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(() => {
    try {
      return localStorage.getItem("last_backup_at");
    } catch {
      return null;
    }
  });

  async function backup() {
    setBusy(true);
    try {
      const day = todayISO();
      const yn = (v: unknown) => (v ? "نعم" : "لا");
      const tables: { file: string; table: string; headers: string[]; order: string; map?: (r: any) => (string | number | null)[]; get?: () => Promise<(string | number | null)[][]> }[] = [
        {
          file: `backup-members-${day}`,
          table: "fund_members",
          order: "member_no",
          headers: ["رقم العضو", "الاسم", "الهاتف", "العنوان", "الاشتراك الشهري", "تاريخ الانضمام", "نشط؟", "ملاحظات"],
          map: (r: any) => [r.member_no, r.full_name, r.phone, r.address, r.monthly_fee, r.joined_on, yn(r.active), r.notes],
        },
        {
          file: `backup-subscriptions-${day}`,
          table: "fund_subscriptions",
          order: "due_month",
          headers: ["الشهر", "المستحق", "المسدد", "الحالة"],
          map: (r: any) => [r.due_month, r.amount, r.paid_amount, SUB_STATUS_LABELS[String(r.status)] ?? r.status],
        },
        {
          file: `backup-receipts-${day}`,
          table: "fund_receipts",
          order: "receipt_no",
          headers: ["رقم السند", "التاريخ", "النوع", "الدافع", "المبلغ", "طريقة الدفع", "مقيد؟", "الغرض المقيد", "ملاحظات"],
          map: (r: any) => [
            r.receipt_no,
            r.receipt_date,
            RECEIPT_TYPE_LABELS[String(r.receipt_type)] ?? r.receipt_type,
            r.donor_name,
            r.amount,
            METHOD_LABELS[String(r.payment_method)] ?? r.payment_method,
            yn(r.is_restricted),
            r.restricted_purpose,
            r.notes,
          ],
        },
        {
          file: `backup-expenses-${day}`,
          table: "fund_expense_requests",
          order: "request_no",
          headers: ["رقم الطلب", "تاريخ الطلب", "التصنيف", "المستفيد", "الهاتف", "الوصف", "المبلغ", "الحالة", "تاريخ الصرف", "رقم سند الصرف"],
          map: (r: any) => [
            r.request_no,
            r.requested_date,
            CATEGORY_LABELS[String(r.category)] ?? r.category,
            r.beneficiary_name,
            r.beneficiary_phone,
            r.description,
            r.amount,
            EXPENSE_STATUS_LABELS[String(r.status)] ?? r.status,
            r.disbursed_at,
            r.payment_voucher_no,
          ],
        },
        {
          file: `backup-approvals-${day}`,
          table: "fund_expense_approvals",
          order: "created_at",
          headers: ["الطلب", "المعتمِد", "الدور", "القرار", "ملاحظات", "التاريخ"],
          map: (r: any) => [r.request_id, r.approver_name, r.approver_role, r.decision === "approved" ? "اعتماد" : "رفض", r.notes, r.created_at],
        },
        {
          file: `backup-audit-${day}`,
          table: "fund_audit_logs",
          order: "created_at",
          headers: ["التاريخ والوقت", "الحدث", "النوع", "معرّف السجل", "المستخدم", "التفاصيل"],
          map: (r: any) => [r.created_at, r.action, r.entity_type, r.entity_id, r.actor_name ?? r.actor_id, r.details],
        },
        {
          file: `backup-users-${day}`,
          table: "fund_user_profiles",
          order: "created_at",
          headers: ["الاسم", "البريد الإلكتروني", "الدور", "نشط؟", "مرتبط بعضو"],
          get: async () => {
            const profs = await fetchAll("fund_user_profiles", "created_at");
            const rols = await fetchAll("fund_user_roles", "user_id");
            const mems = await fetchAll("fund_members", "member_no");
            const roleOf = (uid: unknown) => String((rols.find((x: any) => x.user_id === uid) as any)?.role ?? "member");
            const nameOf = (mid: unknown) => {
              const m = mems.find((x: any) => x.id === mid) as any;
              return m ? `${m.member_no ?? ""} — ${m.full_name}` : "";
            };
            return profs.map((x: any) => [x.full_name, x.email, ROLE_LABELS[String(roleOf(x.user_id)) as FundRole] ?? roleOf(x.user_id), yn(x.active), x.linked_member_id ? nameOf(x.linked_member_id) : "غير مرتبط"]);
          },
        },
        {
          file: `backup-settings-${day}`,
          table: "fund_settings",
          order: "fund_name",
          headers: ["اسم الصندوق", "العملة", "الاشتراك الافتراضي", "الرصيد الافتتاحي", "السداد الذاتي مسموح؟", "شعار مرفوع؟", "آخر تحديث"],
          map: (r: any) => [r.fund_name, r.currency, r.default_monthly_fee, r.opening_balance, yn(r.allow_self_approval), yn(r.logo_url), r.updated_at],
        },
      ];
      for (const [i, t] of tables.entries()) {
        const rows = t.get ? await t.get() : (await fetchAll(t.table, t.order)).map((r: any) => (t.map ? t.map(r) : (Object.values(r) as (string | number | null)[])));
        exportCSV(t.file, t.headers, rows);
        if (i < tables.length - 1) await new Promise((r) => setTimeout(r, 400));
      }
      localStorage.setItem("last_backup_at", new Date().toISOString());
      setLastBackup(localStorage.getItem("last_backup_at"));
      toast.success(`تم تنزيل النسخة الاحتياطية (${tables.length} ملفات Excel)`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="النسخة الاحتياطية">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xl text-sm text-muted-foreground">
          <p>
            تصدير كل بيانات الصندوق (الأعضاء، الاشتراكات، سندات القبض، طلبات الصرف، الاعتمادات، سجل التغييرات،
            المستخدمون، الإعدادات) إلى 8 ملفات جداول تُفتح في Excel وGoogle Sheets.
          </p>
          <p className="mt-1 text-xs">
            {lastBackup
              ? `آخر نسخة احتياطية: ${fmtDateTime(lastBackup)}`
              : "لم تُؤخذ أي نسخة بعد — يُنصح بأخذ نسخة نهاية كل شهر وحفظها في مكان آمن."}
          </p>
        </div>
        <Button variant="soft" disabled={busy} onClick={backup}>
          <DatabaseBackup /> {busy ? "جارٍ التصدير…" : "تنزيل نسخة احتياطية كاملة"}
        </Button>
      </div>
    </Card>
  );
}

async function fetchAll(table: string, order: string): Promise<any[]> {
  const PAGE = 1000;
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const fromFn = supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>;
    const { data, error } = await fromFn(table).select("*").order(order).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as any[]));
    if (data.length < PAGE) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Permissions matrix + per-user permission editor + staff invite      */
/* ------------------------------------------------------------------ */

function PermissionsCard({
  isAdmin,
  profiles,
  roles,
  onChange,
}: {
  isAdmin: boolean;
  profiles: UserProfile[];
  roles: { user_id: string; role: string }[];
  onChange: () => void;
}) {
  const [showMatrix, setShowMatrix] = useState(false);
  const [userId, setUserId] = useState("");
  const [checked, setChecked] = useState<Set<PermissionKey>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const inv = useInvalidateFund();

  const roleOf = (uid: string): FundRole => ((roles.find((r) => r.user_id === uid)?.role ?? "member") as FundRole);

  function pickUser(uid: string) {
    setUserId(uid);
    setChecked(new Set(ROLE_PERMISSIONS[roleOf(uid)]));
  }

  function toggle(k: PermissionKey) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  const activeId = userId || profiles[0]?.user_id || "";
  const activeChecked = checked.size > 0 ? checked : new Set<PermissionKey>(ROLE_PERMISSIONS[roleOf(activeId)]);
  const suggestion = roleFromPermissions(activeChecked);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fund_user_roles").update({ role: suggestion.role }).eq("user_id", activeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        suggestion.exact
          ? `تم تحديث الصلاحيات: ${RL[suggestion.role]}`
          : `التوليفة المختارة لا تطابق دوراً جاهزاً — طُبِّق الأقرب: ${RL[suggestion.role]}`,
      );
      setChecked(new Set());
      inv();
      onChange();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Card title="الصلاحيات والأدوار">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-xs text-muted-foreground">
          الأدوار الجاهزة هي التي تتحكم فعلياً في الاعتماد والصرف داخل قاعدة البيانات. فعّل المربعات وسيقترح النظام
          الدور المطابق تلقائياً.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowMatrix((v) => !v)}>
            <Grid3X3 /> {showMatrix ? "إخفاء المصفوفة" : "عرض مصفوفة الصلاحيات"}
          </Button>
          <Button size="sm" variant="soft" disabled={!isAdmin} onClick={() => setInviteOpen(true)}>
            <UserPlus /> دعوة موظف
          </Button>
        </div>
      </div>

      {showMatrix && (
        <div className="mb-5 overflow-x-auto rounded-lg border">
          <table className="w-full text-xs [&_td]:border-t [&_td]:px-2 [&_td]:py-1.5 [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-center [&_th]:text-[11px]">
            <thead>
              <tr>
                <th className="!text-right">الصلاحية</th>
                {(["admin", "accountant", "treasurer", "board_member", "member"] as FundRole[]).map((r) => (
                  <th key={r}>{RL[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.key}>
                  <td className="min-w-[200px] font-semibold">{p.label}</td>
                  {(["admin", "accountant", "treasurer", "board_member", "member"] as FundRole[]).map((r) => (
                    <td key={r} className="text-center">
                      {ROLE_PERMISSIONS[r].includes(p.key) ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">المستخدم</label>
          <Select value={activeId} onValueChange={pickUser} dir="rtl" disabled={profiles.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder="اختر مستخدماً" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name} {p.email ? `(${p.email})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeId && (
            <p className="text-xs text-muted-foreground">
              الدور الحالي: <b>{RL[roleOf(activeId)]}</b>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">الصلاحيات</label>
          <div className="grid grid-cols-1 gap-1.5 rounded-lg border p-3 sm:grid-cols-2">
            {PERMISSIONS.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={activeChecked.has(p.key)}
                  disabled={!isAdmin || !activeId}
                  onChange={() => toggle(p.key)}
                />
                {p.label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs">
              الدور المقترح:{" "}
              <b className={suggestion.exact ? "text-success" : "text-warning"}>
                {RL[suggestion.role]}
                {!suggestion.exact && " (الأقرب لتوليفتك)"}
              </b>
            </p>
            <Button size="sm" disabled={!isAdmin || !activeId || save.isPending} onClick={() => save.mutate()}>
              <ShieldCheck /> حفظ الصلاحيات
            </Button>
          </div>
          {!isAdmin && (
            <p className="text-xs text-warning">تعديل الصلاحيات متاح لمدير النظام فقط.</p>
          )}
        </div>
      </div>

      <InviteStaffDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </Card>
  );
}

function InviteStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [role, setRole] = useState<FundRole>("accountant");
  const link = typeof window !== "undefined" ? window.location.origin : "";
  const [copied, setCopied] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> دعوة موظف إلى النظام
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <Field label="الدور الذي سيُمنح له">
            <Select value={role} onValueChange={(v) => setRole(v as FundRole)} dir="rtl">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["admin", "accountant", "treasurer", "board_member"] as FundRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {RL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <ol className="list-decimal space-y-2 pr-5">
            <li>
              شارك معه رابط النظام:
              <div className="mt-1 flex items-center gap-2">
                <code dir="ltr" className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">
                  {link}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  <Copy /> {copied ? "تم ✓" : "نسخ"}
                </Button>
              </div>
            </li>
            <li>يطلب منك إنشاء حساب جديد بنفس البريد من صفحة الدخول (تبويب «حساب جديد»).</li>
            <li>
              بعد تسجيله سيظهر في قائمة المستخدمين أعلاه — حدد سطره ثم فعّل صلاحياته كما في
              «{RL[role]}» واحفظ.
            </li>
          </ol>

          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            ملاحظة أمنية: إنشاء الحسابات يتم عبر البريد الرسمي فقط، والدور الافتراضي لأي حساب جديد هو
            «عضو» بلا صلاحيات إدارية حتى يمنحها المدير.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <Mail /> فهمت — سأشارك الرابط
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
