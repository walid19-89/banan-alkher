import type { CSSProperties, ReactNode } from "react";
import { FundEmblem } from "./Brand";
import { amountInWords, money, FUND_FULL_NAME, FUND_SUBTITLE, fmtDate, fmtDateTime } from "@/lib/format";

/**
 * Print-style document components rendered off-screen for PDF export.
 * Everything uses inline styles so the output is identical in light/dark mode
 * and fully deterministic for html2canvas-pro (no react-query hooks allowed here).
 */

const C = {
  ink: "#1f2d33",
  muted: "#5b6e76",
  primary: "#0b5b4a",
  gold: "#b97f15",
  line: "#d9e2e0",
  softBg: "#eaf3ef",
  zebra: "#f6faf8",
  danger: "#b3372b",
};

const vars = { "--primary": C.primary, "--gold": C.gold, "--primary-foreground": "#ffffff" } as CSSProperties;

export function PdfDocShell({
  title,
  docNo,
  dateLabel,
  children,
  signatures = [],
}: {
  title: string;
  docNo?: string | number | null;
  dateLabel?: string;
  children: ReactNode;
  signatures?: string[];
}) {
  return (
    <div className="pdf-doc" style={{ ...vars, width: 794, minHeight: 1123, background: "#ffffff", color: C.ink, padding: "44px 48px", fontFamily: "'Cairo', sans-serif", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, borderBottom: `3px solid ${C.gold}`, paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
            <FundEmblem className="h-16 w-16" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.primary }}>{FUND_FULL_NAME}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{FUND_SUBTITLE}</div>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
          {docNo != null && <div style={{ fontSize: 12, color: C.muted }}>رقم: {docNo}</div>}
          {dateLabel && <div style={{ fontSize: 12, color: C.muted }}>{dateLabel}</div>}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>{children}</div>

      {signatures.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${signatures.length}, minmax(0, 1fr))`, gap: 24, marginTop: 56 }}>
          {signatures.map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <div style={{ borderTop: `1.5px solid ${C.ink}`, margin: "0 18px", paddingTop: 6, fontSize: 12, fontWeight: 700 }}>{s}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28, textAlign: "center", fontSize: 10, color: C.muted }}>
        أُنشئ هذا المستند آلياً بواسطة النظام المحاسبي لصندوق بنان الخير للبنيان — {new Date().toLocaleString("en-GB")}
      </div>
    </div>
  );
}

export function PdfTable({
  headers,
  rows,
  widths,
  footer,
}: {
  headers: string[];
  rows: (string | number)[][];
  widths?: string[];
  footer?: (string | number)[];
}) {
  const cell: CSSProperties = { border: `1px solid ${C.line}`, padding: "6px 9px", fontSize: 12.5, textAlign: "right", verticalAlign: "top" };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: widths ? "fixed" : "auto" }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={h + i} style={{ ...cell, background: C.softBg, fontWeight: 800, fontSize: 12, width: widths?.[i] }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} style={{ ...cell, background: i % 2 === 1 ? C.zebra : "#ffffff" }}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer && (
        <tfoot>
          <tr>
            {footer.map((c, j) => (
              <td key={j} style={{ ...cell, background: C.softBg, fontWeight: 800 }}>
                {c}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

export function PdfSectionTitle({ children }: { children: ReactNode }) {
  return <h2 style={{ margin: "22px 0 8px", fontSize: 15, fontWeight: 800, color: C.primary }}>{children}</h2>;
}

export function PdfAmountBox({ amount }: { amount: number }) {
  return (
    <div style={{ border: `2px solid ${C.gold}`, background: "#fdf6e9", borderRadius: 10, padding: "10px 14px", textAlign: "center", marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: C.muted }}>المبلغ</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{money(amount)}</div>
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{amountInWords(amount)}</div>
    </div>
  );
}

export function PdfKv({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ border: `1px solid ${C.line}`, background: "#fbfdfc", padding: "6px 10px", fontSize: 12, fontWeight: 700, color: C.muted, width: 170 }}>{k}</td>
            <td style={{ border: `1px solid ${C.line}`, padding: "6px 10px", fontSize: 12.5 }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ */
/* Concrete documents                                                  */
/* ------------------------------------------------------------------ */

export function ReceiptPdfDoc({
  receipt,
  memberName,
}: {
  receipt: {
    receipt_no: number | null;
    receipt_date: string;
    receipt_type: string;
    donor_name: string | null;
    amount: number | string;
    payment_method: string;
    is_restricted: boolean;
    restricted_purpose: string | null;
    notes: string | null;
  };
  memberName?: string | null;
}) {
  return (
    <PdfDocShell
      title="سند قبض"
      docNo={receipt.receipt_no}
      dateLabel={`التاريخ: ${fmtDate(receipt.receipt_date)}`}
      signatures={["المستلم", "أمين الصندوق", "المحاسب"]}
    >
      <PdfAmountBox amount={Number(receipt.amount)} />
      <PdfKv
        rows={[
          ["نوع الإيراد", receipt.receipt_type === "subscription" ? "اشتراك عضو" : receipt.receipt_type === "donation" ? "تبرع" : "إيراد آخر"],
          ["الدافع / المتبرع", receipt.donor_name || "—"],
          ...(memberName ? ([["العضو المرتبط", memberName]] as [string, ReactNode][]) : []),
          ["طريقة الدفع", receipt.payment_method === "bank_transfer" ? "تحويل بنكي" : "نقداً"],
          ["تبرع مقيد؟", receipt.is_restricted ? "نعم" : "لا"],
          ...(receipt.is_restricted ? ([["الغرض المقيد", receipt.restricted_purpose || "—"]] as [string, ReactNode][]) : []),
          ...(receipt.notes ? ([["ملاحظات", receipt.notes]] as [string, ReactNode][]) : []),
        ]}
      />
    </PdfDocShell>
  );
}

export function ExpenseVoucherPdfDoc({
  request,
  approvals,
}: {
  request: {
    request_no: number | null;
    requested_date: string;
    category: string;
    beneficiary_name: string;
    beneficiary_phone?: string | null;
    description: string | null;
    amount: number | string;
    status: string;
    disbursed_at: string | null;
    voucher_no: string | number | null;
  };
  approvals: { approver_name: string | null; decision: string; notes: string | null; created_at: string }[];
}) {
  const statusLabel = request.status === "paid" ? "تم الصرف" : request.status === "approved" ? "معتمد بانتظار الصرف" : request.status === "rejected" ? "مرفوض" : "بانتظار الاعتماد";
  const title = request.status === "paid" ? "سند صرف" : "طلب صرف";
  return (
    <PdfDocShell
      title={title}
      docNo={request.status === "paid" ? (request.voucher_no ?? request.request_no) : request.request_no}
      dateLabel={`تاريخ الطلب: ${fmtDate(request.requested_date)}`}
      signatures={request.status === "paid" ? ["المستلم", "أمين الصندوق", "مدير النظام"] : ["مقدم الطلب", "أمين الصندوق", "مدير النظام"]}
    >
      {request.status === "paid" && <PdfAmountBox amount={Number(request.amount)} />}
      <PdfKv
        rows={[
          ["المستفيد", request.beneficiary_name],
          ...(request.beneficiary_phone ? ([["هاتف المستفيد", request.beneficiary_phone]] as [string, ReactNode][]) : []),
          ["التصنيف", request.category],
          ["الوصف / المبررات", request.description || "—"],
          ["المبلغ", money(Number(request.amount))],
          ["الحالة", statusLabel],
          ...(request.disbursed_at ? ([["تاريخ الصرف", fmtDateTime(request.disbursed_at)]] as [string, ReactNode][]) : []),
        ]}
      />
      {approvals.length > 0 && (
        <>
          <PdfSectionTitle>سجل الاعتمادات</PdfSectionTitle>
          <PdfTable
            headers={["المعتمد", "القرار", "ملاحظات", "التاريخ"]}
            rows={approvals.map((a) => [a.approver_name ?? "—", a.decision === "approved" ? "اعتماد" : "رفض", a.notes ?? "—", fmtDateTime(a.created_at)])}
          />
        </>
      )}
    </PdfDocShell>
  );
}

export function StatementPdfDoc({
  member,
  subs,
}: {
  member: { member_no: string | number | null; full_name: string; phone: string | null; monthly_fee: number | string; joined_on: string | null; active: boolean };
  subs: { due_month: string; amount: number | string; paid_amount: number | string; status: string }[];
}) {
  const total = subs.reduce((s, x) => s + Number(x.amount), 0);
  const paid = subs.reduce((s, x) => s + Number(x.paid_amount), 0);
  const statusLabel = (s: string) => (s === "paid" ? "مسدد" : s === "partial" ? "مسدد جزئياً" : "غير مسدد");
  return (
    <PdfDocShell title="كشف حساب عضو" signatures={["العضو", "أمين الصندوق", "المحاسب"]}>
      <PdfKv
        rows={[
          ["رقم العضو", member.member_no ?? "—"],
          ["الاسم", member.full_name],
          ["الهاتف", member.phone || "—"],
          ["الاشتراك الشهري", money(Number(member.monthly_fee))],
          ["تاريخ الانضمام", fmtDate(member.joined_on)],
          ["الحالة", member.active ? "نشط" : "موقوف"],
        ]}
      />
      <PdfSectionTitle>سجل الاشتراكات</PdfSectionTitle>
      <PdfTable
        headers={["الشهر", "المستحق", "المسدد", "المتبقي", "الحالة"]}
        rows={subs.map((s) => [s.due_month.slice(0, 7), money(Number(s.amount)), money(Number(s.paid_amount)), money(Number(s.amount) - Number(s.paid_amount)), statusLabel(s.status)])}
        footer={["الإجمالي", money(total), money(paid), money(total - paid), ""]}
      />
    </PdfDocShell>
  );
}

export function MembersListPdfDoc({
  members,
}: {
  members: { member_no: string | number | null; full_name: string; phone: string | null; monthly_fee: number | string; joined_on: string | null; active: boolean; arrears: number }[];
}) {
  const totalArrears = members.reduce((s, m) => s + m.arrears, 0);
  return (
    <PdfDocShell title="كشف الأعضاء والاشتراكات" dateLabel={`التاريخ: ${fmtDate(new Date().toISOString())}`} signatures={["أمين الصندوق", "المحاسب", "مدير النظام"]}>
      <PdfTable
        headers={["رقم", "الاسم", "الهاتف", "الاشتراك الشهري", "الانضمام", "المتأخرات", "الحالة"]}
        rows={members.map((m) => [
          m.member_no ?? "—",
          m.full_name,
          m.phone || "—",
          money(Number(m.monthly_fee)),
          fmtDate(m.joined_on),
          m.arrears > 0 ? money(m.arrears) : "مسدد",
          m.active ? "نشط" : "موقوف",
        ])}
        footer={["", "الإجمالي", "", "", "", money(totalArrears), ""]}
      />
    </PdfDocShell>
  );
}

export function FinancialReportPdfDoc({
  from,
  to,
  kpis,
  summaryRevenue,
  summaryExpenses,
  revenueRows,
  expenseRows,
  monthlyRows,
  arrearsRows,
}: {
  from: string;
  to: string;
  kpis: { label: string; value: string }[];
  summaryRevenue?: [string, number][];
  summaryExpenses?: [string, number][];
  revenueRows: (string | number)[][];
  expenseRows: (string | number)[][];
  monthlyRows: (string | number)[][];
  arrearsRows: (string | number)[][];
}) {
  return (
    <PdfDocShell title="التقرير المالي" dateLabel={`الفترة: من ${fmtDate(from)} إلى ${fmtDate(to)}`} signatures={["أمين الصندوق", "المحاسب", "مدير النظام"]}>
      <PdfSectionTitle>أولاً: الملخص التنفيذي</PdfSectionTitle>
      <PdfTable headers={["البند", "القيمة"]} rows={kpis.map((k) => [k.label, k.value])} widths={["60%", "40%"]} />
      {summaryRevenue && summaryRevenue.length > 0 && (
        <>
          <PdfSectionTitle>ثانياً: توزيع الإيرادات حسب النوع</PdfSectionTitle>
          <PdfTable
            headers={["النوع", "المبلغ"]}
            rows={summaryRevenue.map(([l, v]) => [l, money(v)])}
            footer={["الإجمالي", money(summaryRevenue.reduce((s, [, v]) => s + v, 0))]}
            widths={["60%", "40%"]}
          />
        </>
      )}
      {summaryExpenses && summaryExpenses.length > 0 && (
        <>
          <PdfSectionTitle>ثالثاً: توزيع المصروفات حسب التصنيف</PdfSectionTitle>
          <PdfTable
            headers={["التصنيف", "المبلغ"]}
            rows={summaryExpenses.map(([l, v]) => [l, money(v)])}
            footer={["الإجمالي", money(summaryExpenses.reduce((s, [, v]) => s + v, 0))]}
            widths={["60%", "40%"]}
          />
        </>
      )}
      <PdfSectionTitle>رابعاً: كشف تفصيلي بالإيرادات</PdfSectionTitle>
      <PdfTable headers={["رقم السند", "التاريخ", "النوع", "الدافع", "المبلغ", "مقيد؟"]} rows={revenueRows} />
      <PdfSectionTitle>خامساً: كشف تفصيلي بالمصروفات</PdfSectionTitle>
      <PdfTable headers={["رقم الطلب", "التاريخ", "التصنيف", "المستفيد", "المبلغ", "الحالة"]} rows={expenseRows} />
      <PdfSectionTitle>سادساً: الحركة الشهرية</PdfSectionTitle>
      <PdfTable headers={["الشهر", "الإيرادات", "المصروفات المصروفة"]} rows={monthlyRows} />
      <PdfSectionTitle>سابعاً: المتأخرات حسب العضو</PdfSectionTitle>
      <PdfTable headers={["العضو", "المتأخرات"]} rows={arrearsRows} />
    </PdfDocShell>
  );
}
