import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { loadJourney, saveGoal } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

const SettingsPage = () => {
  const navigate = useNavigate();
  const journey = loadJourney();
  const [title, setTitle] = useState(journey.goal?.title || "");
  const [description, setDescription] = useState(journey.goal?.description || "");
  const [duration, setDuration] = useState(journey.goal?.duration?.toString() || "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveGoal({
      title: title.trim(),
      description: description.trim(),
      duration: duration ? parseInt(duration) : undefined,
      createdAt: journey.goal?.createdAt || new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen gradient-desert px-6 py-8">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-sans-ui text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="font-serif-display text-2xl font-semibold text-foreground mb-8">Settings</h1>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">Journey Goal</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-card border-border text-foreground" required />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-card border-border text-foreground min-h-[100px] resize-none" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2 font-sans-ui">Duration (days)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" max="365" className="bg-card border-border text-foreground" />
            </div>
            <button type="submit" className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand">
              {saved ? "Saved ✓" : "Save Changes"}
            </button>
          </form>

          <div className="mt-12 border-t border-border pt-8">
            <h2 className="font-serif-display text-lg font-semibold text-foreground mb-4">Reset Journey</h2>
            <p className="text-muted-foreground text-sm mb-4">This will delete all your progress data. This cannot be undone.</p>
            <button
              onClick={() => {
                if (confirm("Are you sure? All progress will be lost.")) {
                  localStorage.removeItem("the-journey-data");
                  navigate("/");
                }
              }}
              className="text-destructive border border-destructive/30 px-6 py-2.5 rounded-lg text-sm font-sans-ui hover:bg-destructive/10 transition-colors"
            >
              Reset Everything
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
