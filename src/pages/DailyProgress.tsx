import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAxisScore, getDistractionScore, calculateDailyTotal,
  getAllAxisMaxScores, getMotivationalMessage, getTodayStr,
  TaskStatus, DistractionTier, DistractionType,
  AXIS_LABELS, STATUS_LABELS, DISTRACTION_LABELS, DISTRACTION_TYPE_LABELS,
} from "@/lib/store";
import {
  getProfile, getTodayLog, saveDailyLogDb, getPendingAppendedTasksDb,
  markTaskCompleted, generateAndSaveAppendedTasks, checkConsecutiveDistractionDb,
  DbProfile, DbAppendedTask,
} from "@/lib/supabase-store";
import { Footprints, TrendingUp, BarChart3, FileText, CheckCircle2, XCircle } from "lucide-react";

const DailyProgress = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [distraction, setDistraction] = useState<DistractionTier | null>(null);
  const [distractionType, setDistractionType] = useState<DistractionType | null>(null);
  const [mentalStatus, setMentalStatus] = useState<TaskStatus | null>(null);
  const [physicalStatus, setPhysicalStatus] = useState<TaskStatus | null>(null);
  const [religiousStatus, setReligiousStatus] = useState<TaskStatus | null>(null);
  const [dailyNote, setDailyNote] = useState("");
  const [message, setMessage] = useState("");
  const [pendingTasks, setPendingTasks] = useState<(DbAppendedTask & { id: string })[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [failedTaskIds, setFailedTaskIds] = useState<string[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const p = await getProfile();
      if (!p || !p.primary_goal) { navigate("/setup"); return; }
      setProfile(p);

      const pending = await getPendingAppendedTasksDb(getTodayStr());
      setPendingTasks(pending);

      // Load saved data for daily note only (not selections, to keep form fresh)
      const todayLog = await getTodayLog();
      if (todayLog) {
        setDailyNote(todayLog.daily_note);
      }

      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading || !profile) return <div className="min-h-screen gradient-desert flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const weights = profile.axis_weights;
  const maxScores = getAllAxisMaxScores(weights);
  const hasDistractionTypeStep = distraction !== null && distraction !== 'none';
  const hasAppendedStep = pendingTasks.length > 0;
  // Steps: 0=distraction, 1=type(conditional), 2=mental, 3=physical, 4=religious, 5=appended(conditional), 6=note, 7=done
  const typeStepOffset = hasDistractionTypeStep ? 0 : -1;
  const mentalStep = 2 + typeStepOffset;
  const physicalStep = 3 + typeStepOffset;
  const religiousStep = 4 + typeStepOffset;
  const appendedStep = 5 + typeStepOffset;
  const noteStep = hasAppendedStep ? 6 + typeStepOffset : 5 + typeStepOffset;
  const doneStep = noteStep + 1;
  const totalSteps = doneStep;

  const handleSubmit = async () => {
    if (!distraction || !mentalStatus || !physicalStatus || !religiousStatus) return;

    const distractionEntry = getDistractionScore(distraction);
    const mentalScore = getAxisScore(mentalStatus, maxScores.mental);
    const physicalScore = getAxisScore(physicalStatus, maxScores.physical);
    const religiousScore = getAxisScore(religiousStatus, maxScores.religious);

    const consecutive = await checkConsecutiveDistractionDb(getTodayStr());
    const recoveredPoints = completedTaskIds.reduce((sum, id) => {
      const t = pendingTasks.find(t => t.id === id);
      return sum + (t?.points_to_reclaim || 0);
    }, 0);

    const axes = {
      mental: mentalScore,
      physical: physicalScore,
      religious: religiousScore,
    };

    const axisTotal = axes.mental.finalScore + axes.physical.finalScore + axes.religious.finalScore;
    const total = consecutive ? 0 : Math.min(40, axisTotal + distractionEntry.points + recoveredPoints);
    setTotalScore(total);

    await saveDailyLogDb({
      date: getTodayStr(),
      distraction_tier: distraction,
      distraction_points: distractionEntry.points,
      distraction_istighfar: distractionEntry.istighfarMinutes,
      mental_status: mentalStatus,
      mental_base_score: mentalScore.baseScore,
      mental_deduction: mentalScore.deduction,
      mental_final_score: mentalScore.finalScore,
      physical_status: physicalStatus,
      physical_base_score: physicalScore.baseScore,
      physical_deduction: physicalScore.deduction,
      physical_final_score: physicalScore.finalScore,
      religious_status: religiousStatus,
      religious_base_score: religiousScore.baseScore,
      religious_deduction: religiousScore.deduction,
      religious_final_score: religiousScore.finalScore,
      daily_note: dailyNote.trim(),
      total_score: total,
      consecutive_distraction: consecutive,
    });

    // Mark completed appended tasks
    for (const id of completedTaskIds) {
      await markTaskCompleted(id);
    }

    // Generate new appended tasks from deductions
    await generateAndSaveAppendedTasks(axes, getTodayStr());

    setMessage(getMotivationalMessage());
    setStep(hasAppendedStep ? 6 : 5);
  };

  const distractionTiers: DistractionTier[] = ['none', 'less_1h', '2_3h', '4h_plus'];
  const taskStatuses: TaskStatus[] = ['completed', 'minor_lack', 'major_lack', 'not_done'];

  const selectWithDelay = (key: string, action: () => void) => {
    setPendingSelection(key);
    setTimeout(() => {
      action();
      setPendingSelection(null);
    }, 350);
  };

  const renderStatusOption = (status: TaskStatus, selected: TaskStatus | null, onSelect: (s: TaskStatus) => void, axisKey: 'mental' | 'physical' | 'religious') => {
    const score = getAxisScore(status, maxScores[axisKey]);
    const isActive = pendingSelection === `${axisKey}-${status}`;
    return (
      <button key={status} tabIndex={-1} onClick={() => selectWithDelay(`${axisKey}-${status}`, () => onSelect(status))}
        className={`w-full text-right p-4 rounded-xl border transition-all duration-200 outline-none ring-0 ${isActive ? 'border-primary bg-primary/15 scale-[1.03] shadow-sand' : selected === status ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30 active:scale-[0.98]'}`}>
        <div className="flex items-center justify-center gap-2">
          {isActive && <span className="text-primary text-lg">✓</span>}
          <span className={`text-sm font-sans-ui ${isActive ? 'text-primary font-semibold' : 'text-foreground'}`}>{STATUS_LABELS[status]}</span>
        </div>
      </button>
    );
  };

  const isDone = step === (hasAppendedStep ? 6 : 5);

  return (
    <div className="min-h-screen gradient-desert flex items-center justify-center px-4 sm:px-6 py-12 pb-28" dir="rtl">
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {isDone ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Footprints className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-serif-display text-3xl font-semibold text-foreground mb-2">{totalScore}/40</h2>
              <p className="text-muted-foreground text-lg mb-6 italic max-w-sm mx-auto">"{message}"</p>

              {/* Score Breakdown */}
              {(() => {
                const distractionEntry = distraction ? getDistractionScore(distraction) : null;
                const mentalScore = mentalStatus ? getAxisScore(mentalStatus, maxScores.mental) : null;
                const physicalScore = physicalStatus ? getAxisScore(physicalStatus, maxScores.physical) : null;
                const religiousScore = religiousStatus ? getAxisScore(religiousStatus, maxScores.religious) : null;

                const losses: { label: string; lost: number }[] = [];
                if (mentalScore && mentalScore.deduction > 0) losses.push({ label: AXIS_LABELS.mental, lost: mentalScore.deduction });
                if (physicalScore && physicalScore.deduction > 0) losses.push({ label: AXIS_LABELS.physical, lost: physicalScore.deduction });
                if (religiousScore && religiousScore.deduction > 0) losses.push({ label: AXIS_LABELS.religious, lost: religiousScore.deduction });
                if (distractionEntry && distractionEntry.points < 10) losses.push({ label: "المشتتات", lost: 10 - distractionEntry.points });

                return (
                  <div className="bg-card border border-border rounded-xl p-4 mb-6 text-right space-y-2">
                    <p className="text-foreground text-sm font-sans-ui font-semibold mb-3 text-center">تفصيل النتيجة</p>
                    <div className="flex justify-between text-sm font-sans-ui">
                      <span className="text-primary font-semibold">{mentalScore?.finalScore}/{maxScores.mental}</span>
                      <span className="text-muted-foreground">{AXIS_LABELS.mental}</span>
                    </div>
                    <div className="flex justify-between text-sm font-sans-ui">
                      <span className="text-primary font-semibold">{physicalScore?.finalScore}/{maxScores.physical}</span>
                      <span className="text-muted-foreground">{AXIS_LABELS.physical}</span>
                    </div>
                    <div className="flex justify-between text-sm font-sans-ui">
                      <span className="text-primary font-semibold">{religiousScore?.finalScore}/{maxScores.religious}</span>
                      <span className="text-muted-foreground">{AXIS_LABELS.religious}</span>
                    </div>
                    <div className="flex justify-between text-sm font-sans-ui">
                      <span className="text-primary font-semibold">{distractionEntry?.points}/10</span>
                      <span className="text-muted-foreground">المشتتات</span>
                    </div>
                    {losses.length > 0 && (
                      <>
                        <div className="border-t border-border my-2" />
                        <p className="text-destructive text-xs font-sans-ui text-center mb-1">النقاط المفقودة</p>
                        {losses.map((l, i) => (
                          <div key={i} className="flex justify-between text-xs font-sans-ui">
                            <span className="text-destructive">-{l.lost}</span>
                            <span className="text-muted-foreground">{l.label}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })()}

              {distraction && getDistractionScore(distraction).istighfarMinutes > 0 && (
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 text-center">
                  <p className="text-accent text-sm font-sans-ui">
                    📿 مطلوب منك {getDistractionScore(distraction).istighfarMinutes} دقيقة استغفار غدًا
                  </p>
                </div>
              )}

              <button onClick={() => navigate("/dashboard")}
                className="gradient-sand text-primary-foreground font-sans-ui font-medium px-10 py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand">
                العودة للرحلة
              </button>
            </motion.div>
          ) : (
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {/* Progress bar */}
              <div className="flex justify-center gap-1.5 mb-8">
                {Array.from({ length: totalSteps - 1 }).map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full max-w-8 transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
                ))}
              </div>

              {/* Step 0: Distractions */}
              {step === 0 && (
                <div>
                   <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-6 text-center">هل عرضت نفسك لمشتتات اليوم؟</h2>
                   <div className="space-y-3">
                     {distractionTiers.map(tier => {
                        const isActive = pendingSelection === `dist-${tier}`;
                        return (
                          <button key={tier} tabIndex={-1} onClick={() => selectWithDelay(`dist-${tier}`, () => { setDistraction(tier); setStep(1); })}
                            className={`w-full text-right p-4 rounded-xl border transition-all duration-200 outline-none ring-0 ${isActive ? 'border-primary bg-primary/15 scale-[1.03] shadow-sand' : distraction === tier ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30 active:scale-[0.98]'}`}>
                            <div className="flex items-center justify-center gap-2">
                              {isActive && <span className="text-primary text-lg">✓</span>}
                              <span className={`text-sm font-sans-ui ${isActive ? 'text-primary font-semibold' : 'text-foreground'}`}>{DISTRACTION_LABELS[tier]}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Steps 1-3: Axes */}
              {[1, 2, 3].includes(step) && (() => {
                const axisKey = (step === 1 ? 'mental' : step === 2 ? 'physical' : 'religious') as 'mental' | 'physical' | 'religious';
                const currentStatus = step === 1 ? mentalStatus : step === 2 ? physicalStatus : religiousStatus;
                const setter = step === 1 ? setMentalStatus : step === 2 ? setPhysicalStatus : setReligiousStatus;
                return (
                  <div>
                    <p className="text-dust text-sm tracking-[0.2em] mb-2 font-sans-ui text-center">المحور {step}/3</p>
                    <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-2 text-center">{AXIS_LABELS[axisKey]}</h2>
                    
                    <p className="text-muted-foreground text-sm mb-6 text-center">ما نسبة إتمامك لمهام هذا المحور اليوم؟</p>
                    <div className="space-y-3">
                      {taskStatuses.map(s => renderStatusOption(s, currentStatus, (sel) => { setter(sel); setStep(step + 1); }, axisKey))}
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Appended Tasks (conditional) */}
              {step === 4 && hasAppendedStep && (
                <div>
                  <p className="text-dust text-sm tracking-[0.2em] mb-2 font-sans-ui text-center">المهام التعويضية</p>
                  <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-6 text-center">مهام مُلحقة من أيام سابقة</h2>
                  <div className="space-y-3 mb-6">
                    {pendingTasks.map(task => {
                      const isCompleted = completedTaskIds.includes(task.id);
                      const isFailed = failedTaskIds.includes(task.id);
                      return (
                        <div key={task.id} className="bg-card border border-border rounded-xl p-4">
                          <p className="text-foreground text-sm mb-1 font-sans-ui">{AXIS_LABELS[task.axis_type]}</p>
                          <p className="text-muted-foreground text-xs mb-3">يمكن استرجاع {task.points_to_reclaim} نقطة ({task.reclaim_percentage}%)</p>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              setCompletedTaskIds(prev => [...prev.filter(id => id !== task.id), task.id]);
                              setFailedTaskIds(prev => prev.filter(id => id !== task.id));
                            }}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-sans-ui transition-all ${isCompleted ? 'bg-accent/20 border border-accent text-accent' : 'border border-border text-muted-foreground hover:border-accent/30'}`}>
                              <CheckCircle2 className="w-4 h-4" /> أنجزت
                            </button>
                            <button onClick={() => {
                              setFailedTaskIds(prev => [...prev.filter(id => id !== task.id), task.id]);
                              setCompletedTaskIds(prev => prev.filter(id => id !== task.id));
                            }}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-sans-ui transition-all ${isFailed ? 'bg-destructive/20 border border-destructive text-destructive' : 'border border-border text-muted-foreground hover:border-destructive/30'}`}>
                              <XCircle className="w-4 h-4" /> لم أنجز
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setStep(5)}
                    disabled={pendingTasks.some(t => !completedTaskIds.includes(t.id) && !failedTaskIds.includes(t.id))}
                    className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand disabled:opacity-50">
                    التالي
                  </button>
                </div>
              )}

              {/* Note step */}
              {step === (hasAppendedStep ? 5 : 4) && (
                <div>
                  <p className="text-dust text-sm tracking-[0.2em] mb-2 font-sans-ui text-center">تأمل</p>
                  <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-6 text-center">ما أهم شيء تعلمته اليوم؟</h2>
                  <textarea
                    value={dailyNote}
                    onChange={(e) => setDailyNote(e.target.value)}
                    placeholder="اكتب ملاحظتك هنا..."
                    className="w-full bg-card border border-border rounded-xl p-4 text-foreground placeholder:text-muted-foreground/50 min-h-[120px] resize-none font-sans-ui text-sm focus:outline-none focus:border-primary/50"
                  />
                  <button onClick={handleSubmit}
                    className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg mt-6 hover:opacity-90 transition-opacity shadow-sand">
                    حفظ التقييم
                  </button>
                </div>
              )}

              {/* Back button */}
              {step > 0 && !isDone && (
                <button onClick={() => setStep(step - 1)}
                  className="w-full mt-3 text-muted-foreground text-sm font-sans-ui py-2 hover:text-foreground transition-colors">
                  رجوع
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3 z-50">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Footprints className="w-5 h-5" /><span className="text-xs font-sans-ui">الرحلة</span>
          </Link>
          <Link to="/progress" className="flex flex-col items-center gap-1 text-primary">
            <TrendingUp className="w-5 h-5" /><span className="text-xs font-sans-ui">التقييم</span>
          </Link>
          <Link to="/statistics" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
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

export default DailyProgress;
