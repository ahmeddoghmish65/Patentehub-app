import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { Question } from '@/db/database';

interface Props {
  onNavigate: (page: string) => void;
}

export function ExamSimulatorPage({ onNavigate }: Props) {
  const { questions, loadQuestions, saveQuizResult } = useAuthStore();
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; userAnswer: boolean; correct: boolean }[]>([]);
  const [phase, setPhase] = useState<'intro' | 'exam' | 'result'>('intro');
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const EXAM_QUESTIONS = 30;
  const EXAM_TIME = 30 * 60; // 30 minutes
  const PASS_ERRORS = 3; // max 3 errors

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  useEffect(() => {
    if (questions.length > 0) {
      const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, EXAM_QUESTIONS);
      setExamQuestions(shuffled);
    }
  }, [questions]);

  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    if (phase === 'exam') {
      iv = setInterval(() => {
        const e = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(e);
        if (e >= EXAM_TIME) {
          // Time's up - finish exam
          finishExam();
        }
      }, 1000);
    }
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startTime]);

  const start = useCallback(() => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, EXAM_QUESTIONS);
    setExamQuestions(shuffled);
    setPhase('exam');
    setStartTime(Date.now());
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
  }, [questions]);

  const handleAnswer = (ans: boolean) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(ans);
    setShowExplanation(true);
    const q = examQuestions[currentIndex];
    const correct = ans === q.isTrue;
    setAnswers(prev => [...prev, { questionId: q.id, userAnswer: ans, correct }]);
  };

  const next = () => {
    if (currentIndex < examQuestions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    const correctCount = answers.filter(a => a.correct).length;
    const score = Math.round((correctCount / examQuestions.length) * 100);
    await saveQuizResult({
      topicId: 'exam-simulator', lessonId: '', score,
      totalQuestions: examQuestions.length, correctAnswers: correctCount,
      wrongAnswers: examQuestions.length - correctCount,
      timeSpent: Math.floor((Date.now() - startTime) / 1000), answers,
    });
    setPhase('result');
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const remaining = EXAM_TIME - elapsed;

  if (examQuestions.length === 0 && questions.length === 0) return (
    <div className="text-center py-20">
      <Icon name="assignment" size={48} className="text-surface-300 mx-auto mb-4" />
      <p className="text-surface-500 mb-4">لا توجد أسئلة كافية لمحاكاة الامتحان</p>
      <Button onClick={() => onNavigate('dashboard')}>العودة</Button>
    </div>
  );

  if (phase === 'intro') return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2 text-surface-500 hover:text-primary-600 mb-6">
        <Icon name="arrow_forward" size={20} /><span className="text-sm">العودة</span>
      </button>
      <div className="bg-white rounded-2xl p-8 border border-surface-100 text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <Icon name="assignment" size={40} className="text-white" filled />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">محاكي الامتحان</h1>
        <p className="text-surface-500 mb-6">محاكاة حقيقية لامتحان الباتينتي الإيطالي</p>

        <div className="bg-surface-50 rounded-xl p-5 mb-6 text-right space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-600">عدد الأسئلة</span>
            <span className="font-bold text-surface-900">{Math.min(EXAM_QUESTIONS, questions.length)} سؤال</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-600">الوقت المتاح</span>
            <span className="font-bold text-surface-900">30 دقيقة</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-600">حد الأخطاء</span>
            <span className="font-bold text-danger-600">{PASS_ERRORS} أخطاء كحد أقصى</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-600">نوع الأسئلة</span>
            <span className="font-bold text-surface-900">صح / خطأ (Vero / Falso)</span>
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 mb-6 flex items-start gap-3 text-right">
          <Icon name="info" size={20} className="text-amber-500 shrink-0 mt-0.5" filled />
          <p className="text-sm text-amber-700">
            في الامتحان الحقيقي، يُسمح بحد أقصى {PASS_ERRORS} أخطاء من أصل 30 سؤال. الوقت المتاح 30 دقيقة.
          </p>
        </div>

        <Button size="lg" fullWidth onClick={start} icon={<Icon name="play_arrow" size={22} />}>
          ابدأ الامتحان
        </Button>
      </div>
    </div>
  );

  if (phase === 'result') {
    const cc = answers.filter(a => a.correct).length;
    const errors = answers.length - cc;
    const passed = errors <= PASS_ERRORS;
    const score = Math.round((cc / examQuestions.length) * 100);
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-8 border border-surface-100 text-center">
          <div className={cn('w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6', passed ? 'bg-success-50' : 'bg-danger-50')}>
            <Icon name={passed ? 'celebration' : 'sentiment_dissatisfied'} size={48} className={passed ? 'text-success-500' : 'text-danger-500'} filled />
          </div>
          <h1 className="text-3xl font-bold text-surface-900 mb-2">{passed ? '🎉 ناجح!' : '❌ راسب'}</h1>
          <p className="text-surface-500 mb-6">
            {passed ? `أحسنت! ارتكبت ${errors} أخطاء فقط من أصل ${PASS_ERRORS} مسموح` : `ارتكبت ${errors} أخطاء — المسموح ${PASS_ERRORS} فقط`}
          </p>

          <div className="relative w-36 h-36 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={passed ? '#22c55e' : '#ef4444'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${score * 2.64} ${264 - score * 2.64}`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('text-3xl font-bold', passed ? 'text-success-500' : 'text-danger-500')}>{score}%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-50 rounded-xl p-3"><p className="text-xl font-bold text-success-500">{cc}</p><p className="text-xs text-surface-500">صحيح</p></div>
            <div className="bg-surface-50 rounded-xl p-3"><p className="text-xl font-bold text-danger-500">{errors}</p><p className="text-xs text-surface-500">خطأ</p></div>
            <div className="bg-surface-50 rounded-xl p-3"><p className="text-xl font-bold text-primary-500">{fmt(elapsed)}</p><p className="text-xs text-surface-500">الوقت</p></div>
          </div>

          <div className="space-y-3">
            <Button fullWidth onClick={start} icon={<Icon name="replay" size={20} />}>إعادة الامتحان</Button>
            <Button fullWidth variant="outline" onClick={() => onNavigate('dashboard')}>العودة للرئيسية</Button>
          </div>
        </div>
      </div>
    );
  }

  const q = examQuestions[currentIndex];
  if (!q) return null;
  const pct = ((currentIndex + 1) / examQuestions.length) * 100;
  const currentErrors = answers.filter(a => !a.correct).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onNavigate('dashboard')} className="text-surface-400 hover:text-surface-600"><Icon name="close" size={24} /></button>
        <div className="flex items-center gap-4">
          {/* Timer */}
          <span className={cn('text-sm font-semibold flex items-center gap-1 px-3 py-1 rounded-lg', remaining < 300 ? 'bg-danger-50 text-danger-600' : 'bg-surface-100 text-surface-600')}>
            <Icon name="timer" size={16} />
            {fmt(remaining)}
          </span>
          {/* Errors counter */}
          <span className={cn('text-sm font-semibold flex items-center gap-1 px-3 py-1 rounded-lg', currentErrors >= PASS_ERRORS ? 'bg-danger-50 text-danger-600' : 'bg-surface-100 text-surface-600')}>
            <Icon name="error" size={16} />
            {currentErrors}/{PASS_ERRORS}
          </span>
          <span className="text-sm font-semibold text-surface-700">{currentIndex + 1}/{examQuestions.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-100 rounded-full h-2 mb-6">
        <div className="bg-green-500 rounded-full h-2 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-surface-100 p-6 sm:p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-lg font-semibold">محاكي الامتحان</span>
          <span className={cn('text-xs px-2 py-1 rounded-lg font-semibold',
            q.difficulty === 'easy' ? 'bg-success-50 text-success-600' : q.difficulty === 'medium' ? 'bg-warning-50 text-warning-600' : 'bg-danger-50 text-danger-600')}>
            {q.difficulty === 'easy' ? 'سهل' : q.difficulty === 'medium' ? 'متوسط' : 'صعب'}
          </span>
        </div>
        {q.image && <img src={q.image} alt="" className="w-full rounded-xl mb-4 max-h-48 object-contain" />}
        <h2 className="text-base font-bold text-surface-900 mb-2 leading-relaxed">{q.questionAr}</h2>
        <p className="text-base text-surface-600" dir="ltr">{q.questionIt}</p>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[true, false].map(val => {
          const isSelected = selectedAnswer === val;
          const isCorrect = val === q.isTrue;
          const show = selectedAnswer !== null;
          return (
            <button key={String(val)}
              className={cn('p-5 rounded-xl border-2 transition-all text-center font-bold text-lg',
                !show && 'hover:border-primary-300 border-surface-200 cursor-pointer',
                show && isCorrect && 'border-success-500 bg-success-50',
                show && isSelected && !isCorrect && 'border-danger-500 bg-danger-50',
                show && !isSelected && !isCorrect && 'border-surface-200 opacity-50',
              )}
              onClick={() => handleAnswer(val)}
              disabled={show}
            >
              <Icon name={val ? 'check_circle' : 'cancel'} size={28} className={cn('mx-auto mb-1.5',
                !show ? (val ? 'text-success-400' : 'text-danger-400') :
                isCorrect ? 'text-success-500' : isSelected ? 'text-danger-500' : 'text-surface-300'
              )} filled />
              <span className={cn('text-base', !show ? 'text-surface-700' : isCorrect ? 'text-success-600' : isSelected && !isCorrect ? 'text-danger-600' : 'text-surface-400')}>
                {val ? 'صحيح / Vero' : 'خطأ / Falso'}
              </span>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={cn('rounded-xl p-4 mb-6 border', selectedAnswer === q.isTrue ? 'bg-success-50 border-success-200' : 'bg-blue-50 border-blue-200')}>
          <div className="flex items-start gap-3">
            <Icon name={selectedAnswer === q.isTrue ? 'lightbulb' : 'info'} size={20} className={selectedAnswer === q.isTrue ? 'text-success-500' : 'text-blue-500'} filled />
            <div>
              <p className="font-semibold text-sm text-surface-800 mb-1">{selectedAnswer === q.isTrue ? '✓ إجابة صحيحة!' : '✗ إجابة خاطئة'}</p>
              <p className="text-sm text-surface-600">{q.explanationAr}</p>
              <p className="text-sm text-surface-500 mt-1" dir="ltr">{q.explanationIt}</p>
            </div>
          </div>
        </div>
      )}

      {selectedAnswer !== null && (
        <Button fullWidth size="lg" onClick={next}>
          {currentIndex < examQuestions.length - 1 ? 'السؤال التالي' : 'عرض النتيجة'}
          <Icon name="arrow_back" size={20} />
        </Button>
      )}
    </div>
  );
}
