/**
 * Additional API Functions for Enhanced Features
 * 
 * This file contains new API functions to support:
 * - Enhanced authentication and password management
 * - Admin permissions system
 * - User verification
 * - Follow system
 * - Poll voting system
 * - Personal info management
 * - Content locking system
 */

import { getDB, generateId, hashPassword, verifyPassword, sendEmail, generateUsername } from './database-updated';
import type { 
  User, AdminPermissions, PersonalInfo, Follow, PollVote, 
  Comment, Post, EmailLog 
} from './database-updated';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ HELPER FUNCTIONS ============

async function getUserFromToken(token: string): Promise<User | null> {
  const db = await getDB();
  const authToken = await db.get('authTokens', token);
  if (!authToken) return null;
  
  const now = new Date();
  const expiresAt = new Date(authToken.expiresAt);
  if (now > expiresAt) return null;
  
  return await db.get('users', authToken.userId);
}

// ============ ENHANCED AUTH FUNCTIONS ============

/**
 * Register with enhanced fields
 */
export async function apiRegisterEnhanced(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  username?: string
): Promise<ApiResponse<{ token: string; user: Omit<User, 'password'> }>> {
  try {
    const db = await getDB();
    
    // Check if email exists
    const existingUser = await db.getFromIndex('users', 'email', email.toLowerCase());
    if (existingUser) {
      return { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' };
    }
    
    // Generate username if not provided
    const finalUsername = username?.trim() || generateUsername(firstName, lastName);
    
    // Check if username exists
    const existingUsername = await db.getFromIndex('users', 'username', finalUsername);
    if (existingUsername) {
      return { success: false, error: 'اسم المستخدم مستخدم بالفعل' };
    }
    
    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();
    
    const user: User = {
      id: generateId(),
      email: email.toLowerCase(),
      password: hashedPassword,
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
    
    // Create token
    const token = generateToken();
    const authToken = {
      token,
      refreshToken: generateToken(),
      userId: user.id,
      createdAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
    
    await db.add('authTokens', authToken);
    
    // Send welcome email
    await sendEmail(email, 'registration', { name: firstName });
    
    const { password: _, ...userWithoutPassword } = user;
    return { success: true, data: { token, user: userWithoutPassword } };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'فشل التسجيل' };
  }
}

/**
 * Check if username exists
 */
export async function apiCheckUsernameExists(username: string): Promise<ApiResponse<boolean>> {
  try {
    const db = await getDB();
    const existing = await db.getFromIndex('users', 'username', username);
    return { success: true, data: !!existing };
  } catch (error) {
    return { success: false, error: 'فشل التحقق' };
  }
}

/**
 * Check if email exists
 */
export async function apiCheckEmailExists(email: string): Promise<ApiResponse<boolean>> {
  try {
    const db = await getDB();
    const existing = await db.getFromIndex('users', 'email', email.toLowerCase());
    return { success: true, data: !!existing };
  } catch (error) {
    return { success: false, error: 'فشل التحقق' };
  }
}

/**
 * Verify current password
 */
export async function apiVerifyCurrentPassword(
  email: string,
  password: string
): Promise<ApiResponse<boolean>> {
  try {
    const db = await getDB();
    const user = await db.getFromIndex('users', 'email', email.toLowerCase());
    if (!user) {
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    const isValid = await verifyPassword(password, user.password);
    return { success: true, data: isValid };
  } catch (error) {
    return { success: false, error: 'فشل التحقق' };
  }
}

/**
 * Change password (requires current password)
 */
export async function apiChangePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<boolean>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
    }
    
    const db = await getDB();
    const hashedPassword = await hashPassword(newPassword);
    
    user.password = hashedPassword;
    await db.put('users', user);
    
    // Send email notification
    await sendEmail(user.email, 'password_change', { name: user.firstName });
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل تغيير كلمة المرور' };
  }
}

/**
 * Change email address
 */
export async function apiChangeEmail(
  token: string,
  newEmail: string
): Promise<ApiResponse<boolean>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    
    // Check if new email is already used
    const existing = await db.getFromIndex('users', 'email', newEmail.toLowerCase());
    if (existing && existing.id !== user.id) {
      return { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' };
    }
    
    const oldEmail = user.email;
    user.email = newEmail.toLowerCase();
    await db.put('users', user);
    
    // Send notification emails
    await sendEmail(oldEmail, 'email_change', { 
      name: user.firstName,
      oldEmail,
      newEmail 
    });
    await sendEmail(newEmail, 'email_change', { 
      name: user.firstName,
      oldEmail,
      newEmail 
    });
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل تغيير البريد الإلكتروني' };
  }
}

// ============ ADMIN PERMISSIONS ============

/**
 * Update user role and permissions
 */
export async function apiUpdateUserRole(
  token: string,
  userId: string,
  role: 'user' | 'admin' | 'moderator',
  permissions?: AdminPermissions
): Promise<ApiResponse<boolean>> {
  try {
    const admin = await getUserFromToken(token);
    if (!admin || admin.role !== 'admin') {
      return { success: false, error: 'غير مصرح' };
    }
    
    const db = await getDB();
    const targetUser = await db.get('users', userId);
    if (!targetUser) {
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    targetUser.role = role;
    if (permissions) {
      targetUser.adminPermissions = permissions;
    }
    
    await db.put('users', targetUser);
    
    // Log action
    await db.add('adminLogs', {
      id: generateId(),
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      action: `تغيير دور المستخدم`,
      details: `تم تغيير دور ${targetUser.firstName} ${targetUser.lastName} إلى ${role}`,
      createdAt: new Date().toISOString(),
    });
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل تحديث الدور' };
  }
}

/**
 * Update admin permissions
 */
export async function apiUpdateAdminPermissions(
  token: string,
  userId: string,
  permissions: AdminPermissions
): Promise<ApiResponse<boolean>> {
  try {
    const admin = await getUserFromToken(token);
    if (!admin || admin.role !== 'admin') {
      return { success: false, error: 'غير مصرح' };
    }
    
    const db = await getDB();
    const targetUser = await db.get('users', userId);
    if (!targetUser) {
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    targetUser.adminPermissions = permissions;
    await db.put('users', targetUser);
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل تحديث الصلاحيات' };
  }
}

// ============ USER VERIFICATION ============

/**
 * Toggle user verification status
 */
export async function apiUpdateUserVerification(
  token: string,
  userId: string,
  isVerified: boolean
): Promise<ApiResponse<boolean>> {
  try {
    const admin = await getUserFromToken(token);
    if (!admin || admin.role !== 'admin') {
      return { success: false, error: 'غير مصرح' };
    }
    
    const db = await getDB();
    const targetUser = await db.get('users', userId);
    if (!targetUser) {
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    targetUser.isVerified = isVerified;
    await db.put('users', targetUser);
    
    // Log action
    await db.add('adminLogs', {
      id: generateId(),
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      action: isVerified ? 'توثيق مستخدم' : 'إلغاء توثيق مستخدم',
      details: `${targetUser.firstName} ${targetUser.lastName}`,
      createdAt: new Date().toISOString(),
    });
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل تحديث حالة التوثيق' };
  }
}

// ============ PERSONAL INFO ============

/**
 * Update personal information
 */
export async function apiUpdatePersonalInfo(
  token: string,
  personalInfo: PersonalInfo
): Promise<ApiResponse<PersonalInfo>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    user.personalInfo = personalInfo;
    
    // Unlock content if personal info is completed
    if (personalInfo.isCompleted) {
      user.progress.contentLocked = false;
    }
    
    await db.put('users', user);
    
    return { success: true, data: personalInfo };
  } catch (error) {
    return { success: false, error: 'فشل تحديث البيانات الشخصية' };
  }
}

/**
 * Check and update content lock status
 */
export async function apiCheckContentLock(token: string): Promise<ApiResponse<boolean>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    
    // Check if user has completed any activity
    const hasCompletedActivity = 
      user.progress.firstLessonCompleted ||
      user.progress.firstQuizCompleted ||
      user.progress.firstTrainingCompleted;
    
    // Lock content if activity completed but personal info not completed
    const shouldLock = hasCompletedActivity && !user.personalInfo.isCompleted;
    
    if (shouldLock !== user.progress.contentLocked) {
      user.progress.contentLocked = shouldLock;
      await db.put('users', user);
    }
    
    return { success: true, data: shouldLock };
  } catch (error) {
    return { success: false, error: 'فشل التحقق من قفل المحتوى' };
  }
}

/**
 * Mark first activity completion
 */
export async function apiMarkFirstActivity(
  token: string,
  activityType: 'lesson' | 'quiz' | 'training'
): Promise<ApiResponse<boolean>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    
    if (activityType === 'lesson') {
      user.progress.firstLessonCompleted = true;
    } else if (activityType === 'quiz') {
      user.progress.firstQuizCompleted = true;
    } else if (activityType === 'training') {
      user.progress.firstTrainingCompleted = true;
    }
    
    // Check if content should be locked
    const hasCompletedActivity = 
      user.progress.firstLessonCompleted ||
      user.progress.firstQuizCompleted ||
      user.progress.firstTrainingCompleted;
    
    if (hasCompletedActivity && !user.personalInfo.isCompleted) {
      user.progress.contentLocked = true;
    }
    
    await db.put('users', user);
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل تحديث الحالة' };
  }
}

// ============ FOLLOW SYSTEM ============

/**
 * Follow a user
 */
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
    user.followingCount = (user.followingCount || 0) + 1;
    await db.put('users', user);
    
    const targetUser = await db.get('users', targetUserId);
    if (targetUser) {
      targetUser.followersCount = (targetUser.followersCount || 0) + 1;
      await db.put('users', targetUser);
    }
    
    return { success: true, data: follow };
  } catch (error) {
    return { success: false, error: 'فشلت المتابعة' };
  }
}

/**
 * Unfollow a user
 */
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
    if (user.followingCount > 0) {
      user.followingCount--;
      await db.put('users', user);
    }
    
    const targetUser = await db.get('users', targetUserId);
    if (targetUser && targetUser.followersCount > 0) {
      targetUser.followersCount--;
      await db.put('users', targetUser);
    }
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل إلغاء المتابعة' };
  }
}

/**
 * Check if following a user
 */
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

/**
 * Get user's followers
 */
export async function apiGetFollowers(
  userId: string
): Promise<ApiResponse<Omit<User, 'password'>[]>> {
  try {
    const db = await getDB();
    const follows = await db.getAllFromIndex('follows', 'followingId', userId);
    
    const followers: Omit<User, 'password'>[] = [];
    for (const follow of follows) {
      const user = await db.get('users', follow.followerId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        followers.push(userWithoutPassword);
      }
    }
    
    return { success: true, data: followers };
  } catch (error) {
    return { success: false, error: 'فشل جلب المتابعين' };
  }
}

/**
 * Get users that a user is following
 */
export async function apiGetFollowing(
  userId: string
): Promise<ApiResponse<Omit<User, 'password'>[]>> {
  try {
    const db = await getDB();
    const follows = await db.getAllFromIndex('follows', 'followerId', userId);
    
    const following: Omit<User, 'password'>[] = [];
    for (const follow of follows) {
      const user = await db.get('users', follow.followingId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        following.push(userWithoutPassword);
      }
    }
    
    return { success: true, data: following };
  } catch (error) {
    return { success: false, error: 'فشل جلب المتابَعين' };
  }
}

// ============ POLL SYSTEM ============

/**
 * Create a poll post
 */
export async function apiCreatePollPost(
  token: string,
  pollQuestion: string,
  correctAnswer: boolean,
  explanation: string
): Promise<ApiResponse<Post>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    const now = new Date().toISOString();
    
    const post: Post = {
      id: generateId(),
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userAvatar: user.avatar,
      content: explanation,
      image: '',
      likesCount: 0,
      commentsCount: 0,
      createdAt: now,
      updatedAt: now,
      type: 'poll',
      pollQuestion,
      pollIsCorrect: correctAnswer,
      pollVotes: { correct: 0, incorrect: 0 },
    };
    
    await db.add('posts', post);
    
    return { success: true, data: post };
  } catch (error) {
    return { success: false, error: 'فشل إنشاء السؤال' };
  }
}

/**
 * Vote on a poll
 */
export async function apiVotePoll(
  token: string,
  postId: string,
  answer: boolean
): Promise<ApiResponse<{ correct: boolean; totalVotes: { correct: number; incorrect: number } }>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    
    // Check if user already voted
    const allVotes = await db.getAllFromIndex('pollVotes', 'postId', postId);
    const existingVote = allVotes.find(v => v.userId === user.id);
    
    if (existingVote) {
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
    if (!post || post.type !== 'poll') {
      return { success: false, error: 'السؤال غير موجود' };
    }
    
    if (!post.pollVotes) {
      post.pollVotes = { correct: 0, incorrect: 0 };
    }
    
    if (answer) {
      post.pollVotes.correct++;
    } else {
      post.pollVotes.incorrect++;
    }
    
    await db.put('posts', post);
    
    return { 
      success: true, 
      data: {
        correct: answer === post.pollIsCorrect,
        totalVotes: post.pollVotes
      }
    };
  } catch (error) {
    return { success: false, error: 'فشل التصويت' };
  }
}

/**
 * Check if user voted on a poll
 */
export async function apiCheckPollVote(
  token: string,
  postId: string
): Promise<ApiResponse<boolean | null>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    const allVotes = await db.getAllFromIndex('pollVotes', 'postId', postId);
    const vote = allVotes.find(v => v.userId === user.id);
    
    return { success: true, data: vote ? vote.answer : null };
  } catch (error) {
    return { success: false, error: 'فشل التحقق' };
  }
}

// ============ ENHANCED COMMUNITY FUNCTIONS ============

/**
 * Create comment with avatar
 */
export async function apiCreateCommentEnhanced(
  token: string,
  postId: string,
  content: string
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
      userAvatar: user.avatar,
      content,
      createdAt: new Date().toISOString(),
    };
    
    await db.add('comments', comment);
    
    // Update comment count
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

/**
 * Update user avatar in all posts and comments
 */
export async function apiUpdateUserAvatarInContent(
  token: string,
  newAvatar: string
): Promise<ApiResponse<boolean>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    
    // Update posts
    const posts = await db.getAllFromIndex('posts', 'userId', user.id);
    for (const post of posts) {
      post.userAvatar = newAvatar;
      await db.put('posts', post);
    }
    
    // Update comments
    const allComments = await db.getAll('comments');
    const userComments = allComments.filter(c => c.userId === user.id);
    for (const comment of userComments) {
      comment.userAvatar = newAvatar;
      await db.put('comments', comment);
    }
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل تحديث الصورة' };
  }
}

/**
 * Get user profile by ID
 */
export async function apiGetUserProfile(
  userId: string
): Promise<ApiResponse<Omit<User, 'password'>>> {
  try {
    const db = await getDB();
    const user = await db.get('users', userId);
    
    if (!user) {
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    const { password, ...userWithoutPassword } = user;
    return { success: true, data: userWithoutPassword };
  } catch (error) {
    return { success: false, error: 'فشل جلب الملف الشخصي' };
  }
}

/**
 * Get user's posts
 */
export async function apiGetUserPosts(userId: string): Promise<ApiResponse<Post[]>> {
  try {
    const db = await getDB();
    const posts = await db.getAllFromIndex('posts', 'userId', userId);
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return { success: true, data: posts };
  } catch (error) {
    return { success: false, error: 'فشل جلب المنشورات' };
  }
}

/**
 * Delete user avatar
 */
export async function apiDeleteAvatar(token: string): Promise<ApiResponse<boolean>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    user.avatar = '';
    await db.put('users', user);
    
    // Update avatar in posts and comments
    await apiUpdateUserAvatarInContent(token, '');
    
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'فشل حذف الصورة' };
  }
}

// ============ EXAM READINESS ============

/**
 * Calculate exam readiness score
 */
export function calculateExamReadiness(user: User): number {
  const { progress } = user;
  
  const factors = {
    quizCount: Math.min((progress.totalQuizzes / 50) * 30, 30),
    
    accuracy: (() => {
      const total = progress.correctAnswers + progress.wrongAnswers;
      if (total === 0) return 0;
      const acc = (progress.correctAnswers / total) * 100;
      return (acc / 100) * 25;
    })(),
    
    lessonsCompleted: Math.min((progress.completedLessons.length / 30) * 20, 20),
    
    topicsCompleted: Math.min((progress.completedTopics.length / 10) * 15, 15),
    
    mistakesPenalty: (() => {
      const avgMistakes = progress.wrongAnswers / (progress.totalQuizzes || 1);
      if (avgMistakes > 5) return -10;
      if (avgMistakes > 3) return -5;
      return 0;
    })(),
    
    consistency: Math.min(progress.currentStreak * 2, 10),
  };
  
  const total = Object.values(factors).reduce((sum, value) => sum + value, 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

/**
 * Update exam readiness
 */
export async function apiUpdateExamReadiness(token: string): Promise<ApiResponse<number>> {
  try {
    const user = await getUserFromToken(token);
    if (!user) return { success: false, error: 'غير مصرح' };
    
    const db = await getDB();
    const readiness = calculateExamReadiness(user);
    
    user.progress.examReadiness = readiness;
    await db.put('users', user);
    
    return { success: true, data: readiness };
  } catch (error) {
    return { success: false, error: 'فشل تحديث الجاهزية' };
  }
}
