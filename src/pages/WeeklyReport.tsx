import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  loadJourney, getWeeklyLogs, getWeeklyScore, getWeeklyRating,
  getAxisWeakness, getDistractionStats, getWeeklyNotes, AXIS_LABELS, JourneyData, getAllAxisMaxScores
} from "@/lib/store";
import { Footprints, TrendingUp, BarChart3, FileText, AlertTriangle, BookOpen, ShieldAlert } from "lucide-react";

const WeeklyReport = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<JourneyData | null>(null);

  useEffect(() => {
    const journey = loadJourney();
    if (!journey.user) { navigate("/setup"); return; }
    setData(journey);
  }, [navigate]);

  if (!data) return null;

  const weeklyLogs = getWeeklyLogs(data.logs);
  const weeklyScore = getWeeklyScore(data.logs);
  const rating = getWeeklyRating(weeklyScore);
  const weakness = getAxisWeakness(data.logs);
  const distractionStats = getDistractionStats(data.logs);
  const notes = getWeeklyNotes(data.logs);

  // Axis breakdown
  const axisTotals = { mental: 0, physical: 0, religious: 0 };
  const distractionTotal = weeklyLogs.reduce((s, l) => s + l.distraction.points, 0);
  for (const l of weeklyLogs) {
    axisTotals.mental += l.axes.mental.finalScore;
    axisTotals.physical += l.axes.physical.finalScore;
    axisTotals.religious += l.axes.religious.finalScore;
  }
  const maxAxisScore = weeklyLogs.length * 10;

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
            {/* Score & Rating */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-6 text-center shadow-sand">
              <p className="text-5xl font-serif-display font-bold text-foreground">{weeklyScore}</p>
              <p className="text-muted-foreground text-sm font-sans-ui mt-1">من ٢٠٠ نقطة</p>
              <p className={`text-lg font-serif-display font-semibold mt-2 ${rating.color}`}>{rating.label}</p>
            </motion.div>

            {/* Axis Performance */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-5 shadow-sand">
              <h3 className="text-sm font-sans-ui text-muted-foreground mb-4">أداء المحاور</h3>
              {Object.entries(axisTotals).map(([key, total]) => (
                <div key={key} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-sm font-sans-ui mb-1">
                    <span className="text-foreground">{AXIS_LABELS[key]}</span>
                    <span className="text-primary">{total}/{maxAxisScore}</span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${maxAxisScore > 0 ? (total / maxAxisScore) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              <div className="mt-3">
                <div className="flex justify-between text-sm font-sans-ui mb-1">
                  <span className="text-foreground">المشتتات</span>
                  <span className="text-primary">{distractionTotal}/{maxAxisScore}</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent/70 rounded-full transition-all" style={{ width: `${maxAxisScore > 0 ? (distractionTotal / maxAxisScore) * 100 : 0}%` }} />
                </div>
              </div>
            </motion.div>

            {/* Weakness */}
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

            {/* Distraction Stats */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sand">
              <ShieldAlert className="w-5 h-5 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-foreground text-sm font-sans-ui font-medium">إحصائيات المشتتات</p>
                <p className="text-muted-foreground text-xs mt-1">
                  أيام بدون مشتتات: {distractionStats.clean} من {distractionStats.total}
                </p>
              </div>
            </motion.div>

            {/* Weekly Notes / Reflections */}
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

      {/* Bottom Nav */}
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
