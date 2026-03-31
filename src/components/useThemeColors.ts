import { useState, useEffect } from 'react';

/**
 * 主題色資訊 — 從 CSS 變數 + localStorage 讀取，
 * 並在主題切換時自動更新（監聽 wj-theme-update / wj-geo-colors 事件）。
 */
export interface ThemeColors {
  accent: string;
  accentLight: string;
  accentDark: string;
  accentGlow: string;
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  colorA: string;
  colorB: string;
  isLight: boolean;
}

const FALLBACK: ThemeColors = {
  accent: '#6d28d9',
  accentLight: '#a78bfa',
  accentDark: '#4c1d95',
  accentGlow: '#c084fc',
  bgPrimary: '#0f0f1a',
  bgSecondary: '#1a1a2e',
  bgCard: 'rgba(26,26,46,0.6)',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  borderColor: '#2d2d44',
  colorA: '#6d28d9',
  colorB: '#c084fc',
  isLight: false,
};

function read(): ThemeColors {
  if (typeof window === 'undefined') return FALLBACK;

  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fb: string) => s.getPropertyValue(name).trim() || fb;

  let colorA = FALLBACK.colorA;
  let colorB = FALLBACK.colorB;
  try {
    const raw = localStorage.getItem('wj-geo-colors');
    if (raw) {
      const parsed = JSON.parse(raw);
      colorA = parsed.colorA || colorA;
      colorB = parsed.colorB || colorB;
    }
  } catch {}

  return {
    accent: v('--accent', FALLBACK.accent),
    accentLight: v('--accent-light', FALLBACK.accentLight),
    accentDark: v('--accent-dark', FALLBACK.accentDark),
    accentGlow: v('--accent-glow', FALLBACK.accentGlow),
    bgPrimary: v('--bg-primary', FALLBACK.bgPrimary),
    bgSecondary: v('--bg-secondary', FALLBACK.bgSecondary),
    bgCard: v('--bg-card', FALLBACK.bgCard),
    textPrimary: v('--text-primary', FALLBACK.textPrimary),
    textSecondary: v('--text-secondary', FALLBACK.textSecondary),
    borderColor: v('--border-color', FALLBACK.borderColor),
    colorA,
    colorB,
    isLight: document.documentElement.getAttribute('data-bg-light') === 'true',
  };
}

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(FALLBACK);

  useEffect(() => {
    const refresh = () => setColors(read());
    refresh();

    // 監聽 ThemeToggle 發出的事件
    window.addEventListener('wj-theme-update', refresh);
    window.addEventListener('wj-geo-colors', refresh);
    window.addEventListener('storage', refresh);

    // 監聽 DOM 屬性變更（data-theme / style / data-bg-light）
    const obs = new MutationObserver(refresh);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style', 'data-bg-light'],
    });

    return () => {
      window.removeEventListener('wj-theme-update', refresh);
      window.removeEventListener('wj-geo-colors', refresh);
      window.removeEventListener('storage', refresh);
      obs.disconnect();
    };
  }, []);

  return colors;
}
