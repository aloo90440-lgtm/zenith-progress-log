import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Calendar, Award, Brain, Dumbbell, BookOpen, Zap, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type User, getEntries, getCurrentWeekNumber, getWeekEntries, getWeeklyRating } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';

interface Props { user: User; }

const AXIS_COLORS = ['hsl(210, 80%, 55%)', 'hsl(145, 63%, 42%)', 'hsl(42, 85%, 55%)'];
const AXIS_NAMES = ['الذهني', 'الجسدي', 'الديني'];

export default function Dashboard({ user }: Props) {
  const entries = useMemo(() => getEntries(user.id), [user.id]);
  const currentWeek = getCurrentWeekNumber(user.id);
  const weekEntries = useMemo(() => getWeekEntries(user.id, currentWeek), [user.id, currentWeek]);

  const weeklyTotal = weekEntries.reduce((sum, e) => sum + e.totalPoints, 0);
  const rating = getWeeklyRating(weeklyTotal);
  const avgDaily = weekEntries.length > 0 ? Math.round(weeklyTotal / weekEntries.length) : 0;
  const bestDay = weekEntries.length > 0 ? weekEntries.reduce((best, e) => e.totalPoints > best.totalPoints ? e : best, weekEntries[0]) : null;

  // Axis averages for the week
  const axisData = useMemo(() => {
    if (weekEntries.length === 0) return [];
    const mental = weekEntries.reduce((s, e) => s + e.mentalAxis.points, 0) / weekEntries.length;
    const physical = weekEntries.reduce((s, e) => s + e.physicalAxis.points, 0) / weekEntries.length;
    const religious = weekEntries.reduce((s, e) => s + e.religiousAxis.points, 0) / weekEntries.length;
    return [
      { name: 'الذهني', value: Math.round(mental * 10) / 10, fill: AXIS_COLORS[0] },
      { name: 'الجسدي', value: Math.round(physical * 10) / 10, fill: AXIS_COLORS[1] },
      { name: 'الديني', value: Math.round(religious * 10) / 10, fill: AXIS_COLORS[2] },
    ];
  }, [weekEntries]);

  // Daily chart data
  const dailyChartData = useMemo(() => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return weekEntries.map(e => ({
      name: days[new Date(e.date).getDay()],
      points: e.totalPoints,
    }));
  }, [weekEntries]);

  // Distraction stats
  const distractionData = useMemo(() => {
    const counts = { none: 0, less1h: 0, '1to3h': 0, more3h: 0 };
    weekEntries.forEach(e => counts[e.distraction.level]++);
    return [
      { name: 'لا مشتتات', value: counts.none, fill: 'hsl(145, 63%, 42%)' },
      { name: '< ساعة', value: counts.less1h, fill: 'hsl(42, 85%, 55%)' },
      { name: '1-3 ساعات', value: counts['1to3h'], fill: 'hsl(30, 90%, 50%)' },
      { name: '> 3 ساعات', value: counts.more3h, fill: 'hsl(0, 72%, 51%)' },
    ].filter(d => d.value > 0);
  }, [weekEntries]);

  // Weekly notes
  const weeklyNotes = weekEntries.filter(e => e.note).map(e => ({ date: e.date, note: e.note }));

  // Weaknesses
  const weaknesses = useMemo(() => {
    if (axisData.length === 0) return [];
    return [...axisData].sort((a, b) => a.value - b.value).filter(a => a.value < 8);
  }, [axisData]);

  if (entries.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
        <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">لا توجد بيانات بعد</h2>
        <p className="text-muted-foreground">ابدأ بتسجيل أدائك اليومي لعرض الإحصائيات</p>
      </motion.div>
    );
  }

  const statCards = [
    { icon: Target, label: 'مجموع الأسبوع', value: `${weeklyTotal}/200`, gradient: 'from-primary to-primary/70' },
    { icon: TrendingUp, label: 'المتوسط اليومي', value: `${avgDaily}/40`, gradient: 'from-info to-info/70' },
    { icon: Calendar, label: 'أيام مسجلة', value: weekEntries.length.toString(), gradient: 'from-success to-success/70' },
    { icon: Award, label: 'التقييم', value: rating.label, gradient: 'from-secondary to-secondary/70' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold">الأسبوع {currentWeek}</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="shadow-card overflow-hidden">
              <CardContent className="pt-4 pb-4">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} w-fit mb-2`}>
                  <stat.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Daily performance chart */}
      {dailyChartData.length > 0 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg">الأداء اليومي</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 40]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="points" fill="hsl(168, 55%, 32%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Axis performance */}
        {axisData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg">أداء المحاور</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {axisData.map((axis, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{axis.name}</span>
                      <span className="font-bold">{axis.value}/10</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(axis.value / 10) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: axis.fill }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distractions */}
        {distractionData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg">إحصائيات المشتتات</CardTitle></CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distractionData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {distractionData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weaknesses */}
      {weaknesses.length > 0 && (
        <Card className="shadow-card border-warning/30">
          <CardHeader><CardTitle className="text-lg text-warning">نقاط الضعف</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-warning">⚠️</span>
                  <span>{w.name}: متوسط {w.value}/10 - يحتاج تحسين</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Best day */}
      {bestDay && (
        <Card className="shadow-card border-success/30">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Star className="h-5 w-5 text-secondary" /> أفضل يوم أداء</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{new Date(bestDay.date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-muted-foreground">{bestDay.totalPoints} نقطة</p>
          </CardContent>
        </Card>
      )}

      {/* Weekly lessons */}
      {weeklyNotes.length > 0 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg">📚 الدروس المستفادة هذا الأسبوع</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {weeklyNotes.map((n, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground shrink-0">{new Date(n.date).toLocaleDateString('ar-SA', { weekday: 'short' })}</span>
                  <span>{n.note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
