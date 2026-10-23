import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  FileDown,
  Gift,
  Lock,
  Pencil,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  Trash2,
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
import { Card, Empty, Field, Kpi, PageHeader, Pill, tableCls } from "@/components/fund/ui";
import { DonationDialog } from "@/components/fund/dialogs";
import { PrintDialog, PrintHeader, VoucherBody } from "@/components/fund/Voucher";
import { ReceiptPdfDoc } from "@/components/fund/PdfDocs";
import { exportNodeToPdf } from "@/lib/pdf";
import { useMe, can } from "@/lib/fund";
import { explainWriteError, PolicyHelpDialog } from "@/components/fund/PolicyHelp";
import { useInvalidateFund } from "@/lib/queries";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  exportCSV,
  fmtDate,
  money,
  METHOD_LABELS,
  RECEIPT_TYPE_LABELS,
  receiptNo,
} from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
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
  const [editing, setEditing] = useState<Receipt | null>(null);
  const [deleting, setDeleting] = useState<Receipt | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const inv = useInvalidateFund();

  const canAdd = can(me, ["admin", "accountant", "treasurer"]);
  const canManage = can(me, ["admin", "accountant"]);

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
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="طباعة السند"
                            onClick={() => setPrinting(r)}
                          >
                            <Printer />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="تصدير PDF"
                            onClick={async () => {
                              try {
                                await exportNodeToPdf(
                                  <ReceiptPdfDoc receipt={r} memberName={memberName(r.member_id)} />,
                                  `receipt-${r.receipt_no ?? r.id}`,
                                );
                                toast.success("تم إنشاء ملف PDF");
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "تعذر إنشاء PDF");
                              }
                            }}
                          >
                            <FileDown />
                          </Button>
                          {canManage && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title={
                                r.receipt_type === "subscription"
                                  ? "سندات الاشتراكات تُعدَّل من شاشة السداد — غير قابلة للتعديل اليدوي"
                                  : "تعديل السند"
                              }
                              disabled={r.receipt_type === "subscription"}
                              onClick={() => setEditing(r)}
                            >
                              <Pencil />
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title={
                                r.receipt_type === "subscription"
                                  ? "سندات الاشتراكات تُحذف عبر حذف السداد من كشف العضو — غير قابلة للحذف اليدوي"
                                  : "حذف السند"
                              }
                              disabled={r.receipt_type === "subscription"}
                              onClick={() => setDeleting(r)}
                            >
                              <Trash2 className="text-destructive" />
                            </Button>
                          )}
                        </div>
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
      <ReceiptEditDialog
        receipt={editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onHelp={() => setHelpOpen(true)}
        onSaved={() => {
          inv();
          setEditing(null);
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف سند القبض؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف السند رقم {deleting ? receiptNo(deleting.receipt_no) : ""} بمبلغ{" "}
              {deleting ? money(deleting.amount) : ""} نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try {
                  const { error } = await supabase.from("fund_receipts").delete().eq("id", deleting.id);
                  if (error) throw error;
                  toast.success("تم حذف السند");
                  inv();
                } catch (e) {
                  explainWriteError(e, () => setHelpOpen(true));
                } finally {
                  setDeleting(null);
                }
              }}
            >
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PolicyHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

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


function ReceiptEditDialog({
  receipt,
  onOpenChange,
  onSaved,
  onHelp,
}: {
  receipt: Receipt | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  onHelp: () => void;
}) {
  const [f, setF] = useState({
    donor_name: "",
    amount: "",
    payment_method: "cash",
    receipt_date: "",
    is_restricted: false,
    restricted_purpose: "",
    notes: "",
  });

  useEffect(() => {
    if (receipt) {
      setF({
        donor_name: receipt.donor_name ?? "",
        amount: String(receipt.amount ?? ""),
        payment_method: receipt.payment_method ?? "cash",
        receipt_date: (receipt.receipt_date ?? "").slice(0, 10),
        is_restricted: receipt.is_restricted ?? false,
        restricted_purpose: receipt.restricted_purpose ?? "",
        notes: receipt.notes ?? "",
      });
    }
  }, [receipt]);

  const m = useMutation({
    mutationFn: async () => {
      if (!receipt) return;
      const { error } = await supabase
        .from("fund_receipts")
        .update({
          donor_name: f.donor_name,
          amount: Number(f.amount),
          payment_method: f.payment_method,
          receipt_date: f.receipt_date,
          is_restricted: f.is_restricted,
          restricted_purpose: f.is_restricted ? f.restricted_purpose : null,
          notes: f.notes || null,
        })
        .eq("id", receipt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ التعديلات");
      onSaved();
    },
    onError: (e) => explainWriteError(e, onHelp),
  });

  return (
    <Dialog open={!!receipt} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>
            تعديل سند قبض {receipt ? receiptNo(receipt.receipt_no) : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="المبلغ (ر.ي)">
              <Input
                type="number"
                min={1}
                value={f.amount}
                onChange={(e) => setF({ ...f, amount: e.target.value })}
              />
            </Field>
            <Field label="التاريخ">
              <Input
                type="date"
                value={f.receipt_date}
                onChange={(e) => setF({ ...f, receipt_date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="اسم الدافع / المتبرع">
            <Input value={f.donor_name} onChange={(e) => setF({ ...f, donor_name: e.target.value })} />
          </Field>
          <Field label="طريقة الدفع">
            <Select value={f.payment_method} onValueChange={(v) => setF({ ...f, payment_method: v })} dir="rtl">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقداً</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm font-semibold">
            تبرع مقيد بغرض محدد
            <Switch checked={f.is_restricted} onCheckedChange={(v) => setF({ ...f, is_restricted: v })} />
          </label>
          {f.is_restricted && (
            <Field label="الغرض المقيد">
              <Input value={f.restricted_purpose} onChange={(e) => setF({ ...f, restricted_purpose: e.target.value })} />
            </Field>
          )}
          <Field label="ملاحظات">
            <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field>
          <p className="text-xs text-muted-foreground">
            سندات الاشتراكات لا تُعدَّل يدوياً لحماية تطابقها مع كشوف السداد — عدّل عبر تسجيل السداد.
          </p>
        </div>
        <DialogFooter>
          <Button
            disabled={m.isPending || !(Number(f.amount) > 0) || !f.donor_name || !f.receipt_date}
            onClick={() => m.mutate()}
          >
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
