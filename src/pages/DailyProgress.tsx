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
import { Footprints, TrendingUp, BarChart3, FileText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type StepId = 'distraction' | 'distraction_type' | 'mental' | 'mental_recovery' | 'physical' | 'physical_recovery' | 'religious' | 'religious_recovery' | 'note' | 'done';

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
  const [recoveryModal, setRecoveryModal] = useState<{
    axisKey: 'mental' | 'physical' | 'religious';
    status: 'minor_lack' | 'major_lack';
    pointsLost: number;
  } | null>(null);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoveryTaskDesc, setRecoveryTaskDesc] = useState("");
  const [recoveryDetectedUnit, setRecoveryDetectedUnit] = useState<{ unit: string; unitLabel: string } | null>(null);
  const [recoveryResult, setRecoveryResult] = useState<{ value: number; unit: string } | null>(null);

  // Religious recovery state
  const [religiousCategory, setReligiousCategory] = useState<'quran' | 'knowledge' | null>(null);
  const [quranSelections, setQuranSelections] = useState<Record<string, boolean>>({ memorize: false, review: false, read: false });
  const [quranQuantities, setQuranQuantities] = useState<Record<string, string>>({ memorize: '', review: '', read: '' });
  const [knowledgeType, setKnowledgeType] = useState<'lectures' | 'books' | null>(null);
  const [knowledgeQuantity, setKnowledgeQuantity] = useState('');

  // Per-axis recovery info to save with appended tasks
  const [axisRecoveryInfo, setAxisRecoveryInfo] = useState<Record<string, { task_desc: string; task_quantity: number | null; task_unit: string | null }>>({});

  // Smart unit detection for mental/physical
  const detectUnitFromTask = (text: string): { unit: string; unitLabel: string } | null => {
    const t = text.trim().toLowerCase();
    if (/صفح|قراءة|قرا|كتاب|مذاكر|مراجع|ورق/.test(t)) return { unit: "pages", unitLabel: "صفحة" };
    if (/سؤال|اسئل|أسئل|حل|مسأل|مسائل|تمارين ذهن/.test(t)) return { unit: "questions", unitLabel: "سؤال" };
    if (/ضغط|سكوات|عقل|بطن|تمرين|عدات|عدّات|بلانك|pull|push|سحب|أوزان|حديد|وزن/.test(t)) return { unit: "reps", unitLabel: "عدّة" };
    if (/آي[اة]|ايات|آيات/.test(t)) return { unit: "ayat", unitLabel: "آية" };
    if (/قرآن|قران|حفظ|تلاو/.test(t)) return { unit: "pages", unitLabel: "صفحة" };
    if (/ذكر|أذكار|اذكار|استغفار|تسبيح|صلاة على/.test(t)) return { unit: "count", unitLabel: "ذِكر" };
    if (/جري|مشي|سباح|ركض|كارديو|هرول|تمدد|يوغا/.test(t)) return { unit: "minutes", unitLabel: "دقيقة" };
    if (/سماع|استماع|بودكاست|محاضر/.test(t)) return { unit: "minutes", unitLabel: "دقيقة" };
    if (/دقيق|وقت|ساع|زمن/.test(t)) return { unit: "minutes", unitLabel: "دقيقة" };
    return null;
  };

  useEffect(() => {
    const load = async () => {
      const p = await getProfile();
      if (!p || !p.primary_goal) { navigate("/setup"); return; }
      setProfile(p);
      const pending = await getPendingAppendedTasksDb(getTodayStr());
      setPendingTasks(pending);
      const todayLog = await getTodayLog();
      if (todayLog) setDailyNote(todayLog.daily_note);
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading || !profile) return <div className="min-h-screen gradient-desert flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const weights = profile.axis_weights;
  const maxScores = getAllAxisMaxScores(weights);
  const hasDistractionTypeStep = distraction !== null && distraction !== 'none';

  // Per-axis pending tasks
  const mentalPending = pendingTasks.filter(t => t.axis_type === 'mental');
  const physicalPending = pendingTasks.filter(t => t.axis_type === 'physical');
  const religiousPending = pendingTasks.filter(t => t.axis_type === 'religious');

  // Dynamic steps sequence
  const stepsSequence: StepId[] = [
    'distraction',
    ...(hasDistractionTypeStep ? ['distraction_type' as StepId] : []),
    'mental',
    ...(mentalPending.length > 0 ? ['mental_recovery' as StepId] : []),
    'physical',
    ...(physicalPending.length > 0 ? ['physical_recovery' as StepId] : []),
    'religious',
    ...(religiousPending.length > 0 ? ['religious_recovery' as StepId] : []),
    'note',
  ];

  const currentStepIndex = stepsSequence.indexOf(currentStep);
  const totalStepsCount = stepsSequence.length;

  const goToNextFromAxis = (axisKey: 'mental' | 'physical' | 'religious') => {
    const recoveryStepId = `${axisKey}_recovery` as StepId;
    if (stepsSequence.includes(recoveryStepId)) {
      setCurrentStep(recoveryStepId);
    } else {
      const axisIdx = stepsSequence.indexOf(axisKey);
      if (axisIdx >= 0 && axisIdx < stepsSequence.length - 1) {
        setCurrentStep(stepsSequence[axisIdx + 1]);
      }
    }
  };

  const goNext = () => {
    const idx = stepsSequence.indexOf(currentStep);
    if (idx < stepsSequence.length - 1) setCurrentStep(stepsSequence[idx + 1]);
  };

  const goBack = () => {
    const idx = stepsSequence.indexOf(currentStep);
    if (idx > 0) setCurrentStep(stepsSequence[idx - 1]);
  };

  const saveRecoveryInfoForAxis = (axisKey: string) => {
    if (!recoveryModal) return;
    const pct = recoveryModal.status === 'minor_lack' ? 0.15 : 0.35;

    if (axisKey === 'religious') {
      const desc = buildReligiousRecoveryDesc(pct);
      if (desc) {
        setAxisRecoveryInfo(prev => ({ ...prev, [axisKey]: { task_desc: desc, task_quantity: null, task_unit: null } }));
      }
    } else {
      if (recoveryTaskDesc && recoveryResult) {
        setAxisRecoveryInfo(prev => ({
          ...prev,
          [axisKey]: {
            task_desc: `${recoveryTaskDesc} - ${recoveryResult.value} ${recoveryResult.unit}`,
            task_quantity: recoveryResult.value,
            task_unit: recoveryDetectedUnit?.unit || null,
          }
        }));
      }
    }
  };

  const buildReligiousRecoveryDesc = (pct: number): string | null => {
    if (religiousCategory === 'quran') {
      const quranLabels: Record<string, string> = { memorize: 'حفظ', review: 'مراجعة', read: 'قراءة' };
      const parts: string[] = [];
      for (const [key, label] of Object.entries(quranLabels)) {
        if (quranSelections[key]) {
          const qty = parseFloat(quranQuantities[key] || '0');
          const comp = Math.round(qty * pct * 100) / 100;
          if (comp > 0) parts.push(`${label} ${comp} صفحة`);
        }
      }
      return parts.length > 0 ? parts.join('، ') : null;
    } else if (religiousCategory === 'knowledge') {
      const qty = parseFloat(knowledgeQuantity || '0');
      const comp = Math.round(qty * pct * 100) / 100;
      const unit = knowledgeType === 'lectures' ? 'دقيقة' : 'صفحة';
      const label = knowledgeType === 'lectures' ? 'محاضرات' : 'كتب';
      return comp > 0 ? `${label} ${comp} ${unit}` : null;
    }
    return null;
  };

  const resetReligiousRecovery = () => {
    setReligiousCategory(null);
    setQuranSelections({ memorize: false, review: false, read: false });
    setQuranQuantities({ memorize: '', review: '', read: '' });
    setKnowledgeType(null);
    setKnowledgeQuantity('');
  };

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

    const axes = { mental: mentalScore, physical: physicalScore, religious: religiousScore };
    const axisTotal = axes.mental.finalScore + axes.physical.finalScore + axes.religious.finalScore;
    const total = consecutive ? 0 : Math.min(40, axisTotal + distractionEntry.points + recoveredPoints);
    setTotalScore(total);

    await saveDailyLogDb({
      date: getTodayStr(),
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

    for (const id of completedTaskIds) await markTaskCompleted(id);
    await generateAndSaveAppendedTasks(axes, getTodayStr(), axisRecoveryInfo);

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

  const renderStatusOption = (status: TaskStatus, selected: TaskStatus | null, onSelect: (s: TaskStatus) => void, axisKey: 'mental' | 'physical' | 'religious') => {
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

  const renderRecoveryStep = (axisKey: 'mental' | 'physical' | 'religious', axisPending: (DbAppendedTask & { id: string })[]) => (
    <div>
      <p className="text-dust text-sm tracking-[0.2em] mb-2 font-sans-ui text-center">مهام تعويضية - {AXIS_LABELS[axisKey]}</p>
      <h2 className="font-serif-display text-xl font-semibold text-foreground mb-6 text-center">هل أنجزت المهام التعويضية؟</h2>
      <div className="space-y-3 mb-6">
        {axisPending.map(task => {
          const isCompleted = completedTaskIds.includes(task.id);
          const isFailed = failedTaskIds.includes(task.id);
          return (
            <div key={task.id} className="bg-card border border-border rounded-xl p-4">
              <p className="text-foreground text-sm mb-1 font-sans-ui font-semibold">{AXIS_LABELS[task.axis_type]}</p>
              {task.task_desc && (
                <p className="text-primary text-sm mb-1 font-sans-ui">📋 {task.task_desc}</p>
              )}
              <p className="text-muted-foreground text-xs mb-1">من تاريخ: {task.created_date}</p>
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
      <button onClick={goNext}
        disabled={axisPending.some(t => !completedTaskIds.includes(t.id) && !failedTaskIds.includes(t.id))}
        className="w-full gradient-sand text-primary-foreground font-sans-ui font-medium py-3.5 rounded-lg hover:opacity-90 transition-opacity shadow-sand disabled:opacity-50">
        التالي
      </button>
    </div>
  );

  const renderReligiousRecoveryModal = () => {
    if (!recoveryModal || recoveryModal.axisKey !== 'religious') return null;
    const pct = recoveryModal.status === 'minor_lack' ? 0.15 : 0.35;

    const quranOptions = [
      { key: 'memorize', label: 'حفظ', unit: 'صفحة' },
      { key: 'review', label: 'مراجعة', unit: 'صفحة' },
      { key: 'read', label: 'قراءة', unit: 'صفحة' },
    ];

    const hasReligiousInput = () => {
      if (religiousCategory === 'quran') {
        return Object.entries(quranSelections).some(([key, selected]) =>
          selected && parseFloat(quranQuantities[key] || '0') > 0
        );
      }
      if (religiousCategory === 'knowledge') {
        return knowledgeType && parseFloat(knowledgeQuantity || '0') > 0;
      }
      return false;
    };

    return (
      <div className="space-y-4">
        {/* Category selection */}
        <p className="text-foreground text-sm text-center font-sans-ui font-bold">اختر نوع التعويض:</p>
        <div className="flex gap-2">
          <button onClick={() => { setReligiousCategory('quran'); setKnowledgeType(null); setKnowledgeQuantity(''); }}
            className={`flex-1 py-3 rounded-xl border text-sm font-sans-ui transition-all ${religiousCategory === 'quran' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-card text-foreground hover:border-primary/30'}`}>
            قرآن
          </button>
          <button onClick={() => { setReligiousCategory('knowledge'); setQuranSelections({ memorize: false, review: false, read: false }); setQuranQuantities({ memorize: '', review: '', read: '' }); }}
            className={`flex-1 py-3 rounded-xl border text-sm font-sans-ui transition-all ${religiousCategory === 'knowledge' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-card text-foreground hover:border-primary/30'}`}>
            علم شرعي
          </button>
        </div>

        {/* Quran multi-select */}
        {religiousCategory === 'quran' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-muted-foreground text-xs text-center font-sans-ui">اختر ما ستعوضه (يمكنك اختيار أكثر من واحد)</p>
            {quranOptions.map(opt => (
              <div key={opt.key} className="space-y-2">
                <button
                  onClick={() => setQuranSelections(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-sans-ui transition-all ${quranSelections[opt.key] ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/30'}`}
                >
                  <span>{quranSelections[opt.key] ? '✓' : '○'}</span>
                  <span>{opt.label}</span>
                </button>
                {quranSelections[opt.key] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2 items-center px-2">
                    <Input
                      type="number"
                      placeholder={`كم ${opt.unit} كانت المهمة الأصلية؟`}
                      value={quranQuantities[opt.key]}
                      onChange={(e) => setQuranQuantities(prev => ({ ...prev, [opt.key]: e.target.value }))}
                      className="text-center text-sm flex-1"
                      dir="rtl"
                    />
                    <span className="text-xs font-sans-ui text-muted-foreground whitespace-nowrap">{opt.unit}</span>
                  </motion.div>
                )}
                {quranSelections[opt.key] && parseFloat(quranQuantities[opt.key] || '0') > 0 && (
                  <p className="text-xs text-center font-sans-ui" style={{ color: '#8B0000' }}>
                    التعويض: {Math.round(parseFloat(quranQuantities[opt.key]) * pct * 100) / 100} {opt.unit}
                  </p>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Knowledge options */}
        {religiousCategory === 'knowledge' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setKnowledgeType('lectures')}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-sans-ui transition-all ${knowledgeType === 'lectures' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-card text-foreground hover:border-primary/30'}`}>
                محاضرات
              </button>
              <button onClick={() => setKnowledgeType('books')}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-sans-ui transition-all ${knowledgeType === 'books' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-card text-foreground hover:border-primary/30'}`}>
                كتب
              </button>
            </div>
            {knowledgeType && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder={`كم ${knowledgeType === 'lectures' ? 'دقيقة' : 'صفحة'} كانت المهمة الأصلية؟`}
                  value={knowledgeQuantity}
                  onChange={(e) => setKnowledgeQuantity(e.target.value)}
                  className="text-center text-sm flex-1"
                  dir="rtl"
                />
                <span className="text-xs font-sans-ui text-muted-foreground whitespace-nowrap">
                  {knowledgeType === 'lectures' ? 'دقيقة' : 'صفحة'}
                </span>
              </motion.div>
            )}
            {knowledgeType && parseFloat(knowledgeQuantity || '0') > 0 && (
              <p className="text-xs text-center font-sans-ui" style={{ color: '#8B0000' }}>
                التعويض: {Math.round(parseFloat(knowledgeQuantity) * pct * 100) / 100} {knowledgeType === 'lectures' ? 'دقيقة' : 'صفحة'}
              </p>
            )}
          </motion.div>
        )}

        {/* Summary */}
        {hasReligiousInput() && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-center text-sm font-sans-ui font-bold" style={{ color: '#8B0000' }}>
              سيتم سؤالك عن هذه المهام غدًا للحفاظ على تقدم التزام قوي
            </p>
          </motion.div>
        )}
      </div>
    );
  };

  const isDone = currentStep === 'done';

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
                  <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-6 text-center">هل عرضت نفسك لمشتتات اليوم؟</h2>
                  <div className="space-y-3">
                    {distractionTiers.map(tier => {
                      const isActive = pendingSelection === `dist-${tier}`;
                      return (
                        <button key={tier} tabIndex={-1} onClick={() => selectWithDelay(`dist-${tier}`, () => {
                          setDistraction(tier);
                          if (tier === 'none') {
                            setDistractionType(null);
                            setCurrentStep('mental');
                          } else {
                            setCurrentStep('distraction_type');
                          }
                        })}
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

              {/* Distraction type step */}
              {currentStep === 'distraction_type' && (
                <div>
                  <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-6 text-center">ما نوع المشتت؟</h2>
                  <div className="space-y-3">
                    {distractionTypes.map(type => {
                      const isActive = pendingSelection === `dtype-${type}`;
                      return (
                        <button key={type} tabIndex={-1} onClick={() => selectWithDelay(`dtype-${type}`, () => { setDistractionType(type); setCurrentStep('mental'); })}
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

              {/* Axis steps */}
              {(['mental', 'physical', 'religious'] as const).includes(currentStep as any) && (() => {
                const axisKey = currentStep as 'mental' | 'physical' | 'religious';
                const axisIndex = axisKey === 'mental' ? 0 : axisKey === 'physical' ? 1 : 2;
                const currentStatus = axisKey === 'mental' ? mentalStatus : axisKey === 'physical' ? physicalStatus : religiousStatus;
                const setter = axisKey === 'mental' ? setMentalStatus : axisKey === 'physical' ? setPhysicalStatus : setReligiousStatus;

                const handleAxisSelect = (sel: TaskStatus) => {
                  setter(sel);
                  if (sel === 'minor_lack' || sel === 'major_lack') {
                    const score = getAxisScore(sel, maxScores[axisKey]);
                    setRecoveryModal({ axisKey, status: sel, pointsLost: score.deduction });
                    setRecoveryInput("");
                    setRecoveryTaskDesc("");
                    setRecoveryDetectedUnit(null);
                    setRecoveryResult(null);
                    resetReligiousRecovery();
                  } else {
                    goToNextFromAxis(axisKey);
                  }
                };

                const dismissRecoveryAndProceed = () => {
                  saveRecoveryInfoForAxis(axisKey);
                  setRecoveryModal(null);
                  goToNextFromAxis(axisKey);
                };

                const skipRecovery = () => {
                  setRecoveryModal(null);
                  setRecoveryInput("");
                  setRecoveryResult(null);
                  resetReligiousRecovery();
                  goToNextFromAxis(axisKey);
                };

                return (
                  <div>
                    <p className="text-dust text-sm tracking-[0.2em] mb-2 font-sans-ui text-center">المحور {axisIndex + 1}/3</p>
                    <h2 className="font-serif-display text-2xl font-semibold text-foreground mb-2 text-center">{AXIS_LABELS[axisKey]}</h2>
                    <p className="text-muted-foreground text-sm mb-6 text-center">ما نسبة إتمامك لمهام هذا المحور اليوم؟</p>
                    <div className="space-y-3">
                      {taskStatuses.map(s => renderStatusOption(s, currentStatus, handleAxisSelect, axisKey))}
                    </div>

                    {/* Recovery Modal */}
                    <AnimatePresence>
                      {recoveryModal && recoveryModal.axisKey === axisKey && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-6 bg-card border border-destructive/30 rounded-xl p-5 space-y-4"
                        >
                          <div className="flex items-center justify-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            <p className="text-sm font-sans-ui font-semibold">
                              لقد خسرت {recoveryModal.pointsLost} نقاط بسبب {recoveryModal.status === 'minor_lack' ? 'نقص بسيط' : 'نقص كبير'}
                            </p>
                          </div>
                          <p className="text-muted-foreground text-sm text-center font-sans-ui">
                            يمكنك تعويض النقاط في اليوم التالي
                          </p>

                          {/* Religious: structured selection */}
                          {axisKey === 'religious' ? (
                            renderReligiousRecoveryModal()
                          ) : (
                            <>
                              <p className="text-foreground text-sm text-center font-sans-ui font-bold">
                                اكتب المهمة التي ستعوض بها وسأحدد الوحدة تلقائيًا
                              </p>
                              <Input
                                type="text"
                                placeholder={
                                  axisKey === 'mental' ? "مثال: مذاكرة، مراجعة، حل أسئلة، محاضرات..." :
                                  "مثال: ضغط، جري، كارديو..."
                                }
                                value={recoveryTaskDesc}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRecoveryTaskDesc(val);
                                  const detected = detectUnitFromTask(val);
                                  setRecoveryDetectedUnit(detected);
                                  setRecoveryInput("");
                                  setRecoveryResult(null);
                                }}
                                className="text-center text-base"
                                dir="rtl"
                              />
                              {recoveryDetectedUnit && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                                  <span className="inline-block bg-primary/10 text-primary text-xs font-sans-ui px-3 py-1.5 rounded-full">
                                    ✓ الوحدة: {recoveryDetectedUnit.unitLabel}
                                  </span>
                                </motion.div>
                              )}
                              {recoveryTaskDesc && !recoveryDetectedUnit && (
                                <p className="text-xs text-muted-foreground text-center font-sans-ui">
                                  لم أتعرف على نوع المهمة، جرّب كلمات مثل: قراءة، ضغط، جري، كارديو...
                                </p>
                              )}
                              {recoveryDetectedUnit && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-center">
                                  <Input
                                    type="number"
                                    placeholder={`كم ${recoveryDetectedUnit.unitLabel}؟`}
                                    value={recoveryInput}
                                    onChange={(e) => {
                                      setRecoveryInput(e.target.value);
                                      const num = parseFloat(e.target.value);
                                      if (!isNaN(num) && num > 0 && recoveryDetectedUnit) {
                                        const pct = recoveryModal.status === 'minor_lack' ? 0.15 : 0.35;
                                        const result = Math.round(num * pct * 100) / 100;
                                        setRecoveryResult({ value: result, unit: recoveryDetectedUnit.unitLabel });
                                      } else {
                                        setRecoveryResult(null);
                                      }
                                    }}
                                    className="text-center text-lg flex-1"
                                    dir="rtl"
                                  />
                                  <span className="text-sm font-sans-ui text-muted-foreground whitespace-nowrap">
                                    {recoveryDetectedUnit.unitLabel}
                                  </span>
                                </motion.div>
                              )}
                              {recoveryResult !== null && (
                                <>
                                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="text-center text-sm font-sans-ui font-bold" style={{ color: '#8B0000' }}>
                                    عليك غدًا تعويض {recoveryResult.value} {recoveryResult.unit} لاسترجاع النقاط
                                  </motion.p>
                                  <p className="text-center text-xs font-sans-ui text-muted-foreground mt-1">
                                    📋 سيتم سؤالك عن هذه المهمة غدًا
                                  </p>
                                </>
                              )}
                            </>
                          )}

                          <div className="flex gap-2">
                            <button onClick={dismissRecoveryAndProceed}
                              className="flex-1 gradient-sand text-primary-foreground font-sans-ui font-medium py-3 rounded-lg hover:opacity-90 transition-opacity">
                              متابعة للتعويض
                            </button>
                            <button onClick={skipRecovery}
                              className="flex-1 border border-destructive text-destructive font-sans-ui font-medium py-3 rounded-lg hover:bg-destructive/10 transition-colors">
                              عدم التعويض
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {/* Per-axis recovery steps */}
              {currentStep === 'mental_recovery' && renderRecoveryStep('mental', mentalPending)}
              {currentStep === 'physical_recovery' && renderRecoveryStep('physical', physicalPending)}
              {currentStep === 'religious_recovery' && renderRecoveryStep('religious', religiousPending)}

              {/* Note step */}
              {currentStep === 'note' && (
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
              {currentStep !== 'distraction' && !isDone && (
                <button onClick={goBack}
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
