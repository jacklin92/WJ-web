import { useState, useEffect, useRef, useCallback } from 'react';

interface Article {
  id: string;
  title: string;
  content: string;
  published?: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'wj-editor-articles';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadArticles(): Article[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage(articles: Article[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function htmlToMarkdown(html: string): string {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n');
  md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');
  md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_, c) =>
    c.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n'
  );
  md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, c) => {
    let i = 0;
    return c.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${++i}. `) + '\n';
  });
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  md = md.replace(/<(s|strike|del)[^>]*>(.*?)<\/\1>/gi, '~~$2~~');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  md = md.replace(/<hr[^>]*\/?>/gi, '---\n\n');
  md = md.replace(/<br[^>]*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n');
  md = md.replace(/<div[^>]*>(.*?)<\/div>/gis, '$1\n');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const toolbarGroups = [
  [
    { cmd: 'bold', label: 'B', style: { fontWeight: 700 }, title: '\u7C97\u9AD4' },
    { cmd: 'italic', label: 'I', style: { fontStyle: 'italic' }, title: '\u659C\u9AD4' },
    { cmd: 'underline', label: 'U', style: { textDecoration: 'underline' }, title: '\u5E95\u7DDA' },
    { cmd: 'strikeThrough', label: 'S', style: { textDecoration: 'line-through' }, title: '\u522A\u9664\u7DDA' },
  ],
  [
    { cmd: 'formatBlock', value: 'h1', label: 'H1', style: { fontSize: '0.7rem', fontWeight: 700 }, title: '\u6A19\u984C 1' },
    { cmd: 'formatBlock', value: 'h2', label: 'H2', style: { fontSize: '0.7rem', fontWeight: 700 }, title: '\u6A19\u984C 2' },
    { cmd: 'formatBlock', value: 'h3', label: 'H3', style: { fontSize: '0.7rem', fontWeight: 700 }, title: '\u6A19\u984C 3' },
    { cmd: 'formatBlock', value: 'p', label: 'P', style: { fontSize: '0.7rem' }, title: '\u6BB5\u843D' },
  ],
  [
    { cmd: 'insertUnorderedList', label: '\u2022', style: { fontSize: '1.1rem' }, title: '\u7121\u5E8F\u6E05\u55AE' },
    { cmd: 'insertOrderedList', label: '1.', style: { fontSize: '0.75rem', fontWeight: 600 }, title: '\u6709\u5E8F\u6E05\u55AE' },
  ],
  [
    { cmd: 'link', label: '\uD83D\uDD17', style: {}, title: '\u63D2\u5165\u9023\u7D50' },
    { cmd: 'image', label: '\uD83D\uDDBC', style: {}, title: '\u63D2\u5165\u5716\u7247' },
    { cmd: 'insertHorizontalRule', label: '\u2014', style: { fontWeight: 700 }, title: '\u5206\u9694\u7DDA' },
  ],
  [
    { cmd: 'formatBlock', value: 'blockquote', label: '\u201C', style: { fontSize: '1.2rem', fontWeight: 700 }, title: '\u5F15\u7528' },
    { cmd: 'formatBlock', value: 'pre', label: '<>', style: { fontSize: '0.7rem', fontFamily: 'monospace' }, title: '\u7A0B\u5F0F\u78BC\u5340\u584A' },
  ],
  [
    { cmd: 'undo', label: '\u21A9', style: {}, title: '\u5FA9\u539F' },
    { cmd: 'redo', label: '\u21AA', style: {}, title: '\u91CD\u505A' },
    { cmd: 'removeFormat', label: 'T\u0338', style: { fontSize: '0.8rem' }, title: '\u6E05\u9664\u683C\u5F0F' },
  ],
];

export default function ArticleEditor() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number>(0);

  useEffect(() => {
    const loaded = loadArticles();
    setArticles(loaded);
    const params = new URLSearchParams(window.location.search);
    const openId = params.get('id');
    if (openId) {
      const article = loaded.find(a => a.id === openId);
      if (article) {
        setCurrentId(article.id);
        setTitle(article.title);
        setTimeout(() => {
          if (editorRef.current) editorRef.current.innerHTML = article.content;
        }, 0);
      }
    }
  }, []);

  const currentArticle = articles.find(a => a.id === currentId);

  const doSave = useCallback(() => {
    if (!currentId || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    setArticles(prev => {
      const updated = prev.map(a =>
        a.id === currentId
          ? { ...a, title, content, updatedAt: new Date().toISOString() }
          : a
      );
      saveToStorage(updated);
      return updated;
    });
  }, [currentId, title]);

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(doSave, 600);
  }, [doSave]);

  useEffect(() => {
    if (currentId) doSave();
  }, [title]);

  const createArticle = () => {
    const article: Article = {
      id: generateId(),
      title: '',
      content: '',
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [article, ...articles];
    setArticles(updated);
    saveToStorage(updated);
    setCurrentId(article.id);
    setTitle('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setTimeout(() => {
      const input = document.getElementById('article-title-input') as HTMLInputElement;
      input?.focus();
    }, 50);
  };

  const openArticle = (id: string) => {
    if (currentId) doSave();
    const article = articles.find(a => a.id === id);
    if (!article) return;
    setCurrentId(article.id);
    setTitle(article.title);
    if (editorRef.current) editorRef.current.innerHTML = article.content;
  };

  const deleteArticle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('\u78BA\u5B9A\u8981\u522A\u9664\u9019\u7BC7\u6587\u7AE0\u55CE\uFF1F')) return;
    const updated = articles.filter(a => a.id !== id);
    setArticles(updated);
    saveToStorage(updated);
    if (currentId === id) {
      setCurrentId(null);
      setTitle('');
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  };

  const togglePublish = () => {
    if (!currentId) return;
    setArticles(prev => {
      const updated = prev.map(a =>
        a.id === currentId
          ? { ...a, published: !a.published, updatedAt: new Date().toISOString() }
          : a
      );
      saveToStorage(updated);
      return updated;
    });
  };

  const execCmd = (cmd: string, value?: string) => {
    if (cmd === 'link') {
      const url = prompt('\u8F38\u5165\u9023\u7D50 URL:');
      if (url) document.execCommand('createLink', false, url);
    } else if (cmd === 'image') {
      const url = prompt('\u8F38\u5165\u5716\u7247 URL:');
      if (url) document.execCommand('insertImage', false, url);
    } else if (cmd === 'formatBlock' && value) {
      document.execCommand('formatBlock', false, `<${value}>`);
    } else {
      document.execCommand(cmd, false, value);
    }
    editorRef.current?.focus();
    scheduleSave();
  };

  const exportMarkdown = () => {
    if (!editorRef.current) return;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    const frontmatter = `---\ntitle: '${title || '\u672A\u547D\u540D'}'\ndescription: ''\npubDate: '${new Date().toISOString().split('T')[0]}'\n---\n\n`;
    const blob = new Blob([frontmatter + md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'untitled'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('zh-TW', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontSize: '0.85rem',
    flexShrink: 0,
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 5rem)', minHeight: '500px' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? '280px' : '0',
          minWidth: sidebarOpen ? '280px' : '0',
          background: 'var(--bg-secondary)',
          borderRight: sidebarOpen ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          borderRadius: '12px 0 0 12px',
        }}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            文章列表
          </span>
          <button
            onClick={createArticle}
            style={{
              padding: '6px 14px',
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-dark)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            + 新增
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {articles.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              尚無文章，點擊「+ 新增」開始撰寫
            </div>
          )}
          {articles.map(a => (
            <div
              key={a.id}
              onClick={() => openArticle(a.id)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '4px',
                background: currentId === a.id ? 'rgba(109, 40, 217, 0.15)' : 'transparent',
                borderLeft: currentId === a.id ? '3px solid var(--accent-light)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (currentId !== a.id) e.currentTarget.style.background = 'var(--bg-card)';
              }}
              onMouseLeave={e => {
                if (currentId !== a.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                    }}>
                      {a.title || '未命名文章'}
                    </div>
                    {a.published && (
                      <span style={{
                        fontSize: '0.6rem',
                        padding: '1px 6px',
                        borderRadius: '999px',
                        background: 'rgba(34,197,94,0.15)',
                        color: '#22c55e',
                        flexShrink: 0,
                        fontWeight: 600,
                      }}>已發布</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {formatDate(a.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => deleteArticle(e, a.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    opacity: 0.5,
                    transition: 'all 0.15s',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  title="刪除文章"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0.5rem 1rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          borderRadius: currentId ? '0' : '0 12px 0 0',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              ...btnBase,
              width: '36px',
              height: '36px',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            title={sidebarOpen ? '收合側邊欄' : '展開側邊欄'}
          >
            {'\u2630'}
          </button>
          {currentId && (
            <>
              <input
                id="article-title-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="輸入文章標題..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-light)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              />
              <button
                onClick={togglePublish}
                style={{
                  padding: '8px 16px',
                  background: currentArticle?.published ? 'rgba(34,197,94,0.15)' : 'var(--bg-card)',
                  border: `1px solid ${currentArticle?.published ? '#22c55e' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  color: currentArticle?.published ? '#22c55e' : 'var(--accent-light)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                title={currentArticle?.published ? '取消發布' : '發布文章'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {currentArticle?.published
                    ? <><path d="M17 7l-10 10" /><path d="M7 7h10v10" /></>
                    : <><path d="M7 17l10-10" /><path d="M17 17H7V7" /></>
                  }
                </svg>
                {currentArticle?.published ? '取消發布' : '發布'}
              </button>
              <button
                onClick={exportMarkdown}
                style={{
                  padding: '8px 16px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--accent-light)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-light)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'scale(1)'; }}
                title="匯出為 Markdown 檔案"
              >
                匯出 .md
              </button>
            </>
          )}
        </div>

        {currentId ? (
          <>
            {/* Toolbar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              padding: '0.5rem 1rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              alignItems: 'center',
            }}>
              {toolbarGroups.map((group, gi) => (
                <div key={gi} style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  {group.map((btn) => (
                    <button
                      key={btn.cmd + (btn.value || '')}
                      onClick={() => execCmd(btn.cmd, btn.value)}
                      style={{ ...btnBase, ...btn.style }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent-light)';
                        e.currentTarget.style.background = 'rgba(109, 40, 217, 0.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.background = 'var(--bg-card)';
                      }}
                      title={btn.title}
                    >
                      {btn.label}
                    </button>
                  ))}
                  {gi < toolbarGroups.length - 1 && (
                    <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Editor Content Area */}
            <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={scheduleSave}
                onKeyDown={e => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    document.execCommand('insertText', false, '    ');
                  }
                }}
                style={{
                  minHeight: '100%',
                  padding: '2rem',
                  maxWidth: '800px',
                  margin: '0 auto',
                  outline: 'none',
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
                data-placeholder="開始撰寫文章內容..."
              />
            </div>
          </>
        ) : (
          /* Empty State */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            color: 'var(--text-secondary)',
          }}>
            <div style={{ fontSize: '4rem', opacity: 0.3 }}>
              &lt;/&gt;
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              選擇文章或建立新文章
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              從左側選擇一篇文章，或點擊下方按鈕新增
            </div>
            <button
              onClick={createArticle}
              style={{
                marginTop: '0.5rem',
                padding: '10px 24px',
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                border: 'none',
                borderRadius: '999px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(109, 40, 217, 0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              + 新增文章
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
