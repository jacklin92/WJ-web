interface PostCardProps {
  title: string;
  description: string;
  pubDate: string;
  slug: string;
  heroImage?: string;
  basePath?: string;
}

export default function PostCard({ title, description, pubDate, slug, heroImage, basePath = '' }: PostCardProps) {
  const formattedDate = new Date(pubDate).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <a href={`${basePath}/blog/${slug}/`} className="gradient-border" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <article className="glass-card" style={{ overflow: 'hidden', borderRadius: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          {heroImage ? (
            <img
              src={heroImage}
              alt={title}
              style={{
                width: '100%',
                height: '180px',
                objectFit: 'cover',
                borderRadius: 0,
                transition: 'transform 0.5s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '180px',
              background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-card))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              color: 'var(--accent-light)',
              opacity: 0.3,
            }}>
              &lt;/&gt;
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '60px',
              background: 'linear-gradient(transparent, var(--bg-primary))',
            }}
          />
        </div>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-light)',
                boxShadow: '0 0 8px var(--accent-light)',
                flexShrink: 0,
              }}
            />
            <time
              dateTime={pubDate}
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                letterSpacing: '0.05em',
              }}
            >
              {formattedDate}
            </time>
          </div>
          <h3
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.1rem',
              color: 'var(--text-primary)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flex: 1,
            }}
          >
            {description}
          </p>
          <div
            style={{
              marginTop: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.82rem',
              color: 'var(--accent-light)',
              fontWeight: 500,
            }}
          >
            <span>閱讀更多</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </article>
    </a>
  );
}
