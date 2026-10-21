import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Wallet, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FundLogo } from "@/components/fund/Brand";
import { FUND_NAME, FUND_SUBTITLE } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "صندوق بنان الخير للبنيان – الغدير – مقبنة – تعز" },
      { name: "description", content: "النظام المحاسبي والإداري لصندوق بنان الخير للبنيان: الاشتراكات، التبرعات، طلبات الصرف والاعتماد المزدوج." },
      { property: "og:title", content: "صندوق بنان الخير للبنيان" },
      { property: "og:description", content: "النظام المحاسبي والإداري للصندوق – الغدير – مقبنة – تعز" },
    ],
  }),
  component: Index,
});

function Index() {
  const features = [
    { icon: Users, t: "الأعضاء والاشتراكات" },
    { icon: Wallet, t: "سندات القبض والتبرعات" },
    { icon: ShieldCheck, t: "اعتماد مزدوج للصرف" },
    { icon: FileText, t: "تقارير وكشوفات مالية" },
  ];
  return (
    <main className="min-h-screen bg-hero text-primary-foreground">
      <div className="pattern-dots min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="rounded-full bg-card p-3 shadow-gold">
            <FundLogo className="h-24 w-24" />
          </div>
          <h1 className="mt-8 text-3xl font-extrabold leading-tight md:text-5xl">{FUND_NAME}</h1>
          <p className="mt-3 text-base opacity-90 md:text-lg">{FUND_SUBTITLE}</p>
          <div className="mt-10 grid w-full grid-cols-2 gap-3 md:grid-cols-4">
            {features.map(({ icon: I, t }) => (
              <div key={t} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur">
                <I className="mx-auto h-6 w-6 text-gold" />
                <p className="mt-2 text-sm font-semibold">{t}</p>
              </div>
            ))}
          </div>
          <Button asChild size="lg" variant="gold" className="mt-10 px-10 text-base">
            <Link to="/dashboard">الدخول إلى النظام</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
