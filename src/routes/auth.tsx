import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionBanner } from "@/components/fund/ui";
import { FundLogo } from "@/components/fund/Brand";
import { FUND_FULL_NAME, FUND_SUBTITLE } from "@/lib/format";
import { errMsg } from "@/lib/fund";

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

type Mode = "tabs" | "forgot" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("tabs");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const recoveryRef = useRef(false);

  useEffect(() => {
    const isRecovery = () => recoveryRef.current || window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryRef.current = true;
        setMode("reset");
      }
    });
    supabase.auth.getUser().then(({ data: u }) => {
      if (u.user && !isRecovery()) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  function authErrorAr(msg: string): string {
    if (/Email not confirmed/i.test(msg)) return "البريد الإلكتروني غير مؤكد — راجع صندوق بريدك واضغط رابط التأكيد.";
    if (/Invalid login credentials/i.test(msg)) return "البريد أو كلمة المرور غير صحيحة.";
    if (/rate limit/i.test(msg)) return "محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة.";
    if (/not confirmed|signups not allowed/i.test(msg)) return "إنشاء الحسابات غير مفعّل حالياً في إعدادات قاعدة البيانات.";
    return msg;
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(authErrorAr(error.message));
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      toast.error(authErrorAr(error.message));
      return;
    }
    if (data.session) navigate({ to: "/dashboard", replace: true });
    else toast.success("تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل ثم تسجيل الدخول.");
  }

  async function sendResetLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    setLoading(false);
    if (error) {
      toast.error(authErrorAr(error.message));
      return;
    }
    toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. افحص صندوق الوارد (وقسم الرسائل غير المرغوبة).");
    setMode("tabs");
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success("تم تحديث كلمة المرور بنجاح");
    navigate({ to: "/dashboard", replace: true });
  }

  async function google() {
    setLoading(true);
    // Direct Supabase OAuth (works on any domain once the Google provider is enabled
    // in the Supabase dashboard) — the previous Lovable broker only worked on lovable.app.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    setLoading(false);
    if (error) {
      const m = error.message;
      if (/provider.*(not enabled|unsupported)/i.test(m))
        toast.error("تسجيل الدخول عبر Google غير مفعّل بعد في إعدادات قاعدة البيانات", { description: "فعّل مزوّد Google من لوحة تحكم قاعدة البيانات (Authentication → Providers).", duration: 8000 });
      else if (/redirect/i.test(m))
        toast.error("عنوان العودة غير مسجل في إعدادات Google", { description: `أضف هذا العنوان إلى قائمة العناوين المسموحة: ${window.location.origin}/auth`, duration: 8000 });
      else toast.error("تعذر بدء تسجيل الدخول عبر Google", { description: errMsg(error) });
    }
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
          <ConnectionBanner />
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            {mode === "forgot" && (
              <form onSubmit={sendResetLink} className="space-y-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setMode("tabs")} className="rounded-full p-1.5 hover:bg-muted" title="رجوع">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <h2 className="text-base font-bold">استعادة كلمة المرور</h2>
                </div>
                <p className="text-xs text-muted-foreground">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.</p>
                <div className="space-y-1.5">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button className="w-full" disabled={loading}>إرسال رابط الاستعادة</Button>
              </form>
            )}
            {mode === "reset" && (
              <form onSubmit={setNewPassword} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-primary-soft p-2 text-primary"><KeyRound className="h-4 w-4" /></span>
                  <h2 className="text-base font-bold">تعيين كلمة مرور جديدة</h2>
                </div>
                <p className="text-xs text-muted-foreground">اختر كلمة مرور جديدة لحسابك ثم اضغط حفظ.</p>
                <div className="space-y-1.5">
                  <Label>كلمة المرور الجديدة</Label>
                  <Input type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" disabled={loading}>حفظ كلمة المرور</Button>
              </form>
            )}
            {mode === "tabs" && (
              <>
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
                      <button type="button" onClick={() => setMode("forgot")} className="w-full text-center text-xs font-semibold text-primary hover:underline">
                        نسيت كلمة المرور؟
                      </button>
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
                <Button variant="outline" className="w-full" onClick={google} disabled={loading}>المتابعة باستخدام Google</Button>
              </>
            )}
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
