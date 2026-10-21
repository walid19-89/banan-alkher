import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FundLogo } from "@/components/fund/Brand";
import { FUND_FULL_NAME, FUND_SUBTITLE } from "@/lib/format";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | صندوق بنان الخير للبنيان" },
      { name: "description", content: "تسجيل الدخول إلى النظام المحاسبي لصندوق بنان الخير للبنيان." },
      { property: "og:title", content: "تسجيل الدخول | صندوق بنان الخير للبنيان" },
      { property: "og:description", content: "بوابة الدخول للنظام المحاسبي والإداري للصندوق." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("بيانات الدخول غير صحيحة");
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) navigate({ to: "/dashboard", replace: true });
    else toast.success("تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل ثم تسجيل الدخول.");
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("تعذر تسجيل الدخول عبر Google");
    else if (!r.redirected) navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-hero text-primary-foreground lg:block">
        <div className="pattern-dots flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="rounded-full bg-card p-4 shadow-gold">
            <FundLogo className="h-32 w-32" />
          </div>
          <h1 className="mt-8 text-4xl font-extrabold leading-snug">{FUND_FULL_NAME}</h1>
          <p className="mt-3 text-lg opacity-90">النظام المحاسبي والإداري</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <FundLogo className="mx-auto h-20 w-20" />
            <h1 className="mt-4 text-xl font-extrabold text-primary">{FUND_FULL_NAME}</h1>
            <p className="text-sm text-muted-foreground">{FUND_SUBTITLE}</p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <Tabs defaultValue="signin" dir="rtl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">حساب جديد</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <Field label="البريد الإلكتروني"><Input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                  <Field label="كلمة المرور"><Input type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                  <Button className="w-full" disabled={loading}>دخول</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <Field label="الاسم الكامل"><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
                  <Field label="البريد الإلكتروني"><Input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                  <Field label="كلمة المرور"><Input type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                  <Button className="w-full" disabled={loading}>إنشاء حساب</Button>
                  <p className="text-xs text-muted-foreground">أول حساب يُسجَّل يصبح مديراً للنظام، وبقية الحسابات تُفعَّل صلاحياتها من قبل المدير.</p>
                </form>
              </TabsContent>
            </Tabs>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> أو <div className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>المتابعة باستخدام Google</Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
