import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';

interface AuthPageProps {
  mode: 'login' | 'register' | 'reset-password';
  onNavigate: (page: string) => void;
}

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { login, register, resetPassword, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(''); clearError();
    if (!email || (mode !== 'reset-password' && !password)) { setLocalError('يرجى ملء جميع الحقول'); return; }
    if (mode === 'register' && !name) { setLocalError('يرجى إدخال الاسم'); return; }

    if (mode === 'reset-password') {
      if (!password) { setLocalError('أدخل كلمة المرور الجديدة'); return; }
      const ok = await resetPassword(email, password);
      if (ok) setResetDone(true);
      return;
    }

    const success = mode === 'register' ? await register(email, password, name) : await login(email, password);
    if (success) onNavigate('dashboard');
  };

  const isLogin = mode === 'login';
  const isReset = mode === 'reset-password';

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 mb-10 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="directions_car" size={22} className="text-white" filled />
            </div>
            <span className="text-xl font-bold text-surface-900 group-hover:text-primary-600 transition-colors">Patente Hub</span>
          </button>

          <h1 className="text-3xl font-bold text-surface-900 mb-2">
            {isReset ? 'إعادة تعيين كلمة المرور' : isLogin ? 'مرحباً بعودتك!' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-surface-500 mb-8">
            {isReset ? 'أدخل بريدك وكلمة المرور الجديدة' : isLogin ? 'سجّل دخولك لمتابعة التعلم' : 'سجّل مجاناً وابدأ رحلتك'}
          </p>

          {resetDone && (
            <div className="bg-success-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <Icon name="check_circle" size={20} />
              <span className="text-sm">تم تغيير كلمة المرور بنجاح! <button className="text-primary-600 font-semibold" onClick={() => onNavigate('login')}>سجّل دخول</button></span>
            </div>
          )}

          {(error || localError) && (
            <div className="bg-danger-50 border border-danger-200 text-danger-600 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <Icon name="error" size={20} />
              <span className="text-sm">{error || localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && <Input label="الاسم الكامل" placeholder="أدخل اسمك" icon="person" value={name} onChange={e => setName(e.target.value)} />}
            <Input label="البريد الإلكتروني" type="email" placeholder="example@email.com" icon="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="text-left" />
            {!isReset || password ? (
              <div className="relative">
                <Input label={isReset ? 'كلمة المرور الجديدة' : 'كلمة المرور'} type={showPassword ? 'text' : 'password'} placeholder="••••••••" icon="lock" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" className="text-left" />
                <button type="button" className="absolute left-3 top-9 text-surface-400 hover:text-surface-600" onClick={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
            ) : null}
            <Button type="submit" fullWidth size="lg" loading={isLoading}>
              {isReset ? 'إعادة تعيين' : isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'}
            </Button>
          </form>

          <div className="text-center mt-6 space-y-2">
            {isLogin && (
              <button className="block w-full text-sm text-primary-600 hover:text-primary-700" onClick={() => onNavigate('reset-password')}>
                نسيت كلمة المرور؟
              </button>
            )}
            <p className="text-surface-500 text-sm">
              {isLogin ? 'ليس لديك حساب؟' : isReset ? 'تذكرت كلمة المرور؟' : 'لديك حساب بالفعل؟'}
              <button className="text-primary-600 font-semibold hover:text-primary-700 mr-2" onClick={() => onNavigate(isLogin || isReset ? (isReset ? 'login' : 'register') : 'login')}>
                {isLogin ? 'سجّل الآن' : 'سجّل الدخول'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-primary-800 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="relative text-center max-w-lg">
          <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 border border-white/30">
            <Icon name="school" size={48} className="text-white" filled />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">تعلّم الباتينتي بالعربية</h2>
          <p className="text-primary-100 text-lg leading-relaxed">انضم لأكثر من 5000 عربي نجحوا في امتحان رخصة القيادة الإيطالية</p>
        </div>
      </div>
    </div>
  );
}
