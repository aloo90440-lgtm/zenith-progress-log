import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  loadJourney, getStreak, getAverageDaily, getBestDay, getActiveDays,
  getWeeklyScore, getWeeklyRating, getHeatmapData, JourneyData
} from "@/lib/store";
import { Footprints, TrendingUp, BarChart3, Star, Calendar, Target, Activity, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const Statistics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<JourneyData | null>(null);

  useEffect(() => {
    const journey = loadJourney();
    if (!journey.user) { navigate("/setup"); return; }
    setData(journey);
  }, [navigate]);

  if (!data) return null;

  const streak = getStreak(data.logs);
  const avg = getAverageDaily(data.logs);
  const best = getBestDay(data.logs);
  const activeDays = getActiveDays(data.logs);
  const weeklyScore = getWeeklyScore(data.logs);
  const weeklyRating = getWeeklyRating(weeklyScore);

  const chartData = [...data.logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(l => ({
      date: new Date(l.date).toLocaleDateString("ar-SA", { day: "numeric", month: "short" }),
      mental: l.axes.mental.finalScore,
      physical: l.axes.physical.finalScore,
      religious: l.axes.religious.finalScore,
      distraction: l.distraction.points,
    }));

  const maxDaily = 40;
  const stats = [
    { icon: Footprints, label: "أيام متتالية", value: `${streak}` },
    { icon: TrendingUp, label: "متوسط يومي", value: `${avg}/${maxDaily}` },
    { icon: Target, label: "نقاط الأسبوع", value: `${weeklyScore}` },
    { icon: Star, label: "أفضل يوم", value: best ? `${best.totalScore}/${maxDaily}` : "—" },
    { icon: Calendar, label: "أيام نشطة", value: `${activeDays}` },
    { icon: Activity, label: "إجمالي التقييمات", value: `${data.logs.length}` },
  ];

  return (
    <div className="min-h-screen gradient-desert px-6 py-8 pb-24" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-dust text-xs tracking-[0.2em] font-sans-ui">نظرة عامة</p>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-foreground mt-1 mb-2">الإحصائيات</h1>
          <p className={`text-sm font-sans-ui mb-8 ${weeklyRating.color}`}>التقييم الأسبوعي: {weeklyRating.label}</p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              className="bg-card border border-border rounded-xl p-4 shadow-sand">
              <stat.icon className="w-4 h-4 text-primary/60 mb-2" />
              <p className="text-xl font-serif-display font-semibold text-foreground">{stat.value}</p>
              <p className="text-muted-foreground text-[10px] mt-1 font-sans-ui">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-card border border-border rounded-xl p-6 shadow-sand">
            <h2 className="font-serif-display text-lg font-semibold text-foreground mb-6">أداء المحاور</h2>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(36, 15%, 55%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(36, 15%, 55%)' }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(36, 15%, 12%)', border: '1px solid hsl(36, 12%, 20%)', borderRadius: '8px', fontSize: '11px', color: 'hsl(36, 30%, 88%)' }}
                  />
                  <Bar dataKey="mental" name="الذهني" fill="hsl(33, 38%, 61%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="physical" name="الجسدي" fill="hsl(72, 16%, 38%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="religious" name="الديني" fill="hsl(30, 14%, 47%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4 text-[10px] font-sans-ui text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /> الذهني</span>
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-accent" /> الجسدي</span>
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-dust" /> الديني</span>
            </div>
          </motion.div>
        )}

        {chartData.length <= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="bg-card/50 border border-border/50 rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">سجّل المزيد من الأيام لرؤية الرسوم البيانية.</p>
          </motion.div>
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
          <Link to="/statistics" className="flex flex-col items-center gap-1 text-primary">
            <BarChart3 className="w-5 h-5" /><span className="text-[10px] font-sans-ui">الإحصائيات</span>
          </Link>
          <Link to="/weekly" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="w-5 h-5" /><span className="text-[10px] font-sans-ui">التقرير</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Statistics;
