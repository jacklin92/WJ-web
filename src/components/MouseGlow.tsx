import { useEffect, useRef, useState } from 'react';

export default function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const [light, setLight] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.left = `${e.clientX}px`;
        glowRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  useEffect(() => {
    const check = () => setLight(document.documentElement.getAttribute('data-bg-light') === 'true');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bg-light'] });
    window.addEventListener('wj-theme-update', check);
    return () => { obs.disconnect(); window.removeEventListener('wj-theme-update', check); };
  }, []);

  return (
    <div
      ref={glowRef}
      style={{
        position: 'fixed',
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        background: light
          ? 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(124,58,237,0.18) 40%, transparent 70%)'
          : 'radial-gradient(circle, rgba(167,139,250,0.45) 0%, rgba(109,40,217,0.25) 35%, rgba(109,40,217,0.08) 60%, transparent 75%)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1,
        transition: 'left 0.1s ease-out, top 0.1s ease-out, background 0.4s ease',
        mixBlendMode: 'screen',
      }}
    />
  );
}
