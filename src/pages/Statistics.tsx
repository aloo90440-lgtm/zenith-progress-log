import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getProfile, getDailyLogs, getPendingAppendedTasksDb, DbProfile, DbDailyLog, DbAppendedTask } from "@/lib/supabase-store";
import {
  getWeeklyRating, getDateOffset, getTodayStr, getAllAxisMaxScores,
  AXIS_LABELS, getDailyRating, getChallengeBadge, getGoalProgress,
  getLongestStreak, getUnitLabel,
} from "@/lib/store";
import { TrendingUp, BarChart3, Star, Target, Activity, Flame, AlertTriangle, Trophy, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Progress } from "@/components/ui/progress";

const Statistics = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [logs, setLogs] = useState<DbDailyLog[]>([]);
  const [pendingTasks, setPendingTasks] = useState<(DbAppendedTask & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveDate = getTodayStr();

  useEffect(() => {
    const load = async () => {
      const p = await getProfile();
      if (!p || !p.primary_goal) { navigate("/setup"); return; }
      setProfile(p);
      const l = await getDailyLogs();
      setLogs(l);
      // Get tomorrow's pending tasks
      const tomorrow = getDateOffset(effectiveDate, 1);
      const pending = await getPendingAppendedTasksDb(tomorrow);
      setPendingTasks(pending);
      setLoading(false);
    };
    load();
  }, [navigate, effectiveDate]);

  if (loading || !profile) return <div className="min-h-screen gradient-desert flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const today = effectiveDate;
  const weights = profile.axis_weights;
  const maxScores = getAllAxisMaxScores(weights);

  // Streak calculation
  let streak = 0;
  let checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    const found = logs.find(l => l.date === dateStr && l.total_score > 0);
    if (found) streak++;
    else if (i > 0) break;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Longest streak
  let longestStreak = 0;
  let currentRun = 0;
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  let lastDate = '';
  for (const log of sortedLogs) {
    if (log.total_score <= 0) { currentRun = 0; lastDate = ''; continue; }
    if (lastDate && getDateOffset(lastDate, 1) === log.date) {
      currentRun++;
    } else {
      currentRun = 1;
    }
    lastDate = log.date;
    longestStreak = Math.max(longestStreak, currentRun);
  }

  const avg = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.total_score, 0) / logs.length) : 0;

  const weekAgo = getDateOffset(today, -6);
  const weeklyLogs = logs.filter(l => l.date >= weekAgo && l.date <= today);
  const weeklyScore = weeklyLogs.reduce((s, l) => s + l.total_score, 0);
  const weeklyRating = getWeeklyRating(weeklyScore);

  // Axis totals for weekly
  const axisTotals = { mental: 0, physical: 0, religious: 0 };
  const distractionTotal = weeklyLogs.reduce((s, l) => s + l.distraction_points, 0);
  for (const l of weeklyLogs) {
    axisTotals.mental += l.mental_final_score;
    axisTotals.physical += l.physical_final_score;
    axisTotals.religious += l.religious_final_score;
  }

  // Weakness/strength
  const labels: Record<string, string> = { mental: 'الذهني', physical: 'الجسدي', religious: 'الديني' };
  let weakness: string | null = null;
  let strength: string | null = null;
  if (weeklyLogs.length > 0) {
    const min = Math.min(axisTotals.mental, axisTotals.physical, axisTotals.religious);
    const max = Math.max(axisTotals.mental, axisTotals.physical, axisTotals.religious);
    weakness = labels[Object.entries(axisTotals).find(([, v]) => v === min)?.[0] || ''] || null;
    strength = labels[Object.entries(axisTotals).find(([, v]) => v === max)?.[0] || ''] || null;
  }

  // Most time-consuming distraction
  const distractionTypes: Record<string, number> = {};
  for (const l of weeklyLogs) {
    if (l.distraction_type && l.distraction_tier !== 'none') {
      distractionTypes[l.distraction_type] = (distractionTypes[l.distraction_type] || 0) + 1;
    }
  }
  const topDistraction = Object.entries(distractionTypes).sort((a, b) => b[1] - a[1])[0];
  const distractionLabels: Record<string, string> = { social: 'سوشيال ميديا', movies: 'أفلام', music: 'موسيقى', other: 'أخرى' };

  const cleanDays = weeklyLogs.filter(l => l.distraction_tier === 'none').length;

  // Chart data
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

  // Goal progress (20-day challenge)
  const goalProgress = {
    current: logs.length,
    target: 20,
    percentage: Math.min(100, Math.round((logs.length / 20) * 100)),
  };
  const avgRating = getDailyRating(avg);

  // Challenge map data (20 days)
  const challengeMap = sortedLogs.slice(0, 20);

  // Today's rating
  const todayLog = logs.find(l => l.date === today);
  const todayRating = todayLog ? getDailyRating(todayLog.total_score) : null;

  // Low performance reminder
  const isLowPerformance = avg < 28 && logs.length > 2;

  return (
    <div className="min-h-screen gradient-desert px-4 sm:px-6 py-8 pb-28" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-muted-foreground text-xs tracking-[0.2em] font-sans-ui">مرحبًا، {profile.name}</p>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-foreground mt-1 mb-2">إحصائياتك</h1>
        </motion.div>

        {/* Goal Pinned */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-xl p-4 mb-4">
          <p className="text-xs text-muted-foreground font-sans-ui mb-1">🎯 هدفك</p>
          <p className="text-foreground text-sm font-medium">{profile.primary_goal}</p>
        </motion.div>

        {/* Low performance reminder */}
        {isLowPerformance && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-4">
            <p className="text-destructive text-sm font-sans-ui font-semibold text-center mb-1">
              أداؤك أضعف من المعتاد
            </p>
            <p className="text-foreground text-xs font-sans-ui text-center">
              تذكّر: "{profile.goal_importance.split('\n')[0]}"
            </p>
          </motion.div>
        )}

        {/* Streak with Fire */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-6 mb-4 text-center shadow-sand">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className={`w-8 h-8 ${streak > 0 ? 'text-accent' : 'text-muted-foreground'}`} />
            {streak >= 3 && <Flame className="w-6 h-6 text-accent/70" />}
            {streak >= 7 && <Flame className="w-5 h-5 text-accent/50" />}
          </div>
          <p className="text-5xl font-serif-display font-bold text-foreground">{streak}</p>
          <p className="text-muted-foreground text-sm mt-1 font-sans-ui">يوم متتالي 🔥</p>
          <p className="text-xs text-muted-foreground font-sans-ui mt-1">
            أطول سلسلة: <span className="text-primary font-semibold">{longestStreak}</span> يوم
          </p>
        </motion.div>

        {/* Goal Progress (20-day) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5 mb-4 shadow-sand">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-primary/70" />
            <p className="text-sm font-sans-ui text-foreground font-semibold">مؤشر السعي نحو الهدف</p>
          </div>
          <Progress value={goalProgress.percentage} className="h-3 mb-2" />
          <div className="flex justify-between text-xs font-sans-ui text-muted-foreground">
            <span>{goalProgress.current}/{goalProgress.target} يوم</span>
            <span>{goalProgress.percentage}%</span>
          </div>
          <p className={`text-sm font-sans-ui text-center mt-2 ${avgRating.color}`}>
            {avgRating.emoji} {avg >= 36 ? 'تقدم ممتاز!' : avg >= 28 ? 'تقدم مستمر!' : 'تقدم أبطأ، اجتهد أكثر!'}
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-xl p-4 text-center shadow-sand">
            <p className="text-2xl font-serif-display font-semibold text-foreground">{todayLog?.total_score ?? '—'}</p>
            <p className="text-muted-foreground text-xs mt-1 font-sans-ui">نقاط اليوم</p>
            {todayRating && <p className={`text-xs mt-0.5 ${todayRating.color}`}>{todayRating.label}</p>}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-4 text-center shadow-sand">
            <p className="text-2xl font-serif-display font-semibold text-foreground">{weeklyScore}</p>
            <p className="text-muted-foreground text-xs mt-1 font-sans-ui">نقاط الأسبوع</p>
            <p className={`text-xs mt-0.5 ${weeklyRating.color}`}>{weeklyRating.label}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-card border border-border rounded-xl p-4 text-center shadow-sand">
            <p className="text-2xl font-serif-display font-semibold text-foreground">{avg}/40</p>
            <p className="text-muted-foreground text-xs mt-1 font-sans-ui">متوسط يومي</p>
          </motion.div>
        </div>

        {/* Box 1: Weekly Axis Performance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl p-5 mb-4 shadow-sand">
          <h3 className="text-sm font-sans-ui text-muted-foreground mb-4">أداء المحاور هذا الأسبوع</h3>
          {(Object.entries(axisTotals) as Array<['mental' | 'physical' | 'religious', number]>).map(([key, total]) => {
            const maxForAxis = weeklyLogs.length * maxScores[key];
            const pct = maxForAxis > 0 ? Math.round((total / maxForAxis) * 100) : 0;
            const lost = maxForAxis - total;
            return (
              <div key={key} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm font-sans-ui mb-1">
                  <span className="text-foreground">{AXIS_LABELS[key]}</span>
                  <span className="text-primary">{total}/{maxForAxis} ({pct}%)</span>
                </div>
                <div className="h-2.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                {lost > 0 && <p className="text-xs text-destructive font-sans-ui mt-0.5">خسارة: {lost} نقطة</p>}
              </div>
            );
          })}
          <div className="mt-3">
            <div className="flex justify-between text-sm font-sans-ui mb-1">
              <span className="text-foreground">المشتتات</span>
              <span className="text-primary">{distractionTotal}/{weeklyLogs.length * 10}</span>
            </div>
            <div className="h-2.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent/70 rounded-full transition-all" style={{ width: `${weeklyLogs.length > 0 ? (distractionTotal / (weeklyLogs.length * 10)) * 100 : 0}%` }} />
            </div>
          </div>
        </motion.div>

        {/* Box 2: Tomorrow's Alerts */}
        {pendingTasks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-4 shadow-sand">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-sans-ui text-foreground font-semibold">تنبيهات الغد</h3>
            </div>
            {pendingTasks.map((task, i) => (
              <div key={task.id} className="flex items-start gap-2 mb-2 last:mb-0">
                <Star className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-foreground text-sm font-sans-ui">
                    {task.task_desc || AXIS_LABELS[task.axis_type]}
                  </p>
                  {task.task_quantity && task.task_unit && (
                    <p className="text-muted-foreground text-xs font-sans-ui">
                      {task.task_quantity} {getUnitLabel(task.axis_type, task.task_unit)}
                    </p>
                  )}
                  <p className="text-accent text-xs font-sans-ui">
                    يمكن استرجاع ⭐ {task.points_to_reclaim} نقطة ({task.reclaim_percentage}%)
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Insights Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {weakness && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
              <p className="text-xs text-muted-foreground font-sans-ui">أضعف محور</p>
              <p className="text-destructive text-sm font-sans-ui font-semibold">{weakness}</p>
            </motion.div>
          )}
          {strength && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-xs text-muted-foreground font-sans-ui">أقوى محور</p>
              <p className="text-primary text-sm font-sans-ui font-semibold">{strength}</p>
            </motion.div>
          )}
          {topDistraction && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}
              className="bg-accent/5 border border-accent/20 rounded-xl p-3">
              <p className="text-xs text-muted-foreground font-sans-ui">أكثر مشتت</p>
              <p className="text-accent text-sm font-sans-ui font-semibold">{distractionLabels[topDistraction[0]] || topDistraction[0]}</p>
            </motion.div>
          )}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}
            className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground font-sans-ui">أيام نظيفة</p>
            <p className="text-primary text-sm font-sans-ui font-semibold">{cleanDays}/{weeklyLogs.length}</p>
          </motion.div>
        </div>

        {/* Total Score Trend */}
        {chartData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sand mb-4">
            <h2 className="font-serif-display text-lg font-semibold text-foreground mb-4">المنحنى البياني</h2>
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

        {/* Axes Breakdown Chart */}
        {chartData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
            className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sand mb-4">
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

        {/* Challenge Map (20 days) */}
        {challengeMap.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="bg-card border border-border rounded-xl p-5 mb-4 shadow-sand">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-accent" />
              <h2 className="font-serif-display text-lg font-semibold text-foreground">خريطة التحدي (20 يوم)</h2>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }).map((_, i) => {
                const log = challengeMap[i];
                const score = log?.total_score ?? 0;
                const hasData = !!log;
                const badge = hasData ? getChallengeBadge(score) : null;
                const bgColor = !hasData ? 'bg-border/50' :
                  score >= 35 ? 'bg-primary/20 border-primary/30' :
                  score >= 20 ? 'bg-accent/20 border-accent/30' :
                  'bg-destructive/20 border-destructive/30';

                return (
                  <div key={i} className={`aspect-square rounded-xl border flex flex-col items-center justify-center ${bgColor} transition-all`}>
                    <span className="text-xs font-sans-ui text-muted-foreground">يوم {i + 1}</span>
                    {hasData && badge && (
                      <>
                        <span className="text-lg">{badge.emoji}</span>
                        <span className="text-[9px] font-sans-ui text-foreground/70">{score}/40</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs font-sans-ui text-muted-foreground">
              <span className="flex items-center gap-1.5">⚔️ محارب (≥35)</span>
              <span className="flex items-center gap-1.5">🛡️ جيد (20-34)</span>
              <span className="flex items-center gap-1.5">🐢 ضعيف (&lt;20)</span>
            </div>
          </motion.div>
        )}

        {chartData.length <= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="bg-card/50 border border-border/50 rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">سجّل المزيد من الأيام لرؤية الرسوم البيانية والإحصائيات.</p>
          </motion.div>
        )}
      </div>

      {/* Bottom Nav - 2 pages only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3 z-50">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link to="/progress" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <TrendingUp className="w-5 h-5" /><span className="text-xs font-sans-ui">التقييم</span>
          </Link>
          <Link to="/statistics" className="flex flex-col items-center gap-1 text-primary">
            <BarChart3 className="w-5 h-5" /><span className="text-xs font-sans-ui">إحصائياتك</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Statistics;
