import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Empty } from "./ui";
import { exportCSV, todayISO } from "@/lib/format";
import { normalizeAmount, normalizeDate, parseTable } from "@/lib/csv";
import { useInvalidateFund } from "@/lib/queries";

type ParsedRow = {
  full_name: string;
  phone: string;
  monthly_fee: number;
  joined_on: string;
  address: string;
  notes: string;
  valid: boolean;
  reason?: string;
};

const HEADER_ALIASES: Record<string, keyof Omit<ParsedRow, "valid" | "reason">> = {
  "الاسم": "full_name",
  "الاسم الكامل": "full_name",
  "اسم العضو": "full_name",
  "name": "full_name",
  "full_name": "full_name",
  "الهاتف": "phone",
  "الجوال": "phone",
  "رقم الهاتف": "phone",
  "phone": "phone",
  "mobile": "phone",
  "الاشتراك": "monthly_fee",
  "الاشتراك الشهري": "monthly_fee",
  "الاشتراك الشهرى": "monthly_fee",
  "monthly_fee": "monthly_fee",
  "fee": "monthly_fee",
  "تاريخ الانضمام": "joined_on",
  "الانضمام": "joined_on",
  "joined_on": "joined_on",
  "العنوان": "address",
  "address": "address",
  "ملاحظات": "notes",
  "notes": "notes",
};

function mapRows(text: string, defaultFee: number): ParsedRow[] {
  const { headers, rows } = parseTable(text);
  const keys = headers.map((h) => HEADER_ALIASES[h.toLowerCase().trim()] ?? null);
  if (!keys.some(Boolean)) return [];
  return rows.map((r) => {
    const rec: Omit<ParsedRow, "valid" | "reason"> = { full_name: "", phone: "", monthly_fee: defaultFee, joined_on: "", address: "", notes: "" };
    keys.forEach((k, i) => {
      const val = (r[i] ?? "").trim();
      if (!k || !val) return;
      if (k === "full_name" || k === "phone" || k === "address" || k === "notes") rec[k] = val;
      else if (k === "monthly_fee") rec.monthly_fee = Number(normalizeAmount(val)) || defaultFee;
      else if (k === "joined_on") rec.joined_on = normalizeDate(val);
    });
    if (!rec.full_name) return { ...rec, valid: false, reason: "الاسم مفقود" };
    if (rec.joined_on && !/^\d{4}-\d{2}-\d{2}$/.test(rec.joined_on)) return { ...rec, valid: false, reason: "صيغة التاريخ غير مفهومة" };
    if (!(rec.monthly_fee >= 0)) return { ...rec, valid: false, reason: "الاشتراك غير صحيح" };
    return { ...rec, valid: true };
  });
}

/** Import members from an Excel/CSV file (or pasted cells) — Arabic or English headers. */
export function ImportMembersDialog({
  open,
  onOpenChange,
  defaultFee,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultFee: number;
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const inv = useInvalidateFund();

  function reset() {
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(f: File) {
    const text = await f.text();
    const mapped = mapRows(text, defaultFee);
    setRows(mapped);
    if (mapped.length === 0) toast.error("لم يتم التعرف على أي عمود. تأكد أن أول سطر يحتوي العناوين مثل: الاسم، الهاتف، الاشتراك الشهري.");
  }

  const m = useMutation({
    mutationFn: async () => {
      const valid = rows.filter((r) => r.valid);
      const payload = valid.map((r) => ({
        full_name: r.full_name,
        phone: r.phone || null,
        monthly_fee: r.monthly_fee,
        joined_on: r.joined_on || todayISO(),
        address: r.address || null,
        notes: r.notes || null,
      }));
      const { error } = await supabase.from("fund_members").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (n) => {
      toast.success(`تم استيراد ${n} عضواً بنجاح`);
      inv();
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر الاستيراد"),
  });

  const validCount = rows.filter((r) => r.valid).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> استيراد أعضاء من ملف Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportCSV(
                  "قالب-استيراد-الأعضاء",
                  ["الاسم الكامل", "الهاتف", "الاشتراك الشهري", "تاريخ الانضمام", "العنوان", "ملاحظات"],
                  [["أحمد محمد", "0771234567", "2000", "2026-01-15", "الغدير", ""]],
                )
              }
            >
              <FileDown /> تنزيل قالب جاهز
            </Button>
            <Button size="sm" variant="soft" onClick={() => fileRef.current?.click()}>
              <Upload /> اختيار ملف CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <span className="text-xs text-muted-foreground">
              من Excel: احفظ الملف بصيغة «CSV UTF-8»، أو انسخ الخلايا والصقها مباشرة في الأسفل.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">أو الصق الجدول من Excel مباشرة:</label>
            <Textarea
              rows={4}
              dir="rtl"
              placeholder={"الاسم الكامل\tالهاتف\tالاشتراك الشهري\nأحمد محمد\t0771234567\t2000"}
              onChange={(e) => {
                const t = e.target.value;
                if (t.trim()) setRows(mapRows(t, defaultFee));
                else setRows([]);
              }}
            />
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                معاينة: <span className="text-success">{validCount} صالح</span>
                {rows.length - validCount > 0 && <span className="text-destructive"> — {rows.length - validCount} غير صالح (سيتم تجاهله)</span>}
              </p>
              <div className="max-h-56 overflow-auto rounded-lg border">
                <table className="w-full text-xs [&_td]:border-t [&_td]:px-2 [&_td]:py-1.5 [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-right">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>الهاتف</th>
                      <th>الاشتراك</th>
                      <th>الانضمام</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className={r.valid ? "" : "bg-danger-soft"}>
                        <td>{r.full_name || "—"}</td>
                        <td dir="ltr">{r.phone || "—"}</td>
                        <td>{r.monthly_fee}</td>
                        <td dir="ltr">{r.joined_on || "—"}</td>
                        <td className={r.valid ? "text-success" : "text-destructive"}>{r.valid ? "✓" : r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows.length === 0 && <Empty>اختر ملفاً أو الصق الجدول لتظهر المعاينة هنا</Empty>}
        </div>

        <DialogFooter>
          <Button disabled={m.isPending || validCount === 0} onClick={() => m.mutate()}>
            <Upload /> استيراد {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
