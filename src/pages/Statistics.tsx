import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { loadJourney, getStreak, getAverageProgress, getBestDay, getActiveDays, getTotalProgress, JourneyData } from "@/lib/store";
import { Footprints, TrendingUp, BarChart3, Star, Calendar, Target, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const Statistics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<JourneyData | null>(null);

  useEffect(() => {
    const journey = loadJourney();
    if (!journey.goal) {
      navigate("/setup");
      return;
    }
    setData(journey);
  }, [navigate]);

  if (!data) return null;

  const streak = getStreak(data.entries);
  const avg = getAverageProgress(data.entries);
  const best = getBestDay(data.entries);
  const activeDays = getActiveDays(data.entries);
  const totalProgress = getTotalProgress(data.entries);

  const chartData = [...data.entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map(e => ({
      date: new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      progress: e.progress,
    }));

  const stats = [
    { icon: Footprints, label: "Current Streak", value: `${streak} days` },
    { icon: TrendingUp, label: "Average Progress", value: `${avg}%` },
    { icon: Target, label: "Overall Journey", value: `${totalProgress}%` },
    { icon: Star, label: "Best Day", value: best ? `${best.progress}%` : "—" },
    { icon: Calendar, label: "Active Days", value: `${activeDays}` },
    { icon: Activity, label: "Total Entries", value: `${data.entries.length}` },
  ];

  return (
    <div className="min-h-screen gradient-desert px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <p className="text-dust text-xs tracking-[0.2em] uppercase font-sans-ui">Overview</p>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-foreground mt-1 mb-8">
            Statistics
          </h1>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-card border border-border rounded-xl p-5 shadow-sand"
            >
              <stat.icon className="w-4 h-4 text-primary/60 mb-2" />
              <p className="text-xl font-serif-display font-semibold text-foreground">{stat.value}</p>
              <p className="text-muted-foreground text-[11px] mt-1 font-sans-ui">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card border border-border rounded-xl p-6 shadow-sand"
          >
            <h2 className="font-serif-display text-lg font-semibold text-foreground mb-6">Progress History</h2>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(33, 38%, 61%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(33, 38%, 61%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(36, 15%, 55%)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'hsl(36, 15%, 55%)' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(36, 15%, 12%)',
                      border: '1px solid hsl(36, 12%, 20%)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(36, 30%, 88%)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="progress"
                    stroke="hsl(33, 38%, 61%)"
                    strokeWidth={2}
                    fill="url(#progressGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {chartData.length <= 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-card/50 border border-border/50 rounded-xl p-8 text-center"
          >
            <p className="text-muted-foreground text-sm">Log more days to see your progress chart.</p>
          </motion.div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-6 py-3">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Footprints className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">Journey</span>
          </Link>
          <Link to="/progress" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">Progress</span>
          </Link>
          <Link to="/statistics" className="flex flex-col items-center gap-1 text-primary">
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">Stats</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Statistics;
