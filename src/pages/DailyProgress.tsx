import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAxisScore, getDistractionScore, getAllAxisMaxScores, getMotivationalMessage,
  getTodayStr, isEvaluationWindowOpen, getDailyRating, getRecoveryFactor,
  calcRecoveryQuantity, getUnitLabel,
  TaskStatus, DistractionTier, DistractionType, TaskInput,
  AXIS_LABELS, STATUS_LABELS, DISTRACTION_LABELS, DISTRACTION_TYPE_LABELS, AXIS_UNITS,
} from "@/lib/store";
import {
  getProfile, getTodayLog, saveDailyLogDb, getPendingAppendedTasksDb,
  markTaskCompleted, markTaskCancelled, cancelRemainingDayTasks,
  generateRecoveryTasks, generateIstighfarTask, generateSplitTasks,
  checkConsecutiveDistractionDb,
  DbProfile, DbAppendedTask,
} from "@/lib/supabase-store";
import { Footprints, TrendingUp, BarChart3, CheckCircle2, XCircle, AlertTriangle, Star, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StepId = 'distraction' | 'distraction_type' | 'distraction_istighfar' |
  'mental' | 'mental_tasks' | 'mental_recovery' | 'mental_notdone' |
  'physical' | 'physical_tasks' | 'physical_recovery' | 'physical_notdone' |
  'religious' | 'religious_tasks' | 'religious_recovery' | 'religious_notdone' |
  'note' | 'done';

const DailyProgress = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<StepId>('distraction');
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

  // Multi-task input per axis
  const [axisTasks, setAxisTasks] = useState<Record<string, TaskInput[]>>({
    mental: [{ name: '', quantity: 0, unit: '' }],
    physical: [{ name: '', quantity: 0, unit: '' }],
    religious: [{ name: '', quantity: 0, unit: '' }],
  });

  // Not-done split choice
  const [splitChoice, setSplitChoice] = useState<Record<string, number>>({});

  // Recovery info for display on done screen
  const [recoveryPreview, setRecoveryPreview] = useState<Array<{ axis: string; tasks: Array<{ name: string; qty: number; unit: string }> }>>([]);

  // Micro-feedback messages
  const [microFeedback, setMicroFeedback] = useState<string | null>(null);

  const effectiveDate = getTodayStr();
  const windowOpen = isEvaluationWindowOpen();

  useEffect(() => {
    const load = async () => {
      const p = await getProfile();
      if (!p || !p.primary_goal) { navigate("/setup"); return; }
      setProfile(p);
      const pending = await getPendingAppendedTasksDb(effectiveDate);
      setPendingTasks(pending);
      const todayLog = await getTodayLog(effectiveDate);
      if (todayLog) setDailyNote(todayLog.daily_note);
      setLoading(false);
    };
    load();
  }, [navigate, effectiveDate]);

  if (loading || !profile) return <div className="min-h-screen gradient-desert flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!windowOpen) {
    return (
      <div className="min-h-screen gradient-desert flex items-center justify-center px-4" dir="rtl">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Footprints className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-4">نافذة التقييم مغلقة</h2>
          <p className="text-muted-foreground text-sm font-sans-ui mb-2">التقييم اليومي متاح من الساعة ٩ مساءً حتى ٦ صباحًا</p>
          <p className="text-primary text-sm font-sans-ui">عد لاحقًا في الموعد المحدد 🌙</p>
          <button onClick={() => navigate("/statistics")} className="mt-6 gradient-sand text-primary-foreground font-sans-ui font-medium px-8 py-3 rounded-lg hover:opacity-90 transition-opacity shadow-sand">
            عرض إحصائياتك
          </button>
        </div>
      </div>
    );
  }

  const weights = profile.axis_weights;
  const maxScores = getAllAxisMaxScores(weights);

  // Filter pending tasks by type
  const mentalPending = pendingTasks.filter(t => t.axis_type === 'mental');
  const physicalPending = pendingTasks.filter(t => t.axis_type === 'physical');
  const religiousPending = pendingTasks.filter(t => t.axis_type === 'religious');
  const istighfarPending = pendingTasks.filter(t => (t as any).task_type === 'istighfar' || t.axis_type === 'distraction');

  // Dynamic steps
  const buildSteps = (): StepId[] => {
    const steps: StepId[] = ['distraction'];
    if (distraction && distraction !== 'none') {
      steps.push('distraction_type');
    }
    // Istighfar from yesterday
    if (istighfarPending.length > 0) {
      steps.push('distraction_istighfar');
    }

    for (const axis of ['mental', 'physical', 'religious'] as const) {
      steps.push(axis);
      const pending = pendingTasks.filter(t => t.axis_type === axis);
      if (pending.length > 0) {
        steps.push(`${axis}_recovery` as StepId);
      }
    }
    steps.push('note');
    return steps;
  };

  const stepsSequence = buildSteps();
  const currentStepIndex = stepsSequence.indexOf(currentStep);
  const totalStepsCount = stepsSequence.length;

  const goNext = () => {
    const idx = stepsSequence.indexOf(currentStep);
    if (idx < stepsSequence.length - 1) setCurrentStep(stepsSequence[idx + 1]);
  };

  const goBack = () => {
    const idx = stepsSequence.indexOf(currentStep);
    if (idx > 0) setCurrentStep(stepsSequence[idx - 1]);
  };

  const goToNextFromAxis = (axisKey: string) => {
    const recoveryStep = `${axisKey}_recovery` as StepId;
    if (stepsSequence.includes(recoveryStep)) {
      setCurrentStep(recoveryStep);
    } else {
      const idx = stepsSequence.indexOf(axisKey as StepId);
      if (idx >= 0 && idx < stepsSequence.length - 1) {
        setCurrentStep(stepsSequence[idx + 1]);
      }
    }
  };

  // Task input helpers
  const addTask = (axis: string) => {
    setAxisTasks(prev => ({
      ...prev,
      [axis]: [...prev[axis], { name: '', quantity: 0, unit: '' }],
    }));
  };

  const removeTask = (axis: string, index: number) => {
    setAxisTasks(prev => ({
      ...prev,
      [axis]: prev[axis].filter((_, i) => i !== index),
    }));
  };

  const updateTask = (axis: string, index: number, field: keyof TaskInput, value: string | number) => {
    setAxisTasks(prev => ({
      ...prev,
      [axis]: prev[axis].map((t, i) => i === index ? { ...t, [field]: value } : t),
    }));
  };

  const getValidTasks = (axis: string): TaskInput[] => {
    return axisTasks[axis].filter(t => t.name.trim() && t.quantity > 0 && t.unit);
  };

  const handleSubmit = async () => {
    if (!distraction || !mentalStatus || !physicalStatus || !religiousStatus) return;

    const distractionEntry = getDistractionScore(distraction);
    const mentalScore = getAxisScore(mentalStatus, maxScores.mental);
    const physicalScore = getAxisScore(physicalStatus, maxScores.physical);
    const religiousScore = getAxisScore(religiousStatus, maxScores.religious);

    const consecutive = await checkConsecutiveDistractionDb(effectiveDate);
    const recoveredPoints = completedTaskIds.reduce((sum, id) => {
      const t = pendingTasks.find(t => t.id === id);
      return sum + (t?.points_to_reclaim || 0);
    }, 0);

    const axes = { mental: mentalScore, physical: physicalScore, religious: religiousScore };
    const axisTotal = axes.mental.finalScore + axes.physical.finalScore + axes.religious.finalScore;
    const total = consecutive ? 0 : Math.min(40, axisTotal + distractionEntry.points + recoveredPoints);
    setTotalScore(total);

    await saveDailyLogDb({
      date: effectiveDate,
      distraction_tier: distraction,
      distraction_type: distractionType || '',
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

    // Mark completed/failed recovery tasks
    for (const id of completedTaskIds) await markTaskCompleted(id);
    for (const id of failedTaskIds) {
      const task = pendingTasks.find(t => t.id === id);
      if (task && (task as any).task_type === 'split' && (task as any).parent_task_id) {
        await cancelRemainingDayTasks((task as any).parent_task_id, (task as any).current_day || 1);
      }
      await markTaskCancelled(id);
    }

    // Generate recovery tasks for axes with deductions (minor_lack / major_lack)
    const recoveryAxes: Record<string, TaskInput[]> = {};
    const preview: typeof recoveryPreview = [];

    for (const axis of ['mental', 'physical', 'religious'] as const) {
      const status = axis === 'mental' ? mentalStatus : axis === 'physical' ? physicalStatus : religiousStatus;
      const score = axes[axis];

      if (status === 'minor_lack' || status === 'major_lack') {
        const validTasks = getValidTasks(axis);
        if (validTasks.length > 0) {
          recoveryAxes[axis] = validTasks;
          const factor = getRecoveryFactor(status);
          preview.push({
            axis: AXIS_LABELS[axis],
            tasks: validTasks.map(t => ({
              name: t.name,
              qty: calcRecoveryQuantity(t.quantity, factor),
              unit: getUnitLabel(axis, t.unit),
            })),
          });
        }
      }

      // Not-done with split
      if (status === 'not_done' && splitChoice[axis]) {
        const validTasks = getValidTasks(axis);
        if (validTasks.length > 0) {
          await generateSplitTasks(axis, score.baseScore, splitChoice[axis], effectiveDate, validTasks);
        }
      }
    }

    await generateRecoveryTasks(axes, effectiveDate, recoveryAxes);

    // Generate istighfar task if distracted
    if (distractionEntry.istighfarMinutes > 0) {
      await generateIstighfarTask(effectiveDate, distractionEntry.points, distractionEntry.istighfarMinutes);
    }

    setRecoveryPreview(preview);

    // Daily rating feedback
    const rating = getDailyRating(total);
    if (total >= 28) {
      setMicroFeedback(`رائع يا ${profile.name}! حصلت على ${total} نقطة. ${rating.emoji} ${rating.label}`);
    } else {
      setMicroFeedback(null);
    }

    setMessage(getMotivationalMessage());
    setCurrentStep('done');
  };

  const distractionTiers: DistractionTier[] = ['none', 'less_1h', '2_3h', '4h_plus'];
  const taskStatuses: TaskStatus[] = ['completed', 'minor_lack', 'major_lack', 'not_done'];
  const distractionTypes: DistractionType[] = ['social', 'movies', 'music', 'other'];

  const selectWithDelay = (key: string, action: () => void) => {
    setPendingSelection(key);
    setTimeout(() => { action(); setPendingSelection(null); }, 350);
  };

  const renderStatusOption = (status: TaskStatus, selected: TaskStatus | null, onSelect: (s: TaskStatus) => void, axisKey: string) => {
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

  // Task input form for an axis
  const renderTaskInputForm = (axisKey: string) => {
    const tasks = axisTasks[axisKey];
    const units = AXIS_UNITS[axisKey] || [];
    const status = axisKey === 'mental' ? mentalStatus : axisKey === 'physical' ? physicalStatus : religiousStatus;
    const isNotDone = status === 'not_done';
    const factor = status === 'minor_lack' ? 0.20 : status === 'major_lack' ? 0.40 : 0;
    const score = getAxisScore(status!, maxScores[axisKey as keyof typeof maxScores]);

    return (
      <div>
        <p className="text-dust text-sm tracking-[0.2em] mb-2 font-sans-ui text-center">
          {isNotDone ? 'تقسيم المهمة' : 'تفاصيل المهام'} - {AXIS_LABELS[axisKey]}
        </p>

        {!isNotDone && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 text-center">
            <p className="text-destructive text-sm font-sans-ui">
              <AlertTriangle className="w-4 h-4 inline ml-1" />
              خسرت {score.deduction} نقاط — يمكنك تعويض {factor * 100}% منها
            </p>
          </div>
        )}

        {isNotDone && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 text-center">
            <p className="text-destructive text-sm font-sans-ui">
              <AlertTriangle className="w-4 h-4 inline ml-1" />
              خسرت {score.deduction} نقاط كاملة
            </p>
            <p className="text-muted-foreground text-xs mt-1 font-sans-ui">يمكنك تقسيم المهمة على عدة أيام لاستعادة جزء من النقاط</p>
          </div>
        )}

        <h2 className="font-serif-display text-lg font-semibold text-foreground mb-4 text-center">
          {isNotDone ? 'أدخل المهام التي تريد تقسيمها' : 'أدخل المهام التي كان بها نقص'}
        </h2>

        <div className="space-y-4 mb-4">
          {tasks.map((task, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-sans-ui">مهمة {idx + 1}</span>
                {tasks.length > 1 && (
                  <button onClick={() => removeTask(axisKey, idx)} className="text-destructive/60 hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Input
                type="text"
                placeholder="اسم المهمة"
                value={task.name}
                onChange={(e) => updateTask(axisKey, idx, 'name', e.target.value)}
                className="text-right text-sm"
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="الكمية"
                  value={task.quantity || ''}
                  onChange={(e) => updateTask(axisKey, idx, 'quantity', parseInt(e.target.value) || 0)}
                  className="text-center text-sm flex-1"
                  min={1}
                />
                <Select value={task.unit} onValueChange={(v) => updateTask(axisKey, idx, 'unit', v)}>
                  <SelectTrigger className="flex-1 text-sm">
                    <SelectValue placeholder="الوحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isNotDone && task.name && task.quantity > 0 && task.unit && (
                <p className="text-xs text-center font-sans-ui text-primary">
                  ⭐ التعويض: {calcRecoveryQuantity(task.quantity, factor)} {getUnitLabel(axisKey, task.unit)}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        <button onClick={() => addTask(axisKey)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/30 text-primary text-sm font-sans-ui hover:bg-primary/5 transition-colors mb-4">
          <Plus className="w-4 h-4" /> إضافة مهمة أخرى
        </button>

        {/* Not-done: split options */}
        {isNotDone && getValidTasks(axisKey).length > 0 && (
          <div className="mb-4">
            <p className="text-foreground text-sm text-center font-sans-ui font-semibold mb-3">كيف تريد تقسيم المهمة؟</p>
            <div className="grid grid-cols-2 gap-2">
              {[2, 3, 4].map(days => (
                <button key={days} onClick={() => setSplitChoice(prev => ({ ...prev, [axisKey]: days }))}
                  className={`py-3 rounded-xl border text-sm font-sans-ui transition-all ${splitChoice[axisKey] === days ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-card text-foreground hover:border-primary/30'}`}>
                  {days} أيام
                </button>
              ))}
              <button onClick={() => setSplitChoice(prev => ({ ...prev, [axisKey]: 0 }))}
                className={`py-3 rounded-xl border text-sm font-sans-ui transition-all ${splitChoice[axisKey] === 0 ? 'border-destructive bg-destructive/10 text-destructive font-semibold' : 'border-border bg-card text-foreground hover:border-destructive/30'}`}>
                تركها ❌
              </button>
            </div>
            {splitChoice[axisKey] && splitChoice[axisKey] > 0 && (
              <p className="text-xs text-center text-primary font-sans-ui mt-2">
                ستُسأل عن كل جزء يوميًا وتحصل على نقاط تناسبية
              </p>
            )}
          </div>
        )}

        {!isNotDone && getValidTasks(axisKey).length > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 mb-4 text-center">
            <p className="text-accent text-xs font-sans-ui">
              📋 ستظهر لك هذه المهام غدًا في قسم المهام التعويضية
            </p>
          </div>
        )}

        <button onClick={goNext}
          disabled={isNotDone ? (getValidTasks(axisKey).length > 0 && splitChoice[axisKey] === undefined) : false}
          className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand disabled:opacity-50">
          التالي
        </button>
      </div>
    );
  };

  const renderRecoveryStep = (axisKey: string, axisPending: (DbAppendedTask & { id: string })[]) => (
    <div>
      <p className="text-dust text-sm tracking-[0.2em] mb-2 font-sans-ui text-center">مهام تعويضية - {AXIS_LABELS[axisKey]}</p>
      <h2 className="font-serif-display text-xl font-semibold text-foreground mb-6 text-center">هل أنجزت المهام التعويضية؟</h2>
      <div className="space-y-3 mb-6">
        {axisPending.map(task => {
          const isCompleted = completedTaskIds.includes(task.id);
          const isFailed = failedTaskIds.includes(task.id);
          const isSplit = (task as any).task_type === 'split';
          return (
            <div key={task.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-accent" />
                <p className="text-foreground text-sm font-sans-ui font-semibold">{AXIS_LABELS[task.axis_type]}</p>
              </div>
              {task.task_desc && (
                <p className="text-primary text-sm mb-1 font-sans-ui">📋 {task.task_desc}</p>
              )}
              {task.task_quantity && task.task_unit && (
                <p className="text-foreground text-sm mb-1 font-sans-ui">
                  الكمية: {task.task_quantity} {getUnitLabel(task.axis_type, task.task_unit || '')}
                </p>
              )}
              {isSplit && (
                <p className="text-accent text-xs mb-1 font-sans-ui">الجزء {(task as any).current_day}/{(task as any).split_days}</p>
              )}
              <p className="text-muted-foreground text-xs mb-3">
                يمكن استرجاع ⭐ {task.points_to_reclaim} نقطة ({task.reclaim_percentage}%)
              </p>
              <div className="flex gap-2">
                <button onClick={() => {
                  setCompletedTaskIds(prev => [...prev.filter(id => id !== task.id), task.id]);
                  setFailedTaskIds(prev => prev.filter(id => id !== task.id));
                }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-sans-ui transition-all ${isCompleted ? 'bg-accent/20 border border-accent text-accent' : 'border border-border text-muted-foreground hover:border-accent/30'}`}>
                  <CheckCircle2 className="w-4 h-4" /> أنجزتها
                </button>
                <button onClick={() => {
                  setFailedTaskIds(prev => [...prev.filter(id => id !== task.id), task.id]);
                  setCompletedTaskIds(prev => prev.filter(id => id !== task.id));
                }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-sans-ui transition-all ${isFailed ? 'bg-destructive/20 border border-destructive text-destructive' : 'border border-border text-muted-foreground hover:border-destructive/30'}`}>
                  <XCircle className="w-4 h-4" /> لم أنجزها
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={goNext}
        disabled={axisPending.some(t => !completedTaskIds.includes(t.id) && !failedTaskIds.includes(t.id))}
        className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand disabled:opacity-50">
        التالي
      </button>
    </div>
  );

  const isDone = currentStep === 'done';
  const rating = getDailyRating(totalScore);
  const isLowPerformance = totalScore < 28;

  return (
    <div className="min-h-screen gradient-desert flex items-center justify-center px-4 sm:px-6 py-12 pb-28" dir="rtl">
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {isDone ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">{rating.emoji}</span>
              </div>
              <h2 className="font-serif-display text-3xl font-semibold text-foreground mb-1">{totalScore}/40</h2>
              <p className={`text-lg font-serif-display font-semibold ${rating.color} mb-4`}>{rating.label}</p>

              {/* Micro-feedback */}
              {microFeedback && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
                  <p className="text-primary text-sm font-sans-ui">{microFeedback}</p>
                </motion.div>
              )}

              <p className="text-muted-foreground text-lg mb-6 italic max-w-sm mx-auto">"{message}"</p>

              {/* Score breakdown */}
              {(() => {
                const distractionEntry = distraction ? getDistractionScore(distraction) : null;
                const mentalScore = mentalStatus ? getAxisScore(mentalStatus, maxScores.mental) : null;
                const physicalScore = physicalStatus ? getAxisScore(physicalStatus, maxScores.physical) : null;
                const religiousScore = religiousStatus ? getAxisScore(religiousStatus, maxScores.religious) : null;

                return (
                  <div className="bg-card border border-border rounded-xl p-4 mb-4 text-right space-y-2">
                    <p className="text-foreground text-sm font-sans-ui font-semibold mb-3 text-center">تفصيل النتيجة</p>
                    {[
                      { label: AXIS_LABELS.mental, score: mentalScore, max: maxScores.mental },
                      { label: AXIS_LABELS.physical, score: physicalScore, max: maxScores.physical },
                      { label: AXIS_LABELS.religious, score: religiousScore, max: maxScores.religious },
                      { label: 'المشتتات', score: distractionEntry ? { finalScore: distractionEntry.points } : null, max: 10 },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between text-sm font-sans-ui">
                        <span className="text-primary font-semibold">{item.score?.finalScore ?? 0}/{item.max}</span>
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Recovery preview */}
              {recoveryPreview.length > 0 && (
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-4 text-right">
                  <p className="text-accent text-sm font-sans-ui font-semibold text-center mb-3">⭐ مهامك التعويضية غدًا:</p>
                  {recoveryPreview.map((r, i) => (
                    <div key={i} className="mb-2">
                      <p className="text-foreground text-sm font-sans-ui font-semibold">{r.axis}</p>
                      {r.tasks.map((t, j) => (
                        <p key={j} className="text-muted-foreground text-xs font-sans-ui">• {t.name}: {t.qty} {t.unit}</p>
                      ))}
                    </div>
                  ))}
                  <p className="text-accent text-xs font-sans-ui text-center mt-2">ستظهر لك غدًا وستُسأل عنها</p>
                </div>
              )}

              {/* Istighfar reminder */}
              {distraction && getDistractionScore(distraction).istighfarMinutes > 0 && (
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-4 text-center">
                  <p className="text-accent text-sm font-sans-ui">
                    📿 مطلوب منك {getDistractionScore(distraction).istighfarMinutes} دقيقة استغفار غدًا
                  </p>
                  <p className="text-muted-foreground text-xs font-sans-ui mt-1">
                    إذا أتممتها ستسترجع ≈ {Math.round((10 - getDistractionScore(distraction).points) / 2)} نقاط
                  </p>
                </div>
              )}

              {/* Low performance - goal reminder */}
              {isLowPerformance && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 mb-4">
                  <p className="text-destructive text-sm font-sans-ui font-semibold mb-2 text-center">
                    لقد كان أداؤك أضعف من المعتاد اليوم
                  </p>
                  <p className="text-foreground text-sm font-sans-ui text-center mb-2">
                    تذكّر هدفك يا <span className="font-semibold text-primary">{profile.name}</span>:
                  </p>
                  <p className="text-foreground text-base font-serif-display font-semibold text-center mb-2">
                    "{profile.primary_goal}"
                  </p>
                  <p className="text-muted-foreground text-sm font-sans-ui text-center">
                    السبب الذي يجعل هذا الهدف مهمًا بالنسبة لك:
                  </p>
                  <p className="text-foreground text-sm font-sans-ui text-center mt-1 italic">
                    "{profile.goal_importance}"
                  </p>
                </motion.div>
              )}

              <button onClick={() => navigate("/statistics")}
                className="gradient-sand text-primary-foreground font-sans-ui font-medium px-10 py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand">
                عرض إحصائياتك
              </button>
            </motion.div>
          ) : (
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {/* Progress bar */}
              <div className="flex justify-center gap-1.5 mb-8">
                {Array.from({ length: totalStepsCount }).map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full max-w-8 transition-colors ${i <= currentStepIndex ? 'bg-primary' : 'bg-border'}`} />
                ))}
              </div>

              {/* Distraction step */}
              {currentStep === 'distraction' && (
                <div>
                  <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-6 text-center">
                    مرحبًا {profile.name}، هل عرضت نفسك لمشتتات اليوم؟
                  </h2>
                  <div className="space-y-3">
                    {distractionTiers.map(tier => {
                      const isActive = pendingSelection === `dist-${tier}`;
                      return (
                        <button key={tier} tabIndex={-1} onClick={() => selectWithDelay(`dist-${tier}`, () => {
                          setDistraction(tier);
                          if (tier === 'none') {
                            setDistractionType(null);
                            // Skip to istighfar or mental
                            if (istighfarPending.length > 0) setCurrentStep('distraction_istighfar');
                            else setCurrentStep('mental');
                          } else {
                            setCurrentStep('distraction_type');
                          }
                        })}
                          className={`w-full text-right p-4 rounded-xl border transition-all duration-200 outline-none ring-0 ${isActive ? 'border-primary bg-primary/15 scale-[1.03] shadow-sand' : distraction === tier ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30 active:scale-[0.98]'}`}>
                          <div className="flex items-center justify-center gap-2">
                            {isActive && <span className="text-primary text-lg">✓</span>}
                            <span className={`text-sm font-sans-ui ${isActive ? 'text-primary font-semibold' : 'text-foreground'}`}>{DISTRACTION_LABELS[tier]}</span>
                          </div>
                          {tier !== 'none' && (
                            <p className="text-xs text-muted-foreground text-center mt-1 font-sans-ui">
                              -{10 - getDistractionScore(tier).points} نقاط
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Distraction type step */}
              {currentStep === 'distraction_type' && (
                <div>
                  <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-4 text-center">ما نوع المشتت؟</h2>
                  {distraction && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 text-center">
                      <p className="text-destructive text-sm font-sans-ui">
                        خسرت {10 - getDistractionScore(distraction).points} نقاط
                      </p>
                      <p className="text-muted-foreground text-xs font-sans-ui mt-1">
                        مطلوب {getDistractionScore(distraction).istighfarMinutes} دقيقة استغفار — إذا أتممتها ستسترجع ≈ {Math.round((10 - getDistractionScore(distraction).points) / 2)} نقاط
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {distractionTypes.map(type => {
                      const isActive = pendingSelection === `dtype-${type}`;
                      return (
                        <button key={type} tabIndex={-1} onClick={() => selectWithDelay(`dtype-${type}`, () => {
                          setDistractionType(type);
                          if (istighfarPending.length > 0) setCurrentStep('distraction_istighfar');
                          else setCurrentStep('mental');
                        })}
                          className={`w-full text-right p-4 rounded-xl border transition-all duration-200 outline-none ring-0 ${isActive ? 'border-primary bg-primary/15 scale-[1.03] shadow-sand' : distractionType === type ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30 active:scale-[0.98]'}`}>
                          <div className="flex items-center justify-center gap-2">
                            {isActive && <span className="text-primary text-lg">✓</span>}
                            <span className={`text-sm font-sans-ui ${isActive ? 'text-primary font-semibold' : 'text-foreground'}`}>{DISTRACTION_TYPE_LABELS[type]}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Istighfar recovery from yesterday */}
              {currentStep === 'distraction_istighfar' && (
                <div>
                  <p className="text-dust text-sm tracking-[0.2em] mb-2 font-sans-ui text-center">مهام الاستغفار</p>
                  <h2 className="font-serif-display text-xl font-semibold text-foreground mb-6 text-center">هل أتممت الاستغفار المطلوب؟</h2>
                  <div className="space-y-3 mb-6">
                    {istighfarPending.map(task => {
                      const isCompleted = completedTaskIds.includes(task.id);
                      const isFailed = failedTaskIds.includes(task.id);
                      return (
                        <div key={task.id} className="bg-card border border-border rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📿</span>
                            <p className="text-foreground text-sm font-sans-ui font-semibold">{task.task_desc}</p>
                          </div>
                          <p className="text-muted-foreground text-xs mb-3">
                            يمكن استرجاع ⭐ {task.points_to_reclaim} نقطة
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              setCompletedTaskIds(prev => [...prev.filter(id => id !== task.id), task.id]);
                              setFailedTaskIds(prev => prev.filter(id => id !== task.id));
                            }}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-sans-ui transition-all ${isCompleted ? 'bg-accent/20 border border-accent text-accent' : 'border border-border text-muted-foreground hover:border-accent/30'}`}>
                              <CheckCircle2 className="w-4 h-4" /> أنجزتها
                            </button>
                            <button onClick={() => {
                              setFailedTaskIds(prev => [...prev.filter(id => id !== task.id), task.id]);
                              setCompletedTaskIds(prev => prev.filter(id => id !== task.id));
                            }}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-sans-ui transition-all ${isFailed ? 'bg-destructive/20 border border-destructive text-destructive' : 'border border-border text-muted-foreground hover:border-destructive/30'}`}>
                              <XCircle className="w-4 h-4" /> لم أنجزها
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setCurrentStep('mental')}
                    disabled={istighfarPending.some(t => !completedTaskIds.includes(t.id) && !failedTaskIds.includes(t.id))}
                    className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand disabled:opacity-50">
                    التالي
                  </button>
                </div>
              )}

              {/* Axis steps */}
              {(['mental', 'physical', 'religious'] as const).map(axisKey => {
                if (currentStep !== axisKey) return null;
                const axisIndex = axisKey === 'mental' ? 0 : axisKey === 'physical' ? 1 : 2;
                const currentStatus = axisKey === 'mental' ? mentalStatus : axisKey === 'physical' ? physicalStatus : religiousStatus;
                const setter = axisKey === 'mental' ? setMentalStatus : axisKey === 'physical' ? setPhysicalStatus : setReligiousStatus;

                const handleAxisSelect = (sel: TaskStatus) => {
                  setter(sel);
                  if (sel === 'minor_lack' || sel === 'major_lack' || sel === 'not_done') {
                    // Go to task input form
                    setCurrentStep(`${axisKey}_tasks` as StepId);
                  } else {
                    goToNextFromAxis(axisKey);
                  }
                };

                return (
                  <div key={axisKey}>
                    <p className="text-dust text-sm tracking-[0.2em] mb-2 font-sans-ui text-center">المحور {axisIndex + 1}/3</p>
                    <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-2 text-center">{AXIS_LABELS[axisKey]}</h2>
                    <p className="text-muted-foreground text-sm mb-6 text-center">ما نسبة إتمامك لمهام هذا المحور اليوم؟</p>
                    <div className="space-y-3">
                      {taskStatuses.map(s => renderStatusOption(s, currentStatus, handleAxisSelect, axisKey))}
                    </div>
                  </div>
                );
              })}

              {/* Task input steps (after minor/major/not_done) */}
              {(['mental_tasks', 'physical_tasks', 'religious_tasks'] as const).map(stepKey => {
                if (currentStep !== stepKey) return null;
                const axisKey = stepKey.replace('_tasks', '') as string;
                
                // Override goNext for task input to go to recovery or next axis
                const handleTaskNext = () => {
                  const recoveryStep = `${axisKey}_recovery` as StepId;
                  if (stepsSequence.includes(recoveryStep)) {
                    setCurrentStep(recoveryStep);
                  } else {
                    // Find next axis or note
                    const axes = ['mental', 'physical', 'religious'];
                    const currentIdx = axes.indexOf(axisKey);
                    for (let i = currentIdx + 1; i < axes.length; i++) {
                      if (stepsSequence.includes(axes[i] as StepId)) {
                        setCurrentStep(axes[i] as StepId);
                        return;
                      }
                    }
                    setCurrentStep('note');
                  }
                };

                return (
                  <div key={stepKey}>
                    {renderTaskInputForm(axisKey)}
                  </div>
                );
              })}

              {/* Recovery steps */}
              {currentStep === 'mental_recovery' && renderRecoveryStep('mental', mentalPending)}
              {currentStep === 'physical_recovery' && renderRecoveryStep('physical', physicalPending)}
              {currentStep === 'religious_recovery' && renderRecoveryStep('religious', religiousPending)}

              {/* Note step */}
              {currentStep === 'note' && (
                <div>
                  <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-6 text-center">ملاحظة اليوم</h2>
                  <textarea
                    value={dailyNote}
                    onChange={(e) => setDailyNote(e.target.value)}
                    placeholder="اكتب ملاحظتك أو الدروس المستفادة من اليوم..."
                    className="w-full min-h-[120px] p-4 rounded-xl border border-border bg-card text-foreground text-sm font-sans-ui resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                    dir="rtl"
                  />
                  <div className="flex gap-3 mt-6">
                    <button onClick={goBack} className="flex-1 border border-border text-muted-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:bg-card transition-colors">
                      رجوع
                    </button>
                    <button onClick={handleSubmit}
                      className="flex-1 gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand">
                      حفظ التقييم
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav - 2 pages only */}
      {!isDone && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3 z-50">
          <div className="max-w-2xl mx-auto flex justify-around">
            <Link to="/progress" className="flex flex-col items-center gap-1 text-primary">
              <TrendingUp className="w-5 h-5" /><span className="text-xs font-sans-ui">التقييم</span>
            </Link>
            <Link to="/statistics" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <BarChart3 className="w-5 h-5" /><span className="text-xs font-sans-ui">إحصائياتك</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
};

export default DailyProgress;
