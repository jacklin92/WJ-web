import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThemeColors, type ThemeColors } from './useThemeColors';

/* ================================================================
   類型定義
   ================================================================ */

export interface DemoProject {
  id: string;
  title: string;
  description: string;
  /** 渲染模式：webgl 使用 Three.js Canvas，canvas2d 使用原生 2D Canvas */
  renderer: 'webgl' | 'canvas2d';
  /** 自訂渲染函式（canvas2d 模式），回傳 cleanup 函式 */
  renderCanvas2D?: (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    colors: ThemeColors,
  ) => (() => void) | void;
  /** 自訂 Three.js 場景子元件（webgl 模式），未提供時顯示佔位動畫 */
  SceneContent?: React.FC<{ colors: ThemeColors }>;
}

/* ================================================================
   佔位 WebGL 場景 — 呼吸光球 + 雙環
   ================================================================ */

function PlaceholderScene({ colors }: { colors: ThemeColors }) {
  const groupRef = useRef<THREE.Group>(null!);
  const sphereRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) groupRef.current.rotation.y = t * 0.3;
    if (sphereRef.current) {
      const s = 1 + Math.sin(t * 2) * 0.15;
      sphereRef.current.scale.setScalar(s);
      const mat = sphereRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={colors.isLight ? 0.5 : 0.3} />
      <pointLight position={[3, 3, 3]} intensity={0.8} color={colors.colorB} />

      <mesh ref={sphereRef}>
        <icosahedronGeometry args={[0.8, 2]} />
        <meshStandardMaterial
          color={colors.colorA}
          emissive={colors.colorA}
          emissiveIntensity={0.3}
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.02, 16, 64]} />
        <meshBasicMaterial color={colors.colorB} transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[1.8, 0.015, 16, 64]} />
        <meshBasicMaterial color={colors.colorB} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

/* ================================================================
   Canvas 2D 渲染器
   ================================================================ */

function Canvas2DRenderer({ project, colors }: { project: DemoProject; colors: ThemeColors }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let cleanup: (() => void) | void;
    if (project.renderCanvas2D) {
      cleanup = project.renderCanvas2D(ctx, canvas, colors);
    } else {
      let animId: number;
      const animate = () => {
        const t = performance.now() * 0.001;
        const w = canvas.width / window.devicePixelRatio;
        const h = canvas.height / window.devicePixelRatio;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < 5; i++) {
          const radius = 30 + i * 40 + Math.sin(t + i) * 15;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
          ctx.strokeStyle = colors.colorB;
          ctx.globalAlpha = 0.3 - i * 0.05;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.textSecondary;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Canvas 2D Demo Slot', w / 2, h / 2);
        animId = requestAnimationFrame(animate);
      };
      animate();
      cleanup = () => cancelAnimationFrame(animId);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (typeof cleanup === 'function') cleanup();
    };
  }, [project, colors]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ================================================================
   Demo 卡片
   ================================================================ */

function DemoCard({ project, isSelected, onSelect }: {
  project: DemoProject;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'block',
        width: '100%',
        padding: '1rem 1.2rem',
        textAlign: 'left',
        background: isSelected ? 'var(--bg-card)' : 'transparent',
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        fontFamily: 'inherit',
      }}
    >
      <h4 style={{
        margin: 0,
        fontSize: '0.95rem',
        fontWeight: 600,
        color: isSelected ? 'var(--accent-light)' : 'var(--text-primary)',
      }}>
        {project.title}
      </h4>
      <p style={{
        margin: '0.3rem 0 0',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.4,
      }}>
        {project.description}
      </p>
    </button>
  );
}

/* ================================================================
   預設 Demo 專案列表
   ================================================================ */

const defaultProjects: DemoProject[] = [
  {
    id: 'placeholder-webgl',
    title: 'WebGL 3D Demo',
    description: '預留 WebGL 渲染插槽，可嵌入 Three.js 即時場景',
    renderer: 'webgl',
  },
  {
    id: 'placeholder-canvas',
    title: 'Canvas 2D Demo',
    description: '預留 Canvas 2D 渲染插槽，適用於 MediaPipe 等 AI 視覺化',
    renderer: 'canvas2d',
  },
];

/* ================================================================
   主元件
   ================================================================ */

export default function LiveDemoShowcase({ projects = defaultProjects }: { projects?: DemoProject[] }) {
  const colors = useThemeColors();
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? '');
  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];

  return (
    <section style={{ width: '100%', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)' }}>
      {/* 標題 */}
      <div style={{ textAlign: 'center', padding: '3rem 1rem 1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Live Demo
        </h2>
        <div style={{ width: 60, height: 3, background: 'linear-gradient(90deg, var(--accent), var(--accent-glow))', borderRadius: 2, margin: '0 auto 0.75rem' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          即時互動展示區 — 可嵌入 AI 視覺化專案
        </p>
      </div>

      {/* 內容 */}
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '0 1rem 3rem',
        display: 'flex',
        gap: '1.5rem',
        flexWrap: 'wrap',
      }}>
        {/* 左側選單 */}
        <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {projects.map((p) => (
            <DemoCard key={p.id} project={p} isSelected={p.id === selectedId} onSelect={() => setSelectedId(p.id)} />
          ))}
          <div style={{
            marginTop: '0.5rem',
            padding: '0.8rem 1rem',
            background: 'var(--bg-card)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(8px)',
          }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              此區塊支援 WebGL 與 Canvas 2D 兩種渲染模式。可傳入自訂 SceneContent 元件或 renderCanvas2D 函式來替換預設內容。
            </p>
          </div>
        </div>

        {/* 右側渲染視窗 */}
        <div style={{
          flex: 1,
          minWidth: '320px',
          height: '450px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          position: 'relative',
        }}>
          {/* 頂部 bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-color)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: `0 0 6px var(--accent-glow)`,
            }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {selected?.title ?? 'Demo'} — {selected?.renderer.toUpperCase()}
            </span>
          </div>

          {/* 渲染區 */}
          <div style={{ width: '100%', height: 'calc(100% - 33px)' }}>
            {selected?.renderer === 'webgl' ? (
              <Canvas camera={{ position: [0, 0, 4], fov: 50 }} style={{ background: 'transparent' }}>
                {selected.SceneContent ? (
                  <selected.SceneContent colors={colors} />
                ) : (
                  <PlaceholderScene colors={colors} />
                )}
              </Canvas>
            ) : (
              <Canvas2DRenderer project={selected} colors={colors} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
