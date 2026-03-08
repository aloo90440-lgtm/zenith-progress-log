import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { loadJourney, saveUser } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";

const SettingsPage = () => {
  const navigate = useNavigate();
  const journey = loadJourney();
  const user = journey.user;
  const [name, setName] = useState(user?.name || "");
  const [goal, setGoal] = useState(user?.primaryGoal || "");
  const [importance, setImportance] = useState(user?.goalImportance || "");
  const [mentalW, setMentalW] = useState(user?.axisWeights.mental || 50);
  const [physicalW, setPhysicalW] = useState(user?.axisWeights.physical || 50);
  const [religiousW, setReligiousW] = useState(user?.axisWeights.religious || 50);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return;
    saveUser({
      name: name.trim(),
      phone: user?.phone,
      email: user?.email,
      primaryGoal: goal.trim(),
      goalImportance: importance.trim(),
      axisWeights: { mental: mentalW, physical: physicalW, religious: religiousW },
      createdAt: user?.createdAt || new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen gradient-desert px-6 py-8" dir="rtl">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-sans-ui text-sm">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </button>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="font-serif-display text-2xl font-semibold text-foreground mb-8">الإعدادات</h1>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">الاسم</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-card border-border text-foreground" required />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">الهدف الخاص</label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} className="bg-card border-border text-foreground" required />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">لماذا هذا الهدف مهم؟</label>
              <Textarea value={importance} onChange={(e) => setImportance(e.target.value)} className="bg-card border-border text-foreground min-h-[120px] resize-none" />
            </div>

            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground font-sans-ui">صعوبة المحاور</p>
              {[
                { label: "الذهني", value: mentalW, setter: setMentalW },
                { label: "الجسدي", value: physicalW, setter: setPhysicalW },
                { label: "الديني", value: religiousW, setter: setReligiousW },
              ].map(({ label, value, setter }) => (
                <div key={label} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-sans-ui text-foreground">{label}</span>
                    <span className="text-primary font-serif-display text-sm font-semibold">{value}%</span>
                  </div>
                  <Slider value={[value]} onValueChange={(v) => setter(v[0])} min={10} max={100} step={5} />
                </div>
              ))}
            </div>

            <button type="submit" className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand">
              {saved ? "✓ تم الحفظ" : "حفظ التغييرات"}
            </button>
          </form>

          <div className="mt-12 border-t border-border pt-8">
            <h2 className="font-serif-display text-lg font-semibold text-foreground mb-4">إعادة ضبط الرحلة</h2>
            <p className="text-muted-foreground text-sm mb-4">سيتم حذف جميع بياناتك. لا يمكن التراجع.</p>
            <button
              onClick={() => {
                if (confirm("هل أنت متأكد؟ سيتم حذف كل البيانات.")) {
                  localStorage.removeItem("the-journey-v2");
                  navigate("/");
                }
              }}
              className="text-destructive border border-destructive/30 px-6 py-2.5 rounded-lg text-sm font-sans-ui hover:bg-destructive/10 transition-colors">
              حذف كل شيء
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
