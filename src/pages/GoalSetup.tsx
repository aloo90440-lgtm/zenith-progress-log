import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getProfile, updateProfile, DbProfile } from "@/lib/supabase-store";
import { getAllAxisMaxScores } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

const GoalSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [importance, setImportance] = useState("");
  const [mentalWeight, setMentalWeight] = useState(50);
  const [physicalWeight, setPhysicalWeight] = useState(50);
  const [religiousWeight, setReligiousWeight] = useState(50);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then(profile => {
      if (profile) {
        setName(profile.name || "");
        setPhone(profile.phone || "");
        setEmail(profile.email || "");
        setGoal(profile.primary_goal || "");
        setImportance(profile.goal_importance || "");
        if (profile.axis_weights) {
          setMentalWeight(profile.axis_weights.mental || 50);
          setPhysicalWeight(profile.axis_weights.physical || 50);
          setReligiousWeight(profile.axis_weights.religious || 50);
        }
      }
      setLoading(false);
    });
  }, []);

  const validateStep = (): boolean => {
    setError("");
    if (step === 0) {
      if (!name.trim()) { setError("الاسم مطلوب"); return false; }
      if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(name.trim())) { setError("الاسم يجب أن يحتوي على حروف فقط"); return false; }
      if (!phone.trim()) { setError("رقم التليفون مطلوب"); return false; }
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 11) { setError("رقم الهاتف يجب أن يكون ١٠ أو ١١ رقم"); return false; }
      return true;
    }
    if (step === 1) {
      if (!goal.trim()) { setError("الهدف مطلوب"); return false; }
      const lines = importance.trim().split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setError("اكتب على الأقل سطرين عن أهمية هدفك");
        return false;
      }
      if (lines.length > 5) {
        setError("الحد الأقصى ٥ أسطر");
        return false;
      }
      return true;
    }
    if (step === 2) {
      const weights = [mentalWeight, physicalWeight, religiousWeight];
      const count100 = weights.filter(w => w === 100).length;
      if (count100 === 0) {
        setError("يجب اختيار محور واحد بصعوبة 100%");
        return false;
      }
      if (count100 > 1) {
        setError("محور واحد فقط يمكن أن يكون 100%");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 2) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    await updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      primary_goal: goal.trim(),
      goal_importance: importance.trim(),
      axis_weights: {
        mental: mentalWeight,
        physical: physicalWeight,
        religious: religiousWeight,
      },
    });
    navigate("/dashboard");
  };

  const steps = [
    { title: "من أنت؟", subtitle: "بياناتك الشخصية" },
    { title: "ما هدفك؟", subtitle: "حدد رحلتك" },
    { title: "أوزان المحاور", subtitle: "حدد صعوبة كل محور" },
  ];

  if (loading) return <div className="min-h-screen gradient-desert flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen gradient-desert flex items-center justify-center px-6 py-12" dir="rtl">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        <p className="text-dust text-sm tracking-[0.2em] uppercase mb-2 font-sans-ui text-center">
          {steps[step].subtitle}
        </p>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-foreground mb-2 text-center">
          {steps[step].title}
        </h1>
        <div className="w-12 h-px bg-primary/40 mx-auto mb-8" />

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-6 text-center">
            <p className="text-destructive text-sm font-sans-ui">{error}</p>
          </div>
        )}

        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">الاسم *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك الكامل" className="bg-card border-border text-foreground placeholder:text-muted-foreground/50" required />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">رقم الهاتف *</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+201234567890" dir="ltr" className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 text-left" required />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">البريد الإلكتروني</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="اختياري" dir="ltr" className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 text-left" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">هدفك الخاص *</label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="مثال: حفظ القرآن كاملاً" className="bg-card border-border text-foreground placeholder:text-muted-foreground/50" required />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">لماذا هذا الهدف مهم؟ * (٢ إلى ٥ أسطر)</label>
              <Textarea
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                placeholder={"اكتب بالتفصيل لماذا هذا الهدف مهم لك...\nسطر ١\nسطر ٢\nسطر ٣\nسطر ٤\nسطر ٥"}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 min-h-[180px] resize-none"
              />
            </div>
          </div>
        )}

        {step === 2 && (() => {
          const maxScores = getAllAxisMaxScores({ mental: mentalWeight, physical: physicalWeight, religious: religiousWeight });
          const axisItems = [
            { label: "المحور الذهني", value: mentalWeight, setter: setMentalWeight, key: 'mental' as const },
            { label: "المحور الجسدي", value: physicalWeight, setter: setPhysicalWeight, key: 'physical' as const },
            { label: "المحور الديني", value: religiousWeight, setter: setReligiousWeight, key: 'religious' as const },
          ];
          return (
            <div className="space-y-8">
              <p className="text-muted-foreground text-sm text-center mb-4">
                حدد نسبة صعوبة كل محور — محور واحد فقط يمكن أن يكون 100%
                <br />
                <span className="text-primary text-xs">الـ 30 نقطة ستتوزع حسب نسب الصعوبة</span>
              </p>
              {axisItems.map(({ label, value, setter, key }) => {
                const isLocked = value !== 100 && [mentalWeight, physicalWeight, religiousWeight].some((w, i) => w === 100 && ['mental', 'physical', 'religious'][i] !== key);
                return (
                  <div key={label} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-sans-ui text-foreground">{label}</span>
                      <span className="text-primary font-serif-display font-semibold text-lg">{value}%</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-muted-foreground font-sans-ui">الحد الأقصى للنقاط</span>
                      <span className="text-xs text-accent font-sans-ui font-medium">{maxScores[key]} نقطة</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(v) => {
                        const newVal = v[0];
                        if (newVal === 100 && isLocked) return;
                        setter(newVal);
                      }}
                      min={10}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 border border-border text-muted-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:bg-card transition-colors"
            >
              رجوع
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand"
          >
            {step === 2 ? "ابدأ الرحلة" : "التالي"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default GoalSetup;
