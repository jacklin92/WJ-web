interface PostCardProps {
  title: string;
  description: string;
  pubDate: string;
  slug: string;
  heroImage?: string;
}

export default function PostCard({ title, description, pubDate, slug, heroImage }: PostCardProps) {
  const formattedDate = new Date(pubDate).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <a
      href={`/blog/${slug}/`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <article
        style={{
          background: 'rgba(26, 26, 46, 0.8)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          backdropFilter: 'blur(10px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(109, 40, 217, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {heroImage && (
          <img
            src={heroImage}
            alt={title}
            style={{
              width: '100%',
              height: '200px',
              objectFit: 'cover',
              borderRadius: 0,
            }}
          />
        )}
        <div style={{ padding: '1.5rem' }}>
          <time
            dateTime={pubDate}
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            {formattedDate}
          </time>
          <h3
            style={{
              margin: '0.5rem 0',
              fontSize: '1.25rem',
              color: '#fff',
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        </div>
      </article>
    </a>
  );
}
