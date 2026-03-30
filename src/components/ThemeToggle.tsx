import { useState, useEffect, useRef } from 'react';

type ThemeMode = 'night' | 'day' | 'custom';

interface CustomSettings {
  accentColor: string;
  baseMode: 'light' | 'dark';
}

const DEFAULT_CUSTOM: CustomSettings = { accentColor: '#6d28d9', baseMode: 'dark' };

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function applyCustomTheme(settings: CustomSettings) {
  const root = document.documentElement;
  const { h, s } = hexToHSL(settings.accentColor);
  const isLight = settings.baseMode === 'light';

  root.style.setProperty('--accent', settings.accentColor);
  root.style.setProperty('--accent-light', hslToHex(h, Math.min(s + 15, 100), 65));
  root.style.setProperty('--accent-dark', hslToHex(h, s, 30));
  root.style.setProperty('--accent-glow', hslToHex(h, Math.min(s + 20, 100), 75));

  if (isLight) {
    root.style.setProperty('--bg-primary', '#f5f5f7');
    root.style.setProperty('--bg-secondary', '#ffffff');
    root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.8)');
    root.style.setProperty('--text-primary', '#1a1a2e');
    root.style.setProperty('--text-secondary', '#64748b');
    root.style.setProperty('--border-color', '#e2e8f0');
  } else {
    root.style.setProperty('--bg-primary', '#0f0f1a');
    root.style.setProperty('--bg-secondary', '#1a1a2e');
    root.style.setProperty('--bg-card', 'rgba(26, 26, 46, 0.6)');
    root.style.setProperty('--text-primary', '#e2e8f0');
    root.style.setProperty('--text-secondary', '#94a3b8');
    root.style.setProperty('--border-color', '#2d2d44');
  }
}

function clearCustomProperties() {
  const root = document.documentElement;
  const props = ['--accent', '--accent-light', '--accent-dark', '--accent-glow',
    '--bg-primary', '--bg-secondary', '--bg-card', '--text-primary', '--text-secondary', '--border-color'];
  props.forEach(p => root.style.removeProperty(p));
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('night');
  const [customSettings, setCustomSettings] = useState<CustomSettings>(DEFAULT_CUSTOM);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('wj-theme') as ThemeMode | null;
    const savedCustom = localStorage.getItem('wj-theme-custom');
    if (saved) setTheme(saved);
    if (savedCustom) {
      try { setCustomSettings(JSON.parse(savedCustom)); } catch {}
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wj-theme', theme);
    if (theme === 'custom') {
      applyCustomTheme(customSettings);
    } else {
      clearCustomProperties();
    }
  }, [theme, customSettings]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPanel]);

  const cycleTheme = () => {
    const order: ThemeMode[] = ['night', 'day', 'custom'];
    const next = order[(order.indexOf(theme) + 1) % 3];
    setTheme(next);
    if (next === 'custom') setShowPanel(true);
    else setShowPanel(false);
  };

  const updateCustom = (key: keyof CustomSettings, value: string) => {
    const updated = { ...customSettings, [key]: value };
    setCustomSettings(updated);
    localStorage.setItem('wj-theme-custom', JSON.stringify(updated));
  };

  const icons: Record<ThemeMode, JSX.Element> = {
    night: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    day: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    custom: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" /><circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="12.5" r="2.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
  };

  const labels: Record<ThemeMode, string> = { night: '夜間模式', day: '日間模式', custom: '自訂模式' };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={cycleTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--accent-light)';
          e.currentTarget.style.borderColor = 'var(--accent-light)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title={labels[theme]}
      >
        {icons[theme]}
      </button>

      {/* Custom Settings Panel */}
      {showPanel && theme === 'custom' && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            minWidth: '200px',
            zIndex: 100,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            自訂主題
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              主色調
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={customSettings.accentColor}
                onChange={e => updateCustom('accentColor', e.target.value)}
                style={{
                  width: '36px',
                  height: '36px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  padding: 0,
                  background: 'none',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                {customSettings.accentColor}
              </span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              底色
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['dark', 'light'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => updateCustom('baseMode', mode)}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: customSettings.baseMode === mode
                      ? '2px solid var(--accent-light)'
                      : '1px solid var(--border-color)',
                    background: customSettings.baseMode === mode ? 'rgba(109, 40, 217, 0.15)' : 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  {mode === 'dark' ? '深色' : '淺色'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
