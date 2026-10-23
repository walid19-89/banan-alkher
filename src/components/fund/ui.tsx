import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudOff, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/lib/fund";
import { cn } from "@/lib/utils";

/**
 * Red banner shown whenever the Supabase database cannot be reached,
 * so stale/zero numbers are never mistaken for real values.
 */
export function ConnectionBanner() {
  const qc = useQueryClient();
  const { isError, isPending, refetch } = useBranding();
  if (!isError || isPending) return null;
  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/40 bg-danger-soft px-4 py-2.5 text-sm font-semibold text-destructive">
      <span className="flex items-center gap-2">
        <CloudOff className="h-4 w-4 shrink-0" />
        تعذر الاتصال بقاعدة البيانات — الأرقام المعروضة قد تكون قديمة أو غير مكتملة. تحقق من اتصال الإنترنت.
      </span>
      <Button
        size="sm"
        variant="outline"
        className="border-destructive/40 text-destructive"
        onClick={() => {
          qc.invalidateQueries();
          refetch();
        }}
      >
        <RotateCcw /> إعادة المحاولة
      </Button>
    </div>
  );
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  primary: "bg-primary-soft text-primary",
  gold: "bg-gold-soft text-gold",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;
export type Tone = keyof typeof TONES;

export function Kpi({ label, value, icon: I, tone = "primary", hint }: { label: string; value: string; icon: LucideIcon; tone?: Tone; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <span className={cn("rounded-lg p-2", TONES[tone])}><I className="h-4 w-4" /></span>
      </div>
      <p className="tabular mt-2 text-xl font-extrabold md:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Pill({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", TONES[tone])}>{children}</span>;
}

export function Card({ title, actions, children, className }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-card md:p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

export const tableCls = "w-full text-sm [&_th]:whitespace-nowrap [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-right [&_th]:font-bold [&_th]:text-muted-foreground [&_td]:border-t [&_td]:px-3 [&_td]:py-2.5";
