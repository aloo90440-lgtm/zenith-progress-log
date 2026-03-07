import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { loadJourney, getStreak, getTodayStr, getAverageProgress, JourneyData } from "@/lib/store";
import { Footprints, TrendingUp, CalendarDays, Settings, BarChart3 } from "lucide-react";

const Dashboard = () => {
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

  if (!data || !data.goal) return null;

  const streak = getStreak(data.entries);
  const todayEntry = data.entries.find(e => e.date === getTodayStr());
  const lastEntry = [...data.entries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const avgProgress = getAverageProgress(data.entries);

  return (
    <div className="min-h-screen gradient-desert px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <p className="text-dust text-xs tracking-[0.2em] uppercase font-sans-ui">Your Journey</p>
            <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-foreground mt-1">
              {data.goal.title}
            </h1>
          </div>
          <Link to="/settings" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        </motion.div>

        {/* Goal description */}
        {data.goal.description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-sm mb-10 leading-relaxed border-l-2 border-primary/30 pl-4"
          >
            {data.goal.description}
          </motion.p>
        )}

        {/* Streak - Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-8 mb-6 text-center shadow-sand"
        >
          <Footprints className="w-8 h-8 text-primary mx-auto mb-3 opacity-70" />
          <p className="text-6xl sm:text-7xl font-serif-display font-bold text-foreground">
            {streak}
          </p>
          <p className="text-muted-foreground text-sm mt-2 font-sans-ui tracking-wide">
            day streak
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-5 shadow-sand"
          >
            <TrendingUp className="w-5 h-5 text-primary/60 mb-2" />
            <p className="text-2xl font-serif-display font-semibold text-foreground">
              {avgProgress}%
            </p>
            <p className="text-muted-foreground text-xs mt-1 font-sans-ui">Avg. Progress</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-xl p-5 shadow-sand"
          >
            <CalendarDays className="w-5 h-5 text-primary/60 mb-2" />
            <p className="text-2xl font-serif-display font-semibold text-foreground">
              {todayEntry ? `${todayEntry.progress}%` : "—"}
            </p>
            <p className="text-muted-foreground text-xs mt-1 font-sans-ui">Today</p>
          </motion.div>
        </div>

        {/* Last entry */}
        {lastEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-card/50 border border-border/50 rounded-xl p-5 mb-8"
          >
            <p className="text-xs text-muted-foreground font-sans-ui mb-1">Last Entry</p>
            <p className="text-foreground text-sm">
              <span className="text-primary font-medium">{lastEntry.progress}%</span> progress on{" "}
              {new Date(lastEntry.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={() => navigate("/progress")}
            className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-4 rounded-xl text-base tracking-wide hover:opacity-90 transition-opacity shadow-sand"
          >
            {todayEntry ? "Update Today's Progress" : "Log Today's Progress"}
          </button>
        </motion.div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-6 py-3">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-primary">
            <Footprints className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">Journey</span>
          </Link>
          <Link to="/progress" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">Progress</span>
          </Link>
          <Link to="/statistics" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">Stats</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
