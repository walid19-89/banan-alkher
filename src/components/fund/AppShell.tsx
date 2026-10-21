import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, Users, Receipt, HandCoins, BarChart3, Settings, LogOut, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, STAFF, can } from "@/lib/fund";
import { FUND_NAME, ROLE_LABELS } from "@/lib/format";
import { FundLogo } from "./Brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "لوحة التحكم", short: "الرئيسية", icon: LayoutDashboard },
  { to: "/members", label: "الأعضاء والاشتراكات", short: "الأعضاء", icon: Users },
  { to: "/receipts", label: "سندات القبض والتبرعات", short: "القبض", icon: Receipt },
  { to: "/expenses", label: "طلبات الصرف والاعتمادات", short: "الصرف", icon: HandCoins },
  { to: "/reports", label: "التقارير المالية", short: "التقارير", icon: BarChart3 },
  { to: "/admin", label: "الإدارة والإعدادات", short: "الإدارة", icon: Settings },
] as const;

export function AppShell() {
  const { data: me, isLoading } = useMe();
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isStaff = can(me, STAFF);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("no-print sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all md:flex", collapsed ? "w-20" : "w-72")}>
        <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
          <div className="rounded-full bg-card p-1"><FundLogo className="h-10 w-10" /></div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{FUND_NAME}</p>
              <p className="truncate text-xs opacity-75">الغدير – مقبنة – تعز</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: I }) => {
            const active = path.startsWith(to);
            return (
              <Link key={to} to={to} title={label} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors", active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent")}>
                <I className="h-5 w-5 shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>
        <button onClick={() => setCollapsed((c) => !c)} className="m-3 flex items-center justify-center gap-2 rounded-lg p-2 text-xs hover:bg-sidebar-accent">
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <><ChevronRight className="h-4 w-4" /> طي القائمة</>}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <FundLogo className="h-9 w-9" />
            <span className="text-sm font-extrabold text-primary">{FUND_NAME}</span>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">النظام المحاسبي والإداري</div>
          <div className="flex items-center gap-3">
            {me && (
              <div className="text-left leading-tight">
                <p className="text-sm font-bold">{me.full_name}</p>
                <span className="inline-block rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold">{ROLE_LABELS[me.role]}</span>
              </div>
            )}
            <Button size="icon" variant="ghost" onClick={signOut} title="تسجيل الخروج"><LogOut /></Button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">
          {isLoading ? (
            <p className="p-10 text-center text-muted-foreground">جارٍ التحميل…</p>
          ) : !isStaff && !path.startsWith("/dashboard") ? (
            <NoAccess />
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-card md:hidden">
        {NAV.map(({ to, short, icon: I }) => {
          const active = path.startsWith(to);
          return (
            <Link key={to} to={to} className={cn("flex flex-col items-center gap-1 py-2 text-[10px] font-semibold", active ? "text-primary" : "text-muted-foreground")}>
              <I className={cn("h-5 w-5", active && "text-gold")} />
              {short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function NoAccess() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
      <h2 className="text-lg font-bold">لا تملك صلاحية الوصول</h2>
      <p className="mt-2 text-sm text-muted-foreground">حسابك مسجل بصلاحية «عضو». يرجى التواصل مع مدير الصندوق لمنحك الصلاحية المناسبة.</p>
    </div>
  );
}
