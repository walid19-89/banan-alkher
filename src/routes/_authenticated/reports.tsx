import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  FileDown,
  Printer,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Empty, Kpi, PageHeader, Pill, tableCls } from "@/components/fund/ui";
import { PdfDocShell, PdfSectionTitle, PdfTable, FinancialReportPdfDoc } from "@/components/fund/PdfDocs";
import { exportNodeToPdf } from "@/lib/pdf";
import { summaryQuery } from "@/lib/fund";
import {
  CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  exportCSV,
  fmtDate,
  money,
  RECEIPT_TYPE_LABELS,
} from "@/lib/format";
import {
  membersQuery,
  receiptsQuery,
  expensesQuery,
  subscriptionsQuery,
  type ExpenseRequest,
  type Receipt,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "التقارير المالية | صندوق بنان الخير للبنيان" }] }),
  component: ReportsPage,
});

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const todayStr = () => new Date().toISOString().slice(0, 10);

function ReportsPage() {
  const { data: summary } = useQuery(summaryQuery);
  const { data: receipts = [] } = useQuery(receiptsQuery);
  const { data: expenses = [] } = useQuery(expensesQuery);
  const { data: members = [] } = useQuery(membersQuery);
  const { data: subs = [] } = useQuery(subscriptionsQuery);

  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(todayStr);
  const [printOpen, setPrintOpen] = useState(false);

  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);

  const receiptsIn = useMemo(
    () => receipts.filter((r) => inRange(r.receipt_date)),
    [receipts, from, to],
  );
  const expensesIn = useMemo(
    () => expenses.filter((e) => inRange(e.requested_date)),
    [expenses, from, to],
  );

  const revenue = receiptsIn.reduce((s, r) => s + Number(r.amount), 0);
  const paidExpenses = expensesIn
    .filter((e) => e.status === "paid")
    .reduce((s, e) => s + Number(e.amount), 0);
  const pendingTotal = expensesIn
    .filter((e) => e.status === "pending" || e.status === "approved")
    .reduce((s, e) => s + Number(e.amount), 0);

  const revenueByType = groupSum(
    receiptsIn,
    (r) =>
      r.receipt_type === "subscription"
        ? r.is_restricted
          ? "تبرعات مقيدة"
          : "اشتراكات الأعضاء"
        : r.is_restricted
          ? "تبرعات مقيدة"
          : "تبرعات وإيرادات أخرى",
    (r) => Number(r.amount),
  );

  const expensesByCategory = groupSum(
    expensesIn,
    (e) => CATEGORY_LABELS[e.category] ?? e.category,
    (e) => Number(e.amount),
  );
  const expensesByStatus = groupSum(
    expensesIn,
    (e) => EXPENSE_STATUS_LABELS[e.status] ?? e.status,
    (e) => Number(e.amount),
  );

  const monthly = useMemo(() => {
    const map = new Map<string, { revenue: number; expenses: number; paid: number }>();
    for (const r of receiptsIn) {
      const k = r.receipt_date.slice(0, 7);
      const row = map.get(k) ?? { revenue: 0, expenses: 0, paid: 0 };
      row.revenue += Number(r.amount);
      map.set(k, row);
    }
    for (const e of expensesIn) {
      const k = e.requested_date.slice(0, 7);
      const row = map.get(k) ?? { revenue: 0, expenses: 0, paid: 0 };
      row.expenses += Number(e.amount);
      if (e.status === "paid") row.paid += Number(e.amount);
      map.set(k, row);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [receiptsIn, expensesIn]);

  const arrearsByMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of subs) {
      map.set(
        s.member_id,
        (map.get(s.member_id) ?? 0) + (Number(s.amount) - Number(s.paid_amount)),
      );
    }
    return members
      .map((m) => ({ member: m, arrears: map.get(m.id) ?? 0 }))
      .filter((x) => x.arrears > 0)
      .sort((a, b) => b.arrears - a.arrears);
  }, [members, subs]);

  function exportSummary() {
    exportCSV(
      "التقرير_المالي_الإجمالي",
      ["الفترة", "إجمالي الإيرادات", "المصروفات المصروفة", "طلبات قيد الاعتماد", "صافي الفترة"],
      [[`${from} — ${to}`, revenue, paidExpenses, pendingTotal, revenue - paidExpenses]],
    );
  }

  function exportMonthly() {
    exportCSV(
      "التقرير_الشهري",
      ["الشهر", "الإيرادات", "المصروفات المصروفة"],
      monthly.map(([m, v]) => [m, v.revenue, v.paid]),
    );
  }

  function exportRevenue() {
    exportCSV(
      "تفصيل_الإيرادات",
      ["رقم السند", "التاريخ", "النوع", "الدافع", "المبلغ", "مقيد", "الغرض"],
      receiptsIn.map((r) => [
        r.receipt_no,
        r.receipt_date,
        RECEIPT_TYPE_LABELS[r.receipt_type] ?? r.receipt_type,
        r.donor_name ?? "",
        Number(r.amount),
        r.is_restricted ? "نعم" : "لا",
        r.restricted_purpose ?? "",
      ]),
    );
  }

  function exportExpenses() {
    exportCSV(
      "تفصيل_المصروفات",
      ["رقم الطلب", "التاريخ", "التصنيف", "المستفيد", "المبلغ", "الحالة"],
      expensesIn.map((e) => [
        e.request_no,
        e.requested_date,
        CATEGORY_LABELS[e.category] ?? e.category,
        e.beneficiary_name,
        Number(e.amount),
        EXPENSE_STATUS_LABELS[e.status] ?? e.status,
      ]),
    );
  }

  function exportArrears() {
    exportCSV(
      "المتأخرات_حسب_العضو",
      ["رقم العضو", "الاسم", "المتأخرات"],
      arrearsByMember.map(({ member, arrears }) => [member.member_no, member.full_name, arrears]),
    );
  }

  const revenueDetailRows = () =>
    receiptsIn.map((r) => [
      r.receipt_no ?? "",
      fmtDate(r.receipt_date),
      RECEIPT_TYPE_LABELS[r.receipt_type] ?? r.receipt_type,
      r.donor_name ?? "",
      Number(r.amount),
      r.is_restricted ? "نعم" : "لا",
    ]);

  const expenseDetailRows = () =>
    expensesIn.map((e) => [
      e.request_no ?? "",
      fmtDate(e.requested_date),
      CATEGORY_LABELS[e.category] ?? e.category,
      e.beneficiary_name,
      Number(e.amount),
      EXPENSE_STATUS_LABELS[e.status] ?? e.status,
    ]);

  const reportKpis = () => [
    { label: "إيرادات الفترة", value: money(revenue) },
    { label: "المصروفات المصروفة", value: money(paidExpenses) },
    { label: "طلبات قيد الاعتماد/الصرف", value: money(pendingTotal) },
    { label: "صافي الفترة", value: money(revenue - paidExpenses) },
    { label: "الرصيد النقدي الحالي (كل الفترات)", value: money(summary?.cash_balance) },
    { label: "إجمالي المتأخرات (كل الفترات)", value: money(summary?.arrears) },
  ];

  const reportDoc = () => (
    <FinancialReportPdfDoc
      from={from}
      to={to}
      kpis={reportKpis()}
      summaryRevenue={revenueByType.map(({ label, value }) => [label, value] as [string, number])}
      summaryExpenses={expensesByCategory.map(({ label, value }) => [label, value] as [string, number])}
      revenueRows={revenueDetailRows()}
      expenseRows={expenseDetailRows()}
      monthlyRows={monthly.map(([m, v]) => [m, v.revenue, v.paid])}
      arrearsRows={arrearsByMember.map(({ member, arrears }) => [
        `${member.member_no ?? ""} — ${member.full_name}`,
        money(arrears),
      ])}
    />
  );

  async function exportFullPdf() {
    try {
      await exportNodeToPdf(reportDoc(), `financial-report-${from}_to_${to}`);
      toast.success("تم إنشاء ملف PDF");
    } catch (e) {
      toast.error("تعذر إنشاء PDF: " + (e instanceof Error ? e.message : ""));
    }
  }

  async function exportSectionPdf(
    title: string,
    filename: string,
    headers: string[],
    rows: (string | number)[][],
  ) {
    try {
      await exportNodeToPdf(
        <PdfDocShell title={title} dateLabel={`الفترة: من ${fmtDate(from)} إلى ${fmtDate(to)}`} signatures={["أمين الصندوق", "المحاسب"]}>
          <PdfTable headers={headers} rows={rows} />
        </PdfDocShell>,
        filename,
      );
      toast.success("تم إنشاء ملف PDF");
    } catch (e) {
      toast.error("تعذر إنشاء PDF: " + (e instanceof Error ? e.message : ""));
    }
  }

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader
          title="التقارير المالية"
          desc="صورة واضحة عن أموال الصندوق خلال الفترة التي تختارها"
          actions={
            <>
              <Button variant="outline" onClick={() => setPrintOpen(true)}>
                <Printer /> طباعة التقرير
              </Button>
              <Button variant="outline" onClick={exportSummary}>
                <Download /> ملخص CSV
              </Button>
              <Button onClick={exportFullPdf}>
                <FileDown /> تصدير PDF كامل
              </Button>
            </>
          }
        />
      </div>

      <Card className="no-print" title="الفترة الزمنية">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">من تاريخ</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">إلى تاريخ</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="soft"
              onClick={() => {
                setFrom(yearStart());
                setTo(todayStr());
              }}
            >
              من بداية السنة
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="إيرادات الفترة" value={money(revenue)} icon={TrendingUp} tone="success" />
          <Kpi
            label="المصروفات المصروفة"
            value={money(paidExpenses)}
            icon={TrendingDown}
            tone="danger"
          />
          <Kpi label="صافي الفترة" value={money(revenue - paidExpenses)} icon={Scale} tone="gold" />
          <Kpi
            label="الرصيد النقدي الحالي"
            value={money(summary?.cash_balance)}
            icon={Wallet}
            hint="كل الفترات"
          />
          <Kpi
            label="طلبات قيد الاعتماد/الصرف"
            value={money(pendingTotal)}
            icon={AlertTriangle}
            tone="warning"
          />
          <Kpi
            label="إجمالي المتأخرات"
            value={money(summary?.arrears)}
            icon={AlertTriangle}
            tone="danger"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="تفصيل الإيرادات"
            actions={
              <div className="no-print flex gap-2">
                <Button size="sm" variant="outline" onClick={exportRevenue}>
                  <Download /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportSectionPdf("تفصيل الإيرادات", "report-revenue", ["رقم السند", "التاريخ", "النوع", "الدافع", "المبلغ", "مقيد؟"], revenueDetailRows())}>
                  <FileDown /> PDF
                </Button>
              </div>
            }
          >
            {revenueByType.length === 0 ? (
              <Empty>لا توجد إيرادات في هذه الفترة</Empty>
            ) : (
              <Breakdown items={revenueByType} total={revenue} />
            )}
          </Card>
          <Card
            title="تفصيل المصروفات حسب التصنيف"
            actions={
              <div className="no-print flex gap-2">
                <Button size="sm" variant="outline" onClick={exportExpenses}>
                  <Download /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportSectionPdf("تفصيل المصروفات", "report-expenses", ["رقم الطلب", "التاريخ", "التصنيف", "المستفيد", "المبلغ", "الحالة"], expenseDetailRows())}>
                  <FileDown /> PDF
                </Button>
              </div>
            }
          >
            {expensesByCategory.length === 0 ? (
              <Empty>لا توجد طلبات صرف في هذه الفترة</Empty>
            ) : (
              <Breakdown
                items={expensesByCategory}
                total={expensesIn.reduce((s, e) => s + Number(e.amount), 0)}
              />
            )}
          </Card>
        </div>

        <Card
          title="الحركة الشهرية"
          actions={
            <div className="no-print flex gap-2">
              <Button size="sm" variant="outline" onClick={exportMonthly}>
                <Download /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportSectionPdf("الحركة الشهرية", "report-monthly", ["الشهر", "الإيرادات", "المصروفات المصروفة"], monthly.map(([m, v]) => [m, v.revenue, v.paid]))}>
                <FileDown /> PDF
              </Button>
            </div>
          }
        >
          {monthly.length === 0 ? (
            <Empty>لا توجد حركة في هذه الفترة</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th>الشهر</th>
                    <th>الإيرادات</th>
                    <th>المصروفات المصروفة</th>
                    <th>الصافي</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map(([m, v]) => (
                    <tr key={m}>
                      <td className="font-semibold">{m}</td>
                      <td className="tabular text-success">{money(v.revenue)}</td>
                      <td className="tabular text-destructive">{money(v.paid)}</td>
                      <td className="tabular font-bold">{money(v.revenue - v.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="حالة طلبات الصرف"
            actions={
              <Button size="sm" variant="outline" className="no-print" onClick={exportExpenses}>
                <Download /> تصدير
              </Button>
            }
          >
            {expensesByStatus.length === 0 ? (
              <Empty>لا توجد طلبات</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className={tableCls}>
                  <thead>
                    <tr>
                      <th>الحالة</th>
                      <th>المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesByStatus.map((x) => (
                      <tr key={x.label}>
                        <td>{x.label}</td>
                        <td className="tabular font-bold">{money(x.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="المتأخرات على الأعضاء"
            actions={
              <div className="no-print flex gap-2">
                <Button size="sm" variant="outline" onClick={exportArrears}>
                  <Download /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportSectionPdf("المتأخرات على الأعضاء", "report-arrears", ["العضو", "المتأخرات"], arrearsByMember.map(({ member, arrears }) => [`${member.member_no ?? ""} — ${member.full_name}`, money(arrears)]))}>
                  <FileDown /> PDF
                </Button>
              </div>
            }
          >
            {arrearsByMember.length === 0 ? (
              <Empty>لا توجد متأخرات — جميع الاشتراكات مسددة</Empty>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className={tableCls}>
                  <thead>
                    <tr>
                      <th>العضو</th>
                      <th>المتأخرات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrearsByMember.map(({ member, arrears }) => (
                      <tr key={member.id}>
                        <td>
                          <span className="tabular text-muted-foreground">{member.member_no}</span>{" "}
                          <span className="font-semibold">{member.full_name}</span>
                        </td>
                        <td className="tabular font-bold text-destructive">{money(arrears)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card title="آخر السندات والحركات">
          <div className="grid gap-4 lg:grid-cols-2">
            <RecentReceipts rows={receiptsIn.slice(0, 8)} />
            <RecentExpenses rows={expensesIn.slice(0, 8)} />
          </div>
        </Card>
      </div>

      {printOpen && (
        <div className="fixed inset-0 z-[100] overflow-auto bg-muted/70 p-4 backdrop-blur-sm">
          <div className="no-print mx-auto mb-3 flex max-w-[820px] flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-2 shadow-card">
            <p className="px-2 text-sm font-semibold">
              معاينة الطباعة — يُطبع المستند الرسمي أدناه فقط، بدون فلاتر أو واجهة التطبيق
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => window.print()}>
                <Printer /> طباعة
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPrintOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
          <div className="print-area mx-auto w-fit overflow-hidden rounded-lg bg-white shadow-card">
            {reportDoc()}
          </div>
        </div>
      )}
    </div>
  );
}

function groupSum<T>(rows: T[], label: (row: T) => string, value: (row: T) => number) {
  const map = new Map<string, number>();
  for (const r of rows) map.set(label(r), (map.get(label(r)) ?? 0) + value(r));
  return [...map.entries()]
    .map(([l, v]) => ({ label: l, value: v }))
    .sort((a, b) => b.value - a.value);
}

function Breakdown({ items, total }: { items: { label: string; value: number }[]; total: number }) {
  const safe = total || 1;
  return (
    <div className="space-y-4">
      {items.map((i, idx) => (
        <div key={i.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold">{i.label}</span>
            <span className="tabular text-muted-foreground">{money(i.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${["bg-primary", "bg-gold", "bg-chart-3", "bg-chart-4", "bg-chart-5"][idx % 5]}`}
              style={{ width: `${Math.max((i.value / safe) * 100, i.value ? 2 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentReceipts({ rows }: { rows: Receipt[] }) {
  if (rows.length === 0) return <Empty>لا توجد سندات قبض</Empty>;
  return (
    <div>
      <p className="mb-2 text-sm font-bold">أحدث سندات القبض</p>
      <table className={tableCls}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="tabular text-muted-foreground">{fmtDate(r.receipt_date)}</td>
              <td>{r.donor_name ?? "—"}</td>
              <td className="tabular font-semibold">{money(r.amount)}</td>
              <td>
                <Pill tone="success">قبض</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentExpenses({ rows }: { rows: ExpenseRequest[] }) {
  if (rows.length === 0) return <Empty>لا توجد طلبات صرف</Empty>;
  return (
    <div>
      <p className="mb-2 text-sm font-bold">أحدث طلبات الصرف</p>
      <table className={tableCls}>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td className="tabular text-muted-foreground">{fmtDate(e.requested_date)}</td>
              <td>{e.beneficiary_name}</td>
              <td className="tabular font-semibold">{money(e.amount)}</td>
              <td>
                <Pill
                  tone={
                    e.status === "paid" ? "success" : e.status === "rejected" ? "danger" : "warning"
                  }
                >
                  {EXPENSE_STATUS_LABELS[e.status] ?? e.status}
                </Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
