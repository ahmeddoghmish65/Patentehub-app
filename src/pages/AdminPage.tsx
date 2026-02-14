import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { Comment } from '@/db/database';

type Tab = 'overview' | 'sections' | 'lessons' | 'questions' | 'signs' | 'dictionary' | 'users' | 'posts' | 'comments' | 'reports' | 'logs';

export function AdminPage() {
  const store = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [modal, setModal] = useState<{ type: string; data?: Record<string, unknown> } | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const [confirmDel, setConfirmDel] = useState<{ type: string; id: string } | null>(null);
  const [allComments, setAllComments] = useState<(Comment & { postContent?: string })[]>([]);
  const [viewUser, setViewUser] = useState<string | null>(null);

  useEffect(() => {
    store.loadAdminStats();
    store.loadSections();
    store.loadLessons();
    store.loadQuestions();
    store.loadSigns();
    store.loadDictSections();
    store.loadDictEntries();
    store.loadAdminUsers();
    store.loadPosts();
    store.loadAdminReports();
    store.loadAdminLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load all comments when comments tab is selected
  useEffect(() => {
    if (tab === 'comments') {
      loadAllComments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, store.posts]);

  const loadAllComments = async () => {
    const comments: (Comment & { postContent?: string })[] = [];
    for (const post of store.posts) {
      const postComments = await store.getComments(post.id);
      for (const c of postComments) {
        comments.push({ ...c, postContent: post.content.substring(0, 60) });
      }
    }
    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAllComments(comments);
  };

  const handleExport = async (storeName: string) => {
    const data = await store.exportData(storeName);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${storeName}.json`; a.click();
  };

  const handleImport = (storeName: string) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      const count = await store.importData(storeName, data);
      alert(`تم استيراد ${count} سجل`);
      store.loadSections(); store.loadLessons(); store.loadQuestions();
      store.loadSigns(); store.loadDictSections(); store.loadDictEntries();
    };
    input.click();
  };

  const handleImageUpload = (field: string) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setForm(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const saveItem = async () => {
    if (!modal) return;
    const { type, data } = modal;
    const isEdit = !!data?.id;
    let ok = false;

    switch (type) {
      case 'section': ok = isEdit ? await store.updateSection(data.id as string, form as never) : await store.createSection(form as never); break;
      case 'lesson': ok = isEdit ? await store.updateLesson(data.id as string, form as never) : await store.createLesson(form as never); break;
      case 'question': ok = isEdit ? await store.updateQuestion(data.id as string, form as never) : await store.createQuestion(form as never); break;
      case 'sign': ok = isEdit ? await store.updateSign(data.id as string, form as never) : await store.createSign(form as never); break;
      case 'dictSection': ok = isEdit ? await store.updateDictSection(data.id as string, form as never) : await store.createDictSection(form as never); break;
      case 'dictEntry': ok = isEdit ? await store.updateDictEntry(data.id as string, form as never) : await store.createDictEntry(form as never); break;
    }
    if (ok) setModal(null);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    const { type, id } = confirmDel;
    switch (type) {
      case 'section': await store.deleteSection(id); break;
      case 'lesson': await store.deleteLesson(id); break;
      case 'question': await store.deleteQuestion(id); break;
      case 'sign': await store.deleteSign(id); break;
      case 'dictSection': await store.deleteDictSection(id); break;
      case 'dictEntry': await store.deleteDictEntry(id); break;
      case 'user': await store.deleteUser(id); break;
      case 'post': await store.adminDeletePost(id); break;
      case 'comment': await store.adminDeleteComment(id); await loadAllComments(); break;
    }
    setConfirmDel(null);
  };

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview', icon: 'dashboard', label: 'نظرة عامة' },
    { id: 'sections', icon: 'folder', label: 'الأقسام' },
    { id: 'lessons', icon: 'school', label: 'الدروس' },
    { id: 'questions', icon: 'quiz', label: 'الأسئلة' },
    { id: 'signs', icon: 'traffic', label: 'الإشارات' },
    { id: 'dictionary', icon: 'menu_book', label: 'القاموس' },
    { id: 'users', icon: 'group', label: 'المستخدمين' },
    { id: 'posts', icon: 'forum', label: 'المنشورات' },
    { id: 'comments', icon: 'chat_bubble', label: 'التعليقات' },
    { id: 'reports', icon: 'flag', label: 'البلاغات' },
    { id: 'logs', icon: 'history', label: 'السجلات' },
  ];

  const renderInput = (label: string, field: string, type = 'text') => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-surface-700 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea className="w-full border border-surface-200 rounded-xl p-3 text-sm resize-none" rows={3} value={(form[field] as string) || ''} onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))} />
      ) : type === 'boolean' ? (
        <select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={String(form[field] || false)} onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value === 'true' }))}>
          <option value="true">صحيح / Vero</option>
          <option value="false">خطأ / Falso</option>
        </select>
      ) : type === 'select-difficulty' ? (
        <select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string) || 'easy'} onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}>
          <option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option>
        </select>
      ) : type === 'select-section' ? (
        <select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string) || ''} onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}>
          <option value="">اختر قسم</option>
          {store.sections.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
        </select>
      ) : type === 'select-lesson' ? (
        <select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string) || ''} onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}>
          <option value="">اختر درس</option>
          {store.lessons.map(l => <option key={l.id} value={l.id}>{l.titleAr}</option>)}
        </select>
      ) : type === 'select-dict-section' ? (
        <select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string) || ''} onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}>
          <option value="">اختر قسم</option>
          {store.dictSections.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
        </select>
      ) : type === 'number' ? (
        <input type="number" className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as number) || 0} onChange={e => setForm(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))} />
      ) : type === 'image' ? (
        <div>
          <button className="px-4 py-2 bg-surface-100 rounded-lg text-sm hover:bg-surface-200 flex items-center gap-1" onClick={() => handleImageUpload(field)}>
            <Icon name="upload" size={16} /> رفع صورة
          </button>
          {form[field] ? <img src={form[field] as string} alt="" className="mt-2 w-20 h-20 object-cover rounded-lg" /> : null}
        </div>
      ) : (
        <input type={type} className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string) || ''} onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 mb-1">لوحة التحكم</h1>
        <p className="text-sm text-surface-400">admin@patente.com — إدارة كاملة للتطبيق</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
        {tabs.map(t => (
          <button key={t.id} className={cn('shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
            tab === t.id ? 'bg-primary-500 text-white' : 'bg-white text-surface-600 border border-surface-200 hover:border-primary-200')} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={16} />{t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && store.adminStats && (() => {
        const pendingReports = store.adminReports.filter(r => r.status === 'pending').length;
        const bannedUsers = store.adminUsers.filter(u => u.isBanned).length;
        const dictTotal = store.dictSections.length;
        const dictEntriesTotal = store.dictEntries.length;
        return (
        <div className="space-y-6">
          {/* Hero Stats */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
            <div className="relative">
              <h2 className="text-lg font-bold mb-4">مرحباً بك في لوحة التحكم</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                  <p className="text-2xl font-bold">{store.adminStats.totalUsers}</p>
                  <p className="text-[10px] text-primary-200">مستخدم</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                  <p className="text-2xl font-bold">{store.adminStats.activeToday}</p>
                  <p className="text-[10px] text-primary-200">نشط اليوم</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                  <p className="text-2xl font-bold">{store.adminStats.totalPosts}</p>
                  <p className="text-[10px] text-primary-200">منشور</p>
                </div>
                <div className={cn("backdrop-blur-sm rounded-xl p-3 text-center border", pendingReports > 0 ? 'bg-red-500/30 border-red-400/30' : 'bg-white/10 border-white/10')}>
                  <p className="text-2xl font-bold">{pendingReports}</p>
                  <p className="text-[10px] text-primary-200">بلاغ معلق</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'الأقسام', value: store.adminStats.totalSections, icon: 'folder', color: 'text-purple-500', bg: 'bg-purple-50', tab: 'sections' as Tab },
              { label: 'الدروس', value: store.adminStats.totalLessons, icon: 'school', color: 'text-green-500', bg: 'bg-green-50', tab: 'lessons' as Tab },
              { label: 'الأسئلة', value: store.adminStats.totalQuestions, icon: 'quiz', color: 'text-orange-500', bg: 'bg-orange-50', tab: 'questions' as Tab },
              { label: 'الإشارات', value: store.adminStats.totalSigns, icon: 'traffic', color: 'text-red-500', bg: 'bg-red-50', tab: 'signs' as Tab },
              { label: 'أقسام القاموس', value: dictTotal, icon: 'menu_book', color: 'text-cyan-500', bg: 'bg-cyan-50', tab: 'dictionary' as Tab },
              { label: 'مصطلحات', value: dictEntriesTotal, icon: 'translate', color: 'text-indigo-500', bg: 'bg-indigo-50', tab: 'dictionary' as Tab },
              { label: 'البلاغات', value: store.adminStats.totalReports, icon: 'flag', color: 'text-pink-500', bg: 'bg-pink-50', tab: 'reports' as Tab },
              { label: 'محظورين', value: bannedUsers, icon: 'block', color: 'text-red-500', bg: 'bg-red-50', tab: 'users' as Tab },
            ].map((s, i) => (
              <button key={i} className="bg-white rounded-xl p-4 border border-surface-100 hover:border-primary-200 hover:shadow-md transition-all text-right" onClick={() => setTab(s.tab)}>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', s.bg)}>
                  <Icon name={s.icon} size={22} className={s.color} filled />
                </div>
                <p className="text-2xl font-bold text-surface-900">{s.value}</p>
                <p className="text-xs text-surface-500">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Content Progress Bars */}
          <div className="bg-white rounded-xl border border-surface-100 p-5">
            <h3 className="font-bold text-surface-900 mb-4 flex items-center gap-2">
              <Icon name="analytics" size={20} className="text-primary-500" filled />
              حالة المحتوى التعليمي
            </h3>
            <div className="space-y-3">
              {[
                { label: 'الأقسام', current: store.adminStats.totalSections, icon: 'folder', color: '#8b5cf6' },
                { label: 'الدروس', current: store.adminStats.totalLessons, icon: 'school', color: '#22c55e' },
                { label: 'الأسئلة', current: store.adminStats.totalQuestions, icon: 'quiz', color: '#f59e0b' },
                { label: 'الإشارات', current: store.adminStats.totalSigns, icon: 'traffic', color: '#ef4444' },
                { label: 'القاموس', current: dictEntriesTotal, icon: 'translate', color: '#06b6d4' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.color + '15' }}>
                    <Icon name={item.icon} size={18} style={{ color: item.color }} filled />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-surface-700">{item.label}</span>
                      <span className="text-sm font-bold text-surface-900">{item.current}</span>
                    </div>
                    <div className="w-full bg-surface-100 rounded-full h-1.5">
                      <div className="rounded-full h-1.5 transition-all" style={{ backgroundColor: item.color, width: `${Math.min(100, item.current * 5)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-surface-100 p-5">
            <h3 className="font-bold text-surface-900 mb-4 flex items-center gap-2">
              <Icon name="bolt" size={20} className="text-amber-500" filled />
              إجراءات سريعة
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'إضافة قسم', icon: 'create_new_folder', tab: 'sections' as Tab },
                { label: 'إضافة درس', icon: 'post_add', tab: 'lessons' as Tab },
                { label: 'إضافة سؤال', icon: 'add_circle', tab: 'questions' as Tab },
                { label: 'إضافة إشارة', icon: 'add_photo_alternate', tab: 'signs' as Tab },
              ].map((action, i) => (
                <button key={i} className="bg-surface-50 hover:bg-primary-50 rounded-xl p-3 text-center transition-colors group" onClick={() => setTab(action.tab)}>
                  <Icon name={action.icon} size={24} className="text-surface-400 group-hover:text-primary-500 mx-auto mb-1" />
                  <p className="text-xs font-medium text-surface-600 group-hover:text-primary-600">{action.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Pending Reports */}
          {pendingReports > 0 && (
            <div className="bg-white rounded-xl border border-danger-100 p-5">
              <h3 className="font-bold text-surface-900 mb-3 flex items-center gap-2">
                <Icon name="flag" size={20} className="text-danger-500" filled />
                بلاغات بانتظار المراجعة ({pendingReports})
              </h3>
              <div className="space-y-2">
                {store.adminReports.filter(r => r.status === 'pending').slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-danger-50 rounded-lg p-3">
                    <div>
                      <p className="text-sm text-surface-800">{r.reason.substring(0, 60)}...</p>
                      <p className="text-xs text-surface-400">{r.type === 'post' ? 'منشور' : r.type === 'comment' ? 'تعليق' : 'مستخدم'} — {new Date(r.createdAt).toLocaleDateString('ar')}</p>
                    </div>
                    <Button size="sm" onClick={() => setTab('reports')}>مراجعة</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Users */}
          {store.adminUsers.length > 0 && (
            <div className="bg-white rounded-xl border border-surface-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-surface-900 flex items-center gap-2">
                  <Icon name="group" size={20} className="text-blue-500" filled />
                  آخر المستخدمين المسجلين
                </h3>
                <button className="text-xs text-primary-500 font-medium" onClick={() => setTab('users')}>عرض الكل</button>
              </div>
              <div className="space-y-2">
                {store.adminUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                      {u.avatar ? <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" alt="" /> : <span className="text-xs font-bold text-primary-700">{u.name.charAt(0)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">{u.name}</p>
                      <p className="text-[10px] text-surface-400">{u.email} — {new Date(u.createdAt).toLocaleDateString('ar')}</p>
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', u.isBanned ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600')}>
                      {u.isBanned ? 'محظور' : 'نشط'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Logs */}
          {store.adminLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-surface-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-surface-900 flex items-center gap-2">
                  <Icon name="history" size={20} className="text-surface-400" />
                  آخر الإجراءات
                </h3>
                <button className="text-xs text-primary-500 font-medium" onClick={() => setTab('logs')}>عرض الكل</button>
              </div>
              <div className="space-y-2">
                {store.adminLogs.slice(0, 5).map(l => (
                  <div key={l.id} className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0">
                    <div className="w-7 h-7 bg-surface-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon name="history" size={14} className="text-surface-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-700 truncate">{l.action}: {l.details}</p>
                      <p className="text-[10px] text-surface-400">{new Date(l.createdAt).toLocaleString('ar')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* Sections CRUD */}
      {tab === 'sections' && (
        <CrudTable title="الأقسام" items={store.sections} search={search} setSearch={setSearch}
          columns={[{ key: 'nameAr', label: 'الاسم' }, { key: 'nameIt', label: 'بالإيطالية' }, { key: 'order', label: 'الترتيب' }]}
          onAdd={() => { setForm({ nameAr: '', nameIt: '', descriptionAr: '', descriptionIt: '', icon: 'school', color: '#3b82f6', image: '', order: store.sections.length + 1 }); setModal({ type: 'section' }); }}
          onEdit={(item) => { setForm(item); setModal({ type: 'section', data: item as Record<string, unknown> }); }}
          onDelete={(id) => setConfirmDel({ type: 'section', id })}
          onExport={() => handleExport('sections')} onImport={() => handleImport('sections')}
          filterFn={(item) => !search || item.nameAr.includes(search) || item.nameIt?.toLowerCase().includes(search.toLowerCase())}
        />
      )}

      {/* Lessons CRUD */}
      {tab === 'lessons' && (
        <CrudTable title="الدروس" items={store.lessons} search={search} setSearch={setSearch}
          columns={[
            { key: 'titleAr', label: 'العنوان' },
            { key: 'sectionId', label: 'القسم', render: (v) => store.sections.find(s => s.id === v)?.nameAr || String(v) },
            { key: 'order', label: 'الترتيب' },
          ]}
          onAdd={() => { setForm({ sectionId: '', titleAr: '', titleIt: '', contentAr: '', contentIt: '', image: '', order: store.lessons.length + 1 }); setModal({ type: 'lesson' }); }}
          onEdit={(item) => { setForm(item); setModal({ type: 'lesson', data: item as Record<string, unknown> }); }}
          onDelete={(id) => setConfirmDel({ type: 'lesson', id })}
          onExport={() => handleExport('lessons')} onImport={() => handleImport('lessons')}
          filterFn={(item) => !search || item.titleAr?.includes(search) || item.titleIt?.toLowerCase().includes(search.toLowerCase())}
        />
      )}

      {/* Questions CRUD */}
      {tab === 'questions' && (
        <CrudTable title="الأسئلة" items={store.questions} search={search} setSearch={setSearch}
          columns={[
            { key: 'questionAr', label: 'السؤال', render: (v: unknown) => String(v || '').substring(0, 50) + '...' },
            { key: 'isTrue', label: 'الإجابة', render: (v) => v ? '✓ صحيح' as string : '✗ خطأ' as string },
            { key: 'difficulty', label: 'الصعوبة' },
          ]}
          onAdd={() => { setForm({ lessonId: '', sectionId: '', questionAr: '', questionIt: '', isTrue: true, explanationAr: '', explanationIt: '', difficulty: 'easy', image: '', order: store.questions.length + 1 }); setModal({ type: 'question' }); }}
          onEdit={(item) => { setForm(item); setModal({ type: 'question', data: item as Record<string, unknown> }); }}
          onDelete={(id) => setConfirmDel({ type: 'question', id })}
          onExport={() => handleExport('questions')} onImport={() => handleImport('questions')}
          filterFn={(item) => !search || item.questionAr?.includes(search) || item.questionIt?.toLowerCase().includes(search.toLowerCase())}
        />
      )}

      {/* Signs CRUD */}
      {tab === 'signs' && (
        <CrudTable title="الإشارات" items={store.signs} search={search} setSearch={setSearch}
          columns={[{ key: 'nameAr', label: 'الاسم' }, { key: 'nameIt', label: 'بالإيطالية' }, { key: 'category', label: 'التصنيف' }]}
          onAdd={() => { setForm({ nameAr: '', nameIt: '', descriptionAr: '', descriptionIt: '', category: 'pericolo', image: '', order: store.signs.length + 1 }); setModal({ type: 'sign' }); }}
          onEdit={(item) => { setForm(item); setModal({ type: 'sign', data: item as Record<string, unknown> }); }}
          onDelete={(id) => setConfirmDel({ type: 'sign', id })}
          onExport={() => handleExport('signs')} onImport={() => handleImport('signs')}
          filterFn={(item) => !search || item.nameAr?.includes(search)}
        />
      )}

      {/* Dictionary */}
      {tab === 'dictionary' && (
        <div className="space-y-6">
          <CrudTable title="أقسام القاموس" items={store.dictSections} search={search} setSearch={setSearch}
            columns={[{ key: 'nameAr', label: 'الاسم' }, { key: 'nameIt', label: 'بالإيطالية' }]}
            onAdd={() => { setForm({ nameAr: '', nameIt: '', icon: 'menu_book', order: store.dictSections.length + 1 }); setModal({ type: 'dictSection' }); }}
            onEdit={(item) => { setForm(item); setModal({ type: 'dictSection', data: item as Record<string, unknown> }); }}
            onDelete={(id) => setConfirmDel({ type: 'dictSection', id })}
            onExport={() => handleExport('dictionarySections')} onImport={() => handleImport('dictionarySections')}
            filterFn={(item) => !search || item.nameAr?.includes(search)}
          />
          <CrudTable title="مصطلحات القاموس" items={store.dictEntries} search={search} setSearch={setSearch}
            columns={[{ key: 'termAr', label: 'المصطلح' }, { key: 'termIt', label: 'بالإيطالية' }, { key: 'sectionId', label: 'القسم', render: (v) => store.dictSections.find(s => s.id === v)?.nameAr || '' }]}
            onAdd={() => { setForm({ sectionId: '', termIt: '', termAr: '', definitionIt: '', definitionAr: '', order: store.dictEntries.length + 1 }); setModal({ type: 'dictEntry' }); }}
            onEdit={(item) => { setForm(item); setModal({ type: 'dictEntry', data: item as Record<string, unknown> }); }}
            onDelete={(id) => setConfirmDel({ type: 'dictEntry', id })}
            onExport={() => handleExport('dictionaryEntries')} onImport={() => handleImport('dictionaryEntries')}
            filterFn={(item) => !search || item.termAr?.includes(search) || item.termIt?.toLowerCase().includes(search.toLowerCase())}
          />
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (() => {
        const selectedUser = store.adminUsers.find(u => u.id === viewUser);

        if (selectedUser) {
          const totalAns = selectedUser.progress.correctAnswers + selectedUser.progress.wrongAnswers;
          const acc = totalAns > 0 ? Math.round((selectedUser.progress.correctAnswers / totalAns) * 100) : 0;
          return (
            <div className="space-y-4">
              <button onClick={() => setViewUser(null)} className="flex items-center gap-2 text-surface-500 hover:text-primary-600">
                <Icon name="arrow_forward" size={20} /><span className="text-sm">العودة للمستخدمين</span>
              </button>
              <div className="bg-white rounded-xl border border-surface-100 p-6">
                <div className="flex items-center gap-4 mb-6">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} className="w-16 h-16 rounded-xl object-cover" alt="" />
                  ) : (
                    <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                      <span className="text-xl font-bold text-primary-700">{selectedUser.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-surface-900">{selectedUser.name}</h2>
                    <p className="text-sm text-surface-500">{selectedUser.email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', selectedUser.isBanned ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600')}>
                        {selectedUser.isBanned ? 'محظور' : 'نشط'}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', selectedUser.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600')}>
                        {selectedUser.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-surface-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-surface-900">{selectedUser.progress.level}</p>
                    <p className="text-[10px] text-surface-400">المستوى</p>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-surface-900">{selectedUser.progress.xp}</p>
                    <p className="text-[10px] text-surface-400">XP</p>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-surface-900">{acc}%</p>
                    <p className="text-[10px] text-surface-400">الدقة</p>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-surface-900">{selectedUser.progress.examReadiness}%</p>
                    <p className="text-[10px] text-surface-400">الجاهزية</p>
                  </div>
                </div>

                {/* Detailed Info */}
                <div className="space-y-2 text-sm border-t border-surface-100 pt-4">
                  <div className="flex justify-between py-1"><span className="text-surface-500">الاختبارات</span><span className="font-medium">{selectedUser.progress.totalQuizzes}</span></div>
                  <div className="flex justify-between py-1"><span className="text-surface-500">إجابات صحيحة</span><span className="font-medium text-success-600">{selectedUser.progress.correctAnswers}</span></div>
                  <div className="flex justify-between py-1"><span className="text-surface-500">إجابات خاطئة</span><span className="font-medium text-danger-600">{selectedUser.progress.wrongAnswers}</span></div>
                  <div className="flex justify-between py-1"><span className="text-surface-500">الدروس المكتملة</span><span className="font-medium">{selectedUser.progress.completedLessons.length}</span></div>
                  <div className="flex justify-between py-1"><span className="text-surface-500">سلسلة الأيام</span><span className="font-medium">{selectedUser.progress.currentStreak} (أفضل: {selectedUser.progress.bestStreak})</span></div>
                  <div className="flex justify-between py-1"><span className="text-surface-500">الشارات</span><span className="font-medium">{selectedUser.progress.badges.join(', ') || 'لا توجد'}</span></div>
                  <div className="flex justify-between py-1"><span className="text-surface-500">تاريخ التسجيل</span><span className="font-medium">{new Date(selectedUser.createdAt).toLocaleString('ar')}</span></div>
                  <div className="flex justify-between py-1"><span className="text-surface-500">آخر دخول</span><span className="font-medium">{new Date(selectedUser.lastLogin).toLocaleString('ar')}</span></div>
                  <div className="flex justify-between py-1"><span className="text-surface-500">آخر دراسة</span><span className="font-medium">{selectedUser.progress.lastStudyDate ? new Date(selectedUser.progress.lastStudyDate).toLocaleString('ar') : 'لم يدرس بعد'}</span></div>
                  <div className="flex justify-between py-1"><span className="text-surface-500">لغة العرض</span><span className="font-medium">{selectedUser.settings.language === 'ar' ? 'العربية' : selectedUser.settings.language === 'it' ? 'الإيطالية' : 'كلاهما'}</span></div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-surface-100">
                  <Button size="sm" variant={selectedUser.isBanned ? 'primary' : 'danger'}
                    onClick={() => { store.banUser(selectedUser.id, !selectedUser.isBanned); }}
                    icon={<Icon name={selectedUser.isBanned ? 'lock_open' : 'block'} size={16} />}>
                    {selectedUser.isBanned ? 'إلغاء الحظر' : 'حظر المستخدم'}
                  </Button>
                  {selectedUser.email !== 'admin@patente.com' && (
                    <>
                      <Button size="sm" variant="secondary"
                        onClick={async () => {
                          // Toggle admin role
                          const db = await import('@/db/database').then(m => m.getDB());
                          const u = await db.get('users', selectedUser.id);
                          if (u) {
                            u.role = u.role === 'admin' ? 'user' : 'admin';
                            await db.put('users', u);
                            store.loadAdminUsers();
                          }
                        }}
                        icon={<Icon name="admin_panel_settings" size={16} />}>
                        {selectedUser.role === 'admin' ? 'إزالة صلاحيات المدير' : 'تعيين كمدير'}
                      </Button>
                      <Button size="sm" variant="danger"
                        onClick={() => { setConfirmDel({ type: 'user', id: selectedUser.id }); setViewUser(null); }}
                        icon={<Icon name="delete" size={16} />}>
                        حذف الحساب
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-bold text-surface-900">المستخدمين ({store.adminUsers.length})</h2>
            <input className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm w-48" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50"><tr>
                <th className="text-right p-3 font-semibold text-surface-600">المستخدم</th>
                <th className="text-right p-3 font-semibold text-surface-600">البريد</th>
                <th className="text-right p-3 font-semibold text-surface-600">الدور</th>
                <th className="text-right p-3 font-semibold text-surface-600">المستوى</th>
                <th className="text-right p-3 font-semibold text-surface-600">الحالة</th>
                <th className="text-right p-3 font-semibold text-surface-600 w-28">إجراءات</th>
              </tr></thead>
              <tbody>
                {store.adminUsers.filter(u => !search || u.name.includes(search) || u.email.includes(search)).map(u => (
                  <tr key={u.id} className="border-t border-surface-50 hover:bg-surface-50 cursor-pointer" onClick={() => setViewUser(u.id)}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {u.avatar ? <img src={u.avatar} className="w-7 h-7 rounded-full object-cover" alt="" /> : (
                          <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center"><span className="text-xs font-bold text-primary-700">{u.name.charAt(0)}</span></div>
                        )}
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-surface-500">{u.email}</td>
                    <td className="p-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-surface-100 text-surface-500')}>
                        {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </span>
                    </td>
                    <td className="p-3">{u.progress.level}</td>
                    <td className="p-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', u.isBanned ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600')}>
                        {u.isBanned ? 'محظور' : 'نشط'}
                      </span>
                    </td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button className="p-1 rounded hover:bg-surface-100" title="عرض التفاصيل" onClick={() => setViewUser(u.id)}>
                          <Icon name="visibility" size={16} className="text-primary-500" />
                        </button>
                        <button className="p-1 rounded hover:bg-surface-100" onClick={() => store.banUser(u.id, !u.isBanned)}>
                          <Icon name={u.isBanned ? 'lock_open' : 'block'} size={16} className={u.isBanned ? 'text-success-500' : 'text-warning-500'} />
                        </button>
                        {u.email !== 'admin@patente.com' && (
                          <button className="p-1 rounded hover:bg-surface-100" onClick={() => setConfirmDel({ type: 'user', id: u.id })}>
                            <Icon name="delete" size={16} className="text-danger-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* Posts */}
      {tab === 'posts' && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b border-surface-100">
            <h2 className="font-bold text-surface-900">المنشورات ({store.posts.length})</h2>
          </div>
          {store.posts.length === 0 ? (
            <div className="p-8 text-center text-surface-400">لا توجد منشورات</div>
          ) : (
            <div className="divide-y divide-surface-50">
              {store.posts.map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-surface-800">{p.userName}</p>
                    <p className="text-xs text-surface-500 line-clamp-2 mt-0.5">{p.content}</p>
                    <p className="text-xs text-surface-400 mt-1">{new Date(p.createdAt).toLocaleDateString('ar')} — {p.likesCount} ❤ {p.commentsCount} 💬</p>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-danger-50 text-danger-500 shrink-0 mr-2" onClick={() => setConfirmDel({ type: 'post', id: p.id })}>
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments */}
      {tab === 'comments' && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between">
            <h2 className="font-bold text-surface-900">تعليقات المنشورات ({allComments.length})</h2>
            <input className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm w-48" placeholder="بحث في التعليقات..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {allComments.length === 0 ? (
            <div className="p-8 text-center text-surface-400">لا توجد تعليقات</div>
          ) : (
            <div className="divide-y divide-surface-50 max-h-[600px] overflow-y-auto">
              {allComments
                .filter(c => !search || c.content.includes(search) || c.userName.includes(search))
                .map(c => (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-700">{c.userName.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-surface-800">{c.userName}</span>
                          <span className="text-xs text-surface-400">{new Date(c.createdAt).toLocaleDateString('ar')}</span>
                        </div>
                        <p className="text-sm text-surface-700">{c.content}</p>
                        {c.postContent && (
                          <p className="text-xs text-surface-400 mt-1 flex items-center gap-1">
                            <Icon name="reply" size={12} />
                            على المنشور: {c.postContent}...
                          </p>
                        )}
                      </div>
                    </div>
                    <button className="p-1.5 rounded-lg hover:bg-danger-50 text-danger-400 hover:text-danger-600 shrink-0" 
                      onClick={() => setConfirmDel({ type: 'comment', id: c.id })}>
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b border-surface-100">
            <h2 className="font-bold text-surface-900">البلاغات ({store.adminReports.length})</h2>
          </div>
          <div className="divide-y divide-surface-50">
            {store.adminReports.length === 0 ? (
              <div className="p-8 text-center text-surface-400">لا توجد بلاغات</div>
            ) : store.adminReports.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full',
                    r.status === 'pending' ? 'bg-warning-50 text-warning-600' : r.status === 'reviewed' ? 'bg-success-50 text-success-600' : 'bg-surface-100 text-surface-500')}>
                    {r.status === 'pending' ? 'قيد المراجعة' : r.status === 'reviewed' ? 'تمت المراجعة' : 'مرفوض'}
                  </span>
                  <span className="text-xs text-surface-400">{new Date(r.createdAt).toLocaleDateString('ar')}</span>
                </div>
                <p className="text-sm text-surface-700 mb-2">{r.reason}</p>
                <p className="text-xs text-surface-400">النوع: {r.type} | الهدف: {r.targetId.substring(0, 8)}...</p>
                {r.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => store.updateReport(r.id, 'reviewed')}><Icon name="check" size={16} /> مراجعة</Button>
                    <Button size="sm" variant="ghost" onClick={() => store.updateReport(r.id, 'dismissed')}>رفض</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      {tab === 'logs' && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b border-surface-100">
            <h2 className="font-bold text-surface-900">سجلات الإدارة</h2>
          </div>
          <div className="divide-y divide-surface-50 max-h-96 overflow-y-auto">
            {store.adminLogs.length === 0 ? (
              <div className="p-8 text-center text-surface-400">لا توجد سجلات</div>
            ) : store.adminLogs.map(l => (
              <div key={l.id} className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon name="history" size={16} className="text-surface-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-800">{l.action}: {l.details}</p>
                  <p className="text-xs text-surface-400">{new Date(l.createdAt).toLocaleString('ar')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-surface-900 mb-4">{modal.data?.id ? 'تعديل' : 'إضافة'}</h3>
            {modal.type === 'section' && (<>
              {renderInput('الاسم بالعربية', 'nameAr')}
              {renderInput('الاسم بالإيطالية', 'nameIt')}
              {renderInput('الوصف بالعربية', 'descriptionAr', 'textarea')}
              {renderInput('الوصف بالإيطالية', 'descriptionIt', 'textarea')}
              {renderInput('الأيقونة', 'icon')}
              {renderInput('اللون', 'color', 'color')}
              {renderInput('صورة', 'image', 'image')}
              {renderInput('الترتيب', 'order', 'number')}
            </>)}
            {modal.type === 'lesson' && (<>
              {renderInput('القسم', 'sectionId', 'select-section')}
              {renderInput('العنوان بالعربية', 'titleAr')}
              {renderInput('العنوان بالإيطالية', 'titleIt')}
              {renderInput('المحتوى بالعربية', 'contentAr', 'textarea')}
              {renderInput('المحتوى بالإيطالية', 'contentIt', 'textarea')}
              {renderInput('صورة', 'image', 'image')}
              {renderInput('الترتيب', 'order', 'number')}
            </>)}
            {modal.type === 'question' && (<>
              {renderInput('القسم', 'sectionId', 'select-section')}
              {renderInput('الدرس', 'lessonId', 'select-lesson')}
              {renderInput('السؤال بالعربية', 'questionAr', 'textarea')}
              {renderInput('السؤال بالإيطالية', 'questionIt', 'textarea')}
              {renderInput('الإجابة الصحيحة', 'isTrue', 'boolean')}
              {renderInput('الشرح بالعربية', 'explanationAr', 'textarea')}
              {renderInput('الشرح بالإيطالية', 'explanationIt', 'textarea')}
              {renderInput('الصعوبة', 'difficulty', 'select-difficulty')}
              {renderInput('صورة', 'image', 'image')}
              {renderInput('الترتيب', 'order', 'number')}
            </>)}
            {modal.type === 'sign' && (<>
              {renderInput('الاسم بالعربية', 'nameAr')}
              {renderInput('الاسم بالإيطالية', 'nameIt')}
              {renderInput('الوصف بالعربية', 'descriptionAr', 'textarea')}
              {renderInput('الوصف بالإيطالية', 'descriptionIt', 'textarea')}
              {renderInput('التصنيف', 'category')}
              {renderInput('صورة', 'image', 'image')}
              {renderInput('الترتيب', 'order', 'number')}
            </>)}
            {modal.type === 'dictSection' && (<>
              {renderInput('الاسم بالعربية', 'nameAr')}
              {renderInput('الاسم بالإيطالية', 'nameIt')}
              {renderInput('الأيقونة', 'icon')}
              {renderInput('الترتيب', 'order', 'number')}
            </>)}
            {modal.type === 'dictEntry' && (<>
              {renderInput('القسم', 'sectionId', 'select-dict-section')}
              {renderInput('المصطلح بالإيطالية', 'termIt')}
              {renderInput('المصطلح بالعربية', 'termAr')}
              {renderInput('التعريف بالإيطالية', 'definitionIt', 'textarea')}
              {renderInput('التعريف بالعربية', 'definitionAr', 'textarea')}
              {renderInput('الترتيب', 'order', 'number')}
            </>)}
            <div className="flex gap-3 mt-6">
              <Button fullWidth variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
              <Button fullWidth onClick={saveItem}>حفظ</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDel(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <Icon name="warning" size={40} className="text-danger-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-surface-900 text-center mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-surface-500 text-center mb-6">هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <Button fullWidth variant="ghost" onClick={() => setConfirmDel(null)}>إلغاء</Button>
              <Button fullWidth variant="danger" onClick={handleDelete}>حذف</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Generic CRUD Table Component
function CrudTable({ title, items, search, setSearch, columns, onAdd, onEdit, onDelete, onExport, onImport, filterFn }: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  search: string;
  setSearch: (s: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: { key: string; label: string; render?: (v: any) => any }[];
  onAdd: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterFn: (item: any) => boolean;
}) {
  const filtered = items.filter(filterFn);
  return (
    <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
      <div className="p-4 border-b border-surface-100 flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-bold text-surface-900">{title} ({items.length})</h2>
        <div className="flex items-center gap-2">
          <input className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm w-40" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400" onClick={onExport} title="تصدير"><Icon name="download" size={18} /></button>
          <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400" onClick={onImport} title="استيراد"><Icon name="upload" size={18} /></button>
          <Button size="sm" onClick={onAdd} icon={<Icon name="add" size={16} />}>إضافة</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-50"><tr>
            {columns.map(c => <th key={c.key} className="text-right p-3 font-semibold text-surface-600">{c.label}</th>)}
            <th className="text-right p-3 font-semibold text-surface-600 w-20">إجراءات</th>
          </tr></thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {filtered.map((item: any) => (
              <tr key={String(item.id)} className="border-t border-surface-50 hover:bg-surface-50">
                {columns.map(c => (
                  <td key={c.key} className="p-3 max-w-xs truncate">{String(c.render ? c.render(item[c.key]) : (item[c.key] ?? ''))}</td>
                ))}
                <td className="p-3">
                  <div className="flex gap-1">
                    <button className="p-1 rounded hover:bg-surface-100" onClick={() => onEdit(item)}><Icon name="edit" size={16} className="text-primary-500" /></button>
                    <button className="p-1 rounded hover:bg-surface-100" onClick={() => onDelete(item.id as string)}><Icon name="delete" size={16} className="text-danger-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-surface-400">لا توجد بيانات</div>}
      </div>
    </div>
  );
}
