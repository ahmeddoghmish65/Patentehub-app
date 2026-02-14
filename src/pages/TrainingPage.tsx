import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { Question, Sign, DictionaryEntry } from '@/db/database';

interface Props { onNavigate: (page: string, data?: Record<string, string>) => void; }

type TrainType = 'questions' | 'signs' | 'dictionary';
type Phase = 'select' | 'training' | 'result';

export function TrainingPage({ onNavigate }: Props) {
  const { questions, signs, dictEntries, loadQuestions, loadSigns, loadDictEntries } = useAuthStore();
  void onNavigate;
  const [type, setType] = useState<TrainType>('questions');
  const [phase, setPhase] = useState<Phase>('select');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [items, setItems] = useState<(Question | Sign | DictionaryEntry)[]>([]);

  useEffect(() => { loadQuestions(); loadSigns(); loadDictEntries(); }, [loadQuestions, loadSigns, loadDictEntries]);

  const startTraining = useCallback((t: TrainType) => {
    setType(t); setPhase('training'); setIndex(0); setScore(0); setShowAnswer(false);
    let arr: (Question | Sign | DictionaryEntry)[] = [];
    if (t === 'questions') arr = [...questions].sort(() => Math.random() - 0.5).slice(0, 10);
    else if (t === 'signs') arr = [...signs].sort(() => Math.random() - 0.5).slice(0, 10);
    else arr = [...dictEntries].sort(() => Math.random() - 0.5).slice(0, 10);
    setItems(arr); setTotal(arr.length);
  }, [questions, signs, dictEntries]);

  const handleCorrect = (correct: boolean) => {
    if (correct) setScore(s => s + 1);
    if (index < items.length - 1) { setIndex(i => i + 1); setShowAnswer(false); }
    else setPhase('result');
  };

  if (phase === 'select') return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-2">التدريب</h1>
      <p className="text-surface-500 mb-8">اختر نوع التدريب</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { t: 'questions' as TrainType, icon: 'quiz', label: 'تدريب الأسئلة', desc: 'تمرن على أسئلة صح/خطأ', count: questions.length, color: '#3b82f6' },
          { t: 'signs' as TrainType, icon: 'traffic', label: 'تدريب الإشارات', desc: 'تعرف على الإشارات المرورية', count: signs.length, color: '#ef4444' },
          { t: 'dictionary' as TrainType, icon: 'translate', label: 'تدريب المصطلحات', desc: 'تعلم المصطلحات الإيطالية', count: dictEntries.length, color: '#8b5cf6' },
        ].map(item => (
          <button key={item.t} className="bg-white rounded-2xl p-6 border-2 border-surface-100 hover:border-primary-200 hover:shadow-lg transition-all text-right group"
            onClick={() => startTraining(item.t)} disabled={item.count === 0}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: item.color + '15' }}>
              <Icon name={item.icon} size={28} style={{ color: item.color }} filled />
            </div>
            <h3 className="text-lg font-bold text-surface-900 mb-1">{item.label}</h3>
            <p className="text-xs text-surface-400 mb-3">{item.desc}</p>
            <span className="text-xs text-primary-500 font-semibold">{item.count} عنصر متاح</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (phase === 'result') return (
    <div className="max-w-lg mx-auto text-center">
      <div className="bg-white rounded-2xl p-8 border border-surface-100">
        <div className={cn('w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6', score >= total * 0.7 ? 'bg-success-50' : 'bg-warning-50')}>
          <Icon name={score >= total * 0.7 ? 'emoji_events' : 'psychology'} size={40} className={score >= total * 0.7 ? 'text-success-500' : 'text-warning-500'} filled />
        </div>
        <h2 className="text-2xl font-bold text-surface-900 mb-2">نتيجة التدريب</h2>
        <p className="text-4xl font-bold text-primary-600 mb-2">{score}/{total}</p>
        <p className="text-surface-500 mb-8">{Math.round((score / total) * 100)}% صحيح</p>
        <div className="space-y-3">
          <Button fullWidth onClick={() => startTraining(type)} icon={<Icon name="replay" size={20} />}>إعادة التدريب</Button>
          <Button fullWidth variant="outline" onClick={() => setPhase('select')}>اختر تدريباً آخر</Button>
        </div>
      </div>
    </div>
  );

  const item = items[index];
  if (!item) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setPhase('select')} className="text-surface-400 hover:text-surface-600"><Icon name="close" size={24} /></button>
        <span className="text-sm font-semibold text-surface-700">{index + 1}/{total}</span>
      </div>
      <div className="w-full bg-surface-100 rounded-full h-2 mb-8">
        <div className="bg-primary-500 rounded-full h-2 transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <div className="bg-white rounded-2xl p-6 border border-surface-100 mb-6">
        {type === 'questions' && 'questionAr' in item && (
          <>
            <h2 className="text-base font-bold text-surface-900 mb-2">{item.questionAr}</h2>
            <p className="text-base text-surface-500 mb-4" dir="ltr">{item.questionIt}</p>
            {!showAnswer ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => { setShowAnswer(true); }} className="!border-success-300 !text-success-600">صحيح / Vero</Button>
                <Button variant="outline" onClick={() => { setShowAnswer(true); }} className="!border-danger-300 !text-danger-600">خطأ / Falso</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={cn('p-4 rounded-xl', item.isTrue ? 'bg-success-50 border border-success-200' : 'bg-danger-50 border border-danger-200')}>
                  <p className="font-semibold text-sm">{item.isTrue ? '✓ الإجابة: صحيح (Vero)' : '✗ الإجابة: خطأ (Falso)'}</p>
                  <p className="text-xs text-surface-600 mt-1">{item.explanationAr}</p>
                </div>
                <div className="flex gap-2">
                  <Button fullWidth variant="secondary" onClick={() => handleCorrect(false)} className="!bg-danger-50 !text-danger-600">لم أعرف</Button>
                  <Button fullWidth onClick={() => handleCorrect(true)} className="!bg-success-500">عرفتها ✓</Button>
                </div>
              </div>
            )}
          </>
        )}

        {type === 'signs' && 'nameAr' in item && !('questionAr' in item) && !('termIt' in item) && (
          <>
            <div className="w-32 h-32 mx-auto mb-4 bg-surface-50 rounded-xl flex items-center justify-center overflow-hidden">
              {item.image ? <img src={item.image} alt="" className="w-full h-full object-contain" /> : <Icon name="traffic" size={60} className="text-surface-300" />}
            </div>
            {!showAnswer ? (
              <div className="text-center">
                <p className="text-surface-500 mb-4">ما اسم هذه الإشارة؟</p>
                <Button onClick={() => setShowAnswer(true)}>إظهار الإجابة</Button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <h3 className="text-xl font-bold text-surface-900">{item.nameAr}</h3>
                <p className="text-primary-500 font-medium">{item.nameIt}</p>
                <p className="text-sm text-surface-500">{item.descriptionAr}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="secondary" onClick={() => handleCorrect(false)} className="!bg-danger-50 !text-danger-600">لم أعرف</Button>
                  <Button onClick={() => handleCorrect(true)} className="!bg-success-500">عرفتها ✓</Button>
                </div>
              </div>
            )}
          </>
        )}

        {type === 'dictionary' && 'termIt' in item && (
          <>
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-primary-600" dir="ltr">{item.termIt}</p>
              <p className="text-xs text-surface-400 mt-2">ما ترجمة هذا المصطلح؟</p>
            </div>
            {!showAnswer ? (
              <div className="text-center">
                <Button onClick={() => setShowAnswer(true)}>إظهار الترجمة</Button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <h3 className="text-xl font-bold text-surface-900">{item.termAr}</h3>
                <p className="text-sm text-surface-500">{item.definitionAr}</p>
                <p className="text-xs text-surface-400" dir="ltr">{item.definitionIt}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="secondary" onClick={() => handleCorrect(false)} className="!bg-danger-50 !text-danger-600">لم أعرف</Button>
                  <Button onClick={() => handleCorrect(true)} className="!bg-success-500">عرفتها ✓</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
