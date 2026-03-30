import { useState, useEffect, useRef, useCallback } from 'react';

interface Article {
  id: string;
  title: string;
  content: string;
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

const toolbarGroups = [
  [
    { cmd: 'bold', label: 'B', style: { fontWeight: 700 }, title: '粗體' },
    { cmd: 'italic', label: 'I', style: { fontStyle: 'italic' }, title: '斜體' },
    { cmd: 'underline', label: 'U', style: { textDecoration: 'underline' }, title: '底線' },
    { cmd: 'strikeThrough', label: 'S', style: { textDecoration: 'line-through' }, title: '刪除線' },
  ],
  [
    { cmd: 'formatBlock', value: 'h1', label: 'H1', style: { fontSize: '0.7rem', fontWeight: 700 }, title: '標題 1' },
    { cmd: 'formatBlock', value: 'h2', label: 'H2', style: { fontSize: '0.7rem', fontWeight: 700 }, title: '標題 2' },
    { cmd: 'formatBlock', value: 'h3', label: 'H3', style: { fontSize: '0.7rem', fontWeight: 700 }, title: '標題 3' },
    { cmd: 'formatBlock', value: 'p', label: 'P', style: { fontSize: '0.7rem' }, title: '段落' },
  ],
  [
    { cmd: 'insertUnorderedList', label: '\u2022', style: { fontSize: '1.1rem' }, title: '無序清單' },
    { cmd: 'insertOrderedList', label: '1.', style: { fontSize: '0.75rem', fontWeight: 600 }, title: '有序清單' },
  ],
  [
    { cmd: 'link', label: '\uD83D\uDD17', style: {}, title: '插入連結' },
    { cmd: 'image', label: '\uD83D\uDDBC', style: {}, title: '插入圖片' },
    { cmd: 'insertHorizontalRule', label: '—', style: { fontWeight: 700 }, title: '分隔線' },
  ],
  [
    { cmd: 'formatBlock', value: 'blockquote', label: '\u201C', style: { fontSize: '1.2rem', fontWeight: 700 }, title: '引用' },
    { cmd: 'formatBlock', value: 'pre', label: '<>', style: { fontSize: '0.7rem', fontFamily: 'monospace' }, title: '程式碼區塊' },
  ],
  [
    { cmd: 'undo', label: '\u21A9', style: {}, title: '復原' },
    { cmd: 'redo', label: '\u21AA', style: {}, title: '重做' },
    { cmd: 'removeFormat', label: 'T\u0338', style: { fontSize: '0.8rem' }, title: '清除格式' },
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
    setArticles(loadArticles());
  }, []);

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
    if (!confirm('確定要刪除這篇文章嗎？')) return;
    const updated = articles.filter(a => a.id !== id);
    setArticles(updated);
    saveToStorage(updated);
    if (currentId === id) {
      setCurrentId(null);
      setTitle('');
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  };

  const execCmd = (cmd: string, value?: string) => {
    if (cmd === 'link') {
      const url = prompt('輸入連結 URL:');
      if (url) document.execCommand('createLink', false, url);
    } else if (cmd === 'image') {
      const url = prompt('輸入圖片 URL:');
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
    const frontmatter = `---\ntitle: '${title || '未命名'}'\ndescription: ''\npubDate: '${new Date().toISOString().split('T')[0]}'\n---\n\n`;
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
              color: '#fff',
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
                  <div style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {a.title || '未命名文章'}
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
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    opacity: 0.5,
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  title="刪除文章"
                >
                  \u2715
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
            {sidebarOpen ? '\u2630' : '\u2630'}
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
                color: '#fff',
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
