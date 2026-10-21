import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Scale, AlertTriangle, Clock, CalendarPlus, HandCoins, Gift, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, Kpi, PageHeader, Pill, tableCls, Empty } from "@/components/fund/ui";
import { FundLogo } from "@/components/fund/Brand";
import { DonationDialog, ExpenseRequestDialog, GenerateDuesDialog, PaySubscriptionDialog } from "@/components/fund/dialogs";
import { summaryQuery, useMe, can, STAFF } from "@/lib/fund";
import { CATEGORY_LABELS, FUND_FULL_NAME, SUB_STATUS_LABELS, fmtMonth, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم | صندوق بنان الخير للبنيان" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  if (!can(me, STAFF)) return <MemberHome memberId={me?.linked_member_id ?? null} />;
  return <StaffDashboard />;
}

function StaffDashboard() {
  const { data: me } = useMe();
  const { data: s } = useQuery(summaryQuery);
  const [dlg, setDlg] = useState<null | "pay" | "don" | "dues" | "exp">(null);
  const canFin = can(me, ["admin", "accountant", "treasurer"]);
  const canDues = can(me, ["admin", "accountant"]);

  const rev = s ? [
    { k: "اشتراكات الأعضاء", v: s.rev_subscriptions, c: "bg-primary" },
    { k: "تبرعات عامة", v: s.rev_general_donations, c: "bg-gold" },
    { k: "تبرعات مقيدة", v: s.rev_restricted_donations, c: "bg-chart-3" },
  ] : [];
  const revTotal = rev.reduce((a, b) => a + Number(b.v), 0) || 1;
  const exp = s ? Object.entries(s.expenses_by_category ?? {}) : [];
  const expTotal = exp.reduce((a, [, v]) => a + Number(v), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-hero text-primary-foreground shadow-card">
        <div className="pattern-dots flex flex-wrap items-center gap-4 p-5 md:p-7">
          <div className="rounded-full bg-card p-2"><FundLogo className="h-16 w-16" /></div>
          <div className="flex-1">
            <p className="text-xs opacity-80">مرحباً، {me?.full_name}</p>
            <h1 className="text-lg font-extrabold md:text-2xl">{FUND_FULL_NAME}</h1>
          </div>
          <div className="text-left">
            <p className="text-xs opacity-80">الرصيد النقدي الفعلي المتاح</p>
            <p className="tabular text-2xl font-extrabold text-gold md:text-3xl">{money(s?.cash_balance)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="الرصيد النقدي الفعلي" value={money(s?.cash_balance)} icon={Wallet} hint="افتتاحي + الإيرادات − المصروف المدفوع" />
        <Kpi label="إجمالي الإيرادات المحصلة" value={money(s?.total_revenue)} icon={TrendingUp} tone="success" />
        <Kpi label="إجمالي المصروفات المدفوعة" value={money(s?.total_paid_expenses)} icon={TrendingDown} tone="danger" />
        <Kpi label="الصافي المتاح للصرف الجديد" value={money(s?.net_available)} icon={Scale} tone="gold" hint={`معتمد بانتظار الصرف: ${money(s?.committed)}`} />
        <Kpi label="متأخرات الاشتراكات" value={money(s?.arrears)} icon={AlertTriangle} tone="warning" hint="مستحقات غير محصلة – لا تُحسب في النقد" />
        <Kpi label="طلبات معلقة للاعتماد" value={String(s?.pending_requests ?? 0)} icon={Clock} tone="muted" hint={`${s?.approved_requests ?? 0} معتمد بانتظار الصرف`} />
      </div>

      <Card title="إجراءات سريعة">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Button variant="soft" className="h-14" disabled={!canFin} onClick={() => setDlg("pay")}><CreditCard /> سداد اشتراك</Button>
          <Button variant="soft" className="h-14" disabled={!canFin} onClick={() => setDlg("don")}><Gift /> سند تبرع</Button>
          <Button variant="soft" className="h-14" disabled={!canDues} onClick={() => setDlg("dues")}><CalendarPlus /> توليد استحقاقات الشهر</Button>
          <Button variant="gold" className="h-14" onClick={() => setDlg("exp")}><HandCoins /> طلب صرف جديد</Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="توزيع الإيرادات">
          <Bars items={rev.map((r) => ({ label: r.k, value: Number(r.v), pct: (Number(r.v) / revTotal) * 100, cls: r.c }))} />
        </Card>
        <Card title="المصروفات المدفوعة حسب التصنيف">
          {exp.length ? <Bars items={exp.map(([k, v]) => ({ label: CATEGORY_LABELS[k] ?? k, value: Number(v), pct: (Number(v) / expTotal) * 100, cls: "bg-chart-4" }))} /> : <Empty>لا توجد مصروفات مدفوعة بعد</Empty>}
        </Card>
      </div>

      <PaySubscriptionDialog open={dlg === "pay"} onOpenChange={(o) => !o && setDlg(null)} />
      <DonationDialog open={dlg === "don"} onOpenChange={(o) => !o && setDlg(null)} />
      <GenerateDuesDialog open={dlg === "dues"} onOpenChange={(o) => !o && setDlg(null)} />
      <ExpenseRequestDialog open={dlg === "exp"} onOpenChange={(o) => !o && setDlg(null)} />
    </div>
  );
}

function Bars({ items }: { items: { label: string; value: number; pct: number; cls: string }[] }) {
  return (
    <div className="space-y-4">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{i.label}</span><span className="tabular text-muted-foreground">{money(i.value)}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${i.cls}`} style={{ width: `${Math.max(i.pct, i.value ? 2 : 0)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function MemberHome({ memberId }: { memberId: string | null }) {
  const subs = useQuery({
    queryKey: ["subs", "mine", memberId],
    enabled: !!memberId,
    queryFn: async () => (await supabase.from("fund_subscriptions").select("*").eq("member_id", memberId!).order("due_month", { ascending: false })).data ?? [],
  });
  const arrears = (subs.data ?? []).reduce((a, s) => a + Number(s.amount) - Number(s.paid_amount), 0);
  return (
    <div className="space-y-5">
      <PageHeader title="حسابي في الصندوق" desc="عرض اشتراكاتك الشهرية ومتأخراتك" />
      {!memberId ? (
        <Card><Empty>حسابك غير مرتبط بسجل عضو بعد. يرجى التواصل مع مدير الصندوق.</Empty></Card>
      ) : (
        <>
          <Kpi label="المتأخرات المستحقة عليك" value={money(arrears)} icon={AlertTriangle} tone="warning" />
          <Card title="اشتراكاتي">
            <div className="overflow-x-auto"><table className={tableCls}>
              <thead><tr><th>الشهر</th><th>المستحق</th><th>المسدد</th><th>الحالة</th></tr></thead>
              <tbody>{subs.data?.map((s) => (
                <tr key={s.id}><td>{fmtMonth(s.due_month)}</td><td className="tabular">{money(s.amount)}</td><td className="tabular">{money(s.paid_amount)}</td>
                  <td><Pill tone={s.status === "paid" ? "success" : s.status === "partial" ? "warning" : "danger"}>{SUB_STATUS_LABELS[s.status]}</Pill></td></tr>
              ))}</tbody>
            </table></div>
          </Card>
        </>
      )}
    </div>
  );
}
