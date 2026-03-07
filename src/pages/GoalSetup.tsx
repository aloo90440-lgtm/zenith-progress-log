import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { saveGoal, loadJourney } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const GoalSetup = () => {
  const navigate = useNavigate();
  const existing = loadJourney().goal;
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [duration, setDuration] = useState<string>(existing?.duration?.toString() || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveGoal({
      title: title.trim(),
      description: description.trim(),
      duration: duration ? parseInt(duration) : undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
    });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen gradient-desert flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg"
      >
        <p className="text-dust text-sm tracking-[0.3em] uppercase mb-3 font-sans-ui text-center">
          Define your path
        </p>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-foreground mb-2 text-center">
          Your Journey Goal
        </h1>
        <div className="w-12 h-px bg-primary/40 mx-auto mb-10" />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">
              Journey Goal
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master a new language"
              className="bg-card border-border text-foreground placeholder:text-muted-foreground/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">
              Goal Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this goal means to you..."
              className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 min-h-[100px] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">
              Duration (days) — optional
            </label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 30"
              min="1"
              max="365"
              className="bg-card border-border text-foreground placeholder:text-muted-foreground/50"
            />
          </div>

          <button
            type="submit"
            className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg text-base tracking-wide hover:opacity-90 transition-opacity shadow-sand mt-4"
          >
            Begin the Journey
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default GoalSetup;
