import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'patente_hub_v3';
const DB_VERSION = 2;

// ============ TYPES ============

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string; // NEW
  lastName: string; // NEW
  username: string; // NEW
  avatar: string;
  role: 'user' | 'admin' | 'moderator'; // UPDATED
  adminPermissions?: AdminPermissions; // NEW
  isVerified: boolean; // NEW
  isBanned: boolean;
  createdAt: string;
  lastLogin: string;
  personalInfo: PersonalInfo; // NEW
  progress: UserProgress;
  settings: UserSettings;
  followingCount: number; // NEW
  followersCount: number; // NEW
}

export interface AdminPermissions {
  manageUsers: boolean;
  manageSections: boolean;
  manageLessons: boolean;
  manageQuestions: boolean;
  manageSigns: boolean;
  manageDictionary: boolean;
  managePosts: boolean;
  viewReports: boolean;
  viewLogs: boolean;
  viewStats: boolean;
}

export interface PersonalInfo {
  birthDate: string;
  country: string;
  state: string;
  gender: 'male' | 'female' | 'other' | '';
  phone: string;
  phoneCountryCode: string;
  italianLevel: 'weak' | 'good' | 'very_good' | 'native' | '';
  isCompleted: boolean; // NEW - tracks if all required fields are filled
}

export interface UserProgress {
  totalQuizzes: number;
  correctAnswers: number;
  wrongAnswers: number;
  completedLessons: string[];
  completedTopics: string[];
  currentStreak: number;
  bestStreak: number;
  lastStudyDate: string;
  level: number;
  xp: number;
  badges: string[];
  examReadiness: number;
  firstLessonCompleted: boolean; // NEW
  firstQuizCompleted: boolean; // NEW
  firstTrainingCompleted: boolean; // NEW
  contentLocked: boolean; // NEW - locks content until personal info is completed
}

export interface UserSettings {
  language: 'ar' | 'it' | 'both';
  theme: 'light' | 'dark';
  notifications: boolean;
  soundEffects: boolean;
  fontSize: 'small' | 'medium' | 'large';
  emailNotifications: boolean; // NEW
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Section {
  id: string;
  nameAr: string;
  nameIt: string;
  descriptionAr: string;
  descriptionIt: string;
  image: string;
  icon: string;
  color: string;
  order: number;
  createdAt: string;
}

export interface Lesson {
  id: string;
  sectionId: string;
  titleAr: string;
  titleIt: string;
  contentAr: string;
  contentIt: string;
  image: string;
  order: number;
  createdAt: string;
}

export interface Question {
  id: string;
  lessonId: string;
  sectionId: string;
  questionAr: string;
  questionIt: string;
  isTrue: boolean;
  explanationAr: string;
  explanationIt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  image: string;
  order: number;
  createdAt: string;
}

export interface Sign {
  id: string;
  nameAr: string;
  nameIt: string;
  descriptionAr: string;
  descriptionIt: string;
  category: string;
  image: string;
  order: number;
  createdAt: string;
}

export interface DictionarySection {
  id: string;
  nameAr: string;
  nameIt: string;
  icon: string;
  order: number;
  createdAt: string;
}

export interface DictionaryEntry {
  id: string;
  sectionId: string;
  termIt: string;
  termAr: string;
  definitionIt: string;
  definitionAr: string;
  order: number;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  image: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  pollQuestion?: string; // NEW
  pollIsCorrect?: boolean; // NEW
  pollVotes?: { correct: number; incorrect: number }; // NEW
  type: 'regular' | 'poll'; // NEW
}

export interface PollVote {
  id: string;
  postId: string;
  userId: string;
  answer: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string; // NEW
  content: string;
  createdAt: string;
}

export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface Report {
  id: string;
  type: 'post' | 'comment' | 'user';
  targetId: string;
  userId: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  topicId: string;
  lessonId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeSpent: number;
  answers: { questionId: string; userAnswer: boolean; correct: boolean }[];
  createdAt: string;
}

export interface UserMistake {
  id: string;
  userId: string;
  questionId: string;
  questionAr: string;
  questionIt: string;
  correctAnswer: boolean;
  userAnswer: boolean;
  count: number;
  lastMistakeAt: string;
}

export interface TrainingSession {
  id: string;
  userId: string;
  type: 'questions' | 'signs' | 'dictionary';
  score: number;
  total: number;
  timeSpent: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string; // NEW
  action: string;
  details: string;
  createdAt: string;
}

export interface AuthToken {
  token: string;
  refreshToken: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface EmailLog {
  id: string;
  userId: string;
  email: string;
  type: 'registration' | 'password_change' | 'email_change' | 'password_reset';
  sentAt: string;
  status: 'sent' | 'failed';
}

// ============ DATABASE ============

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      const stores = [
        { name: 'users', keyPath: 'id', indexes: [
          { name: 'email', keyPath: 'email', unique: true },
          { name: 'username', keyPath: 'username', unique: true } // NEW
        ]},
        { name: 'follows', keyPath: 'id', indexes: [
          { name: 'followerId', keyPath: 'followerId', unique: false },
          { name: 'followingId', keyPath: 'followingId', unique: false }
        ]}, // NEW
        { name: 'sections', keyPath: 'id', indexes: [{ name: 'order', keyPath: 'order', unique: false }] },
        { name: 'lessons', keyPath: 'id', indexes: [{ name: 'sectionId', keyPath: 'sectionId', unique: false }] },
        { name: 'questions', keyPath: 'id', indexes: [
          { name: 'lessonId', keyPath: 'lessonId', unique: false },
          { name: 'sectionId', keyPath: 'sectionId', unique: false }
        ]},
        { name: 'signs', keyPath: 'id', indexes: [{ name: 'category', keyPath: 'category', unique: false }] },
        { name: 'dictionarySections', keyPath: 'id', indexes: [] },
        { name: 'dictionaryEntries', keyPath: 'id', indexes: [{ name: 'sectionId', keyPath: 'sectionId', unique: false }] },
        { name: 'posts', keyPath: 'id', indexes: [{ name: 'userId', keyPath: 'userId', unique: false }] },
        { name: 'comments', keyPath: 'id', indexes: [{ name: 'postId', keyPath: 'postId', unique: false }] },
        { name: 'likes', keyPath: 'id', indexes: [
          { name: 'postId', keyPath: 'postId', unique: false },
          { name: 'userId', keyPath: 'userId', unique: false }
        ]},
        { name: 'pollVotes', keyPath: 'id', indexes: [
          { name: 'postId', keyPath: 'postId', unique: false },
          { name: 'userId', keyPath: 'userId', unique: false }
        ]}, // NEW
        { name: 'reports', keyPath: 'id', indexes: [{ name: 'status', keyPath: 'status', unique: false }] },
        { name: 'quizResults', keyPath: 'id', indexes: [{ name: 'userId', keyPath: 'userId', unique: false }] },
        { name: 'userMistakes', keyPath: 'id', indexes: [{ name: 'userId', keyPath: 'userId', unique: false }] },
        { name: 'trainingSessions', keyPath: 'id', indexes: [{ name: 'userId', keyPath: 'userId', unique: false }] },
        { name: 'notifications', keyPath: 'id', indexes: [{ name: 'userId', keyPath: 'userId', unique: false }] },
        { name: 'adminLogs', keyPath: 'id', indexes: [] },
        { name: 'authTokens', keyPath: 'token', indexes: [{ name: 'userId', keyPath: 'userId', unique: false }] },
        { name: 'emailLogs', keyPath: 'id', indexes: [
          { name: 'userId', keyPath: 'userId', unique: false },
          { name: 'email', keyPath: 'email', unique: false }
        ]}, // NEW
      ];

      for (const s of stores) {
        if (!db.objectStoreNames.contains(s.name)) {
          const store = db.createObjectStore(s.name, { keyPath: s.keyPath });
          for (const idx of s.indexes) {
            store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
          }
        } else if (oldVersion < DB_VERSION) {
          // Update existing stores if needed
          const tx = (db as any).transaction;
          if (tx) {
            const store = tx.objectStore(s.name);
            for (const idx of s.indexes) {
              if (!store.indexNames.contains(idx.name)) {
                store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
              }
            }
          }
        }
      }
    },
  });

  return dbInstance;
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

export function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function generateUsername(firstName: string, lastName: string): string {
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${base}${random}`;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'patente_hub_salt_2024_production_v2');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

// ============ EMAIL SIMULATION ============

export async function sendEmail(
  to: string,
  type: 'registration' | 'password_change' | 'email_change' | 'password_reset',
  data: { name?: string; oldEmail?: string; newEmail?: string }
): Promise<boolean> {
  try {
    const db = await getDB();
    
    let subject = '';
    let body = '';
    
    switch (type) {
      case 'registration':
        subject = 'مرحباً بك في Patente Hub 🚗';
        body = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="font-size: 32px; margin: 0;">🚗 Patente Hub</h1>
              <p style="font-size: 18px; margin: 10px 0;">منصتك العربية لتعلم رخصة القيادة الإيطالية</p>
            </div>
            
            <div style="background: white; color: #333; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #667eea; margin-top: 0;">مرحباً ${data.name || 'صديقنا'}! 👋</h2>
              
              <p style="font-size: 16px; line-height: 1.8;">
                نحن سعداء جداً بانضمامك إلى عائلة Patente Hub! تم إنشاء حسابك بنجاح وأنت الآن جاهز لبدء رحلة التعلم.
              </p>
              
              <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #667eea; margin-top: 0;">✨ ما الذي يمكنك فعله الآن؟</h3>
                <ul style="line-height: 2; padding-right: 20px;">
                  <li>📚 استكشاف أكثر من 30 درساً تعليمياً</li>
                  <li>❓ حل آلاف الأسئلة التدريبية</li>
                  <li>🚦 تعلم جميع الإشارات المرورية</li>
                  <li>📖 استخدام القاموس الإيطالي-العربي</li>
                  <li>🎯 محاكي الامتحان الحقيقي</li>
                  <li>👥 الانضمام لمجتمع المتعلمين</li>
                </ul>
              </div>
              
              <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>💡 نصيحة:</strong> لا تنسى إكمال بياناتك الشخصية للحصول على تجربة كاملة!
                </p>
              </div>
              
              <p style="font-size: 16px; line-height: 1.8; margin-top: 30px;">
                نحن هنا لدعمك في كل خطوة. حظاً موفقاً في امتحانك! 🎉
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                مع تحيات فريق Patente Hub<br>
                <a href="mailto:support@patentehub.com" style="color: #667eea;">support@patentehub.com</a>
              </p>
            </div>
          </div>
        `;
        break;
        
      case 'password_change':
        subject = 'تم تغيير كلمة المرور 🔒';
        body = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #667eea;">🔒 تغيير كلمة المرور</h1>
              </div>
              
              <p style="font-size: 16px; line-height: 1.8;">
                مرحباً ${data.name || ''},
              </p>
              
              <p style="font-size: 16px; line-height: 1.8;">
                تم تغيير كلمة المرور لحسابك في Patente Hub بنجاح.
              </p>
              
              <div style="background: #d4edda; border: 2px solid #28a745; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #155724;">
                  <strong>✓ تأكيد:</strong> كلمة المرور الخاصة بك آمنة الآن
                </p>
              </div>
              
              <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ تحذير:</strong> إذا لم تقم بهذا التغيير، يرجى الاتصال بنا فوراً على support@patentehub.com
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                مع تحيات فريق Patente Hub
              </p>
            </div>
          </div>
        `;
        break;
        
      case 'email_change':
        subject = 'تم تغيير البريد الإلكتروني 📧';
        body = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #667eea;">📧 تغيير البريد الإلكتروني</h1>
              </div>
              
              <p style="font-size: 16px; line-height: 1.8;">
                مرحباً ${data.name || ''},
              </p>
              
              <p style="font-size: 16px; line-height: 1.8;">
                تم تحديث البريد الإلكتروني لحسابك في Patente Hub بنجاح.
              </p>
              
              <div style="background: #f8f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>من:</strong> ${data.oldEmail || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>إلى:</strong> ${data.newEmail || to}</p>
              </div>
              
              <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ تحذير:</strong> إذا لم تقم بهذا التغيير، يرجى الاتصال بنا فوراً على support@patentehub.com
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                مع تحيات فريق Patente Hub
              </p>
            </div>
          </div>
        `;
        break;
        
      case 'password_reset':
        subject = 'إعادة تعيين كلمة المرور 🔑';
        body = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #667eea;">🔑 إعادة تعيين كلمة المرور</h1>
              </div>
              
              <p style="font-size: 16px; line-height: 1.8;">
                مرحباً ${data.name || ''},
              </p>
              
              <p style="font-size: 16px; line-height: 1.8;">
                تم إعادة تعيين كلمة المرور لحسابك في Patente Hub بنجاح.
              </p>
              
              <div style="background: #d4edda; border: 2px solid #28a745; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #155724;">
                  <strong>✓ تأكيد:</strong> يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                مع تحيات فريق Patente Hub
              </p>
            </div>
          </div>
        `;
        break;
    }
    
    // Log the email
    const emailLog: EmailLog = {
      id: generateId(),
      userId: '',
      email: to,
      type,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };
    
    await db.add('emailLogs', emailLog);
    
    // In a real app, this would send an actual email
    console.log('📧 Email sent:', {
      to,
      subject,
      type,
      timestamp: new Date().toISOString()
    });
    
    // Show notification in console for development
    console.log('Email Content Preview:', {
      subject,
      bodyPreview: body.substring(0, 200) + '...'
    });
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
