import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Wallet,
  AlertTriangle,
  Plus,
  CalendarPlus,
  Download,
  Pencil,
  Trash2,
  CreditCard,
  Search,
  FileText,
  MessageCircle,
  FileDown,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Card, Empty, Kpi, PageHeader, Pill, tableCls } from "@/components/fund/ui";
import { MemberDialog } from "@/components/fund/MemberDialog";
import { GenerateDuesDialog, PaySubscriptionDialog } from "@/components/fund/dialogs";
import { settingsQuery, useMe, can } from "@/lib/fund";
import { exportCSV, fmtDate, fmtMonth, money, whatsappLink, FUND_NAME, SUB_STATUS_LABELS } from "@/lib/format";
import { exportNodeToPdf } from "@/lib/pdf";
import { StatementPdfDoc, MembersListPdfDoc } from "@/components/fund/PdfDocs";
import { ImportMembersDialog } from "@/components/fund/ImportMembersDialog";
import {
  memberArrears,
  membersQuery,
  subscriptionsQuery,
  useInvalidateFund,
  type Member,
  type Subscription,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "الأعضاء والاشتراكات | صندوق بنان الخير للبنيان" }] }),
  component: MembersPage,
});

function MembersPage() {
  const { data: me } = useMe();
  const { data: members = [], isLoading } = useQuery(membersQuery);
  const { data: subs = [] } = useQuery(subscriptionsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const inv = useInvalidateFund();

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [payFor, setPayFor] = useState<Member | null>(null);
  const [duesOpen, setDuesOpen] = useState(false);
  const [details, setDetails] = useState<Member | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);

  const canWrite = can(me, ["admin", "accountant"]);
  const canPay = can(me, ["admin", "accountant", "treasurer"]);
  const canDues = can(me, ["admin", "accountant"]);
  const isAdmin = can(me, ["admin"]);

  const filtered = useMemo(() => {
    const term = q.trim();
    return members.filter((m) => {
      if (onlyActive && !m.active) return false;
      if (!term) return true;
      return (
        m.full_name.includes(term) ||
        (m.member_no ?? "").toLowerCase().includes(term.toLowerCase()) ||
        (m.phone ?? "").includes(term)
      );
    });
  }, [members, q, onlyActive]);

  const activeCount = members.filter((m) => m.active).length;
  const monthlyExpected = members
    .filter((m) => m.active)
    .reduce((sum, m) => sum + Number(m.monthly_fee), 0);
  const totalArrears = subs.reduce((sum, s) => sum + (Number(s.amount) - Number(s.paid_amount)), 0);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fund_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف العضو");
      inv();
      setToDelete(null);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "تعذر حذف العضو (قد يكون مرتبطاً بحساب مستخدم)"),
  });

  function exportList() {
    exportCSV(
      "الأعضاء",
      ["رقم العضو", "الاسم", "الهاتف", "الاشتراك الشهري", "تاريخ الانضمام", "الحالة", "المتأخرات"],
      filtered.map((m) => [
        m.member_no ?? "",
        m.full_name,
        m.phone ?? "",
        Number(m.monthly_fee),
        m.joined_on,
        m.active ? "نشط" : "موقوف",
        memberArrears(subs, m.id),
      ]),
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الأعضاء والاشتراكات"
        desc="سجل الأعضاء، اشتراكاتهم الشهرية، وحالة السداد"
        actions={
          <>
            {canWrite && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus /> عضو جديد
              </Button>
            )}
            {canDues && (
              <Button variant="soft" onClick={() => setDuesOpen(true)}>
                <CalendarPlus /> توليد استحقاقات الشهر
              </Button>
            )}
            <Button variant="outline" onClick={exportList}>
              <Download /> تصدير Excel (CSV)
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload /> استيراد من Excel
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await exportNodeToPdf(
                    <MembersListPdfDoc
                      members={members.map((m) => ({ ...m, arrears: memberArrears(subs, m.id) }))}
                    />,
                    `members-list-${new Date().toISOString().slice(0, 10)}`,
                  );
                  toast.success("تم إنشاء ملف PDF");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "تعذر إنشاء PDF");
                }
              }}
            >
              <FileDown /> كشف PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="إجمالي الأعضاء" value={String(members.length)} icon={Users} />
        <Kpi label="الأعضاء النشطون" value={String(activeCount)} icon={Users} tone="success" />
        <Kpi
          label="الاشتراك الشهري المتوقع"
          value={money(monthlyExpected)}
          icon={Wallet}
          tone="gold"
          hint="مجموع اشتراكات الأعضاء النشطين"
        />
        <Kpi
          label="إجمالي المتأخرات"
          value={money(totalArrears)}
          icon={AlertTriangle}
          tone="danger"
          hint="مستحقات غير محصلة"
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="ابحث بالاسم أو رقم العضو أو الهاتف…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button
            variant={onlyActive ? "gold" : "outline"}
            onClick={() => setOnlyActive((v) => !v)}
          >
            النشطون فقط
          </Button>
        </div>

        {isLoading ? (
          <Empty>جارٍ التحميل…</Empty>
        ) : filtered.length === 0 ? (
          <Empty>لا يوجد أعضاء مطابقون. أضف عضوًا جديدًا للبدء.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>الاشتراك</th>
                  <th>الانضمام</th>
                  <th>المتأخرات</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const arrears = memberArrears(subs, m.id);
                  return (
                    <tr key={m.id}>
                      <td className="tabular text-muted-foreground">{m.member_no ?? "—"}</td>
                      <td className="font-semibold">{m.full_name}</td>
                      <td className="tabular" dir="ltr">
                        {m.phone ? (
                          <div className="flex items-center gap-1">
                            <a href={`tel:${m.phone}`} className="hover:underline" title="اتصال">{m.phone}</a>
                            {(() => {
                              const wa = whatsappLink(
                                m.phone,
                                m.full_name,
                                arrears > 0
                                  ? `نود تذكيركم بوجود متأخرات اشتراكات بمبلغ ${money(arrears)} على حسابكم في ${FUND_NAME}. نتمنى المباشرة بالسداد، وشكراً تعاونكم.`
                                  : undefined,
                              );
                              return wa ? (
                                <a
                                  href={wa}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="مراسلة واتساب"
                                  className="inline-flex rounded-full p-1 text-success hover:bg-success-soft"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="tabular">{money(m.monthly_fee)}</td>
                      <td className="tabular">{fmtDate(m.joined_on)}</td>
                      <td className="tabular">
                        {arrears > 0 ? (
                          <span className="font-bold text-destructive">{money(arrears)}</span>
                        ) : (
                          <span className="text-success">مسدد</span>
                        )}
                      </td>
                      <td>
                        <Pill tone={m.active ? "success" : "muted"}>
                          {m.active ? "نشط" : "موقوف"}
                        </Pill>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="كشف الاشتراكات"
                            onClick={() => setDetails(m)}
                          >
                            <FileText />
                          </Button>
                          {canPay && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="تسجيل سداد"
                              onClick={() => setPayFor(m)}
                            >
                              <CreditCard />
                            </Button>
                          )}
                          {canWrite && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="تعديل"
                              onClick={() => {
                                setEditing(m);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="حذف"
                              onClick={() => setToDelete(m)}
                            >
                              <Trash2 className="text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ImportMembersDialog open={importOpen} onOpenChange={setImportOpen} defaultFee={Number(settings?.default_monthly_fee ?? 1000)} />
      <MemberDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editing}
        defaultFee={Number(settings?.default_monthly_fee ?? 1000)}
      />
      <GenerateDuesDialog open={duesOpen} onOpenChange={setDuesOpen} />
      <PaySubscriptionDialog
        open={!!payFor}
        onOpenChange={(o) => !o && setPayFor(null)}
        memberId={payFor?.id ?? ""}
      />

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>اشتراكات العضو: {details?.full_name}</DialogTitle>
          </DialogHeader>
          <MemberSubscriptions memberId={details?.id ?? ""} subs={subs} />
          {details && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const rows = subs
                    .filter((x) => x.member_id === details.id)
                    .sort((a, b) => a.due_month.localeCompare(b.due_month));
                  exportCSV(
                    `statement-${details.member_no ?? details.id}`,
                    ["الشهر", "المستحق", "المسدد", "الحالة"],
                    rows.map((x) => [x.due_month.slice(0, 7), Number(x.amount), Number(x.paid_amount), SUB_STATUS_LABELS[x.status] ?? x.status]),
                  );
                }}
              >
                <FileSpreadsheet /> تصدير Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await exportNodeToPdf(
                      <StatementPdfDoc
                        member={details}
                        subs={subs.filter((x) => x.member_id === details.id).sort((a, b) => a.due_month.localeCompare(b.due_month))}
                      />,
                      `statement-${details.member_no ?? details.id}`,
                    );
                    toast.success("تم إنشاء ملف PDF");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "تعذر إنشاء PDF");
                  }
                }}
              >
                <FileDown /> تصدير PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العضو؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{toDelete?.full_name}» وكل اشتراكاته نهائيًا. لا يمكن التراجع عن هذا
              الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)}>
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MemberSubscriptions({ memberId, subs }: { memberId: string; subs: Subscription[] }) {
  const rows = memberId ? subs.filter((s) => s.member_id === memberId) : [];
  const total = rows.reduce((sum, s) => sum + Number(s.amount), 0);
  const paid = rows.reduce((sum, s) => sum + Number(s.paid_amount), 0);

  if (!memberId) return null;
  if (rows.length === 0)
    return <Empty>لا توجد استحقاقات مسجلة لهذا العضو. استخدم «توليد استحقاقات الشهر».</Empty>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted p-2">
          <p className="text-[11px] text-muted-foreground">إجمالي المستحق</p>
          <p className="tabular font-bold">{money(total)}</p>
        </div>
        <div className="rounded-lg bg-success-soft p-2">
          <p className="text-[11px] text-muted-foreground">المسدد</p>
          <p className="tabular font-bold text-success">{money(paid)}</p>
        </div>
        <div className="rounded-lg bg-danger-soft p-2">
          <p className="text-[11px] text-muted-foreground">المتبقي</p>
          <p className="tabular font-bold text-destructive">{money(total - paid)}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th>الشهر</th>
              <th>المستحق</th>
              <th>المسدد</th>
              <th>المتبقي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="tabular">{fmtMonth(s.due_month)}</td>
                <td className="tabular">{money(s.amount)}</td>
                <td className="tabular">{money(s.paid_amount)}</td>
                <td className="tabular">{money(Number(s.amount) - Number(s.paid_amount))}</td>
                <td>
                  <Pill
                    tone={
                      s.status === "paid"
                        ? "success"
                        : s.status === "partial"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {SUB_STATUS_LABELS[s.status]}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
