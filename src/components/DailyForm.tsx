import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Dumbbell, BookOpen, Zap, Pen, CheckCircle2, XCircle, SplitSquareVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  type AxisScore, type DistractionScore, type DailyEntry, type CompensatoryTask,
  getPercentagePoints, getDistractionScore, calculateDailyTotal,
  saveEntry, getTodayEntry, getPendingDeferredPoints, getCurrentWeekNumber,
  type User
} from '@/lib/store';
import { toast } from 'sonner';

interface Props { user: User; onSubmit: () => void; }

const PERCENTAGES = [
  { value: 100 as const, label: '100٪', desc: '10 نقاط' },
  { value: 75 as const, label: '75٪', desc: '8 نقاط + 2 مؤجلة' },
  { value: 50 as const, label: '50٪', desc: '5 نقاط + 5 مؤجلة' },
  { value: 0 as const, label: '0٪', desc: '0 نقطة + 10 مؤجلة' },
];

const DISTRACTION_OPTIONS = [
  { value: 'none' as const, label: 'لا', desc: '10 نقاط', icon: '✅' },
  { value: 'less1h' as const, label: 'أقل من ساعة', desc: '7 نقاط + 20 دقيقة استغفار', icon: '⚠️' },
  { value: '1to3h' as const, label: '1 إلى 3 ساعات', desc: '4 نقاط + 30 دقيقة استغفار', icon: '🔶' },
  { value: 'more3h' as const, label: 'أكثر من 3 ساعات', desc: '0 نقاط + 40 دقيقة استغفار', icon: '🔴' },
];

const AXES = [
  { key: 'mentalAxis' as const, name: 'المحور الذهني', icon: Brain, color: 'from-info to-info/70' },
  { key: 'physicalAxis' as const, name: 'المحور الجسدي', icon: Dumbbell, color: 'from-success to-success/70' },
  { key: 'religiousAxis' as const, name: 'المحور الديني', icon: BookOpen, color: 'from-secondary to-secondary/70' },
];

function AxisSelector({ axis, value, onChange, onSplitChange }: {
  axis: typeof AXES[0];
  value: AxisScore | null;
  onChange: (score: AxisScore) => void;
  onSplitChange?: (days: number) => void;
}) {
  const Icon = axis.icon;
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${axis.color}`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          {axis.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">ما نسبة إتمام المهام في هذا المحور اليوم؟</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {PERCENTAGES.map(p => {
            const selected = value?.percentage === p.value;
            return (
              <button
                key={p.value}
                onClick={() => {
                  const pts = getPercentagePoints(p.value);
                  onChange({ percentage: p.value, points: pts.points, deferredPoints: pts.deferred });
                }}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  selected ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-bold text-lg">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </button>
            );
          })}
        </div>
        {value?.percentage === 0 && onSplitChange && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
            <Label className="flex items-center gap-2 mb-2">
              <SplitSquareVertical className="h-4 w-4" /> تقسيم المهمة على عدة أيام
            </Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(d => (
                <button
                  key={d}
                  onClick={() => onSplitChange(d)}
                  className={`flex-1 p-2 rounded-lg border-2 text-sm transition-all ${
                    value.splitDays === d ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {d === 1 ? 'بدون' : `${d} أيام`}
                </button>
              ))}
            </div>
            {value.splitDays && value.splitDays > 1 && (
              <p className="text-xs text-muted-foreground mt-2">
                {Math.ceil(10 / value.splitDays)} نقطة/يوم لمدة {value.splitDays} أيام
              </p>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DailyForm({ user, onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const [axes, setAxes] = useState<Record<string, AxisScore | null>>({ mentalAxis: null, physicalAxis: null, religiousAxis: null });
  const [distraction, setDistraction] = useState<DistractionScore | null>(null);
  const [note, setNote] = useState('');
  const [compensatoryTasks, setCompensatoryTasks] = useState<CompensatoryTask[]>([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    const existing = getTodayEntry(user.id);
    if (existing) setAlreadySubmitted(true);
    
    const pending = getPendingDeferredPoints(user.id);
    setCompensatoryTasks(pending);
  }, [user.id]);

  if (alreadySubmitted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">تم تسجيل بيانات اليوم</h2>
        <p className="text-muted-foreground">عد غدًا لتسجيل أداء يوم جديد</p>
      </motion.div>
    );
  }

  const handleSubmit = () => {
    const mental = axes.mentalAxis;
    const physical = axes.physicalAxis;
    const religious = axes.religiousAxis;
    if (!mental || !physical || !religious || !distraction) {
      toast.error('يرجى إكمال جميع الحقول');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const entry: DailyEntry = {
      id: crypto.randomUUID(),
      userId: user.id,
      date: today,
      mentalAxis: mental,
      physicalAxis: physical,
      religiousAxis: religious,
      distraction,
      note: note.trim(),
      compensatoryTasks,
      totalPoints: 0,
      weekNumber: getCurrentWeekNumber(user.id),
    };
    entry.totalPoints = calculateDailyTotal(entry);
    saveEntry(entry);
    toast.success(`تم التسجيل! حصلت على ${entry.totalPoints} نقطة اليوم`);
    onSubmit();
  };

  const steps = [
    // Step 0: Compensatory tasks (if any)
    ...(compensatoryTasks.length > 0 ? [{
      title: 'المهام التعويضية',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">لديك نقاط مؤجلة من الأمس. هل أنجزت المهام التعويضية؟</p>
          {compensatoryTasks.map((task, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{task.axisName}</span>
                  <span className="text-sm text-muted-foreground">{task.deferredPoints} نقاط مؤجلة</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={task.completed ? 'default' : 'outline'}
                    className={task.completed ? 'gradient-primary text-primary-foreground flex-1' : 'flex-1'}
                    onClick={() => {
                      const updated = [...compensatoryTasks];
                      updated[i] = { ...task, completed: true };
                      setCompensatoryTasks(updated);
                    }}
                  >
                    <CheckCircle2 className="ml-1 h-4 w-4" /> نعم
                  </Button>
                  <Button
                    variant={!task.completed ? 'destructive' : 'outline'}
                    className="flex-1"
                    onClick={() => {
                      const updated = [...compensatoryTasks];
                      updated[i] = { ...task, completed: false };
                      setCompensatoryTasks(updated);
                    }}
                  >
                    <XCircle className="ml-1 h-4 w-4" /> لا
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ),
    }] : []),
    // Step 1-3: Axes
    ...AXES.map((axis, idx) => ({
      title: axis.name,
      content: (
        <AxisSelector
          axis={axis}
          value={axes[axis.key]}
          onChange={(score) => setAxes(prev => ({ ...prev, [axis.key]: score }))}
          onSplitChange={(days) => setAxes(prev => ({ ...prev, [axis.key]: { ...prev[axis.key]!, splitDays: days } }))}
        />
      ),
    })),
    // Step 4: Distractions
    {
      title: 'المشتتات',
      content: (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-gradient-to-br from-destructive to-destructive/70">
                <Zap className="h-5 w-5 text-destructive-foreground" />
              </div>
              المشتتات
            </CardTitle>
            <p className="text-sm text-muted-foreground">هل تعرضت لمشتتات اليوم؟</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {DISTRACTION_OPTIONS.map(opt => {
              const selected = distraction?.level === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDistraction(getDistractionScore(opt.value))}
                  className={`w-full p-3 rounded-lg border-2 text-right transition-all flex items-center gap-3 ${
                    selected ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      ),
    },
    // Step 5: Notes
    {
      title: 'ملاحظات اليوم',
      content: (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70">
                <Pen className="h-5 w-5 text-primary-foreground" />
              </div>
              ما أهم شيء تعلمته اليوم؟
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              rows={4}
            />
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-1">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'gradient-primary' : 'bg-muted'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-bold mb-4">{steps[step].title}</h2>
          {steps[step].content}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">السابق</Button>
        )}
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} className="flex-1 gradient-primary text-primary-foreground hover:opacity-90">التالي</Button>
        ) : (
          <Button onClick={handleSubmit} className="flex-1 gradient-gold text-secondary-foreground hover:opacity-90 font-bold">
            <CheckCircle2 className="ml-2 h-5 w-5" /> تسجيل
          </Button>
        )}
      </div>
    </div>
  );
}
