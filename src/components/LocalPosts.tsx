import { useState, useEffect } from 'react';

interface LocalArticle {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
}

export default function LocalPosts({ basePath = '' }: { basePath: string }) {
  const [articles, setArticles] = useState<LocalArticle[]>([]);

  useEffect(() => {
    try {
      const data = localStorage.getItem('wj-editor-articles');
      if (data) {
        const parsed: LocalArticle[] = JSON.parse(data);
        setArticles(parsed.filter(a => a.title.trim()));
      }
    } catch {}
  }, []);

  if (articles.length === 0) return null;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>草稿文章</h2>
        <div className="section-divider" />
        <p style={{ color: 'var(--text-secondary)' }}>編輯器中的文章草稿</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {articles.slice(0, 4).map(a => (
          <a key={a.id} href={`${basePath}/editor`} className="gradient-border" style={{ textDecoration: 'none', display: 'block' }}>
            <article className="glass-card" style={{ overflow: 'hidden', borderRadius: '16px' }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-glow)', boxShadow: '0 0 8px var(--accent-glow)' }} />
                  <time style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                    {new Date(a.updatedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </time>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(109,40,217,0.15)', color: 'var(--accent-light)', marginLeft: 'auto' }}>草稿</span>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {a.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                  {stripHtml(a.content).slice(0, 100) || '(尚無內容)'}
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--accent-light)', fontWeight: 500 }}>
                  <span>繼續編輯</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </article>
          </a>
        ))}
      </div>
    </div>
  );
}
