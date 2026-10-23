import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Save, ShieldCheck, Users, Wallet, History, Trash2 } from "lucide-react";
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
import { FundEmblem } from "@/components/fund/Brand";
import { errMsg, imageToDataUrl, settingsQuery, useMe, can } from "@/lib/fund";
import { fmtDateTime, ROLE_LABELS, type FundRole } from "@/lib/format";
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
