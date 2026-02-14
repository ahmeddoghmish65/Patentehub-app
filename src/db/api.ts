import {
  getDB, generateId, generateToken, hashPassword, verifyPassword, generateUsername, sendEmail,
  type User, type Section, type Lesson, type Question, type Sign,
  type DictionarySection, type DictionaryEntry, type Post, type Comment,
  type Like, type Report, type QuizResult, type UserMistake,
  type TrainingSession, type Notification, type AdminLog, type AdminPermissions,
  type PersonalInfo, type Follow, type PollVote
} from './database';

// ============ RATE LIMITING ============
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(key: string, max = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) { rateLimitMap.set(key, { count: 1, resetTime: now + windowMs }); return true; }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// ============ VALIDATION ============
function validateEmail(e: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function sanitize(s: string): string { return s.replace(/<[^>]*>/g, '').trim(); }

interface ApiRes<T = unknown> { success: boolean; data?: T; error?: string; code: number; }
function ok<T>(data: T, code = 200): ApiRes<T> { return { success: true, data, code }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function err(error: string, code = 400): ApiRes<any> { return { success: false, error, code }; }

// ============ AUTH HELPERS ============
async function getAuthUser(token: string): Promise<User | null> {
  const db = await getDB();
  const at = await db.get('authTokens', token);
  if (!at || new Date(at.expiresAt) < new Date()) return null;
  return db.get('users', at.userId);
}

async function isAdmin(token: string): Promise<boolean> {
  const u = await getAuthUser(token);
  return u?.role === 'admin';
}

async function checkPermission(token: string, permission: keyof AdminPermissions): Promise<boolean> {
  const u = await getAuthUser(token);
  if (!u || u.role === 'user') return false;
  if (u.role === 'admin') return true;
  return u.adminPermissions?.[permission] || false;
}

