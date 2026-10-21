export const FUND_NAME = "صندوق بنان الخير للبنيان";
export const FUND_FULL_NAME = "صندوق بنان الخير للبنيان – الغدير – مقبنة – تعز";
export const FUND_SUBTITLE = "الغدير – مقبنة – تعز | النظام المحاسبي والإداري";

export type FundRole = "admin" | "accountant" | "treasurer" | "board_member" | "member";

export const ROLE_LABELS: Record<FundRole, string> = {
  admin: "مدير النظام",
  accountant: "محاسب",
  treasurer: "أمين الصندوق",
  board_member: "عضو مجلس الإدارة",
  member: "عضو",
};

export const CATEGORY_LABELS: Record<string, string> = {
  social_aid: "مساعدة اجتماعية",
  charitable_aid: "مساعدة خيرية",
  medical_aid: "مساعدة طبية",
  emergency_aid: "مساعدة طارئة",
  operational: "مصروفات تشغيلية",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار الاعتماد",
  approved: "معتمد بانتظار الصرف",
  rejected: "مرفوض",
  paid: "تم الصرف",
};

export const SUB_STATUS_LABELS: Record<string, string> = {
  unpaid: "غير مسدد",
  partial: "مسدد جزئياً",
  paid: "مسدد",
};

export const RECEIPT_TYPE_LABELS: Record<string, string> = {
  subscription: "اشتراك عضو",
  donation: "تبرع",
  other: "إيراد آخر",
};

export const METHOD_LABELS: Record<string, string> = {
  cash: "نقداً",
  bank_transfer: "تحويل بنكي",
};

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function money(v: number | string | null | undefined): string {
  return `${nf.format(Number(v ?? 0))} ر.ي`;
}

export function num(v: number | string | null | undefined): string {
  return nf.format(Number(v ?? 0));
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-GB");
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function fmtMonth(v: string | null | undefined): string {
  if (!v) return "—";
  return v.slice(0, 7);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function receiptNo(n: number | string): string {
  return `RV-${String(n).padStart(4, "0")}`;
}

export function requestNo(n: number | string): string {
  return `ER-${String(n).padStart(4, "0")}`;
}

/** Export rows as CSV with UTF-8 BOM so Arabic opens correctly in Excel. */
export function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Convert an integer amount to Arabic words (simplified, up to billions). */
export function amountInWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "صفر ريال يمني";
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  const three = (x: number): string => {
    const parts: string[] = [];
    const h = Math.floor(x / 100);
    const r = x % 100;
    if (h) parts.push(hundreds[h]);
    if (r) {
      if (r < 20) parts.push(ones[r]);
      else {
        const o = r % 10;
        parts.push(o ? `${ones[o]} و${tens[Math.floor(r / 10)]}` : tens[Math.floor(r / 10)]);
      }
    }
    return parts.join(" و");
  };
  const scales: [number, string, string, string][] = [
    [1e9, "مليار", "ملياران", "مليارات"],
    [1e6, "مليون", "مليونان", "ملايين"],
    [1e3, "ألف", "ألفان", "آلاف"],
  ];
  const out: string[] = [];
  let rest = n;
  for (const [v, one, two, many] of scales) {
    const q = Math.floor(rest / v);
    rest %= v;
    if (!q) continue;
    if (q === 1) out.push(one);
    else if (q === 2) out.push(two);
    else if (q <= 10) out.push(`${three(q)} ${many}`);
    else out.push(`${three(q)} ${one}اً`.replace("ألفاً", "ألف"));
  }
  if (rest) out.push(three(rest));
  return `${out.join(" و")} ريال يمني فقط لا غير`;
}
