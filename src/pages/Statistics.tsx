import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getProfile, getDailyLogs, DbDailyLog } from "@/lib/supabase-store";
import { getWeeklyRating, getDateOffset, getTodayStr, getAllAxisMaxScores, AXIS_LABELS } from "@/lib/store";
import { Footprints, TrendingUp, BarChart3, Star, Calendar, Target, Activity, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const Statistics = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<DbDailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const p = await getProfile();
      if (!p || !p.primary_goal) { navigate("/setup"); return; }
      const l = await getDailyLogs();
      setLogs(l);
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading) return <div className="min-h-screen gradient-desert flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const today = getTodayStr();

  // Streak
  let streak = 0;
  let checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    const found = logs.find(l => l.date === dateStr && l.total_score > 0);
    if (found) streak++;
    else if (i > 0) break;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const avg = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.total_score, 0) / logs.length) : 0;
  const best = logs.length > 0 ? logs.reduce((b, l) => l.total_score > b.total_score ? l : b, logs[0]) : null;
  const activeDays = logs.filter(l => l.total_score > 0).length;

  const weekAgo = getDateOffset(today, -6);
  const weeklyLogs = logs.filter(l => l.date >= weekAgo && l.date <= today);
  const weeklyScore = weeklyLogs.reduce((s, l) => s + l.total_score, 0);
  const weeklyRating = getWeeklyRating(weeklyScore);

  const chartData = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(l => ({
      date: new Date(l.date).toLocaleDateString("ar-SA", { day: "numeric", month: "short" }),
      mental: l.mental_final_score,
      physical: l.physical_final_score,
      religious: l.religious_final_score,
      distraction: l.distraction_points,
      total: l.total_score,
    }));

  const stats = [
    { icon: Footprints, label: "أيام متتالية", value: `${streak}`, color: "text-primary" },
    { icon: TrendingUp, label: "متوسط يومي", value: `${avg}/40`, color: "text-accent" },
    { icon: Target, label: "نقاط الأسبوع", value: `${weeklyScore}`, color: "text-primary" },
    { icon: Star, label: "أفضل يوم", value: best ? `${best.total_score}/40` : "—", color: "text-accent" },
    { icon: Calendar, label: "أيام نشطة", value: `${activeDays}`, color: "text-primary" },
    { icon: Activity, label: "إجمالي التقييمات", value: `${logs.length}`, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen gradient-desert px-4 sm:px-6 py-8 pb-28" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-muted-foreground text-xs tracking-[0.2em] font-sans-ui">نظرة عامة</p>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-foreground mt-1 mb-2">الإحصائيات</h1>
          <p className={`text-sm font-sans-ui mb-6 ${weeklyRating.color}`}>التقييم الأسبوعي: {weeklyRating.label}</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sand">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2 opacity-70`} />
              <p className="text-2xl font-serif-display font-semibold text-foreground">{stat.value}</p>
              <p className="text-muted-foreground text-xs mt-1 font-sans-ui">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Total Score Trend */}
        {chartData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sand mb-4">
            <h2 className="font-serif-display text-lg font-semibold text-foreground mb-4">مسار النقاط الإجمالية</h2>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(155, 35%, 28%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(155, 35%, 28%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(150, 10%, 45%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(150, 10%, 45%)' }} axisLine={false} tickLine={false} width={25} domain={[0, 40]} />
                  <Tooltip contentStyle={{ background: 'hsl(40, 25%, 98%)', border: '1px solid hsl(40, 18%, 84%)', borderRadius: '8px', fontSize: '11px', color: 'hsl(150, 25%, 15%)' }} />
                  <Area type="monotone" dataKey="total" name="الإجمالي" stroke="hsl(155, 35%, 28%)" fill="url(#totalGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Axes Breakdown */}
        {chartData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sand">
            <h2 className="font-serif-display text-lg font-semibold text-foreground mb-4">أداء المحاور</h2>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(150, 10%, 45%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(150, 10%, 45%)' }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip contentStyle={{ background: 'hsl(40, 25%, 98%)', border: '1px solid hsl(40, 18%, 84%)', borderRadius: '8px', fontSize: '11px', color: 'hsl(150, 25%, 15%)' }} />
                  <Bar dataKey="mental" name="الذهني" fill="hsl(155, 35%, 28%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="physical" name="الجسدي" fill="hsl(43, 65%, 52%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="religious" name="الديني" fill="hsl(145, 15%, 50%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs font-sans-ui text-muted-foreground">
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: 'hsl(155, 35%, 28%)' }} /> الذهني</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: 'hsl(43, 65%, 52%)' }} /> الجسدي</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: 'hsl(145, 15%, 50%)' }} /> الديني</span>
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

      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3 z-50">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Footprints className="w-5 h-5" /><span className="text-xs font-sans-ui">الرحلة</span>
          </Link>
          <Link to="/progress" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <TrendingUp className="w-5 h-5" /><span className="text-xs font-sans-ui">التقييم</span>
          </Link>
          <Link to="/statistics" className="flex flex-col items-center gap-1 text-primary">
            <BarChart3 className="w-5 h-5" /><span className="text-xs font-sans-ui">الإحصائيات</span>
          </Link>
          <Link to="/weekly" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="w-5 h-5" /><span className="text-xs font-sans-ui">التقرير</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Statistics;
