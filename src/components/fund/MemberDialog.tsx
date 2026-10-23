import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "./ui";
import { errMsg } from "@/lib/fund";
import { useInvalidateFund, type Member } from "@/lib/queries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
  defaultFee: number;
};

const emptyForm = (fee: number) => ({
  full_name: "",
  phone: "",
  address: "الغدير - مقبنة - تعز",
  monthly_fee: String(fee || 1000),
  joined_on: new Date().toISOString().slice(0, 10),
  active: true,
  notes: "",
});

export function MemberDialog({ open, onOpenChange, member, defaultFee }: Props) {
  const inv = useInvalidateFund();
  const [f, setF] = useState(emptyForm(defaultFee));

  useEffect(() => {
    if (!open) return;
    setF(
      member
        ? {
            full_name: member.full_name,
            phone: member.phone ?? "",
            address: member.address ?? "",
            monthly_fee: String(member.monthly_fee),
            joined_on: member.joined_on,
            active: member.active,
            notes: member.notes ?? "",
          }
        : emptyForm(defaultFee),
    );
  }, [open, member, defaultFee]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: f.full_name.trim(),
        phone: f.phone.trim() || null,
        address: f.address.trim() || null,
        monthly_fee: Number(f.monthly_fee),
        joined_on: f.joined_on,
        active: f.active,
        notes: f.notes.trim() || null,
      };
      const { error } = member
        ? await supabase.from("fund_members").update(payload).eq("id", member.id)
        : await supabase.from("fund_members").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(member ? "تم تحديث بيانات العضو" : "تمت إضافة العضو بنجاح");
      inv();
      onOpenChange(false);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{member ? "تعديل بيانات عضو" : "إضافة عضو جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="الاسم الكامل">
            <Input
              value={f.full_name}
              onChange={(e) => setF({ ...f, full_name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="رقم الهاتف">
              <Input
                dir="ltr"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
              />
            </Field>
            <Field label="الاشتراك الشهري (ر.ي)">
              <Input
                type="number"
                min={0}
                value={f.monthly_fee}
                onChange={(e) => setF({ ...f, monthly_fee: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ الانضمام">
              <Input
                type="date"
                value={f.joined_on}
                onChange={(e) => setF({ ...f, joined_on: e.target.value })}
              />
            </Field>
            <Field label="العنوان">
              <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm font-semibold">
            عضو نشط (يستحق عليه الاشتراك الشهري)
            <Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} />
          </label>
          <Field label="ملاحظات">
            <Textarea
              rows={2}
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            disabled={save.isPending || !f.full_name.trim() || !(Number(f.monthly_fee) >= 0)}
            onClick={() => save.mutate()}
          >
            {member ? "حفظ التعديلات" : "إضافة العضو"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
