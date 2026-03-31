import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColors, type ThemeColors } from './useThemeColors';

/* ================================================================
   類型定義
   ================================================================ */

export interface DemoProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  renderer: 'webgl' | 'canvas2d';
  renderCanvas2D?: (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    colors: ThemeColors,
  ) => (() => void) | void;
  SceneContent?: React.FC<{ colors: ThemeColors }>;
}

/* ================================================================
   WebGL Demo: DNA 雙螺旋粒子
   ================================================================ */

function DNAHelixScene({ colors }: { colors: ThemeColors }) {
  const groupRef = useRef<THREE.Group>(null!);
  const pointsRef = useRef<THREE.Points>(null!);
  const linesRef = useRef<THREE.LineSegments>(null!);

  const { positions, linePositions, particleColors } = useMemo(() => {
    const count = 120;
    const pos = new Float32Array(count * 2 * 3);
    const cols = new Float32Array(count * 2 * 3);
    const lines: number[] = [];
    const cA = new THREE.Color(colors.colorA);
    const cB = new THREE.Color(colors.colorB);

    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 6;
      const y = (i / count) * 8 - 4;
      const r = 1.2;

      const x1 = Math.cos(t) * r;
      const z1 = Math.sin(t) * r;
      const x2 = Math.cos(t + Math.PI) * r;
      const z2 = Math.sin(t + Math.PI) * r;

      pos[i * 6] = x1; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z1;
      pos[i * 6 + 3] = x2; pos[i * 6 + 4] = y; pos[i * 6 + 5] = z2;

      const blend = i / count;
      const c1 = cA.clone().lerp(cB, blend);
      const c2 = cB.clone().lerp(cA, blend);
      cols[i * 6] = c1.r; cols[i * 6 + 1] = c1.g; cols[i * 6 + 2] = c1.b;
      cols[i * 6 + 3] = c2.r; cols[i * 6 + 4] = c2.g; cols[i * 6 + 5] = c2.b;

      if (i % 6 === 0) {
        lines.push(x1, y, z1, x2, y, z2);
      }
    }
    return {
      positions: pos,
      linePositions: new Float32Array(lines),
      particleColors: cols,
    };
  }, [colors.colorA, colors.colorB]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={colors.isLight ? 0.5 : 0.2} />
      <pointLight position={[3, 4, 3]} intensity={1} color={colors.colorB} distance={15} />
      <pointLight position={[-3, -2, 2]} intensity={0.5} color={colors.colorA} distance={12} />

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[particleColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={colors.isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={colors.colorB} transparent opacity={0.2} />
      </lineSegments>
    </group>
  );
}

/* ================================================================
   WebGL Demo: 波形地形
   ================================================================ */

const terrainVert = `
uniform float uTime;
uniform float uAmplitude;
varying float vHeight;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float wave1 = sin(pos.x * 1.5 + uTime * 0.8) * cos(pos.z * 1.2 + uTime * 0.6);
  float wave2 = sin(pos.x * 3.0 + uTime * 1.2) * 0.3;
  float wave3 = cos(pos.z * 2.5 + uTime * 0.5) * 0.4;
  pos.y = (wave1 + wave2 + wave3) * uAmplitude;
  vHeight = pos.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const terrainFrag = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
varying float vHeight;
varying vec2 vUv;

void main() {
  float t = clamp((vHeight + 0.8) / 1.6, 0.0, 1.0);
  vec3 col = mix(uColorA, uColorB, t);
  col += 0.08;
  float edge = smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  gl_FragColor = vec4(col, uOpacity * edge);
}`;

function TerrainScene({ colors }: { colors: ThemeColors }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmplitude: { value: 0.6 },
      uColorA: { value: new THREE.Color(colors.colorA) },
      uColorB: { value: new THREE.Color(colors.colorB) },
      uOpacity: { value: 0.7 },
    },
    vertexShader: terrainVert,
    fragmentShader: terrainFrag,
    wireframe: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  useEffect(() => {
    material.uniforms.uColorA.value.set(colors.colorA);
    material.uniforms.uColorB.value.set(colors.colorB);
  }, [colors.colorA, colors.colorB, material]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group rotation={[-Math.PI / 3.5, 0, Math.PI / 8]}>
      <ambientLight intensity={colors.isLight ? 0.4 : 0.15} />
      <pointLight position={[0, 5, 3]} intensity={0.8} color={colors.colorB} distance={20} />

      <mesh material={material} position={[0, 0, 0]}>
        <planeGeometry args={[8, 8, 80, 80]} />
      </mesh>
    </group>
  );
}

/* ================================================================
   WebGL Demo: 粒子星系
   ================================================================ */

function GalaxyScene({ colors }: { colors: ThemeColors }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 3000;

  const { positions, particleColors, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const cA = new THREE.Color(colors.colorA);
    const cB = new THREE.Color(colors.colorB);
    const cCore = new THREE.Color(colors.accentGlow);

    for (let i = 0; i < count; i++) {
      const radius = Math.random() * 4;
      const branch = (i % 3) * ((Math.PI * 2) / 3);
      const spin = radius * 1.2;
      const scatter = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.6;

      pos[i * 3] = Math.cos(branch + spin) * radius + scatter;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.4 * Math.max(0, 1 - radius * 0.2);
      pos[i * 3 + 2] = Math.sin(branch + spin) * radius + scatter;

      const t = radius / 4;
      const c = t < 0.3
        ? cCore.clone().lerp(cA, t / 0.3)
        : cA.clone().lerp(cB, (t - 0.3) / 0.7);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;

      sz[i] = Math.random() * 0.06 + 0.01;
    }
    return { positions: pos, particleColors: cols, sizes: sz };
  }, [colors.colorA, colors.colorB, colors.accentGlow]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.08;
    }
  });

  return (
    <group rotation={[-0.6, 0, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[particleColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          vertexColors
          transparent
          opacity={colors.isLight ? 0.7 : 0.9}
          sizeAttenuation
          blending={colors.isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/* ================================================================
   Canvas 2D Demo: 神經網路視覺化
   ================================================================ */

interface Neuron { x: number; y: number; layer: number; }
interface Connection { from: number; to: number; weight: number; }

function neuralNetworkRenderer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  colors: ThemeColors,
): () => void {
  const layers = [4, 6, 8, 6, 3];
  const neurons: Neuron[] = [];
  const connections: Connection[] = [];
  let w = 0, h = 0;

  function buildNetwork() {
    w = canvas.width / window.devicePixelRatio;
    h = canvas.height / window.devicePixelRatio;
    neurons.length = 0;
    connections.length = 0;

    const marginX = w * 0.12;
    const usableW = w - marginX * 2;
    const gapX = usableW / (layers.length - 1);

    layers.forEach((count, li) => {
      const gapY = h / (count + 1);
      for (let ni = 0; ni < count; ni++) {
        neurons.push({ x: marginX + li * gapX, y: gapY * (ni + 1), layer: li });
      }
    });

    let idx = 0;
    for (let li = 0; li < layers.length - 1; li++) {
      const startIdx = idx;
      const nextIdx = startIdx + layers[li];
      for (let a = startIdx; a < nextIdx; a++) {
        for (let b = nextIdx; b < nextIdx + layers[li + 1]; b++) {
          connections.push({ from: a, to: b, weight: Math.random() });
        }
      }
      idx = nextIdx;
    }
  }
  buildNetwork();

  const pulses: { connIdx: number; progress: number; speed: number }[] = [];

  let animId: number;
  function animate() {
    const t = performance.now() * 0.001;
    w = canvas.width / window.devicePixelRatio;
    h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    // 連線
    connections.forEach((conn, ci) => {
      const from = neurons[conn.from];
      const to = neurons[conn.to];
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = colors.colorB;
      ctx.globalAlpha = 0.06 + conn.weight * 0.06;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // 脈衝
    if (Math.random() < 0.08) {
      pulses.push({
        connIdx: Math.floor(Math.random() * connections.length),
        progress: 0,
        speed: 0.01 + Math.random() * 0.02,
      });
    }

    ctx.globalAlpha = 1;
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.progress += p.speed;
      if (p.progress > 1) { pulses.splice(i, 1); continue; }

      const conn = connections[p.connIdx];
      const from = neurons[conn.from];
      const to = neurons[conn.to];
      const px = from.x + (to.x - from.x) * p.progress;
      const py = from.y + (to.y - from.y) * p.progress;

      const grad = ctx.createRadialGradient(px, py, 0, px, py, 8);
      grad.addColorStop(0, colors.colorB);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(px - 8, py - 8, 16, 16);
    }

    // 神經元
    ctx.globalAlpha = 1;
    neurons.forEach((n, ni) => {
      const pulse = Math.sin(t * 2 + ni * 0.5) * 0.15 + 0.85;
      const r = 4 * pulse;

      // 光暈
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
      grad.addColorStop(0, colors.colorA);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(n.x - r * 4, n.y - r * 4, r * 8, r * 8);

      // 核心
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.layer === 0 || n.layer === layers.length - 1
        ? colors.colorB : colors.colorA;
      ctx.fill();

      // 邊框
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = colors.colorB;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(animate);
  }
  animate();

  return () => cancelAnimationFrame(animId);
}

/* ================================================================
   Canvas 2D Demo: 音頻波形視覺化
   ================================================================ */

function audioVisualizerRenderer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  colors: ThemeColors,
): () => void {
  const barCount = 48;

  let animId: number;
  function animate() {
    const t = performance.now() * 0.001;
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const barW = w / (barCount * 1.8);
    const gap = barW * 0.8;
    const totalW = barCount * (barW + gap) - gap;
    const startX = (w - totalW) / 2;
    const centerY = h / 2;

    for (let i = 0; i < barCount; i++) {
      const freq1 = Math.sin(t * 2.5 + i * 0.2) * 0.4;
      const freq2 = Math.sin(t * 1.8 + i * 0.35) * 0.3;
      const freq3 = Math.cos(t * 3.2 + i * 0.15) * 0.2;
      const amplitude = Math.abs(freq1 + freq2 + freq3);
      const barH = amplitude * h * 0.4 + 4;

      const x = startX + i * (barW + gap);
      const blend = i / barCount;

      // 上半部
      const gradUp = ctx.createLinearGradient(x, centerY, x, centerY - barH);
      gradUp.addColorStop(0, colors.colorA);
      gradUp.addColorStop(1, colors.colorB);
      ctx.fillStyle = gradUp;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.roundRect(x, centerY - barH, barW, barH, 2);
      ctx.fill();

      // 下半部（鏡像）
      const gradDown = ctx.createLinearGradient(x, centerY, x, centerY + barH);
      gradDown.addColorStop(0, colors.colorA);
      gradDown.addColorStop(1, colors.colorB);
      ctx.fillStyle = gradDown;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.roundRect(x, centerY, barW, barH * 0.6, 2);
      ctx.fill();

      // 頂部光點
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = colors.colorB;
      ctx.beginPath();
      ctx.roundRect(x, centerY - barH - 4, barW, 3, 1);
      ctx.fill();
    }

    // 中線
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = colors.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX - 10, centerY);
    ctx.lineTo(startX + totalW + 10, centerY);
    ctx.stroke();

    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(animate);
  }
  animate();

  return () => cancelAnimationFrame(animId);
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
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '0.85rem 1rem',
        textAlign: 'left',
        background: isSelected
          ? 'var(--bg-card)'
          : hovered ? 'var(--bg-card)' : 'transparent',
        border: `1px solid ${isSelected ? 'var(--accent)' : hovered ? 'var(--accent-dark)' : 'var(--border-color)'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        fontFamily: 'inherit',
        backdropFilter: 'blur(4px)',
        boxShadow: isSelected ? '0 0 16px rgba(109,40,217,0.12)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isSelected ? 'var(--accent-light)' : 'var(--border-color)',
          boxShadow: isSelected ? '0 0 8px var(--accent-glow)' : 'none',
          transition: 'all 0.3s',
        }} />
        <h4 style={{
          margin: 0,
          fontSize: '0.85rem',
          fontWeight: 600,
          color: isSelected ? 'var(--accent-light)' : 'var(--text-primary)',
        }}>
          {project.title}
        </h4>
      </div>
      <p style={{
        margin: '0 0 0.4rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.4,
        paddingLeft: '14px',
      }}>
        {project.description}
      </p>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingLeft: '14px' }}>
        {project.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: '0.6rem',
              padding: '1px 6px',
              borderRadius: '4px',
              background: isSelected ? 'var(--accent)' : 'var(--bg-secondary)',
              color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)',
              fontWeight: 500,
              letterSpacing: '0.02em',
              transition: 'all 0.25s',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

/* ================================================================
   預設 Demo 專案
   ================================================================ */

const defaultProjects: DemoProject[] = [
  {
    id: 'dna-helix',
    title: 'DNA 雙螺旋粒子',
    description: '程式化生成的 3D 雙股螺旋結構，粒子色彩隨主題漸變',
    tags: ['Three.js', 'Particles', 'WebGL'],
    renderer: 'webgl',
    SceneContent: DNAHelixScene,
  },
  {
    id: 'terrain-wave',
    title: '波形地形生成',
    description: '自訂 Shader 驅動的即時波動地形網格',
    tags: ['Shader', 'GLSL', 'Wireframe'],
    renderer: 'webgl',
    SceneContent: TerrainScene,
  },
  {
    id: 'galaxy',
    title: '粒子星系模擬',
    description: '三臂螺旋星系結構，3000 顆粒子即時旋轉',
    tags: ['Particles', 'Procedural', '3D'],
    renderer: 'webgl',
    SceneContent: GalaxyScene,
  },
  {
    id: 'neural-network',
    title: '神經網路視覺化',
    description: '動態神經元脈衝傳導動畫，模擬前饋網路運算過程',
    tags: ['Canvas 2D', 'AI', 'Animation'],
    renderer: 'canvas2d',
    renderCanvas2D: neuralNetworkRenderer,
  },
  {
    id: 'audio-visualizer',
    title: '音頻波形分析',
    description: '模擬頻譜柱狀圖搭配鏡像反射效果',
    tags: ['Canvas 2D', 'Audio', 'Spectrum'],
    renderer: 'canvas2d',
    renderCanvas2D: audioVisualizerRenderer,
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
    <section style={{ width: '100%', padding: '3rem 1rem 2.5rem' }}>
      {/* 標題 */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Live Demo
        </h2>
        <div style={{ width: 60, height: 3, background: 'linear-gradient(90deg, var(--accent), var(--accent-glow))', borderRadius: 2, margin: '0 auto 0.75rem' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
          即時互動展示區 — WebGL 與 Canvas 2D 視覺化範例
        </p>
      </div>

      {/* 內容區 */}
      <div style={{
        maxWidth: '960px',
        margin: '0 auto',
        display: 'flex',
        gap: '1.25rem',
        flexWrap: 'wrap',
      }}>
        {/* 左側選單 */}
        <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {projects.map((p) => (
            <DemoCard key={p.id} project={p} isSelected={p.id === selectedId} onSelect={() => setSelectedId(p.id)} />
          ))}
        </div>

        {/* 右側渲染視窗 */}
        <div style={{
          flex: 1,
          minWidth: '300px',
          borderRadius: '16px',
          padding: '1px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-glow), var(--accent-dark), var(--accent-glow), var(--accent))',
          backgroundSize: '300% 300%',
          animation: 'gradientShift 6s ease infinite',
        }}>
          <div style={{
            borderRadius: '15px',
            overflow: 'hidden',
            background: 'var(--bg-secondary)',
            height: '420px',
            position: 'relative',
          }}>
            {/* 頂部 bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.45rem 1rem',
              background: 'var(--bg-card)',
              borderBottom: '1px solid var(--border-color)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* 視窗控制點 */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
                    <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginLeft: '0.5rem' }}>
                  {selected?.title}
                </span>
              </div>
              <span style={{
                fontSize: '0.55rem',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                fontFamily: 'monospace',
                letterSpacing: '0.04em',
              }}>
                {selected?.renderer.toUpperCase()}
              </span>
            </div>

            {/* 四角裝飾 */}
            {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => {
              const isTop = corner.includes('top');
              const isLeft = corner.includes('left');
              return (
                <div
                  key={corner}
                  style={{
                    position: 'absolute',
                    [isTop ? 'top' : 'bottom']: '38px',
                    [isLeft ? 'left' : 'right']: '8px',
                    width: '16px',
                    height: '16px',
                    zIndex: 4,
                    pointerEvents: 'none',
                    borderTop: isTop ? '1.5px solid var(--accent-light)' : 'none',
                    borderBottom: !isTop ? '1.5px solid var(--accent-light)' : 'none',
                    borderLeft: isLeft ? '1.5px solid var(--accent-light)' : 'none',
                    borderRight: !isLeft ? '1.5px solid var(--accent-light)' : 'none',
                    opacity: 0.35,
                  }}
                />
              );
            })}

            {/* 渲染區 */}
            <div style={{ width: '100%', height: 'calc(100% - 33px)' }}>
              {selected?.renderer === 'webgl' ? (
                <Canvas
                  camera={{ position: [0, 0, 5], fov: 50 }}
                  style={{ background: 'transparent' }}
                  dpr={[1, 1.5]}
                >
                  {selected.SceneContent ? (
                    <selected.SceneContent colors={colors} />
                  ) : null}
                </Canvas>
              ) : (
                <Canvas2DRenderer project={selected} colors={colors} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
