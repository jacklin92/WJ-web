import { useEffect, useRef } from 'react';

export default function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.left = `${e.clientX}px`;
        glowRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={glowRef}
      style={{
        position: 'fixed',
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(167, 139, 250, 0.45) 0%, rgba(109, 40, 217, 0.25) 35%, rgba(109, 40, 217, 0.08) 60%, transparent 75%)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1,
        transition: 'left 0.1s ease-out, top 0.1s ease-out',
        mixBlendMode: 'screen',
      }}
    />
  );
}
