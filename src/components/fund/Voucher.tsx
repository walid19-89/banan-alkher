import type { ReactNode } from "react";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FundLogo } from "./Brand";
import { FUND_FULL_NAME, money, amountInWords } from "@/lib/format";

export function PrintHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-primary pb-3">
      <div>
        <p className="text-base font-extrabold text-primary">{FUND_FULL_NAME}</p>
        <p className="text-xs text-muted-foreground">النظام المحاسبي والإداري</p>
      </div>
      <FundLogo className="h-16 w-16" />
      <div className="text-left">
        <p className="text-lg font-extrabold">{title}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function PrintDialog({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto" dir="rtl">
        <DialogHeader className="no-print">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="print-area bg-card p-2">{children}</div>
        <div className="no-print flex justify-end">
          <Button onClick={() => window.print()}><Printer /> طباعة</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VoucherBody({ rows, amount, signatures }: { rows: [string, ReactNode][]; amount: number; signatures: string[] }) {
  return (
    <div className="space-y-4 pt-4 text-sm">
      <div className="rounded-xl border-2 border-gold bg-gold-soft p-3 text-center">
        <p className="text-xs text-muted-foreground">المبلغ</p>
        <p className="tabular text-2xl font-extrabold">{money(amount)}</p>
        <p className="mt-1 text-xs font-semibold">{amountInWords(amount)}</p>
      </div>
      <table className="w-full">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b">
              <td className="w-40 py-2 font-bold text-muted-foreground">{k}</td>
              <td className="py-2">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid gap-6 pt-10" style={{ gridTemplateColumns: `repeat(${signatures.length}, minmax(0, 1fr))` }}>
        {signatures.map((s) => (
          <div key={s} className="text-center">
            <div className="mx-4 border-t border-foreground pt-2 text-xs font-bold">{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
