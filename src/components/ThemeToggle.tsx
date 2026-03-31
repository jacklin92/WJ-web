import { useState, useEffect, useRef } from 'react';

type ThemeMode = 'night' | 'day' | 'custom';
interface CustomSettings { accentColor: string; bgColor: string }
interface GeoColors { colorA: string; colorB: string }

const DEFAULT_CUSTOM: CustomSettings = { accentColor: '#6d28d9', bgColor: '#0f0f1a' };
const DEFAULT_GEO: GeoColors = { colorA: '#6d28d9', colorB: '#c084fc' };

function hexToHSL(hex: string) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toH = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toH(f(0))}${toH(f(8))}${toH(f(4))}`;
}

function isLightHex(hex: string): boolean {
  if (!hex || hex[0] !== '#' || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.45;
}

function lighten(hex: string, amount: number): string {
  const { h, s, l } = hexToHSL(hex);
  return hslToHex(h, s, Math.min(100, l + amount));
}

const ALL_VARS = [
  '--accent', '--accent-light', '--accent-dark', '--accent-glow',
  '--bg-primary', '--bg-secondary', '--bg-card',
  '--text-primary', '--text-secondary', '--border-color',
];

function applyBgOverrides(root: HTMLElement, bgColor: string) {
  root.style.setProperty('--bg-primary', bgColor);
  if (isLightHex(bgColor)) {
    root.style.setProperty('--bg-secondary', '#ffffff');
    root.style.setProperty('--bg-card', 'rgba(255,255,255,0.8)');
    root.style.setProperty('--text-primary', '#1a1a2e');
    root.style.setProperty('--text-secondary', '#64748b');
    root.style.setProperty('--border-color', '#e2e8f0');
  } else {
    root.style.setProperty('--bg-secondary', lighten(bgColor, 8));
    root.style.setProperty('--bg-card', lighten(bgColor, 8));
    root.style.setProperty('--text-primary', '#e2e8f0');
    root.style.setProperty('--text-secondary', '#94a3b8');
    root.style.setProperty('--border-color', lighten(bgColor, 18));
  }
}

function applyMode(mode: ThemeMode, custom: CustomSettings, bgOverride: string | null) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  ALL_VARS.forEach(p => root.style.removeProperty(p));

  if (mode === 'custom') {
    const { h, s } = hexToHSL(custom.accentColor);
    root.style.setProperty('--accent', custom.accentColor);
    root.style.setProperty('--accent-light', hslToHex(h, Math.min(s + 15, 100), 65));
    root.style.setProperty('--accent-dark', hslToHex(h, s, 30));
    root.style.setProperty('--accent-glow', hslToHex(h, Math.min(s + 20, 100), 75));
    applyBgOverrides(root, custom.bgColor);
  } else if (bgOverride) {
    applyBgOverrides(root, bgOverride);
  }

  let light: boolean;
  if (mode === 'custom') light = isLightHex(custom.bgColor);
  else if (bgOverride) light = isLightHex(bgOverride);
  else light = mode === 'day';
  root.setAttribute('data-bg-light', light ? 'true' : 'false');
  window.dispatchEvent(new Event('wj-theme-update'));
}

export default function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>('night');
  const [custom, setCustom] = useState<CustomSettings>(DEFAULT_CUSTOM);
  const [geo, setGeo] = useState<GeoColors>(DEFAULT_GEO);
  const [bgOverride, setBgOverride] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const m = localStorage.getItem('wj-theme') as ThemeMode | null;
    if (m) setMode(m);
    try { const c = JSON.parse(localStorage.getItem('wj-theme-custom') || ''); setCustom(c); } catch {}
    try { const g = JSON.parse(localStorage.getItem('wj-geo-colors') || ''); setGeo(g); } catch {}
    const bo = localStorage.getItem('wj-bg-override');
    if (bo) setBgOverride(bo);
  }, []);

  useEffect(() => {
    applyMode(mode, custom, bgOverride);
    localStorage.setItem('wj-theme', mode);
    localStorage.setItem('wj-theme-custom', JSON.stringify(custom));
    if (bgOverride) localStorage.setItem('wj-bg-override', bgOverride);
    else localStorage.removeItem('wj-bg-override');
  }, [mode, custom, bgOverride]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const updateCustom = (key: keyof CustomSettings, val: string) => {
    setCustom(prev => ({ ...prev, [key]: val }));
  };

  const updateGeo = (key: keyof GeoColors, val: string) => {
    const next = { ...geo, [key]: val };
    setGeo(next);
    localStorage.setItem('wj-geo-colors', JSON.stringify(next));
    window.dispatchEvent(new Event('wj-geo-colors'));
  };

  const resetAll = () => {
    setMode('night');
    setCustom(DEFAULT_CUSTOM);
    setGeo(DEFAULT_GEO);
    setBgOverride(null);
    localStorage.removeItem('wj-theme');
    localStorage.removeItem('wj-theme-custom');
    localStorage.removeItem('wj-geo-colors');
    localStorage.removeItem('wj-bg-override');
    ALL_VARS.forEach(p => document.documentElement.style.removeProperty(p));
    document.documentElement.setAttribute('data-theme', 'night');
    document.documentElement.setAttribute('data-bg-light', 'false');
    window.dispatchEvent(new Event('wj-theme-update'));
    window.dispatchEvent(new Event('wj-geo-colors'));
  };

  const modeIcons: Record<ThemeMode, string> = { night: '\u263E', day: '\u2600', custom: '\u2726' };

  const swatch = (color: string, onChange: (v: string) => void, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input type="color" value={color} onChange={e => onChange(e.target.value)}
          style={{ width: '28px', height: '28px', border: '2px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', padding: 0, background: 'none' }} />
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'monospace', width: '58px' }}>{color}</span>
      </div>
    </div>
  );

  const defaultBg = mode === 'night' ? '#0f0f1a' : '#f5f5f7';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px', borderRadius: '50%',
          border: '1px solid var(--border-color)', background: 'var(--bg-card)',
          color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
          fontSize: '1.1rem', backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent-light)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        title="主題設定"
      >
        {modeIcons[mode]}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          width: '240px', zIndex: 200, backdropFilter: 'blur(16px)', overflow: 'hidden',
        }}>
          {/* Mode Selection */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>主題模式</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['night', 'day', 'custom'] as ThemeMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    border: mode === m ? '2px solid var(--accent-light)' : '1px solid var(--border-color)',
                    background: mode === m ? 'rgba(109,40,217,0.15)' : 'var(--bg-card)',
                    color: 'var(--text-primary)',
                  }}>
                  {modeIcons[m]} {{ night: '夜間', day: '日間', custom: '自訂' }[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors (only in custom mode) */}
          {mode === 'custom' && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>自訂色彩</div>
              {swatch(custom.accentColor, v => updateCustom('accentColor', v), '主色調')}
              {swatch(custom.bgColor, v => updateCustom('bgColor', v), '底色')}
            </div>
          )}

          {/* Background Override (night/day modes) */}
          {mode !== 'custom' && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>底色調整</div>
              {swatch(bgOverride || defaultBg, v => setBgOverride(v), '背景色')}
            </div>
          )}

          {/* Geometry Gradient */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>圖形漸層</div>
            {swatch(geo.colorA, v => updateGeo('colorA', v), '色彩 A')}
            {swatch(geo.colorB, v => updateGeo('colorB', v), '色彩 B')}
            <div style={{
              height: '12px', borderRadius: '6px', marginTop: '2px',
              background: `linear-gradient(90deg, ${geo.colorA}, ${geo.colorB})`,
              border: '1px solid var(--border-color)',
            }} />
          </div>

          {/* Reset */}
          <div style={{ padding: '10px 12px' }}>
            <button onClick={resetAll}
              style={{
                width: '100%', padding: '7px 0', borderRadius: '8px',
                border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem',
                fontWeight: 600, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              還原預設
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
