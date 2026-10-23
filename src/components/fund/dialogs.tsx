import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./ui";
import { CATEGORY_LABELS, fmtMonth, money, todayISO } from "@/lib/format";
import { errMsg, uploadDoc } from "@/lib/fund";

type DProps = { open: boolean; onOpenChange: (o: boolean) => void };

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    ["summary", "members", "subs", "receipts", "expenses", "approvals", "audit"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
}

export function GenerateDuesDialog({ open, onOpenChange }: DProps) {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const inv = useInvalidateAll();
  const m = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("fund_generate_monthly_dues", { p_month: `${month}-01` });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(n ? `تم توليد ${n} استحقاق لشهر ${month}` : "جميع الأعضاء النشطين لديهم استحقاق لهذا الشهر مسبقاً");
      inv();
      onOpenChange(false);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>توليد استحقاقات الشهر</DialogTitle></DialogHeader>
        <Field label="الشهر"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        <p className="text-xs text-muted-foreground">سيتم إنشاء استحقاق لكل عضو نشط بقيمة اشتراكه الشهري، مع تجاوز من لديه استحقاق لنفس الشهر.</p>
        <DialogFooter><Button disabled={m.isPending || !month} onClick={() => m.mutate()}>توليد</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaySubscriptionDialog({ open, onOpenChange, memberId }: DProps & { memberId?: string }) {
  const inv = useInvalidateAll();
  const [member, setMember] = useState(memberId ?? "");
  const [subId, setSubId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(todayISO());
  useEffect(() => { if (open) { setMember(memberId ?? ""); setSubId(""); setAmount(""); } }, [open, memberId]);

  const members = useQuery({
    queryKey: ["members", "active-list"],
    enabled: open,
    queryFn: async () => (await supabase.from("fund_members").select("id, full_name, member_no").order("member_no")).data ?? [],
  });
  const subs = useQuery({
    queryKey: ["subs", "open", member],
    enabled: open && !!member,
    queryFn: async () =>
      (await supabase.from("fund_subscriptions").select("*").eq("member_id", member).neq("status", "paid").order("due_month")).data ?? [],
  });
  const sel = useMemo(() => subs.data?.find((s) => s.id === subId), [subs.data, subId]);
  const remaining = sel ? Number(sel.amount) - Number(sel.paid_amount) : 0;

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fund_pay_subscription", { p_subscription_id: subId, p_amount: Number(amount), p_method: method, p_date: date });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم تسجيل السداد وإصدار سند القبض"); inv(); onOpenChange(false); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تسجيل سداد اشتراك (كلي أو جزئي)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="العضو">
            <Select value={member} onValueChange={(v) => { setMember(v); setSubId(""); }} dir="rtl">
              <SelectTrigger><SelectValue placeholder="اختر العضو" /></SelectTrigger>
              <SelectContent>{members.data?.map((x) => <SelectItem key={x.id} value={x.id}>{x.member_no} — {x.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="الاستحقاق">
            <Select value={subId} onValueChange={(v) => { setSubId(v); const s = subs.data?.find((x) => x.id === v); if (s) setAmount(String(Number(s.amount) - Number(s.paid_amount))); }} dir="rtl">
              <SelectTrigger><SelectValue placeholder={member && subs.data?.length === 0 ? "لا توجد استحقاقات مفتوحة" : "اختر الشهر"} /></SelectTrigger>
              <SelectContent>{subs.data?.map((s) => <SelectItem key={s.id} value={s.id}>{fmtMonth(s.due_month)} — المتبقي {money(Number(s.amount) - Number(s.paid_amount))}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`المبلغ${sel ? ` (الحد ${money(remaining)})` : ""}`}><Input type="number" min={1} max={remaining || undefined} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="التاريخ"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <MethodSelect value={method} onChange={setMethod} />
        </div>
        <DialogFooter><Button disabled={m.isPending || !subId || !(Number(amount) > 0)} onClick={() => m.mutate()}>حفظ وإصدار سند قبض</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MethodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="طريقة الدفع">
      <Select value={value} onValueChange={onChange} dir="rtl">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="cash">نقداً</SelectItem>
          <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function DonationDialog({ open, onOpenChange }: DProps) {
  const inv = useInvalidateAll();
  const [f, setF] = useState({ type: "donation", donor: "", amount: "", method: "cash", restricted: false, purpose: "", date: todayISO(), notes: "" });
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => { if (open) { setF({ type: "donation", donor: "", amount: "", method: "cash", restricted: false, purpose: "", date: todayISO(), notes: "" }); setFile(null); } }, [open]);
  const m = useMutation({
    mutationFn: async () => {
      const attachment_url = file ? await uploadDoc(file, "receipts") : null;
      const { error } = await supabase.from("fund_receipts").insert({
        receipt_type: f.type, donor_name: f.donor, amount: Number(f.amount), payment_method: f.method,
        is_restricted: f.restricted, restricted_purpose: f.restricted ? f.purpose : null, receipt_date: f.date, notes: f.notes || null, attachment_url,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم حفظ سند القبض"); inv(); onOpenChange(false); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>سند قبض – تبرع / إيراد</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع الإيراد">
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })} dir="rtl">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="donation">تبرع</SelectItem><SelectItem value="other">إيراد آخر</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="المبلغ (ر.ي)"><Input type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          </div>
          <Field label="اسم المتبرع / الدافع"><Input value={f.donor} onChange={(e) => setF({ ...f, donor: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <MethodSelect value={f.method} onChange={(v) => setF({ ...f, method: v })} />
            <Field label="التاريخ"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          </div>
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm font-semibold">
            تبرع مقيد بغرض محدد
            <Switch checked={f.restricted} onCheckedChange={(v) => setF({ ...f, restricted: v })} />
          </label>
          {f.restricted && <Field label="الغرض المقيد"><Input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></Field>}
          <Field label="ملاحظات"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <Field label="مرفق (صورة السند/الحوالة)"><Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        </div>
        <DialogFooter><Button disabled={m.isPending || !(Number(f.amount) > 0) || !f.donor || (f.restricted && !f.purpose)} onClick={() => m.mutate()}>حفظ السند</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseRequestDialog({ open, onOpenChange, initial }: DProps & { initial?: import("@/lib/queries").ExpenseRequest | null }) {
  const inv = useInvalidateAll();
  const empty = { category: "social_aid", name: "", phone: "", amount: "", description: "", notes: "" };
  const [f, setF] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    if (open) {
      setF(
        initial
          ? { category: initial.category, name: initial.beneficiary_name, phone: initial.beneficiary_phone ?? "", amount: String(initial.amount ?? ""), description: initial.description ?? "", notes: initial.notes ?? "" }
          : empty,
      );
      setFile(null);
    }
  }, [open, initial]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = useMutation({
    mutationFn: async () => {
      const attachment_url = file ? await uploadDoc(file, "expenses") : null;
      if (initial) {
        const { error } = await supabase.from("fund_expense_requests").update({
          category: f.category, beneficiary_name: f.name, beneficiary_phone: f.phone || null, amount: Number(f.amount),
          description: f.description, notes: f.notes || null, ...(attachment_url ? { attachment_url } : {}),
        }).eq("id", initial.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("fund_expense_requests").insert({
        category: f.category, beneficiary_name: f.name, beneficiary_phone: f.phone || null, amount: Number(f.amount),
        description: f.description, notes: f.notes || null, attachment_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(initial ? "تم حفظ تعديلات الطلب" : "تم إنشاء طلب الصرف وإرساله للاعتماد");
      inv();
      onOpenChange(false);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>{initial ? "تعديل طلب صرف (قبل الاعتماد)" : "طلب صرف / مساعدة جديد"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="التصنيف">
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })} dir="rtl">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="المبلغ (ر.ي)"><Input type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم المستفيد"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="هاتف المستفيد"><Input dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          </div>
          <Field label="الوصف / مبررات الطلب"><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="مستند داعم"><Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        </div>
        <DialogFooter><Button disabled={m.isPending || !f.name || !f.description || !(Number(f.amount) > 0)} onClick={() => m.mutate()}>{initial ? "حفظ التعديلات" : "إرسال للاعتماد"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
