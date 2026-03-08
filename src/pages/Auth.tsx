import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type AuthMode = "login" | "signup";
type AuthMethod = "email" | "phone";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [method, setMethod] = useState<AuthMethod>("email");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailAuth = async () => {
    setError("");
    setLoading(true);

    if (mode === "signup") {
      if (!name.trim()) { setError("الاسم مطلوب"); setLoading(false); return; }
      if (!phone.trim()) { setError("رقم التليفون مطلوب"); setLoading(false); return; }
      if (!email.trim() || !password) { setError("الإيميل وكلمة السر مطلوبين"); setLoading(false); return; }
      if (password.length < 6) { setError("كلمة السر يجب أن تكون 6 أحرف على الأقل"); setLoading(false); return; }

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), phone: phone.trim() },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        toast.success("تم إنشاء الحساب بنجاح!");
        navigate("/setup");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message === "Invalid login credentials" ? "بيانات الدخول غير صحيحة" : signInError.message);
      } else {
        navigate("/dashboard");
      }
    }

    setLoading(false);
  };

  const handlePhoneSendOtp = async () => {
    setError("");
    if (!phone.trim()) { setError("رقم التليفون مطلوب"); return; }

    setLoading(true);

    if (mode === "signup") {
      if (!name.trim()) { setError("الاسم مطلوب"); setLoading(false); return; }

      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
        options: { data: { name: name.trim(), phone: phone.trim() } },
      });

      if (error) {
        setError(error.message);
      } else {
        setOtpSent(true);
        toast.success("تم إرسال رمز التحقق");
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
      if (error) {
        setError(error.message);
      } else {
        setOtpSent(true);
        toast.success("تم إرسال رمز التحقق");
      }
    }

    setLoading(false);
  };

  const handlePhoneVerifyOtp = async () => {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otp,
      type: "sms",
    });

    if (error) {
      setError("رمز التحقق غير صحيح");
    } else {
      toast.success("تم تسجيل الدخول بنجاح!");
      navigate(mode === "signup" ? "/setup" : "/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-desert flex items-center justify-center px-6 py-12" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h1 className="font-serif-display text-3xl font-semibold text-foreground text-center mb-2">
          {mode === "signup" ? "إنشاء حساب" : "تسجيل الدخول"}
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-8">
          {mode === "signup" ? "ابدأ رحلتك نحو الانضباط" : "أكمل رحلتك"}
        </p>

        {/* Method Toggle */}
        <div className="flex bg-card border border-border rounded-xl p-1 mb-6">
          <button
            onClick={() => { setMethod("email"); setOtpSent(false); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-sans-ui transition-all ${method === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            إيميل
          </button>
          <button
            onClick={() => { setMethod("phone"); setOtpSent(false); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-sans-ui transition-all ${method === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            رقم التليفون
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 text-center">
            <p className="text-destructive text-sm font-sans-ui">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Name (signup only) */}
          {mode === "signup" && (
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">الاسم *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك الكامل"
                className="bg-card border-border text-foreground placeholder:text-muted-foreground/50" />
            </div>
          )}

          {/* Phone (always for phone method, signup for email method) */}
          {(method === "phone" || mode === "signup") && (
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">رقم التليفون *</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+201234567890" dir="ltr"
                className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 text-left" />
            </div>
          )}

          {/* Email fields */}
          {method === "email" && (
            <>
              <div>
                <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">البريد الإلكتروني *</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" dir="ltr"
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 text-left" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">كلمة السر *</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" dir="ltr"
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 text-left" />
              </div>
            </>
          )}

          {/* OTP input */}
          {method === "phone" && otpSent && (
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">رمز التحقق</label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" dir="ltr" maxLength={6}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 text-left text-center text-xl tracking-widest" />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={method === "email" ? handleEmailAuth : (otpSent ? handlePhoneVerifyOtp : handlePhoneSendOtp)}
          disabled={loading}
          className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg mt-6 hover:opacity-90 transition-opacity shadow-sand disabled:opacity-50"
        >
          {loading ? "جاري..." : method === "phone" && !otpSent ? "إرسال رمز التحقق" : method === "phone" && otpSent ? "تأكيد" : mode === "signup" ? "إنشاء حساب" : "دخول"}
        </button>

        {/* Toggle mode */}
        <p className="text-center text-muted-foreground text-sm mt-6 font-sans-ui">
          {mode === "signup" ? "عندك حساب؟" : "ما عندكش حساب؟"}{" "}
          <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setOtpSent(false); }}
            className="text-primary hover:underline">
            {mode === "signup" ? "سجّل دخول" : "أنشئ حساب"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
