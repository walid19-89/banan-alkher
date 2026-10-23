import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Download,
  FileDown,
  HandCoins,
  Pencil,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, Empty, Kpi, PageHeader, Pill, tableCls, type Tone } from "@/components/fund/ui";
import { ExpenseRequestDialog } from "@/components/fund/dialogs";
import { PrintDialog, PrintHeader, VoucherBody } from "@/components/fund/Voucher";
import { ExpenseVoucherPdfDoc } from "@/components/fund/PdfDocs";
import { exportNodeToPdf } from "@/lib/pdf";
import { explainWriteError, PolicyHelpDialog } from "@/components/fund/PolicyHelp";
import { useMe, can, errMsg } from "@/lib/fund";
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
  CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  exportCSV,
  fmtDate,
  fmtDateTime,
  money,
  requestNo,
} from "@/lib/format";
import {
  approvalsQuery,
  expensesQuery,
  useInvalidateFund,
  type ExpenseRequest,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "طلبات الصرف والاعتمادات | صندوق بنان الخير للبنيان" }] }),
  component: ExpensesPage,
});

const STATUS_TONE: Record<string, Tone> = {
  pending: "warning",
  approved: "primary",
  rejected: "danger",
  paid: "success",
};

function ExpensesPage() {
  const { data: me } = useMe();
  const { data: requests = [], isLoading } = useQuery(expensesQuery);
  const { data: approvals = [] } = useQuery(approvalsQuery);
  const inv = useInvalidateFund();

  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRequest | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRequest | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fund_expense_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الطلب المعلق");
      inv();
      setDeleting(null);
    },
    onError: (e) => explainWriteError(e, () => setHelpOpen(true)),
  });

  async function rowPdf(r: ExpenseRequest) {
    try {
      await exportNodeToPdf(
        <ExpenseVoucherPdfDoc
          request={{ ...r, voucher_no: r.payment_voucher_no }}
          approvals={approvals.filter((a) => a.request_id === r.id)}
        />,
        `expense-${r.request_no ?? r.id}`,
      );
      toast.success("تم إنشاء ملف PDF");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إنشاء PDF");
    }
  }
  const [selected, setSelected] = useState<ExpenseRequest | null>(null);
  const [printing, setPrinting] = useState<ExpenseRequest | null>(null);

  const canApprove = can(me, ["admin", "treasurer", "board_member"]);
  const canPay = can(me, ["admin", "treasurer"]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return requests.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!term) return true;
      return (
        r.beneficiary_name.toLowerCase().includes(term) ||
        (r.description ?? "").toLowerCase().includes(term) ||
        String(r.request_no).includes(term)
      );
    });
  }, [requests, tab, q]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      paid: requests.filter((r) => r.status === "paid").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests],
  );

  const paidTotal = requests
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const approvedTotal = requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const pendingTotal = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const decide = useMutation({
    mutationFn: async ({
      id,
      decision,
      notes,
    }: {
      id: string;
      decision: "approved" | "rejected";
      notes: string | undefined;
    }) => {
      const { error } = await supabase.rpc("fund_decide_expense", {
        p_request_id: id,
        p_decision: decision,
        ...(notes ? { p_notes: notes } : {}),
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.decision === "approved" ? "تم تسجيل اعتمادك على الطلب" : "تم رفض الطلب");
      inv();
      setSelected(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const disburse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("fund_disburse_expense", { p_request_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم صرف المبلغ وإصدار سند الصرف");
      inv();
      setSelected(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  function exportList() {
    exportCSV(
      "طلبات_الصرف",
      [
        "رقم الطلب",
        "التاريخ",
        "التصنيف",
        "المستفيد",
        "الهاتف",
        "المبلغ",
        "الاعتمادات",
        "الحالة",
        "الوصف",
        "رقم سند الصرف",
      ],
      filtered.map((r) => [
        requestNo(r.request_no),
        r.requested_date,
        CATEGORY_LABELS[r.category] ?? r.category,
        r.beneficiary_name,
        r.beneficiary_phone ?? "",
        Number(r.amount),
        `${r.approval_count}/2`,
        EXPENSE_STATUS_LABELS[r.status] ?? r.status,
        r.description,
        r.payment_voucher_no ?? "",
      ]),
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="طلبات الصرف والاعتمادات"
        desc="كل طلب يمر باعتماد مزدوج قبل الصرف، حمايةً لأموال الصندوق"
        actions={
          <>
            <Button onClick={() => setCreateOpen(true)}>
              <HandCoins /> طلب صرف جديد
            </Button>
            <Button variant="outline" onClick={exportList}>
              <Download /> تصدير Excel (CSV)
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="طلبات بانتظار الاعتماد"
          value={String(counts.pending)}
          icon={Clock}
          tone="warning"
          hint={money(pendingTotal)}
        />
        <Kpi
          label="معتمد بانتظار الصرف"
          value={String(counts.approved)}
          icon={ShieldCheck}
          tone="primary"
          hint={money(approvedTotal)}
        />
        <Kpi
          label="تم صرفها"
          value={String(counts.paid)}
          icon={Wallet}
          tone="success"
          hint={money(paidTotal)}
        />
        <Kpi label="مرفوضة" value={String(counts.rejected)} icon={X} tone="danger" />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Tabs value={tab} onValueChange={setTab} dir="rtl">
            <TabsList className="flex-wrap">
              <TabsTrigger value="pending">المعلقة ({counts.pending})</TabsTrigger>
              <TabsTrigger value="approved">معتمدة ({counts.approved})</TabsTrigger>
              <TabsTrigger value="paid">مصروفة ({counts.paid})</TabsTrigger>
              <TabsTrigger value="rejected">مرفوضة ({counts.rejected})</TabsTrigger>
              <TabsTrigger value="all">الكل ({counts.all})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative min-w-[220px] flex-1 md:max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="ابحث بالمستفيد أو رقم الطلب…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <Empty>جارٍ التحميل…</Empty>
        ) : filtered.length === 0 ? (
          <Empty>لا توجد طلبات في هذه القائمة.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>التاريخ</th>
                  <th>التصنيف</th>
                  <th>المستفيد</th>
                  <th>المبلغ</th>
                  <th>الاعتماد</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="tabular font-bold text-primary">{requestNo(r.request_no)}</td>
                    <td className="tabular">{fmtDate(r.requested_date)}</td>
                    <td>{CATEGORY_LABELS[r.category] ?? r.category}</td>
                    <td className="font-semibold">{r.beneficiary_name}</td>
                    <td className="tabular font-bold">{money(r.amount)}</td>
                    <td className="tabular text-xs">
                      {r.status === "rejected" ? "—" : `${r.approval_count} / 2`}
                    </td>
                    <td>
                      <Pill tone={STATUS_TONE[r.status] ?? "muted"}>
                        {EXPENSE_STATUS_LABELS[r.status] ?? r.status}
                      </Pill>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="soft" onClick={() => setSelected(r)}>
                          التفاصيل
                        </Button>
                        {(r.status === "paid" || r.status === "approved") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="طباعة سند الصرف"
                            onClick={() => setPrinting(r)}
                          >
                            <Printer />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="تصدير PDF"
                          onClick={() => void rowPdf(r)}
                        >
                          <FileDown />
                        </Button>
                        {r.status === "pending" &&
                          (can(me, ["admin"]) || r.created_by === me?.user_id) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="تعديل الطلب المعلق"
                              onClick={() => setEditing(r)}
                            >
                              <Pencil />
                            </Button>
                          )}
                        {r.status === "pending" && can(me, ["admin"]) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="حذف الطلب المعلق"
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
        )}
      </Card>

      <ExpenseRequestDialog
        key={editing?.id ?? "new"}
        open={createOpen || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        initial={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الطلب المعلق؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف طلب الصرف {deleting ? requestNo(deleting.request_no) : ""} الخاص بـ
              «{deleting?.beneficiary_name}» بمبلغ {deleting ? money(deleting.amount) : ""}. لا يمكن
              التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id)}>
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PolicyHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>طلب صرف {selected ? requestNo(selected.request_no) : ""}</DialogTitle>
          </DialogHeader>
          {selected && (
            <RequestDetails
              request={selected}
              approvals={approvals.filter((a) => a.request_id === selected.id)}
              myUserId={me?.user_id ?? ""}
              canApprove={canApprove}
              canPay={canPay}
              busy={decide.isPending || disburse.isPending}
              onDecide={(decision, notes) => decide.mutate({ id: selected.id, decision, notes })}
              onDisburse={() => disburse.mutate(selected.id)}
              onPrint={() => setPrinting(selected)}
              onEdit={() => {
                setSelected(null);
                setEditing(selected);
              }}
              onDelete={() => {
                setSelected(null);
                setDeleting(selected);
              }}
              canEdit={selected.status === "pending" && (can(me, ["admin"]) || selected.created_by === me?.user_id)}
              canDelete={selected.status === "pending" && can(me, ["admin"])}
              onPdf={async () => {
                if (!selected) return;
                try {
                  await exportNodeToPdf(
                    <ExpenseVoucherPdfDoc
                      request={{ ...selected, voucher_no: selected.payment_voucher_no }}
                      approvals={approvals.filter((a) => a.request_id === selected.id)}
                    />,
                    `expense-${selected.request_no ?? selected.id}`,
                  );
                  toast.success("تم إنشاء ملف PDF");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "تعذر إنشاء PDF");
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <PrintDialog open={!!printing} onOpenChange={(o) => !o && setPrinting(null)} title="سند صرف">
        {printing && (
          <div className="space-y-2">
            <PrintHeader
              title="سند صرف"
              sub={`طلب ${requestNo(printing.request_no)}${printing.payment_voucher_no ? ` — قيد ${printing.payment_voucher_no}` : ""}`}
            />
            <VoucherBody
              amount={Number(printing.amount)}
              rows={[
                ["المستفيد", printing.beneficiary_name],
                ["الهاتف", printing.beneficiary_phone || "—"],
                ["التصنيف", CATEGORY_LABELS[printing.category] ?? printing.category],
                ["الوصف", printing.description],
                ["تاريخ الطلب", fmtDate(printing.requested_date)],
                ["تاريخ الصرف", printing.disbursed_at ? fmtDateTime(printing.disbursed_at) : "—"],
                ["الحالة", EXPENSE_STATUS_LABELS[printing.status] ?? printing.status],
              ]}
              signatures={["المستلم", "أمين الصندوق", "المدير"]}
            />
          </div>
        )}
      </PrintDialog>
    </div>
  );
}

function RequestDetails({
  request,
  approvals,
  myUserId,
  canApprove,
  canPay,
  busy,
  onDecide,
  onDisburse,
  onPrint,
  onEdit,
  onDelete,
  onPdf,
  canEdit,
  canDelete,
}: {
  request: ExpenseRequest;
  approvals: {
    approver_id: string;
    approver_name: string;
    approver_role: string;
    decision: string;
    notes: string | null;
    created_at: string;
  }[];
  myUserId: string;
  canApprove: boolean;
  canPay: boolean;
  busy: boolean;
  onDecide: (decision: "approved" | "rejected", notes?: string) => void;
  onDisburse: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPdf: () => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [notes, setNotes] = useState("");
  const already = approvals.some((a) => a.approver_id === myUserId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="المستفيد" value={request.beneficiary_name} />
        <Info label="المبلغ" value={money(request.amount)} />
        <Info label="التصنيف" value={CATEGORY_LABELS[request.category] ?? request.category} />
        <Info label="الحالة" value={EXPENSE_STATUS_LABELS[request.status] ?? request.status} />
        <Info label="الهاتف" value={request.beneficiary_phone || "—"} />
        <Info
          label="عدد الاعتمادات"
          value={request.status === "rejected" ? "—" : `${request.approval_count} من 2`}
        />
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        <p className="mb-1 text-xs font-bold text-muted-foreground">الوصف / المبررات</p>
        <p>{request.description}</p>
        {request.notes && (
          <p className="mt-2 text-xs text-muted-foreground">ملاحظات: {request.notes}</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">سجل الاعتمادات</p>
        {approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا يوجد قرارات بعد.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {approvals.map((a, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <span className="font-semibold">{a.approver_name}</span>
                <span className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</span>
                <Pill tone={a.decision === "approved" ? "success" : "danger"}>
                  {a.decision === "approved" ? "اعتمد" : "رفض"}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canApprove && request.status === "pending" && !already && (
        <div className="space-y-2 rounded-lg border-2 border-gold-soft bg-gold-soft/40 p-3">
          <p className="text-sm font-bold">قرارك على هذا الطلب</p>
          <Textarea
            rows={2}
            placeholder="ملاحظات الاعتماد (اختياري)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => onDecide("approved", notes || undefined)}>
              <Check /> اعتماد الطلب
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => onDecide("rejected", notes || undefined)}
            >
              <X /> رفض الطلب
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            يتطلب الصرف اعتماد شخصين مختلفين، ولا يمكنك اعتماد طلب قمت بإنشائه.
          </p>
        </div>
      )}

      {canApprove && request.status === "pending" && already && (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          سبق لك إبداء قرار على هذا الطلب.
        </p>
      )}

      {canPay && request.status === "approved" && request.approval_count >= 2 && (
        <Button className="w-full" disabled={busy} onClick={onDisburse}>
          <Wallet /> صرف المبلغ وإصدار سند الصرف
        </Button>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onPrint}>
          <Printer /> طباعة السند
        </Button>
        <Button variant="outline" onClick={() => void onPdf()}>
          <FileDown /> تصدير PDF
        </Button>
        {canEdit && (
          <Button variant="outline" onClick={onEdit}>
            <Pencil /> تعديل الطلب
          </Button>
        )}
        {canDelete && (
          <Button variant="outline" className="text-destructive" onClick={onDelete}>
            <Trash2 /> حذف الطلب
          </Button>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
