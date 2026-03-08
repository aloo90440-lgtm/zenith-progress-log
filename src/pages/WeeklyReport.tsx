import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getProfile, getDailyLogs, DbProfile, DbDailyLog } from "@/lib/supabase-store";
import { getWeeklyRating, getDateOffset, getTodayStr, getAllAxisMaxScores, AXIS_LABELS } from "@/lib/store";
import { Footprints, TrendingUp, BarChart3, FileText, AlertTriangle, BookOpen, ShieldAlert } from "lucide-react";

const WeeklyReport = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [logs, setLogs] = useState<DbDailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const p = await getProfile();
      if (!p || !p.primary_goal) { navigate("/setup"); return; }
      setProfile(p);
      const l = await getDailyLogs();
      setLogs(l);
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading || !profile) return <div className="min-h-screen gradient-desert flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const today = getTodayStr();
  const weekAgo = getDateOffset(today, -6);
  const weeklyLogs = logs.filter(l => l.date >= weekAgo && l.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const weeklyScore = weeklyLogs.reduce((s, l) => s + l.total_score, 0);
  const rating = getWeeklyRating(weeklyScore);

  const weights = profile.axis_weights;
  const maxScores = getAllAxisMaxScores(weights);

  const axisTotals = { mental: 0, physical: 0, religious: 0 };
  const distractionTotal = weeklyLogs.reduce((s, l) => s + l.distraction_points, 0);
  for (const l of weeklyLogs) {
    axisTotals.mental += l.mental_final_score;
    axisTotals.physical += l.physical_final_score;
    axisTotals.religious += l.religious_final_score;
  }

  // Weakness
  const labels: Record<string, string> = { mental: 'الذهني', physical: 'الجسدي', religious: 'الديني' };
  let weakness: string | null = null;
  if (weeklyLogs.length > 0) {
    const min = Math.min(axisTotals.mental, axisTotals.physical, axisTotals.religious);
    const weakAxis = Object.entries(axisTotals).find(([, v]) => v === min);
    weakness = weakAxis ? labels[weakAxis[0]] : null;
  }

  // Distraction stats
  const cleanDays = weeklyLogs.filter(l => l.distraction_tier === 'none').length;

  // Notes
  const notes = weeklyLogs
    .filter(l => l.daily_note.trim())
    .map(l => ({ date: l.date, note: l.daily_note }));

  return (
    <div className="min-h-screen gradient-desert px-6 py-8 pb-24" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-dust text-xs tracking-[0.2em] font-sans-ui">تقرير</p>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-foreground mt-1 mb-8">التقرير الأسبوعي</h1>
        </motion.div>

        {weeklyLogs.length === 0 ? (
          <div className="bg-card/50 border border-border/50 rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">لا توجد بيانات لهذا الأسبوع بعد.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-6 text-center shadow-sand">
              <p className="text-5xl font-serif-display font-bold text-foreground">{weeklyScore}</p>
              <p className="text-muted-foreground text-sm font-sans-ui mt-1">من {weeklyLogs.length * 40} نقطة</p>
              <p className={`text-lg font-serif-display font-semibold mt-2 ${rating.color}`}>{rating.label}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-5 shadow-sand">
              <h3 className="text-sm font-sans-ui text-muted-foreground mb-4">أداء المحاور</h3>
              {(Object.entries(axisTotals) as Array<['mental' | 'physical' | 'religious', number]>).map(([key, total]) => {
                const maxForAxis = weeklyLogs.length * maxScores[key];
                return (
                  <div key={key} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm font-sans-ui mb-1">
                      <span className="text-foreground">{AXIS_LABELS[key]}</span>
                      <span className="text-primary">{total}/{maxForAxis}</span>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${maxForAxis > 0 ? (total / maxForAxis) * 100 : 0}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="mt-3">
                <div className="flex justify-between text-sm font-sans-ui mb-1">
                  <span className="text-foreground">المشتتات</span>
                  <span className="text-primary">{distractionTotal}/{weeklyLogs.length * 10}</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent/70 rounded-full transition-all" style={{ width: `${weeklyLogs.length > 0 ? (distractionTotal / (weeklyLogs.length * 10)) * 100 : 0}%` }} />
                </div>
              </div>
            </motion.div>

            {weakness && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-foreground text-sm font-sans-ui font-medium">نقطة ضعف</p>
                  <p className="text-muted-foreground text-xs mt-1">المحور الأضعف هذا الأسبوع: <span className="text-destructive">{weakness}</span></p>
                </div>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sand">
              <ShieldAlert className="w-5 h-5 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-foreground text-sm font-sans-ui font-medium">إحصائيات المشتتات</p>
                <p className="text-muted-foreground text-xs mt-1">أيام بدون مشتتات: {cleanDays} من {weeklyLogs.length}</p>
              </div>
            </motion.div>

            {notes.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-card border border-border rounded-xl p-5 shadow-sand">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-primary/60" />
                  <h3 className="text-sm font-sans-ui text-muted-foreground">الدروس المستفادة هذا الأسبوع</h3>
                </div>
                <div className="space-y-3">
                  {notes.map((n, i) => (
                    <div key={i} className="border-r-2 border-primary/30 pr-3">
                      <p className="text-[10px] text-muted-foreground font-sans-ui">{new Date(n.date).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "short" })}</p>
                      <p className="text-foreground text-sm mt-0.5">{n.note}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-6 py-3 z-50">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Footprints className="w-5 h-5" /><span className="text-[10px] font-sans-ui">الرحلة</span>
          </Link>
          <Link to="/progress" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <TrendingUp className="w-5 h-5" /><span className="text-[10px] font-sans-ui">التقييم</span>
          </Link>
          <Link to="/statistics" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <BarChart3 className="w-5 h-5" /><span className="text-[10px] font-sans-ui">الإحصائيات</span>
          </Link>
          <Link to="/weekly" className="flex flex-col items-center gap-1 text-primary">
            <FileText className="w-5 h-5" /><span className="text-[10px] font-sans-ui">التقرير</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default WeeklyReport;
