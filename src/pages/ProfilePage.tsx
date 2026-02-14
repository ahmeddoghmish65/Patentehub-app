import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { apiResetPassword } from '@/db/api';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, logout, updateSettings, updateProfile, mistakes, loadMistakes } = useAuthStore();
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [editEmail, setEditEmail] = useState(false);
  const [emailValue, setEmailValue] = useState(user?.email || '');
  const [editPassword, setEditPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadMistakes(); }, [loadMistakes]);

  if (!user) return null;

  const { progress, settings } = user;
  const totalAnswers = progress.correctAnswers + progress.wrongAnswers;
  const accuracy = totalAnswers > 0 ? Math.round((progress.correctAnswers / totalAnswers) * 100) : 0;
  const isAdmin = user.email === 'admin@patente.com' && user.role === 'admin';

  const handleLogout = async () => {
    await logout();
    onNavigate('landing');
  };

  const handleAvatarChange = () => { fileRef.current?.click(); };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت'); return; }
    const reader = new FileReader();
    reader.onload = () => { updateProfile({ avatar: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSaveName = () => {
    if (nameValue.trim() && nameValue !== user.name) {
      updateProfile({ name: nameValue.trim() });
    }
    setEditName(false);
  };

  const handleSaveBio = () => {
    localStorage.setItem(`bio_${user.id}`, bioValue);
    setEditBio(false);
  };

  const handleSavePassword = async () => {
    if (passwordValue.length < 6) { setPasswordMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    const result = await apiResetPassword(user.email, passwordValue);
    if (result.success) {
      setPasswordMsg('تم تغيير كلمة المرور بنجاح ✓');
      setPasswordValue('');
      setTimeout(() => { setPasswordMsg(''); setEditPassword(false); }, 2000);
    } else {
      setPasswordMsg(result.error || 'حدث خطأ');
    }
  };

  const storedBio = localStorage.getItem(`bio_${user.id}`) || '';

  // Language only affects content display in lessons, questions, signs, and dictionary
  const handleLanguageChange = (lang: 'ar' | 'it' | 'both') => {
    updateSettings({ language: lang });
  };

  const languageOptions = [
    { value: 'ar' as const, label: 'العربية فقط', icon: '🇸🇦' },
    { value: 'it' as const, label: 'الإيطالية فقط', icon: '🇮🇹' },
    { value: 'both' as const, label: 'العربية + الإيطالية', icon: '🌐' },
  ];

  const allBadges = [
    { id: 'newcomer', name: 'عضو جديد', desc: 'أنشأت حسابك', icon: 'waving_hand', color: 'bg-blue-500' },
    { id: 'quiz_master', name: 'خبير الاختبارات', desc: 'أكمل 10 اختبارات', icon: 'quiz', color: 'bg-purple-500' },
    { id: 'perfect_score', name: 'علامة كاملة', desc: 'احصل على 100%', icon: 'star', color: 'bg-yellow-500' },
    { id: 'week_streak', name: 'أسبوع متواصل', desc: '7 أيام متتالية', icon: 'local_fire_department', color: 'bg-orange-500' },
    { id: 'level_5', name: 'المستوى 5', desc: 'وصلت للمستوى 5', icon: 'military_tech', color: 'bg-green-500' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 border border-surface-100">
        <div className="flex items-start gap-4 mb-5">
          <div className="relative group cursor-pointer" onClick={handleAvatarChange}>
            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={onFileChange} />
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">{user.name.charAt(0)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="camera_alt" size={22} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -left-1 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center border-2 border-white">
              <Icon name="camera_alt" size={14} className="text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {editName ? (
              <div className="flex items-center gap-2 mb-1">
                <input className="border border-primary-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:ring-2 focus:ring-primary-100" value={nameValue} onChange={e => setNameValue(e.target.value)} autoFocus />
                <button className="p-1.5 rounded-lg bg-primary-500 text-white" onClick={handleSaveName}><Icon name="check" size={16} /></button>
                <button className="p-1.5 rounded-lg bg-surface-100" onClick={() => setEditName(false)}><Icon name="close" size={16} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-surface-900">{user.name}</h1>
                <button className="p-1 rounded hover:bg-surface-100 text-surface-400" onClick={() => { setNameValue(user.name); setEditName(true); }}>
                  <Icon name="edit" size={14} />
                </button>
              </div>
            )}
            <p className="text-sm text-surface-500 mb-1">{user.email}</p>

            {/* Bio */}
            {editBio ? (
              <div className="mt-2">
                <textarea
                  className="w-full border border-primary-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary-100"
                  rows={2} placeholder="اكتب نبذة عنك..." value={bioValue}
                  onChange={e => setBioValue(e.target.value)} maxLength={150} autoFocus
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-surface-400">{bioValue.length}/150</span>
                  <div className="flex gap-1">
                    <button className="px-2 py-1 rounded-lg text-xs bg-surface-100 text-surface-600" onClick={() => setEditBio(false)}>إلغاء</button>
                    <button className="px-2 py-1 rounded-lg text-xs bg-primary-500 text-white" onClick={handleSaveBio}>حفظ</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                {storedBio ? (
                  <p className="text-sm text-surface-600 flex items-start gap-1">
                    <span>{storedBio}</span>
                    <button className="text-surface-400 hover:text-primary-500 shrink-0 mt-0.5" onClick={() => { setBioValue(storedBio); setEditBio(true); }}>
                      <Icon name="edit" size={12} />
                    </button>
                  </p>
                ) : (
                  <button className="text-xs text-primary-500 hover:text-primary-700 flex items-center gap-1" onClick={() => { setBioValue(''); setEditBio(true); }}>
                    <Icon name="add" size={14} /> أضف نبذة عنك
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium">المستوى {progress.level}</span>
              <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">{progress.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'اختبارات', value: String(progress.totalQuizzes), icon: 'quiz', color: 'text-blue-500' },
            { label: 'الدقة', value: `${accuracy}%`, icon: 'check_circle', color: 'text-green-500' },
            { label: 'السلسلة', value: `${progress.currentStreak}`, icon: 'local_fire_department', color: 'text-orange-500' },
            { label: 'الجاهزية', value: `${progress.examReadiness}%`, icon: 'verified', color: 'text-purple-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-surface-50 rounded-xl p-2.5 text-center">
              <Icon name={stat.icon} size={18} className={cn(stat.color, 'mb-0.5')} filled />
              <p className="text-base font-bold text-surface-900">{stat.value}</p>
              <p className="text-[10px] text-surface-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Panel Button */}
      {isAdmin && (
        <button
          className="w-full bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 flex items-center gap-3 text-white shadow-lg shadow-primary-200 hover:shadow-xl transition-all"
          onClick={() => onNavigate('admin')}
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon name="admin_panel_settings" size={24} filled />
          </div>
          <div className="flex-1 text-right">
            <h3 className="font-bold">لوحة التحكم</h3>
            <p className="text-xs text-primary-200">إدارة المحتوى والمستخدمين</p>
          </div>
          <Icon name="chevron_left" size={22} />
        </button>
      )}

      {/* Edit Account */}
      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <h2 className="font-bold text-surface-900 mb-4 flex items-center gap-2">
          <Icon name="manage_accounts" size={20} className="text-primary-500" />
          تعديل بيانات الحساب
        </h2>

        {/* Edit Email */}
        <div className="mb-4 pb-4 border-b border-surface-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-700">البريد الإلكتروني</p>
              <p className="text-xs text-surface-400 mt-0.5">{user.email}</p>
            </div>
            {!editEmail ? (
              <button className="text-xs text-primary-500 font-medium hover:text-primary-700 flex items-center gap-1"
                onClick={() => { setEmailValue(user.email); setEditEmail(true); }}>
                <Icon name="edit" size={14} /> تعديل
              </button>
            ) : null}
          </div>
          {editEmail && (
            <div className="mt-3 space-y-2">
              <input
                type="email" dir="ltr" className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm text-left focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                value={emailValue} onChange={e => setEmailValue(e.target.value)} placeholder="البريد الجديد"
              />
              <p className="text-xs text-surface-400">⚠️ تغيير البريد يتطلب إعادة تسجيل الدخول</p>
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-1.5 rounded-lg text-xs bg-surface-100 text-surface-600" onClick={() => setEditEmail(false)}>إلغاء</button>
                <button className="px-3 py-1.5 rounded-lg text-xs bg-primary-500 text-white"
                  onClick={() => { setEditEmail(false); /* Email change would need backend support */ }}>
                  حفظ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit Password */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-700">كلمة المرور</p>
              <p className="text-xs text-surface-400 mt-0.5">••••••••</p>
            </div>
            {!editPassword ? (
              <button className="text-xs text-primary-500 font-medium hover:text-primary-700 flex items-center gap-1"
                onClick={() => { setPasswordValue(''); setPasswordMsg(''); setEditPassword(true); }}>
                <Icon name="lock" size={14} /> تغيير
              </button>
            ) : null}
          </div>
          {editPassword && (
            <div className="mt-3 space-y-2">
              <input
                type="password" dir="ltr" className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm text-left focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                value={passwordValue} onChange={e => setPasswordValue(e.target.value)} placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
              />
              {passwordMsg && (
                <p className={cn('text-xs', passwordMsg.includes('✓') ? 'text-success-600' : 'text-danger-500')}>
                  {passwordMsg}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-1.5 rounded-lg text-xs bg-surface-100 text-surface-600" onClick={() => setEditPassword(false)}>إلغاء</button>
                <button className="px-3 py-1.5 rounded-lg text-xs bg-primary-500 text-white" onClick={handleSavePassword}>
                  تغيير كلمة المرور
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Language Display - Only for content */}
      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <h2 className="font-bold text-surface-900 mb-2 flex items-center gap-2">
          <Icon name="translate" size={20} className="text-primary-500" />
          لغة عرض المحتوى
        </h2>
        <p className="text-xs text-surface-400 mb-4">
          تؤثر فقط على عرض المحتوى في الدروس والأسئلة والإشارات والقاموس
        </p>
        <div className="grid grid-cols-3 gap-2">
          {languageOptions.map(opt => (
            <button
              key={opt.value}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                settings.language === opt.value ? 'border-primary-500 bg-primary-50' : 'border-surface-100 hover:border-surface-200'
              )}
              onClick={() => handleLanguageChange(opt.value)}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className={cn('text-xs font-medium', settings.language === opt.value ? 'text-primary-700' : 'text-surface-600')}>{opt.label}</span>
              {settings.language === opt.value && (
                <Icon name="check_circle" size={16} className="text-primary-500" filled />
              )}
            </button>
          ))}
        </div>
        <div className="mt-3 bg-surface-50 rounded-lg p-3">
          <p className="text-xs text-surface-500">
            {settings.language === 'ar' ? '📝 سيتم عرض شرح الدروس والأسئلة والإشارات والقاموس بالعربية فقط' :
             settings.language === 'it' ? '📝 Il contenuto di lezioni, domande, segnali e dizionario verrà mostrato solo in italiano' :
             '📝 سيتم عرض المحتوى بالعربية والإيطالية معاً في الدروس والأسئلة والإشارات والقاموس'}
          </p>
        </div>
      </div>

      {/* Exam Readiness */}
      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-surface-900 flex items-center gap-2">
            <Icon name="verified" size={20} className="text-primary-500" filled />
            جاهزية الامتحان
          </h2>
          <span className={cn('text-xl font-bold', progress.examReadiness >= 70 ? 'text-success-500' : progress.examReadiness >= 40 ? 'text-warning-500' : 'text-danger-500')}>
            {progress.examReadiness}%
          </span>
        </div>
        <div className="w-full bg-surface-100 rounded-full h-3 mb-2">
          <div className={cn('rounded-full h-3 transition-all duration-700', progress.examReadiness >= 70 ? 'bg-success-500' : progress.examReadiness >= 40 ? 'bg-warning-500' : 'bg-danger-500')}
            style={{ width: `${progress.examReadiness}%` }} />
        </div>
        <p className="text-xs text-surface-500">
          {progress.examReadiness >= 70 ? '🎉 أنت جاهز للامتحان!' : progress.examReadiness >= 40 ? '📚 تقدم جيد، واصل الدراسة' : '🚀 ابدأ بحل الاختبارات'}
        </p>
      </div>

      {/* Progress Details */}
      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <h2 className="font-bold text-surface-900 mb-4 flex items-center gap-2">
          <Icon name="trending_up" size={20} className="text-primary-500" />
          التقدم
        </h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-surface-600">الدروس المكتملة</span>
              <span className="font-semibold text-surface-800">{progress.completedLessons.length}</span>
            </div>
            <div className="w-full bg-surface-100 rounded-full h-2">
              <div className="bg-primary-500 rounded-full h-2 transition-all" style={{ width: `${Math.min(100, progress.completedLessons.length * 5)}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-surface-50">
            <div className="text-center">
              <p className="text-sm font-bold text-success-600">{progress.correctAnswers}</p>
              <p className="text-xs text-surface-400">صحيحة</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-danger-600">{progress.wrongAnswers}</p>
              <p className="text-xs text-surface-400">خاطئة</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-primary-600">{totalAnswers}</p>
              <p className="text-xs text-surface-400">إجمالي</p>
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <h2 className="font-bold text-surface-900 mb-4 flex items-center gap-2">
          <Icon name="emoji_events" size={20} className="text-orange-500" />
          الإنجازات ({progress.badges.length}/{allBadges.length})
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {allBadges.map(badge => {
            const isEarned = progress.badges.includes(badge.id);
            return (
              <div key={badge.id} className={cn('rounded-xl p-2 text-center', isEarned ? 'opacity-100' : 'opacity-30')}>
                <div className={cn('w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-1', isEarned ? badge.color : 'bg-surface-200')}>
                  <Icon name={badge.icon} size={20} className={isEarned ? 'text-white' : 'text-surface-400'} filled />
                </div>
                <p className="text-[10px] font-semibold text-surface-700 leading-tight">{badge.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <h2 className="font-bold text-surface-900 mb-3 flex items-center gap-2">
          <Icon name="info" size={20} className="text-surface-400" />
          معلومات الحساب
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5"><span className="text-surface-500">تاريخ التسجيل</span><span className="text-surface-700">{new Date(user.createdAt).toLocaleDateString('ar')}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-surface-500">آخر دخول</span><span className="text-surface-700">{new Date(user.lastLogin).toLocaleDateString('ar')}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-surface-500">نوع الحساب</span><span className="text-primary-600 font-medium">{user.role === 'admin' ? 'مسؤول' : 'مستخدم'}</span></div>
        </div>
      </div>

      {/* My Mistakes (full) */}
      {mistakes.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center gap-2">
            <Icon name="error_outline" size={20} className="text-danger-500" />
            <h2 className="font-bold text-surface-900">أخطائي ({mistakes.length})</h2>
          </div>
          <div className="divide-y divide-surface-50 max-h-80 overflow-y-auto">
            {mistakes.map(m => (
              <div key={m.id} className="p-4 flex items-start gap-3">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', m.count >= 3 ? 'bg-danger-50' : 'bg-warning-50')}>
                  <span className="text-xs font-bold" style={{ color: m.count >= 3 ? '#ef4444' : '#f59e0b' }}>{m.count}×</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-surface-800">{m.questionAr}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-danger-500">إجابتك: {m.userAnswer ? 'صحيح' : 'خطأ'}</span>
                    <span className="text-success-500">الصحيح: {m.correctAnswer ? 'صحيح' : 'خطأ'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <Button variant="danger" fullWidth onClick={handleLogout} icon={<Icon name="logout" size={20} />}>
        تسجيل الخروج
      </Button>
    </div>
  );
}
