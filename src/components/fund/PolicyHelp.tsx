import { useState } from "react";
import { toast } from "sonner";
import { Copy, Database } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { errMsg, isRlsError } from "@/lib/fund";

export const EDIT_DELETE_SQL = `-- تفعيل التعديل والحذف للسندات وطلبات الصرف
CREATE POLICY "receipts staff update" ON public.fund_receipts
  FOR UPDATE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin','accountant']))
  WITH CHECK (public.fund_has_role(auth.uid(), ARRAY['admin','accountant']));

CREATE POLICY "receipts staff delete" ON public.fund_receipts
  FOR DELETE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin','accountant']));

CREATE POLICY "expenses update pending" ON public.fund_expense_requests
  FOR UPDATE TO authenticated
  USING (public.fund_is_staff(auth.uid()) AND status = 'pending')
  WITH CHECK (public.fund_is_staff(auth.uid()) AND status = 'pending');

CREATE POLICY "expenses admin delete pending" ON public.fund_expense_requests
  FOR DELETE TO authenticated
  USING (public.fund_has_role(auth.uid(), ARRAY['admin']) AND status = 'pending');`;

/** Toast that guides the user to the one-step Lovable fix when the DB blocks a write. */
export function explainWriteError(e: unknown, openHelp: () => void) {
  if (isRlsError(e)) {
    toast.error("قاعدة البيانات تمنع هذا الإجراء حالياً", {
      description: "تفعيل التعديل والحذف يحتاج خطوة واحدة تُنفَّذ من داخل Lovable.",
      action: { label: "عرض الحل", onClick: openHelp },
      duration: 10000,
    });
  } else {
    toast.error(errMsg(e));
  }
}

export function PolicyHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> كيف أُفعّل التعديل والحذف؟
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            سياسات الحماية في قاعدة البيانات (Row-Level Security) لا تسمح حالياً بتعديل أو حذف السندات وطلبات الصرف.
            هذا قرار أمني جيد افتراضياً، ولتغييره:
          </p>
          <ol className="list-decimal space-y-1.5 pr-5 text-sm">
            <li>افتح مشروعك في منصة Lovable.</li>
            <li>
              انسخ الجملة التالية وأرسلها في محادثة Lovable:
              <span className="mx-1 font-bold">«طبّق هذا الكود على قاعدة البيانات»</span> مع الكود أدناه.
            </li>
            <li>سيسألك Lovable للتأكيد — وافق، وستُفعَّل الأزرار مباشرة بدون أي تغيير آخر.</li>
          </ol>
          <div className="relative">
            <pre dir="ltr" className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-left text-[11px] leading-relaxed">
              {EDIT_DELETE_SQL}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute left-2 top-2"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(EDIT_DELETE_SQL);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  /* clipboard unavailable */
                }
              }}
            >
              <Copy /> {copied ? "تم النسخ ✓" : "نسخ الكود"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ملاحظة: التعديل والحذف للسندات متاح للمدير والمحاسب فقط، ولطلبات الصرف (وهي بانتظار الاعتماد) للموظفين،
            والحذف للمدير فقط — لا يمكن تعديل طلب مصروف بعد اعتماده حفاظاً على سجلات المال.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
