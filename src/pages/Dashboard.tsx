import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  loadJourney, getStreak, getTodayStr, getAverageDaily, getWeeklyScore,
  getWeeklyRating, getSmartReminder, getHeatmapData, JourneyData
} from "@/lib/store";
import { Footprints, TrendingUp, Settings, BarChart3, FileText } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<JourneyData | null>(null);

  useEffect(() => {
    const journey = loadJourney();
    if (!journey.user) { navigate("/setup"); return; }
    setData(journey);
  }, [navigate]);

  if (!data || !data.user) return null;

  const streak = getStreak(data.logs);
  const todayLog = data.logs.find(l => l.date === getTodayStr());
  const avgDaily = getAverageDaily(data.logs);
  const weeklyScore = getWeeklyScore(data.logs);
  const weeklyRating = getWeeklyRating(weeklyScore);
  const heatmap = getHeatmapData(data.logs, 28);
  const isLowPerformance = avgDaily < 20 && data.logs.length > 2;

  return (
    <div className="min-h-screen gradient-desert px-6 py-8 pb-24" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-6">
          <div>
            <p className="text-dust text-xs tracking-[0.2em] font-sans-ui">مرحبًا، {data.user.name}</p>
            <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-foreground mt-1">رحلتك</h1>
          </div>
          <Link to="/settings" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        </motion.div>

        {/* Goal pinned */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-card/50 border border-border/50 rounded-xl p-4 mb-6">
          <p className="text-xs text-muted-foreground font-sans-ui mb-1">🎯 هدفك</p>
          <p className="text-foreground text-sm font-medium">{data.user.primaryGoal}</p>
        </motion.div>

        {/* Smart Reminder */}
        {isLowPerformance && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-primary text-sm font-sans-ui leading-relaxed">{getSmartReminder(data.user)}</p>
          </motion.div>
        )}

        {/* Streak Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-8 mb-6 text-center shadow-sand">
          <Footprints className="w-8 h-8 text-primary mx-auto mb-3 opacity-70" />
          <p className="text-6xl sm:text-7xl font-serif-display font-bold text-foreground">{streak}</p>
          <p className="text-muted-foreground text-sm mt-2 font-sans-ui">يوم متتالي</p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-4 text-center shadow-sand">
            <p className="text-2xl font-serif-display font-semibold text-foreground">{todayLog?.totalScore ?? '—'}</p>
            <p className="text-muted-foreground text-[10px] mt-1 font-sans-ui">نقاط اليوم</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-card border border-border rounded-xl p-4 text-center shadow-sand">
            <p className="text-2xl font-serif-display font-semibold text-foreground">{weeklyScore}</p>
            <p className="text-muted-foreground text-[10px] mt-1 font-sans-ui">نقاط الأسبوع</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-4 text-center shadow-sand">
            <p className={`text-lg font-serif-display font-semibold ${weeklyRating.color}`}>{weeklyRating.label}</p>
            <p className="text-muted-foreground text-[10px] mt-1 font-sans-ui">التقييم</p>
          </motion.div>
        </div>

        {/* Heatmap */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sand">
          <p className="text-xs text-muted-foreground font-sans-ui mb-3">خريطة الالتزام (٤ أسابيع)</p>
          <div className="grid grid-cols-7 gap-1.5">
            {heatmap.map((d) => {
              const intensity = d.score === 0 ? 'bg-border' :
                d.score <= 15 ? 'bg-destructive/40' :
                d.score <= 25 ? 'bg-dust/60' :
                d.score <= 35 ? 'bg-accent/60' : 'bg-primary/80';
              return (
                <div key={d.date} className={`aspect-square rounded-sm ${intensity} transition-colors`}
                  title={`${d.date}: ${d.score}/40`} />
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground font-sans-ui">
            <span>أقل</span>
            <div className="w-3 h-3 rounded-sm bg-border" />
            <div className="w-3 h-3 rounded-sm bg-destructive/40" />
            <div className="w-3 h-3 rounded-sm bg-dust/60" />
            <div className="w-3 h-3 rounded-sm bg-accent/60" />
            <div className="w-3 h-3 rounded-sm bg-primary/80" />
            <span>أكثر</span>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <button onClick={() => navigate("/progress")}
            className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-4 rounded-xl text-base hover:opacity-90 transition-opacity shadow-sand">
            {todayLog ? "تحديث تقييم اليوم" : "تقييم اليوم"}
          </button>
        </motion.div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-6 py-3 z-50">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-primary">
            <Footprints className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">الرحلة</span>
          </Link>
          <Link to="/progress" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">التقييم</span>
          </Link>
          <Link to="/statistics" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">الإحصائيات</span>
          </Link>
          <Link to="/weekly" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">التقرير</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
