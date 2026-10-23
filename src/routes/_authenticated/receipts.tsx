import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Download,
  Gift,
  Lock,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, Empty, Kpi, PageHeader, Pill, tableCls } from "@/components/fund/ui";
import { DonationDialog } from "@/components/fund/dialogs";
import { PrintDialog, PrintHeader, VoucherBody } from "@/components/fund/Voucher";
import { useMe, can } from "@/lib/fund";
import {
  exportCSV,
  fmtDate,
  money,
  METHOD_LABELS,
  RECEIPT_TYPE_LABELS,
  receiptNo,
} from "@/lib/format";
import { membersQuery, receiptsQuery, type Receipt } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/receipts")({
  head: () => ({ meta: [{ title: "سندات القبض والتبرعات | صندوق بنان الخير للبنيان" }] }),
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { data: me } = useMe();
  const { data: receipts = [], isLoading } = useQuery(receiptsQuery);
  const { data: members = [] } = useQuery(membersQuery);

  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [donationOpen, setDonationOpen] = useState(false);
  const [printing, setPrinting] = useState<Receipt | null>(null);

  const canAdd = can(me, ["admin", "accountant", "treasurer"]);

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, `${m.member_no ?? ""} — ${m.full_name}`]));
    return (id: string | null) => (id ? (map.get(id) ?? "—") : "");
  }, [members]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return receipts.filter((r) => {
      if (type !== "all" && r.receipt_type !== type) return false;
      if (from && r.receipt_date < from) return false;
      if (to && r.receipt_date > to) return false;
      if (!term) return true;
      return (
        (r.donor_name ?? "").toLowerCase().includes(term) ||
        String(r.receipt_no).includes(term) ||
        (r.restricted_purpose ?? "").toLowerCase().includes(term) ||
        (r.notes ?? "").toLowerCase().includes(term)
      );
    });
  }, [receipts, type, from, to, q]);

  const total = receipts.reduce((sum, r) => sum + Number(r.amount), 0);
  const restricted = receipts
    .filter((r) => r.is_restricted)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const donations = receipts.filter((r) => r.receipt_type !== "subscription").length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = receipts
    .filter((r) => r.receipt_date.startsWith(thisMonth))
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const filteredTotal = filtered.reduce((sum, r) => sum + Number(r.amount), 0);

  function exportList() {
    exportCSV(
      "سندات_القبض",
      [
        "رقم السند",
        "التاريخ",
        "النوع",
        "الدافع / العضو",
        "المبلغ",
        "طريقة الدفع",
        "مقيد",
        "الغرض",
        "ملاحظات",
      ],
      filtered.map((r) => [
        receiptNo(r.receipt_no),
        r.receipt_date,
        RECEIPT_TYPE_LABELS[r.receipt_type] ?? r.receipt_type,
        r.donor_name ?? memberName(r.member_id),
        Number(r.amount),
        METHOD_LABELS[r.payment_method] ?? r.payment_method,
        r.is_restricted ? "نعم" : "لا",
        r.restricted_purpose ?? "",
        r.notes ?? "",
      ]),
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="سندات القبض والتبرعات"
        desc="كل ما يدخل الصندوق: اشتراكات الأعضاء، التبرعات العامة والمقيدة"
        actions={
          <>
            {canAdd && (
              <Button onClick={() => setDonationOpen(true)}>
                <Gift /> سند تبرع / إيراد
              </Button>
            )}
            <Button variant="outline" onClick={exportList}>
              <Download /> تصدير Excel (CSV)
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="إجمالي الإيرادات المحصلة"
          value={money(total)}
          icon={TrendingUp}
          tone="success"
        />
        <Kpi label="إيرادات الشهر الحالي" value={money(monthTotal)} icon={ReceiptIcon} />
        <Kpi label="عدد التبرعات" value={String(donations)} icon={Gift} tone="gold" />
        <Kpi label="تبرعات مقيدة بغرض" value={money(restricted)} icon={Lock} tone="warning" />
      </div>

      <Card>
        <div className="mb-4 grid gap-2 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="ابحث بالاسم أو رقم السند…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={type} onValueChange={setType} dir="rtl">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="subscription">اشتراكات الأعضاء</SelectItem>
              <SelectItem value="donation">تبرعات</SelectItem>
              <SelectItem value="other">إيرادات أخرى</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              title="من تاريخ"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              title="إلى تاريخ"
            />
          </div>
        </div>

        {isLoading ? (
          <Empty>جارٍ التحميل…</Empty>
        ) : filtered.length === 0 ? (
          <Empty>لا توجد سندات مطابقة للبحث.</Empty>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                عدد السندات: <b className="text-foreground">{filtered.length}</b>
              </span>
              <span className="text-muted-foreground">
                إجمالي المعروض: <b className="tabular text-foreground">{money(filteredTotal)}</b>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th>رقم السند</th>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>الدافع</th>
                    <th>المبلغ</th>
                    <th>الطريقة</th>
                    <th>البيان</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="tabular font-bold text-primary">{receiptNo(r.receipt_no)}</td>
                      <td className="tabular">{fmtDate(r.receipt_date)}</td>
                      <td>
                        <Pill tone={r.receipt_type === "subscription" ? "primary" : "gold"}>
                          {RECEIPT_TYPE_LABELS[r.receipt_type] ?? r.receipt_type}
                        </Pill>
                      </td>
                      <td className="font-semibold">
                        {r.donor_name || memberName(r.member_id) || "—"}
                      </td>
                      <td className="tabular font-bold">{money(r.amount)}</td>
                      <td className="text-xs">
                        {METHOD_LABELS[r.payment_method] ?? r.payment_method}
                      </td>
                      <td className="max-w-[220px] text-xs text-muted-foreground">
                        {r.is_restricted && (
                          <Lock className="mb-0.5 me-1 inline h-3 w-3 text-gold" />
                        )}
                        {r.restricted_purpose || r.notes || "—"}
                      </td>
                      <td>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="طباعة السند"
                          onClick={() => setPrinting(r)}
                        >
                          <Printer />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <DonationDialog open={donationOpen} onOpenChange={setDonationOpen} />

      <PrintDialog open={!!printing} onOpenChange={(o) => !o && setPrinting(null)} title="سند قبض">
        {printing && (
          <div className="space-y-2">
            <PrintHeader
              title="سند قبض"
              sub={`رقم ${receiptNo(printing.receipt_no)} — ${fmtDate(printing.receipt_date)}`}
            />
            <VoucherBody
              amount={Number(printing.amount)}
              rows={[
                [
                  "نوع الإيراد",
                  RECEIPT_TYPE_LABELS[printing.receipt_type] ?? printing.receipt_type,
                ],
                ["الدافع", printing.donor_name || memberName(printing.member_id) || "—"],
                ["طريقة الدفع", METHOD_LABELS[printing.payment_method] ?? printing.payment_method],
                [
                  "مقيد بغرض",
                  printing.is_restricted ? printing.restricted_purpose || "نعم" : "غير مقيد",
                ],
                ["ملاحظات", printing.notes || "—"],
              ]}
              signatures={["المستلم", "المحاسب", "أمين الصندوق"]}
            />
          </div>
        )}
      </PrintDialog>
    </div>
  );
}
