import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { saveDailyEntry, getTodayStr, loadJourney, getMotivationalMessage } from "@/lib/store";
import { Slider } from "@/components/ui/slider";
import { Footprints, TrendingUp, BarChart3 } from "lucide-react";

const DailyProgress = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(50);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const journey = loadJourney();
    if (!journey.goal) {
      navigate("/setup");
      return;
    }
    const today = journey.entries.find(e => e.date === getTodayStr());
    if (today) setProgress(today.progress);
  }, [navigate]);

  const handleSubmit = () => {
    saveDailyEntry({
      date: getTodayStr(),
      progress,
      createdAt: new Date().toISOString(),
    });
    setMessage(getMotivationalMessage());
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen gradient-desert flex items-center justify-center px-6 py-12 pb-24">
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <p className="text-dust text-sm tracking-[0.3em] uppercase mb-3 font-sans-ui">
                Daily Check-in
              </p>
              <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-foreground mb-2">
                How much progress today?
              </h1>
              <div className="w-12 h-px bg-primary/40 mx-auto mb-10" />

              <div className="bg-card border border-border rounded-xl p-8 shadow-sand mb-8">
                <p className="text-7xl sm:text-8xl font-serif-display font-bold text-foreground mb-6">
                  {progress}%
                </p>

                <Slider
                  value={[progress]}
                  onValueChange={(v) => setProgress(v[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />

                <div className="flex justify-between mt-3 text-xs text-muted-foreground font-sans-ui">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-4 rounded-xl text-base tracking-wide hover:opacity-90 transition-opacity shadow-sand"
              >
                Save Progress
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Footprints className="w-8 h-8 text-primary" />
              </div>

              <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-foreground mb-4">
                {progress}% recorded
              </h2>

              <p className="text-muted-foreground text-lg mb-10 italic max-w-sm mx-auto leading-relaxed">
                "{message}"
              </p>

              <button
                onClick={() => navigate("/dashboard")}
                className="gradient-sand text-primary-foreground font-sans-ui font-medium px-10 py-3.5 rounded-lg text-base tracking-wide hover:opacity-90 transition-opacity shadow-sand"
              >
                Back to Journey
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-6 py-3">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Footprints className="w-5 h-5" />
            <span className="text-[10px] font-sans-ui">Journey</span>
          </Link>
          <Link to="/progress" className="flex flex-col items-center gap-1 text-primary">
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

export default DailyProgress;
