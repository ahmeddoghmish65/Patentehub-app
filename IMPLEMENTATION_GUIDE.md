# دليل التحديثات الشامل لمنصة Patente Hub

## نظرة عامة
هذا الملف يحتوي على جميع التحسينات والتحديثات المطلوبة للمنصة مع شرح مفصل لكل ميزة وطريقة تطبيقها.

---

## 1. تحسين نظام تغيير كلمة المرور ✅

### المتطلبات:
- إضافة حقل لكلمة المرور الحالية
- إضافة حقل لكلمة المرور الجديدة
- إضافة حقل لتأكيد كلمة المرور الجديدة
- التحقق من تطابق كلمة المرور الجديدة والتأكيد

### التطبيق في ProfilePage.tsx:

```typescript
const [changePasswordModal, setChangePasswordModal] = useState(false);
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmNewPassword, setConfirmNewPassword] = useState('');
const [passwordError, setPasswordError] = useState('');

const handleChangePassword = async () => {
  setPasswordError('');
  
  // Validation
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    setPasswordError('يرجى ملء جميع الحقول');
    return;
  }
  
  if (newPassword !== confirmNewPassword) {
    setPasswordError('كلمة المرور الجديدة والتأكيد غير متطابقتين');
    return;
  }
  
  if (newPassword.length < 6) {
    setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    return;
  }
  
  // Verify current password
  const isCurrentValid = await apiVerifyCurrentPassword(user.email, currentPassword);
  if (!isCurrentValid) {
    setPasswordError('كلمة المرور الحالية غير صحيحة');
    return;
  }
  
  // Change password
  const result = await apiChangePassword(user.email, currentPassword, newPassword);
  if (result.success) {
    // Send email notification
    await sendEmail(user.email, 'password_change', { name: user.firstName });
    alert('تم تغيير كلمة المرور بنجاح ✓');
    setChangePasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  } else {
    setPasswordError(result.error || 'حدث خطأ');
  }
};
```

---

## 2. إصلاح نظام نسيان كلمة المرور ✅

### المشكلة الحالية:
نظام إعادة التعيين الحالي لا يعمل بشكل جيد

### الحل المقترح:
إنشاء نظام إعادة تعيين محسّن مع التحقق من البريد الإلكتروني

### التطبيق في AuthPage.tsx:

```typescript
// Add these states
const [resetStep, setResetStep] = useState<'email' | 'code' | 'newPassword'>('email');
const [verificationCode, setVerificationCode] = useState('');
const [generatedCode, setGeneratedCode] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

const handleForgotPassword = async () => {
  if (resetStep === 'email') {
    // Step 1: Send verification code
    if (!email) {
      setLocalError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    
    // Check if email exists
    const exists = await apiCheckEmailExists(email);
    if (!exists) {
      setLocalError('البريد الإلكتروني غير مسجل');
      return;
    }
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    
    // Send code via email
    await sendVerificationCode(email, code);
    
    setResetStep('code');
    alert('تم إرسال رمز التحقق إلى بريدك الإلكتروني');
    
  } else if (resetStep === 'code') {
    // Step 2: Verify code
    if (verificationCode !== generatedCode) {
      setLocalError('رمز التحقق غير صحيح');
      return;
    }
    setResetStep('newPassword');
    
  } else if (resetStep === 'newPassword') {
    // Step 3: Set new password
    if (!password || !confirmPassword) {
      setLocalError('يرجى ملء جميع الحقول');
      return;
    }
    
    if (password !== confirmPassword) {
      setLocalError('كلمة المرور والتأكيد غير متطابقتين');
      return;
    }
    
    if (password.length < 6) {
      setLocalError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    const result = await resetPassword(email, password);
    if (result) {
      await sendEmail(email, 'password_reset', { name: '' });
      alert('تم إعادة تعيين كلمة المرور بنجاح!');
      onNavigate('login');
    }
  }
};
```

---

## 3. نظام إدارة المديرين والصلاحيات ✅

### الميزات الجديدة:
- إضافة دور "مشرف" (moderator) بالإضافة للمدير والمستخدم
- نظام صلاحيات دقيق لكل مدير
- إمكانية تخصيص المهام التي يمكن لكل مدير إدارتها

### هيكل الصلاحيات (AdminPermissions):
```typescript
interface AdminPermissions {
  manageUsers: boolean;         // إدارة المستخدمين
  manageSections: boolean;       // إدارة الأقسام
  manageLessons: boolean;        // إدارة الدروس
  manageQuestions: boolean;      // إدارة الأسئلة
  manageSigns: boolean;          // إدارة الإشارات
  manageDictionary: boolean;     // إدارة القاموس
  managePosts: boolean;          // إدارة المنشورات
  viewReports: boolean;          // عرض البلاغات
  viewLogs: boolean;             // عرض السجلات
  viewStats: boolean;            // عرض الإحصائيات
}
```

### التطبيق في AdminPage.tsx:

```typescript
// Add Admin Modal Component
const AdminPermissionsModal = ({ user, onClose, onSave }) => {
  const [permissions, setPermissions] = useState<AdminPermissions>(
    user.adminPermissions || {
      manageUsers: false,
      manageSections: false,
      manageLessons: false,
      manageQuestions: false,
      manageSigns: false,
      manageDictionary: false,
      managePosts: false,
      viewReports: false,
      viewLogs: false,
      viewStats: false,
    }
  );
  
  const permissionsList = [
    { key: 'manageUsers', label: 'إدارة المستخدمين', icon: 'people' },
    { key: 'manageSections', label: 'إدارة الأقسام', icon: 'category' },
    { key: 'manageLessons', label: 'إدارة الدروس', icon: 'school' },
    { key: 'manageQuestions', label: 'إدارة الأسئلة', icon: 'quiz' },
    { key: 'manageSigns', label: 'إدارة الإشارات', icon: 'traffic' },
    { key: 'manageDictionary', label: 'إدارة القاموس', icon: 'book' },
    { key: 'managePosts', label: 'إدارة المنشورات', icon: 'forum' },
    { key: 'viewReports', label: 'عرض البلاغات', icon: 'report' },
    { key: 'viewLogs', label: 'عرض السجلات', icon: 'history' },
    { key: 'viewStats', label: 'عرض الإحصائيات', icon: 'analytics' },
  ];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-6">تعديل صلاحيات المدير</h2>
        
        <div className="space-y-3 mb-6">
          {permissionsList.map(perm => (
            <label key={perm.key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 cursor-pointer">
              <input
                type="checkbox"
                checked={permissions[perm.key as keyof AdminPermissions]}
                onChange={(e) => setPermissions(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                className="w-5 h-5 text-primary-600 rounded"
              />
              <Icon name={perm.icon} size={24} />
              <span className="flex-1">{perm.label}</span>
            </label>
          ))}
        </div>
        
        <div className="flex gap-3">
          <Button onClick={() => onSave(permissions)} fullWidth>حفظ</Button>
          <Button onClick={onClose} variant="outline" fullWidth>إلغاء</Button>
        </div>
      </div>
    </div>
  );
};

// Function to promote user to admin/moderator
const handlePromoteToAdmin = async (userId: string, role: 'admin' | 'moderator') => {
  const defaultPermissions: AdminPermissions = {
    manageUsers: role === 'admin',
    manageSections: true,
    manageLessons: true,
    manageQuestions: true,
    manageSigns: true,
    manageDictionary: true,
    managePosts: true,
    viewReports: true,
    viewLogs: role === 'admin',
    viewStats: true,
  };
  
  await apiUpdateUserRole(token, userId, role, defaultPermissions);
  await loadAdminUsers();
};
```

---

## 4. نظام التحقق من المستخدم ✅

### الميزة:
إضافة علامة "تم التحقق" (Verified Badge) للمستخدمين

### التطبيق:

```typescript
// في User interface (database.ts)
interface User {
  // ... existing fields
  isVerified: boolean; // NEW
}

// في AdminPage.tsx
const toggleUserVerification = async (userId: string, currentStatus: boolean) => {
  await apiUpdateUserVerification(token, userId, !currentStatus);
  await loadAdminUsers();
};

// في CommunityPage.tsx وأي مكان يعرض اسم المستخدم
const UserNameWithBadge = ({ user }) => (
  <div className="flex items-center gap-1">
    <span className="font-semibold">{user.firstName} {user.lastName}</span>
    {user.isVerified && (
      <Icon 
        name="verified" 
        size={16} 
        className="text-primary-600"
        title="مستخدم موثق"
      />
    )}
  </div>
);
```

---

## 5. تحسين صفحة التسجيل مع اليوزرنيم ✅

### الحقول المطلوبة:
1. الاسم الأول
2. اسم العائلة
3. اسم المستخدم (Username) - اختياري، يتم إنشاؤه تلقائياً إذا لم يُدخل
4. البريد الإلكتروني
5. كلمة المرور
6. تأكيد كلمة المرور

### التطبيق في AuthPage.tsx:

```typescript
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    setLocalError('يرجى ملء جميع الحقول المطلوبة');
    return;
  }
  
  if (password !== confirmPassword) {
    setLocalError('كلمة المرور والتأكيد غير متطابقتين');
    return;
  }
  
  if (password.length < 6) {
    setLocalError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    return;
  }
  
  // Generate username if not provided
  const finalUsername = username.trim() || generateUsername(firstName, lastName);
  
  // Check if username is taken
  if (username.trim()) {
    const isTaken = await apiCheckUsernameExists(username);
    if (isTaken) {
      setLocalError('اسم المستخدم مستخدم بالفعل');
      return;
    }
  }
  
  const success = await register(email, password, firstName, lastName, finalUsername);
  
  if (success) {
    // Send welcome email
    await sendEmail(email, 'registration', { name: firstName });
    onNavigate('dashboard');
  }
};

// في form:
<form onSubmit={handleRegister} className="space-y-5">
  <Input 
    label="الاسم الأول *" 
    placeholder="أدخل اسمك الأول" 
    icon="person"
    value={firstName}
    onChange={e => setFirstName(e.target.value)}
  />
  
  <Input 
    label="اسم العائلة *" 
    placeholder="أدخل اسم العائلة" 
    icon="person"
    value={lastName}
    onChange={e => setLastName(e.target.value)}
  />
  
  <Input 
    label="اسم المستخدم (اختياري)" 
    placeholder="سيتم إنشاؤه تلقائياً إذا تركته فارغاً" 
    icon="alternate_email"
    value={username}
    onChange={e => setUsername(e.target.value)}
    dir="ltr"
    className="text-left"
  />
  
  <Input 
    label="البريد الإلكتروني *" 
    type="email"
    placeholder="example@email.com" 
    icon="email"
    value={email}
    onChange={e => setEmail(e.target.value)}
    dir="ltr"
    className="text-left"
  />
  
  <div className="relative">
    <Input 
      label="كلمة المرور *" 
      type={showPassword ? 'text' : 'password'}
      placeholder="6 أحرف على الأقل" 
      icon="lock"
      value={password}
      onChange={e => setPassword(e.target.value)}
      dir="ltr"
      className="text-left"
    />
    <button 
      type="button" 
      className="absolute left-3 top-9 text-surface-400 hover:text-surface-600"
      onClick={() => setShowPassword(!showPassword)}
    >
      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
    </button>
  </div>
  
  <div className="relative">
    <Input 
      label="تأكيد كلمة المرور *" 
      type={showConfirmPassword ? 'text' : 'password'}
      placeholder="أعد كتابة كلمة المرور" 
      icon="lock"
      value={confirmPassword}
      onChange={e => setConfirmPassword(e.target.value)}
      dir="ltr"
      className="text-left"
    />
    <button 
      type="button" 
      className="absolute left-3 top-9 text-surface-400 hover:text-surface-600"
      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
    >
      <Icon name={showConfirmPassword ? 'visibility_off' : 'visibility'} size={20} />
    </button>
  </div>
  
  <Button type="submit" fullWidth size="lg" loading={isLoading}>
    إنشاء الحساب
  </Button>
</form>
```

---

## 6. نظام قفل المحتوى حتى إكمال البيانات الشخصية ✅

### المتطلبات:
- بعد إكمال أول درس، اختبار، أو تدريب يتم قفل جميع الأقسام
- لا يمكن فتحها إلا بعد إكمال البيانات الشخصية
- البيانات المطلوبة:
  1. تاريخ الميلاد
  2. الدولة (إيطاليا إجبارياً)
  3. المحافظة/الولاية
  4. الجنس
  5. رقم الهاتف مع مفتاح الدولة
  6. مستوى اللغة الإيطالية

### التطبيق:

```typescript
// في database.ts - PersonalInfo interface
interface PersonalInfo {
  birthDate: string;
  country: string; // Must be 'Italy'
  state: string;
  gender: 'male' | 'female' | 'other' | '';
  phone: string;
  phoneCountryCode: string;
  italianLevel: 'weak' | 'good' | 'very_good' | 'native' | '';
  isCompleted: boolean;
}

// في UserProgress interface
interface UserProgress {
  // ... existing fields
  firstLessonCompleted: boolean;
  firstQuizCompleted: boolean;
  firstTrainingCompleted: boolean;
  contentLocked: boolean;
}

// دالة للتحقق من الحاجة لقفل المحتوى
const checkContentLock = (user: User): boolean => {
  const { progress, personalInfo } = user;
  
  // إذا تم إكمال أي من الأنشطة الأولى
  const hasCompletedActivity = 
    progress.firstLessonCompleted || 
    progress.firstQuizCompleted || 
    progress.firstTrainingCompleted;
  
  // قفل المحتوى إذا تم إكمال نشاط ولم تكتمل البيانات الشخصية
  return hasCompletedActivity && !personalInfo.isCompleted;
};

// مكون تحذير قفل المحتوى
const ContentLockedModal = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="lock" size={40} className="text-warning-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">المحتوى مقفل 🔒</h2>
          <p className="text-surface-600">
            لمتابعة التعلم، يرجى إكمال بياناتك الشخصية أولاً
          </p>
        </div>
        
        <div className="bg-primary-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Icon name="info" size={20} />
            البيانات المطلوبة:
          </h3>
          <ul className="space-y-1 text-sm text-surface-700">
            <li>✓ تاريخ الميلاد</li>
            <li>✓ الدولة والمحافظة</li>
            <li>✓ الجنس</li>
            <li>✓ رقم الهاتف</li>
            <li>✓ مستوى اللغة الإيطالية</li>
          </ul>
        </div>
        
        <Button onClick={onComplete} fullWidth size="lg">
          إكمال البيانات الآن
        </Button>
      </div>
    </div>
  );
};

// في كل صفحة محتوى (LessonsPage, QuizPage, TrainingPage, إلخ)
const LessonsPage = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const [showLockedModal, setShowLockedModal] = useState(false);
  
  useEffect(() => {
    if (user && checkContentLock(user)) {
      setShowLockedModal(true);
    }
  }, [user]);
  
  if (showLockedModal) {
    return (
      <ContentLockedModal 
        onComplete={() => {
          setShowLockedModal(false);
          onNavigate('profile');
        }} 
      />
    );
  }
  
  // ... rest of component
};

// صفحة إكمال البيانات الشخصية في ProfilePage
const PersonalInfoForm = ({ user, onSave }: { user: User; onSave: (info: PersonalInfo) => void }) => {
  const [formData, setFormData] = useState<PersonalInfo>({
    birthDate: user.personalInfo?.birthDate || '',
    country: 'Italy', // Fixed to Italy
    state: user.personalInfo?.state || '',
    gender: user.personalInfo?.gender || '',
    phone: user.personalInfo?.phone || '',
    phoneCountryCode: user.personalInfo?.phoneCountryCode || '+39',
    italianLevel: user.personalInfo?.italianLevel || '',
    isCompleted: false,
  });
  
  const italianStates = [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
    'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
    'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
    'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'
  ];
  
  const handleSubmit = () => {
    // Validation
    if (!formData.birthDate || !formData.state || !formData.gender || 
        !formData.phone || !formData.italianLevel) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    const completedInfo = { ...formData, isCompleted: true };
    onSave(completedInfo);
  };
  
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold">إكمال البيانات الشخصية</h3>
      
      <div>
        <label className="block text-sm font-medium mb-2">تاريخ الميلاد *</label>
        <input
          type="date"
          value={formData.birthDate}
          onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:outline-none"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">الدولة *</label>
        <input
          type="text"
          value="إيطاليا (Italy)"
          disabled
          className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-surface-50"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">المحافظة/المنطقة *</label>
        <select
          value={formData.state}
          onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:outline-none"
        >
          <option value="">اختر المحافظة</option>
          {italianStates.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">الجنس *</label>
        <div className="flex gap-4">
          {[
            { value: 'male', label: 'ذكر', icon: 'male' },
            { value: 'female', label: 'أنثى', icon: 'female' },
            { value: 'other', label: 'آخر', icon: 'transgender' }
          ].map(option => (
            <label key={option.value} className="flex-1">
              <input
                type="radio"
                name="gender"
                value={option.value}
                checked={formData.gender === option.value}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                className="sr-only peer"
              />
              <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-surface-200 peer-checked:border-primary-500 peer-checked:bg-primary-50 cursor-pointer">
                <Icon name={option.icon} size={20} />
                <span>{option.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">رقم الهاتف *</label>
        <div className="flex gap-3">
          <select
            value={formData.phoneCountryCode}
            onChange={(e) => setFormData(prev => ({ ...prev, phoneCountryCode: e.target.value }))}
            className="w-32 px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:outline-none"
          >
            <option value="+39">🇮🇹 +39</option>
            <option value="+20">🇪🇬 +20</option>
            <option value="+966">🇸🇦 +966</option>
            <option value="+971">🇦🇪 +971</option>
            <option value="+962">🇯🇴 +962</option>
            <option value="+212">🇲🇦 +212</option>
            <option value="+216">🇹🇳 +216</option>
            <option value="+213">🇩🇿 +213</option>
          </select>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="3123456789"
            className="flex-1 px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:outline-none"
            dir="ltr"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">مستوى اللغة الإيطالية *</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'weak', label: 'ضعيف', emoji: '📚' },
            { value: 'good', label: 'جيد', emoji: '📖' },
            { value: 'very_good', label: 'جيد جداً', emoji: '⭐' },
            { value: 'native', label: 'أنا إيطالي', emoji: '🇮🇹' }
          ].map(option => (
            <label key={option.value}>
              <input
                type="radio"
                name="italianLevel"
                value={option.value}
                checked={formData.italianLevel === option.value}
                onChange={(e) => setFormData(prev => ({ ...prev, italianLevel: e.target.value as any }))}
                className="sr-only peer"
              />
              <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-surface-200 peer-checked:border-primary-500 peer-checked:bg-primary-50 cursor-pointer">
                <span className="text-2xl">{option.emoji}</span>
                <span>{option.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
      
      <Button onClick={handleSubmit} fullWidth size="lg">
        حفظ البيانات
      </Button>
    </div>
  );
};
```

---

## 7. إصلاح الصور في المجتمع ✅

### المشكلة:
- الصورة الشخصية لا تظهر في المنشورات
- الصورة لا تظهر في التعليقات
- يظهر فقط أول حرف من الاسم

### الحل:

```typescript
// في CommunityPage.tsx - تحديث Comment interface
interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string; // إضافة هذا الحقل
  content: string;
  createdAt: string;
}

// عند إنشاء تعليق جديد
const handleCreateComment = async (postId: string, content: string) => {
  await createComment(postId, content, user.avatar); // تمرير الصورة
};

// في apiCreateComment function
export async function apiCreateComment(
  token: string,
  postId: string,
  content: string,
  userAvatar: string // إضافة هذا المعامل
): Promise<ApiResponse<Comment>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    const comment: Comment = {
      id: generateId(),
      postId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userAvatar: user.avatar, // استخدام الصورة من المستخدم
      content,
      createdAt: new Date().toISOString(),
    };
    
    await db.add('comments', comment);
    
    // تحديث عدد التعليقات
    const post = await db.get('posts', postId);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      await db.put('posts', post);
    }
    
    return { success: true, data: comment };
  } catch (error) {
    return { success: false, error: 'فشل إنشاء التعليق' };
  }
}

// عرض التعليق مع الصورة
const CommentItem = ({ comment }: { comment: Comment }) => (
  <div className="flex gap-3 p-4 bg-surface-50 rounded-xl">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
      {comment.userAvatar ? (
        <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full object-cover" />
      ) : (
        <span>{comment.userName.charAt(0)}</span>
      )}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-sm">{comment.userName}</span>
        <span className="text-xs text-surface-400">{formatRelativeTime(comment.createdAt)}</span>
      </div>
      <p className="text-surface-700">{comment.content}</p>
    </div>
  </div>
);

// تحديث الصورة عند تغييرها في الملف الشخصي
const handleAvatarUpdate = async (newAvatar: string) => {
  await updateProfile({ avatar: newAvatar });
  
  // تحديث جميع المنشورات والتعليقات القديمة
  await apiUpdateUserAvatarInPosts(token, user.id, newAvatar);
};
```

---

## 8. نظام الأسئلة التفاعلية في المجتمع ✅

### الميزة:
إضافة إمكانية إنشاء أسئلة استطلاعية (صح/خطأ) في المجتمع

### التطبيق:

```typescript
// تحديث Post interface
interface Post {
  // ... existing fields
  type: 'regular' | 'poll';
  pollQuestion?: string;
  pollIsCorrect?: boolean;
  pollVotes?: { correct: number; incorrect: number };
}

// PollVote interface
interface PollVote {
  id: string;
  postId: string;
  userId: string;
  answer: boolean;
  createdAt: string;
}

// مكون إنشاء سؤال استطلاعي
const CreatePollPost = ({ onSubmit, onCancel }) => {
  const [question, setQuestion] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<boolean>(true);
  const [explanation, setExplanation] = useState('');
  
  const handleSubmit = () => {
    if (!question.trim()) {
      alert('يرجى كتابة السؤال');
      return;
    }
    
    onSubmit({
      type: 'poll',
      content: explanation,
      pollQuestion: question,
      pollIsCorrect: correctAnswer,
    });
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">السؤال *</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="اكتب سؤالاً تعليمياً (صح أم خطأ)"
          className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:outline-none resize-none"
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">الإجابة الصحيحة *</label>
        <div className="flex gap-4">
          <label className="flex-1">
            <input
              type="radio"
              name="answer"
              checked={correctAnswer === true}
              onChange={() => setCorrectAnswer(true)}
              className="sr-only peer"
            />
            <div className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-surface-200 peer-checked:border-green-500 peer-checked:bg-green-50 cursor-pointer">
              <Icon name="check_circle" size={24} className="text-green-600" />
              <span className="font-semibold">صح ✓</span>
            </div>
          </label>
          
          <label className="flex-1">
            <input
              type="radio"
              name="answer"
              checked={correctAnswer === false}
              onChange={() => setCorrectAnswer(false)}
              className="sr-only peer"
            />
            <div className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-surface-200 peer-checked:border-red-500 peer-checked:bg-red-50 cursor-pointer">
              <Icon name="cancel" size={24} className="text-red-600" />
              <span className="font-semibold">خطأ ✗</span>
            </div>
          </label>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">الشرح (اختياري)</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="اشرح الإجابة الصحيحة"
          className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:outline-none resize-none"
          rows={2}
        />
      </div>
      
      <div className="flex gap-3">
        <Button onClick={handleSubmit} fullWidth>نشر السؤال</Button>
        <Button onClick={onCancel} variant="outline" fullWidth>إلغاء</Button>
      </div>
    </div>
  );
};

// عرض منشور الاستطلاع
const PollPost = ({ post, onVote }: { post: Post; onVote: (answer: boolean) => void }) => {
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const handleVote = async (answer: boolean) => {
    await onVote(answer);
    setUserVote(answer);
    setShowResults(true);
  };
  
  const totalVotes = (post.pollVotes?.correct || 0) + (post.pollVotes?.incorrect || 0);
  const correctPercent = totalVotes > 0 ? Math.round(((post.pollVotes?.correct || 0) / totalVotes) * 100) : 0;
  const incorrectPercent = 100 - correctPercent;
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-surface-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
          <Icon name="quiz" size={24} />
        </div>
        <div>
          <h3 className="font-semibold">سؤال تفاعلي</h3>
          <p className="text-sm text-surface-500">اختبر معلوماتك</p>
        </div>
      </div>
      
      <div className="bg-primary-50 rounded-xl p-4 mb-4">
        <p className="text-lg font-medium">{post.pollQuestion}</p>
      </div>
      
      {!showResults ? (
        <div className="flex gap-4">
          <button
            onClick={() => handleVote(true)}
            className="flex-1 p-4 rounded-xl border-2 border-surface-200 hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <Icon name="check_circle" size={32} className="text-green-600 mx-auto mb-2" />
            <span className="font-semibold">صح ✓</span>
          </button>
          
          <button
            onClick={() => handleVote(false)}
            className="flex-1 p-4 rounded-xl border-2 border-surface-200 hover:border-red-500 hover:bg-red-50 transition-colors"
          >
            <Icon name="cancel" size={32} className="text-red-600 mx-auto mb-2" />
            <span className="font-semibold">خطأ ✗</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`p-4 rounded-xl ${userVote === post.pollIsCorrect ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon 
                name={userVote === post.pollIsCorrect ? 'check_circle' : 'cancel'} 
                size={24} 
                className={userVote === post.pollIsCorrect ? 'text-green-600' : 'text-red-600'}
              />
              <span className="font-semibold">
                {userVote === post.pollIsCorrect ? 'إجابة صحيحة! 🎉' : 'إجابة خاطئة'}
              </span>
            </div>
            <p className="text-sm">
              الإجابة الصحيحة: <strong>{post.pollIsCorrect ? 'صح ✓' : 'خطأ ✗'}</strong>
            </p>
          </div>
          
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>صح ✓</span>
                <span className="font-semibold">{correctPercent}%</span>
              </div>
              <div className="h-3 bg-surface-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${correctPercent}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>خطأ ✗</span>
                <span className="font-semibold">{incorrectPercent}%</span>
              </div>
              <div className="h-3 bg-surface-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${incorrectPercent}%` }}
                />
              </div>
            </div>
          </div>
          
          <p className="text-sm text-surface-500 text-center">
            {totalVotes} شخص أجاب على هذا السؤال
          </p>
          
          {post.content && (
            <div className="bg-blue-50 rounded-xl p-3 border-2 border-blue-200">
              <p className="text-sm"><strong>💡 الشرح:</strong> {post.content}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// API لحفظ التصويت
export async function apiVotePoll(
  token: string,
  postId: string,
  answer: boolean
): Promise<ApiResponse<PollVote>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    
    // Check if user already voted
    const existingVote = await db.getFromIndex('pollVotes', 'postId', postId);
    if (existingVote && existingVote.userId === user.id) {
      return { success: false, error: 'لقد صوّت بالفعل' };
    }
    
    const vote: PollVote = {
      id: generateId(),
      postId,
      userId: user.id,
      answer,
      createdAt: new Date().toISOString(),
    };
    
    await db.add('pollVotes', vote);
    
    // Update poll vote counts
    const post = await db.get('posts', postId);
    if (post && post.type === 'poll') {
      if (!post.pollVotes) {
        post.pollVotes = { correct: 0, incorrect: 0 };
      }
      
      if (answer) {
        post.pollVotes.correct++;
      } else {
        post.pollVotes.incorrect++;
      }
      
      await db.put('posts', post);
    }
    
    return { success: true, data: vote };
  } catch (error) {
    return { success: false, error: 'فشل التصويت' };
  }
}
```

---

## 9. نظام المتابعة ✅

### الميزات:
- متابعة المستخدمين الآخرين
- عرض إحصائيات المتابَعين والمتابِعين
- عرض منشورات المستخدمين المتابَعين
- عرض الأسئلة التي رفعوها

### التطبيق:

```typescript
// Follow interface (already in database.ts)
interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

// User interface updates
interface User {
  // ... existing fields
  followingCount: number;
  followersCount: number;
}

// API functions
export async function apiFollowUser(
  token: string,
  targetUserId: string
): Promise<ApiResponse<Follow>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    if (user.id === targetUserId) {
      return { success: false, error: 'لا يمكنك متابعة نفسك' };
    }
    
    const db = await getDB();
    
    // Check if already following
    const allFollows = await db.getAllFromIndex('follows', 'followerId', user.id);
    const existing = allFollows.find(f => f.followingId === targetUserId);
    
    if (existing) {
      return { success: false, error: 'تتابع هذا المستخدم بالفعل' };
    }
    
    const follow: Follow = {
      id: generateId(),
      followerId: user.id,
      followingId: targetUserId,
      createdAt: new Date().toISOString(),
    };
    
    await db.add('follows', follow);
    
    // Update counts
    const follower = await db.get('users', user.id);
    const following = await db.get('users', targetUserId);
    
    if (follower) {
      follower.followingCount = (follower.followingCount || 0) + 1;
      await db.put('users', follower);
    }
    
    if (following) {
      following.followersCount = (following.followersCount || 0) + 1;
      await db.put('users', following);
    }
    
    return { success: true, data: follow };
  } catch (error) {
    return { success: false, error: 'فشلت المتابعة' };
  }
}

export async function apiUnfollowUser(
  token: string,
  targetUserId: string
): Promise<ApiResponse<boolean>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    
    const allFollows = await db.getAllFromIndex('follows', 'followerId', user.id);
    const follow = allFollows.find(f => f.followingId === targetUserId);
    
    if (!follow) {
      return { success: false, error: 'لا تتابع هذا المستخدم' };
    }
    
    await db.delete('follows', follow.id);
    
    // Update counts
    const follower = await db.get('users', user.id);
    const following = await db.get('users', targetUserId);
    
    if (follower && follower.followingCount > 0) {
      follower.followingCount--;
      await db.put('users', follower);
    }
    
    if (following && following.followersCount > 0) {
      following.followersCount--;
      await db.put('users', following);
    }
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل إلغاء المتابعة' };
  }
}

export async function apiCheckFollowing(
  token: string,
  targetUserId: string
): Promise<ApiResponse<boolean>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    const allFollows = await db.getAllFromIndex('follows', 'followerId', user.id);
    const isFollowing = allFollows.some(f => f.followingId === targetUserId);
    
    return { success: true, data: isFollowing };
  } catch (error) {
    return { success: false, error: 'فشل التحقق' };
  }
}

// UserProfile component
const UserProfile = ({ userId, onNavigate }: { userId: string; onNavigate: (page: string) => void }) => {
  const { user: currentUser } = useAuthStore();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userStats, setUserStats] = useState({
    totalQuizzes: 0,
    accuracy: 0,
    level: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadUserProfile();
  }, [userId]);
  
  const loadUserProfile = async () => {
    const userResult = await apiGetUserProfile(token, userId);
    if (userResult.success && userResult.data) {
      setProfileUser(userResult.data);
    }
    
    const postsResult = await apiGetUserPosts(userId);
    if (postsResult.success && postsResult.data) {
      setUserPosts(postsResult.data);
    }
    
    const followResult = await apiCheckFollowing(token, userId);
    if (followResult.success) {
      setIsFollowing(followResult.data || false);
    }
    
    setLoading(false);
  };
  
  const handleFollowToggle = async () => {
    if (isFollowing) {
      const result = await apiUnfollowUser(token, userId);
      if (result.success) {
        setIsFollowing(false);
        loadUserProfile(); // Refresh to update counts
      }
    } else {
      const result = await apiFollowUser(token, userId);
      if (result.success) {
        setIsFollowing(true);
        loadUserProfile();
      }
    }
  };
  
  if (loading) return <div>جاري التحميل...</div>;
  if (!profileUser) return <div>المستخدم غير موجود</div>;
  
  const isOwnProfile = currentUser?.id === userId;
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 border border-surface-100">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-semibold overflow-hidden flex-shrink-0">
            {profileUser.avatar ? (
              <img src={profileUser.avatar} alt={profileUser.firstName} className="w-full h-full object-cover" />
            ) : (
              <span>{profileUser.firstName.charAt(0)}</span>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{profileUser.firstName} {profileUser.lastName}</h1>
              {profileUser.isVerified && (
                <Icon name="verified" size={24} className="text-primary-600" title="مستخدم موثق" />
              )}
            </div>
            
            <p className="text-surface-500 mb-4">@{profileUser.username}</p>
            
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{profileUser.followersCount || 0}</div>
                <div className="text-sm text-surface-500">متابِع</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{profileUser.followingCount || 0}</div>
                <div className="text-sm text-surface-500">يتابع</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{userPosts.length}</div>
                <div className="text-sm text-surface-500">منشور</div>
              </div>
            </div>
            
            {!isOwnProfile && (
              <Button
                onClick={handleFollowToggle}
                variant={isFollowing ? 'outline' : 'primary'}
                size="md"
              >
                <Icon name={isFollowing ? 'person_remove' : 'person_add'} size={20} />
                {isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-surface-100 text-center">
          <Icon name="quiz" size={32} className="text-primary-600 mx-auto mb-2" />
          <div className="text-2xl font-bold">{profileUser.progress.totalQuizzes}</div>
          <div className="text-sm text-surface-500">اختبار</div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-surface-100 text-center">
          <Icon name="military_tech" size={32} className="text-yellow-600 mx-auto mb-2" />
          <div className="text-2xl font-bold">{profileUser.progress.level}</div>
          <div className="text-sm text-surface-500">المستوى</div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-surface-100 text-center">
          <Icon name="check_circle" size={32} className="text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold">
            {Math.round((profileUser.progress.correctAnswers / 
              (profileUser.progress.correctAnswers + profileUser.progress.wrongAnswers || 1)) * 100)}%
          </div>
          <div className="text-sm text-surface-500">الدقة</div>
        </div>
      </div>
      
      {/* Posts */}
      <div>
        <h2 className="text-xl font-bold mb-4">المنشورات</h2>
        {userPosts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-surface-100 text-center">
            <Icon name="post_add" size={48} className="text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500">لا توجد منشورات بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 10. إمكانية حذف الصورة الشخصية ✅

### التطبيق في ProfilePage.tsx:

```typescript
const handleRemoveAvatar = async () => {
  if (window.confirm('هل أنت متأكد من حذف الصورة الشخصية؟')) {
    await updateProfile({ avatar: '' });
  }
};

// في UI:
<div className="relative group cursor-pointer">
  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-semibold overflow-hidden">
    {user.avatar ? (
      <img src={user.avatar} alt={user.firstName} className="w-full h-full object-cover" />
    ) : (
      <span>{user.firstName.charAt(0)}</span>
    )}
  </div>
  
  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
    <button
      onClick={handleAvatarChange}
      className="p-2 bg-white rounded-full hover:bg-surface-100"
      title="تغيير الصورة"
    >
      <Icon name="edit" size={20} className="text-surface-900" />
    </button>
    
    {user.avatar && (
      <button
        onClick={handleRemoveAvatar}
        className="p-2 bg-white rounded-full hover:bg-surface-100"
        title="حذف الصورة"
      >
        <Icon name="delete" size={20} className="text-danger-600" />
      </button>
    )}
  </div>
</div>
```

---

## 11. تحسين نسبة جاهزية الامتحان ✅

### الخوارزمية المحسّنة:

```typescript
// دالة حساب نسبة الجاهزية المتقدمة
function calculateExamReadiness(user: User): number {
  const { progress } = user;
  
  // العوامل المؤثرة في الجاهزية
  const factors = {
    // 1. عدد الاختبارات (30%)
    quizCount: Math.min((progress.totalQuizzes / 50) * 30, 30),
    
    // 2. الدقة (25%)
    accuracy: (() => {
      const total = progress.correctAnswers + progress.wrongAnswers;
      if (total === 0) return 0;
      const acc = (progress.correctAnswers / total) * 100;
      return (acc / 100) * 25;
    })(),
    
    // 3. الدروس المكتملة (20%)
    lessonsCompleted: Math.min((progress.completedLessons.length / 30) * 20, 20),
    
    // 4. المواضيع المكتملة (15%)
    topicsCompleted: Math.min((progress.completedTopics.length / 10) * 15, 15),
    
    // 5. الأخطاء المتكررة (-10% penalty)
    mistakesPenalty: (() => {
      const avgMistakes = progress.wrongAnswers / (progress.totalQuizzes || 1);
      if (avgMistakes > 5) return -10;
      if (avgMistakes > 3) return -5;
      return 0;
    })(),
    
    // 6. الاستمرارية (10%)
    consistency: (() => {
      const streakBonus = Math.min(progress.currentStreak * 2, 10);
      return streakBonus;
    })(),
  };
  
  // حساب المجموع
  const total = Object.values(factors).reduce((sum, value) => sum + value, 0);
  
  // التأكد من أن النسبة بين 0 و 100
  return Math.max(0, Math.min(100, Math.round(total)));
}

// دالة للحصول على توصيات بناءً على مستوى الجاهزية
function getReadinessRecommendations(readiness: number): string[] {
  const recommendations: string[] = [];
  
  if (readiness < 30) {
    recommendations.push('📚 ابدأ بدراسة الدروس الأساسية');
    recommendations.push('❓ حل المزيد من الأسئلة التدريبية');
    recommendations.push('🎯 ركز على فهم القواعد المرورية');
  } else if (readiness < 60) {
    recommendations.push('📖 راجع الدروس التي واجهت صعوبة فيها');
    recommendations.push('🔄 كرر الأسئلة الخاطئة');
    recommendations.push('🚦 تدرب على الإشارات المرورية');
  } else if (readiness < 80) {
    recommendations.push('✅ أنت على الطريق الصحيح!');
    recommendations.push('🎯 جرب محاكي الامتحان');
    recommendations.push('💪 حافظ على الاستمرارية');
  } else {
    recommendations.push('🎉 أنت جاهز تقريباً!');
    recommendations.push('🏆 جرب اختبارات نهائية');
    recommendations.push('📅 يمكنك حجز موعد الامتحان');
  }
  
  return recommendations;
}

// مكون عرض الجاهزية
const ExamReadinessCard = ({ user }: { user: User }) => {
  const readiness = calculateExamReadiness(user);
  const recommendations = getReadinessRecommendations(readiness);
  
  const getReadinessColor = (value: number) => {
    if (value < 30) return 'text-red-600 bg-red-50';
    if (value < 60) return 'text-orange-600 bg-orange-50';
    if (value < 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };
  
  const getReadinessMessage = (value: number) => {
    if (value < 30) return 'ابدأ التعلم';
    if (value < 60) return 'تحسّن جيد';
    if (value < 80) return 'جاهز تقريباً';
    return 'جاهز للامتحان!';
  };
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-surface-100">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Icon name="analytics" size={24} />
        نسبة الجاهزية للامتحان
      </h3>
      
      <div className="mb-6">
        <div className="flex items-end justify-between mb-2">
          <span className="text-4xl font-bold text-primary-600">{readiness}%</span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getReadinessColor(readiness)}`}>
            {getReadinessMessage(readiness)}
          </span>
        </div>
        
        <div className="h-4 bg-surface-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              readiness < 30 ? 'bg-red-500' :
              readiness < 60 ? 'bg-orange-500' :
              readiness < 80 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${readiness}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">التوصيات:</h4>
        {recommendations.map((rec, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm text-surface-700">
            <Icon name="arrow_forward" size={16} className="text-primary-600 mt-0.5 flex-shrink-0" />
            <span>{rec}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 12. نظام إرسال البريد الإلكتروني ✅

تم تنفيذه في ملف database-updated.ts مع دالة `sendEmail()`

### متى يتم إرسال البريد:

1. **عند التسجيل**: بريد ترحيبي احترافي
2. **عند تغيير كلمة المرور**: تأكيد التغيير
3. **عند تغيير البريد الإلكتروني**: تأكيد من البريد القديم والجديد
4. **عند إعادة تعيين كلمة المرور**: تأكيد إعادة التعيين

### مثال الاستخدام:

```typescript
// عند التسجيل
const handleRegister = async () => {
  const success = await register(email, password, firstName, lastName, username);
  if (success) {
    await sendEmail(email, 'registration', { name: firstName });
    onNavigate('dashboard');
  }
};

// عند تغيير كلمة المرور
const handleChangePassword = async () => {
  const result = await apiChangePassword(email, currentPassword, newPassword);
  if (result.success) {
    await sendEmail(email, 'password_change', { name: user.firstName });
  }
};

// عند تغيير البريد
const handleChangeEmail = async (newEmail: string) => {
  const result = await apiChangeEmail(token, newEmail);
  if (result.success) {
    await sendEmail(user.email, 'email_change', { 
      name: user.firstName,
      oldEmail: user.email,
      newEmail: newEmail
    });
    await sendEmail(newEmail, 'email_change', { 
      name: user.firstName,
      oldEmail: user.email,
      newEmail: newEmail
    });
  }
};
```

---

## ملاحظات مهمة للتطبيق:

### 1. الترتيب الموصى به للتطبيق:
1. تحديث database.ts بالهيكل الجديد
2. تحديث API functions في api.ts
3. تحديث AuthPage.tsx
4. تحديث ProfilePage.tsx
5. تحديث CommunityPage.tsx
6. تحديث AdminPage.tsx
7. اختبار جميع الميزات

### 2. التوافق مع الإصدار الحالي:
- يجب إنشاء migration script لتحديث البيانات الموجودة
- إضافة default values للحقول الجديدة في المستخدمين الحاليين

### 3. الأمان:
- التأكد من تشفير كلمات المرور
- التحقق من الصلاحيات قبل كل عملية
- تسجيل جميع العمليات الإدارية

### 4. الأداء:
- استخدام indexes في قاعدة البيانات
- Lazy loading للصور
- Pagination للمنشورات والتعليقات

---

## خلاصة:

هذا الدليل يغطي جميع التحسينات المطلوبة للمنصة. كل قسم يحتوي على:
- شرح المتطلبات
- الكود الكامل للتطبيق
- أمثلة عملية
- ملاحظات مهمة

للمساعدة في التطبيق أو توضيح أي نقطة، يرجى الرجوع إلى هذا الدليل.
