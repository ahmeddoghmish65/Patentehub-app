import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { Comment } from '@/db/database';

// We store replies as comments with a special prefix pattern: REPLY_TO:<parentId>:
function isReply(c: Comment): boolean { return c.content.startsWith('REPLY_TO:'); }
function getParentId(c: Comment): string | null {
  if (!isReply(c)) return null;
  const match = c.content.match(/^REPLY_TO:([^:]+):/);
  return match ? match[1] : null;
}
function getReplyContent(c: Comment): string {
  return c.content.replace(/^REPLY_TO:[^:]+:/, '');
}

export function CommunityPage() {
  const { posts, loadPosts, createPost, updatePost, deletePost, toggleLike, checkLike, getComments, createComment, deleteComment, createReport, user } = useAuthStore();
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [reportModal, setReportModal] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'post' | 'comment' | 'reply'; id: string } | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => { loadPosts(); }, [loadPosts]);

  useEffect(() => {
    posts.forEach(async p => { const liked = await checkLike(p.id); setLikes(prev => ({ ...prev, [p.id]: liked })); });
  }, [posts, checkLike]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    await createPost(newPost, '');
    setNewPost('');
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    const result = await toggleLike(postId);
    if (result) setLikes(prev => ({ ...prev, [postId]: result.liked }));
  };

  const openComments = async (postId: string) => {
    if (showComments === postId) { setShowComments(null); return; }
    const c = await getComments(postId);
    setComments(c); setShowComments(postId); setReplyingTo(null); setReplyContent('');
  };

  const handleComment = async (postId: string) => {
    if (!newComment.trim()) return;
    await createComment(postId, newComment);
    setNewComment('');
    const c = await getComments(postId); setComments(c);
    await loadPosts();
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim() || !replyingTo) return;
    // Store reply with parent reference
    await createComment(postId, `REPLY_TO:${replyingTo.commentId}:${replyContent}`);
    setReplyContent(''); setReplyingTo(null);
    const c = await getComments(postId); setComments(c);
    await loadPosts();
  };

  const handleDeleteItem = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'post') {
      await deletePost(confirmDelete.id);
    } else {
      await deleteComment(confirmDelete.id);
      if (showComments) { const c = await getComments(showComments); setComments(c); }
      await loadPosts();
    }
    setConfirmDelete(null);
  };

  const handleEdit = async (id: string) => {
    await updatePost(id, editContent);
    setEditingPost(null);
  };

  const handleReport = async () => {
    if (!reportModal || !reportReason.trim()) return;
    await createReport(reportModal.type, reportModal.id, reportReason);
    setReportModal(null); setReportReason('');
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 3000);
  };

  // Separate root comments and replies
  const rootComments = comments.filter(c => !isReply(c));
  const getReplies = (commentId: string) => comments.filter(c => getParentId(c) === commentId);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 mb-2">المجتمع</h1>
        <p className="text-surface-500">شارك تجربتك مع الآخرين</p>
      </div>

      {/* Report Success Toast */}
      {reportSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success-500 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in-up">
          <Icon name="check_circle" size={20} filled />
          <span className="text-sm font-medium">تم إرسال البلاغ بنجاح</span>
        </div>
      )}

      {/* New Post */}
      <div className="bg-white rounded-2xl p-5 border border-surface-100 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
            ) : (
              <span className="text-sm font-bold text-primary-700">{user?.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1">
            <textarea className="w-full border border-surface-200 rounded-xl p-3 text-sm resize-none focus:border-primary-500 transition-colors" rows={3}
              placeholder="شارك شيئاً مع المجتمع..." value={newPost} onChange={e => setNewPost(e.target.value)} />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={handlePost} loading={posting} disabled={!newPost.trim()}>نشر</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-surface-100">
          <Icon name="forum" size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500">لا توجد منشورات بعد. كن أول من يشارك!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center overflow-hidden">
                      {post.userAvatar ? (
                        <img src={post.userAvatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                      ) : (
                        <span className="text-sm font-bold text-white">{post.userName.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-surface-900 text-sm">{post.userName}</p>
                      <p className="text-xs text-surface-400">{new Date(post.createdAt).toLocaleDateString('ar')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(post.userId === user?.id || user?.role === 'admin') && (
                      <>
                        {post.userId === user?.id && (
                          <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400" onClick={() => { setEditingPost(post.id); setEditContent(post.content); }}>
                            <Icon name="edit" size={18} />
                          </button>
                        )}
                        <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400" onClick={() => setConfirmDelete({ type: 'post', id: post.id })}>
                          <Icon name="delete" size={18} />
                        </button>
                      </>
                    )}
                    <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400" onClick={() => setReportModal({ type: 'post', id: post.id })}>
                      <Icon name="flag" size={18} />
                    </button>
                  </div>
                </div>

                {editingPost === post.id ? (
                  <div className="space-y-2">
                    <textarea className="w-full border border-surface-200 rounded-xl p-3 text-sm resize-none" rows={3} value={editContent} onChange={e => setEditContent(e.target.value)} />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditingPost(null)}>إلغاء</Button>
                      <Button size="sm" onClick={() => handleEdit(post.id)}>حفظ</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-surface-700 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                )}

                {post.image && <img src={post.image} alt="" className="mt-3 rounded-xl w-full" />}
              </div>

              <div className="border-t border-surface-100 px-5 py-3 flex items-center gap-4">
                <button className={cn('flex items-center gap-1 text-sm transition-colors', likes[post.id] ? 'text-primary-600' : 'text-surface-400 hover:text-primary-500')} onClick={() => handleLike(post.id)}>
                  <Icon name="favorite" size={20} filled={likes[post.id]} />{post.likesCount}
                </button>
                <button className="flex items-center gap-1 text-sm text-surface-400 hover:text-primary-500" onClick={() => openComments(post.id)}>
                  <Icon name="chat_bubble" size={20} />{post.commentsCount}
                </button>
              </div>

              {/* Comments Section */}
              {showComments === post.id && (
                <div className="border-t border-surface-100 p-4 bg-surface-50 space-y-3">
                  {/* Root Comments */}
                  {rootComments.map(c => {
                    const replies = getReplies(c.id);
                    return (
                      <div key={c.id} className="space-y-2">
                        {/* Main Comment */}
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 bg-surface-200 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-surface-600">{c.userName.charAt(0)}</span>
                          </div>
                          <div className="flex-1 bg-white rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-surface-800">{c.userName}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-surface-400">{new Date(c.createdAt).toLocaleDateString('ar')}</span>
                                {/* Reply button */}
                                <button className="text-primary-400 hover:text-primary-600 p-0.5" title="رد"
                                  onClick={() => setReplyingTo({ commentId: c.id, userName: c.userName })}>
                                  <Icon name="reply" size={13} />
                                </button>
                                {/* Report comment */}
                                <button className="text-surface-400 hover:text-orange-500 p-0.5" title="إبلاغ"
                                  onClick={() => setReportModal({ type: 'comment', id: c.id })}>
                                  <Icon name="flag" size={13} />
                                </button>
                                {/* Delete comment */}
                                {(c.userId === user?.id || user?.role === 'admin') && (
                                  <button className="text-surface-400 hover:text-danger-500 p-0.5"
                                    onClick={() => setConfirmDelete({ type: 'comment', id: c.id })}>
                                    <Icon name="close" size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-surface-600">{c.content}</p>
                          </div>
                        </div>

                        {/* Replies */}
                        {replies.length > 0 && (
                          <div className="mr-9 space-y-2 border-r-2 border-primary-100 pr-3">
                            {replies.map(r => (
                              <div key={r.id} className="flex items-start gap-2">
                                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-primary-700">{r.userName.charAt(0)}</span>
                                </div>
                                <div className="flex-1 bg-white rounded-lg px-3 py-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-semibold text-surface-800">{r.userName}</span>
                                      <Icon name="arrow_back" size={10} className="text-surface-300" />
                                      <span className="text-[10px] text-primary-500">{c.userName}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-surface-400">{new Date(r.createdAt).toLocaleDateString('ar')}</span>
                                      {/* Report reply */}
                                      <button className="text-surface-400 hover:text-orange-500 p-0.5" title="إبلاغ"
                                        onClick={() => setReportModal({ type: 'comment', id: r.id })}>
                                        <Icon name="flag" size={11} />
                                      </button>
                                      {/* Delete reply */}
                                      {(r.userId === user?.id || user?.role === 'admin') && (
                                        <button className="text-surface-400 hover:text-danger-500 p-0.5"
                                          onClick={() => setConfirmDelete({ type: 'reply', id: r.id })}>
                                          <Icon name="close" size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-surface-600">{getReplyContent(r)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply input (shown when replying to this comment) */}
                        {replyingTo?.commentId === c.id && (
                          <div className="mr-9 flex gap-2 items-center">
                            <div className="flex-1 relative">
                              <input
                                className="w-full border border-primary-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100 pr-20"
                                placeholder={`رد على ${replyingTo.userName}...`}
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleReply(post.id); }}
                                autoFocus
                              />
                              <button className="absolute left-1 top-1/2 -translate-y-1/2 text-xs text-surface-400 hover:text-surface-600 px-2"
                                onClick={() => { setReplyingTo(null); setReplyContent(''); }}>
                                إلغاء
                              </button>
                            </div>
                            <Button size="sm" onClick={() => handleReply(post.id)} disabled={!replyContent.trim()}>
                              <Icon name="send" size={14} />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* New comment input */}
                  <div className="flex gap-2">
                    <input className="flex-1 border border-surface-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 transition-colors" placeholder="اكتب تعليقاً..." value={newComment} onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id); }} />
                    <Button size="sm" onClick={() => handleComment(post.id)} disabled={!newComment.trim()}>إرسال</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <Icon name="warning" size={40} className="text-warning-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-surface-900 text-center mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-surface-500 text-center mb-6">
              {confirmDelete.type === 'post' ? 'هل أنت متأكد من حذف هذا المنشور؟' :
               confirmDelete.type === 'reply' ? 'هل أنت متأكد من حذف هذا الرد؟' :
               'هل أنت متأكد من حذف هذا التعليق؟'}
            </p>
            <div className="flex gap-3">
              <Button fullWidth variant="ghost" onClick={() => setConfirmDelete(null)}>إلغاء</Button>
              <Button fullWidth variant="danger" onClick={handleDeleteItem}>حذف</Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setReportModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Icon name="flag" size={22} className="text-warning-500" />
              <h3 className="text-lg font-bold text-surface-900">
                إبلاغ عن {reportModal.type === 'post' ? 'منشور' : 'تعليق'}
              </h3>
            </div>
            <textarea className="w-full border border-surface-200 rounded-xl p-3 text-sm resize-none mb-4 focus:border-primary-500 transition-colors" rows={3} placeholder="سبب البلاغ..." value={reportReason} onChange={e => setReportReason(e.target.value)} />
            <div className="flex gap-3">
              <Button fullWidth variant="ghost" onClick={() => setReportModal(null)}>إلغاء</Button>
              <Button fullWidth variant="danger" onClick={handleReport} disabled={!reportReason.trim()}>
                <Icon name="flag" size={16} />
                إرسال البلاغ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
