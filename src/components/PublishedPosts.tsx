import { useState, useEffect } from 'react';

interface LocalArticle {
  id: string;
  title: string;
  content: string;
  published?: boolean;
  createdAt: string;
  updatedAt: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
}

export default function PublishedPosts({ basePath = '' }: { basePath: string }) {
  const [articles, setArticles] = useState<LocalArticle[]>([]);

  useEffect(() => {
    try {
      const data = localStorage.getItem('wj-editor-articles');
      if (data) {
        const parsed: LocalArticle[] = JSON.parse(data);
        setArticles(parsed.filter(a => a.published && a.title.trim()));
      }
    } catch {}
  }, []);

  if (articles.length === 0) return null;

  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Local</div>
        <div className="section-divider" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {articles.map(a => (
          <a key={a.id} href={`${basePath}/editor?id=${a.id}`} className="gradient-border" style={{ textDecoration: 'none', display: 'block' }}>
            <article className="glass-card" style={{ overflow: 'hidden', borderRadius: '16px' }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', boxShadow: '0 0 8px var(--accent-light)' }} />
                  <time style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                    {new Date(a.updatedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </time>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {a.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                  {stripHtml(a.content).slice(0, 120) || '(尚無內容)'}
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--accent-light)', fontWeight: 500 }}>
                  <span>閱讀更多</span>
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
