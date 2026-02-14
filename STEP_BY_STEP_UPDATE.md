# دليل التحديث خطوة بخطوة 🚀

## المقدمة

هذا الدليل سيساعدك على تحديث مشروعك الحالي إلى الإصدار المحسّن 2.0 خطوة بخطوة.

---

## ⏱️ الوقت المتوقع

- للمطورين المتمرسين: 2-3 ساعات
- للمبتدئين: 4-6 ساعات

---

## 📋 قبل البدء

### ✅ المتطلبات:
- [ ] Node.js 16+ مثبت
- [ ] معرفة أساسية بـ React و TypeScript
- [ ] محرر نصوص (VS Code موصى به)
- [ ] نسخة احتياطية من المشروع الحالي

### 📦 نسخة احتياطية:
```bash
cp -r patente-hub-system-design patente-hub-backup
```

---

## 🎯 الخطوات

### الخطوة 1: تحديث package.json ✅

**الوقت المتوقع:** 2 دقيقة

**الهدف:** إضافة التبعيات الجديدة

**الإجراء:**
لا حاجة لتغيير - package.json محدث بالفعل

**التحقق:**
```bash
npm install
```

**النتيجة المتوقعة:** تثبيت جميع الحزم بنجاح

---

### الخطوة 2: تحديث database.ts ⭐ (مهم جداً)

**الوقت المتوقع:** 5 دقائق

**الهدف:** تحديث هيكل قاعدة البيانات

**الإجراء:**
1. افتح `src/db/database.ts`
2. **احذف كل المحتوى**
3. انسخ كل محتوى ملف `database-updated.ts` المرفق
4. احفظ الملف

**التحقق:**
- [ ] يوجد interface PersonalInfo
- [ ] يوجد interface AdminPermissions
- [ ] يوجد interface Follow
- [ ] يوجد interface PollVote
- [ ] يوجد دالة sendEmail
- [ ] يوجد دالة generateUsername

**⚠️ تحذير:** هذه الخطوة حرجة - تأكد من النسخ الكامل

---

### الخطوة 3: تحديث api.ts ⭐⭐ (مهم جداً)

**الوقت المتوقع:** 15 دقيقة

**الهدف:** إضافة دوال API الجديدة

**الإجراء:**

#### 3.1 - تحديث الـ imports

افتح `src/db/api.ts` وفي السطر الأول، استبدل الـ imports بهذا:

```typescript
import {
  getDB, generateId, generateToken, hashPassword, verifyPassword, 
  generateUsername, sendEmail,  // جديد
  type User, type Section, type Lesson, type Question, type Sign,
  type DictionarySection, type DictionaryEntry, type Post, type Comment,
  type Like, type Report, type QuizResult, type UserMistake,
  type TrainingSession, type Notification, type AdminLog, 
  type AdminPermissions, type PersonalInfo, type Follow, type PollVote  // جديد
} from './database';
```

#### 3.2 - إضافة دالة checkPermission

ابحث عن دالة `isAdmin` وأضف بعدها:

```typescript
async function checkPermission(token: string, permission: keyof AdminPermissions): Promise<boolean> {
  const u = await getAuthUser(token);
  if (!u || u.role === 'user') return false;
  if (u.role === 'admin') return true;
  return u.adminPermissions?.[permission] || false;
}
```

#### 3.3 - تحديث apiRegister

استبدل دالة `apiRegister` الحالية بهذا:

```typescript
export async function apiRegister(
  email: string, 
  password: string, 
  firstName: string, 
  lastName: string,
  username?: string
): Promise<ApiRes<{ user: Omit<User, 'password'>; token: string; refreshToken: string }>> {
  if (!checkRateLimit('reg_' + email, 5, 300000)) return err('تجاوز الحد المسموح', 429);
  email = sanitize(email).toLowerCase();
  firstName = sanitize(firstName);
  lastName = sanitize(lastName);
  
  if (!validateEmail(email)) return err('بريد إلكتروني غير صالح');
  if (password.length < 6) return err('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  if (firstName.length < 2) return err('الاسم الأول قصير جداً');
  if (lastName.length < 2) return err('اسم العائلة قصير جداً');

  const db = await getDB();
  const exists = await db.getFromIndex('users', 'email', email);
  if (exists) return err('البريد الإلكتروني مستخدم بالفعل');

  // Generate username if not provided
  const finalUsername = username?.trim() || generateUsername(firstName, lastName);
  
  // Check if username exists
  const existingUsername = await db.getFromIndex('users', 'username', finalUsername);
  if (existingUsername) return err('اسم المستخدم مستخدم بالفعل');

  const now = new Date().toISOString();
  const user: User = {
    id: generateId(),
    email,
    password: await hashPassword(password),
    firstName,
    lastName,
    username: finalUsername,
    avatar: '',
    role: 'user',
    isVerified: false,
    isBanned: false,
    createdAt: now,
    lastLogin: now,
    personalInfo: {
      birthDate: '',
      country: '',
      state: '',
      gender: '',
      phone: '',
      phoneCountryCode: '',
      italianLevel: '',
      isCompleted: false,
    },
    progress: {
      totalQuizzes: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      completedLessons: [],
      completedTopics: [],
      currentStreak: 0,
      bestStreak: 0,
      lastStudyDate: '',
      level: 1,
      xp: 0,
      badges: ['newcomer'],
      examReadiness: 0,
      firstLessonCompleted: false,
      firstQuizCompleted: false,
      firstTrainingCompleted: false,
      contentLocked: false,
    },
    settings: {
      language: 'ar',
      theme: 'light',
      notifications: true,
      soundEffects: true,
      fontSize: 'medium',
      emailNotifications: true,
    },
    followingCount: 0,
    followersCount: 0,
  };

  await db.add('users', user);

  const token = generateToken();
  const refreshToken = generateToken();
  await db.add('authTokens', {
    token,
    refreshToken,
    userId: user.id,
    createdAt: now,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Send welcome email
  await sendEmail(email, 'registration', { name: firstName });

  const { password: _, ...userNoPass } = user;
  return ok({ user: userNoPass, token, refreshToken });
}
```

#### 3.4 - إضافة الدوال الجديدة

في **نهاية الملف**، أضف جميع الدوال من `api-new-functions.ts`:

- apiCheckUsernameExists
- apiCheckEmailExists
- apiVerifyCurrentPassword
- apiChangePassword
- apiChangeEmail
- apiUpdateUserRole
- apiUpdateAdminPermissions
- apiUpdateUserVerification
- apiUpdatePersonalInfo
- apiCheckContentLock
- apiMarkFirstActivity
- apiFollowUser
- apiUnfollowUser
- apiCheckFollowing
- apiGetFollowers
- apiGetFollowing
- apiCreatePollPost
- apiVotePoll
- apiCheckPollVote
- apiCreateCommentEnhanced
- apiUpdateUserAvatarInContent
- apiGetUserProfile
- apiGetUserPosts
- apiDeleteAvatar
- calculateExamReadiness
- apiUpdateExamReadiness

**💡 نصيحة:** انسخ كل محتوى `api-new-functions.ts` من السطر 53 حتى النهاية

**التحقق:**
```bash
# تأكد من عدم وجود أخطاء في التجميع
npm run dev
```

---

### الخطوة 4: تحديث AuthPage.tsx ⭐

**الوقت المتوقع:** 20 دقيقة

**الهدف:** تحديث صفحة التسجيل وإعادة تعيين كلمة المرور

**الإجراء:**

#### 4.1 - تحديث الـ states

ابحث عن:
```typescript
const [name, setName] = useState('');
```

استبدله بـ:
```typescript
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [username, setUsername] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
```

#### 4.2 - تحديث handleSubmit

استبدل قسم التسجيل في `handleSubmit` بهذا:

```typescript
if (mode === 'register') {
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    setLocalError('يرجى ملء جميع الحقول المطلوبة');
    return;
  }
  
  if (password !== confirmPassword) {
    setLocalError('كلمة المرور والتأكيد غير متطابقتين');
    return;
  }
  
  const success = await register(email, password, firstName, lastName, username);
  if (success) onNavigate('dashboard');
  return;
}
```

#### 4.3 - تحديث نموذج التسجيل

استبدل نموذج التسجيل بهذا:

```typescript
{mode === 'register' && (
  <>
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
  </>
)}

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

{!isReset || password ? (
  <div className="relative">
    <Input 
      label={isReset ? 'كلمة المرور الجديدة' : 'كلمة المرور *'} 
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
) : null}

{mode === 'register' && (
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
)}
```

**التحقق:**
- [ ] يمكن التسجيل بنجاح
- [ ] يظهر خطأ عند عدم تطابق كلمات المرور
- [ ] يتم إنشاء username تلقائياً إذا لم يُدخل

---

### الخطوة 5: تحديث authStore.ts ⭐

**الوقت المتوقع:** 10 دقائق

**الهدف:** تحديث دالة register

**الإجراء:**

ابحث عن:
```typescript
register: (email: string, password: string, name: string) => Promise<boolean>;
```

استبدله بـ:
```typescript
register: (email: string, password: string, firstName: string, lastName: string, username?: string) => Promise<boolean>;
```

ثم ابحث عن تطبيق `register:` واستبدله بـ:

```typescript
register: async (email, password, firstName, lastName, username) => {
  set({ isLoading: true, error: null });
  const r = await api.apiRegister(email, password, firstName, lastName, username);
  if (r.success && r.data) {
    sessionStorage.setItem(TOKEN_KEY, r.data.token);
    set({ user: r.data.user, token: r.data.token, isLoading: false });
    return true;
  }
  set({ error: r.error || 'فشل التسجيل', isLoading: false });
  return false;
},
```

**التحقق:**
```bash
npm run dev
# جرب التسجيل
```

---

### الخطوة 6: إضافة مكونات جديدة (اختياري) ⭐⭐

**الوقت المتوقع:** 60-90 دقيقة

**الهدف:** إضافة الميزات المتقدمة

هذه الخطوة اختيارية ولكنها موصى بها للحصول على جميع الميزات.

راجع `IMPLEMENTATION_GUIDE.md` للأقسام التالية:

- **القسم 6:** نموذج البيانات الشخصية في ProfilePage.tsx
- **القسم 7:** إصلاح الصور في CommunityPage.tsx
- **القسم 8:** نظام الأسئلة التفاعلية
- **القسم 9:** نظام المتابعة
- **القسم 10:** حذف الصورة الشخصية
- **القسم 11:** نسبة الجاهزية المحسّنة

**💡 نصيحة:** ابدأ بالميزات الأساسية ثم أضف المتقدمة لاحقاً

---

### الخطوة 7: الاختبار النهائي ✅

**الوقت المتوقع:** 30 دقيقة

**قائمة الاختبار:**

#### التسجيل والدخول:
- [ ] التسجيل بجميع الحقول يعمل
- [ ] username يُنشأ تلقائياً
- [ ] تأكيد كلمة المرور يعمل
- [ ] رسالة البريد الإلكتروني تُرسل (تحقق من console)

#### نظام المصادقة:
- [ ] تسجيل الدخول يعمل
- [ ] تسجيل الخروج يعمل
- [ ] الجلسة تستمر بعد إعادة التحميل

#### المحتوى:
- [ ] الدروس تُعرض بشكل صحيح
- [ ] الاختبارات تعمل
- [ ] النتائج تُحفظ

#### المجتمع (إذا تم التحديث):
- [ ] المنشورات تُعرض
- [ ] التعليقات تعمل
- [ ] الصور تظهر بشكل صحيح

---

## 🐛 حل المشاكل الشائعة

### المشكلة 1: أخطاء TypeScript بعد التحديث

**الحل:**
```bash
# احذف node_modules وأعد التثبيت
rm -rf node_modules package-lock.json
npm install
```

### المشكلة 2: "Cannot find module '@/db/database'"

**الحل:**
تأكد من أن `vite.config.ts` يحتوي على:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### المشكلة 3: البيانات القديمة تظهر

**الحل:**
```javascript
// افتح Developer Console واكتب:
indexedDB.deleteDatabase('patente_hub_v2');
indexedDB.deleteDatabase('patente_hub_v3');
// ثم أعد تحميل الصفحة
```

### المشكلة 4: الصور لا تُحمّل

**الحل:**
تأكد من أن `public/` folder موجود ويحتوي على الصور

---

## ✅ التحقق النهائي

عند الانتهاء، يجب أن يكون لديك:

- ✅ نظام تسجيل محسّن (5 حقول)
- ✅ username تلقائي
- ✅ تأكيد كلمة المرور
- ✅ نظام بريد إلكتروني محاكى
- ✅ قاعدة بيانات محدثة
- ✅ API functions جديدة

---

## 📞 المساعدة

إذا واجهت أي مشكلة:

1. راجع `IMPLEMENTATION_GUIDE.md` للتفاصيل
2. تحقق من console للأخطاء
3. تأكد من اتباع جميع الخطوات بالترتيب

---

## 🎉 التهانينا!

إذا وصلت إلى هنا، فقد نجحت في تحديث مشروعك! 

**الخطوة التالية:** جرب جميع الميزات وتأكد من عملها بشكل صحيح.

---

**ملاحظة:** هذا التحديث يشمل الميزات الأساسية. للميزات المتقدمة (المتابعة، الأسئلة التفاعلية، إلخ)، راجع `IMPLEMENTATION_GUIDE.md`.
