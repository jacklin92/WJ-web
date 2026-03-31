import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Line, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColors } from './useThemeColors';

/* ================================================================
   資料定義 — 網頁開發歷程節點
   ================================================================ */

interface ExperienceNode {
  year: string;
  title: string;
  description: string;
  icon: string;
}

const experiences: ExperienceNode[] = [
  {
    year: 'Phase 1',
    title: '踏入網頁的世界',
    description: 'HTML / CSS 切版，寫出第一個靜態頁面',
    icon: '</>',
  },
  {
    year: 'Phase 2',
    title: 'JavaScript 啟蒙',
    description: 'DOM 操作、事件處理、非同步概念',
    icon: 'JS',
  },
  {
    year: 'Phase 3',
    title: '框架與工程化',
    description: 'React / Astro / Tailwind CSS / Vite 建構流程',
    icon: 'FW',
  },
  {
    year: 'Phase 4',
    title: '後端與資料庫',
    description: 'Python / Node.js / REST API / PostgreSQL',
    icon: 'BE',
  },
  {
    year: 'Phase 5',
    title: '3D 與視覺化',
    description: 'Three.js / WebGL / Shader / R3F 互動場景',
    icon: '3D',
  },
  {
    year: 'Phase 6',
    title: 'AI 與持續進化',
    description: 'LLM 整合 / RAG 架構 / MediaPipe 即時辨識',
    icon: 'AI',
  },
];

/* ================================================================
   3D 路徑曲線 — 雙螺旋造型
   ================================================================ */

function buildCurve(nodeCount: number): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const t = i / (nodeCount - 1);
    const x = Math.sin(t * Math.PI * 2.2) * 2.2;
    const y = 4 - t * 8;
    const z = Math.cos(t * Math.PI * 1.6) * 1.6;
    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

/* ================================================================
   發光路徑線條（三層光暈）
   ================================================================ */

function GlowingPath({ curve, colorA, colorB }: {
  curve: THREE.CatmullRomCurve3;
  colorA: string;
  colorB: string;
}) {
  const pathPoints = useMemo(() => curve.getPoints(300), [curve]);
  return (
    <group>
      <Line points={pathPoints} color={colorB} lineWidth={3} transparent opacity={0.85} />
      <Line points={pathPoints} color={colorA} lineWidth={8} transparent opacity={0.12} />
      <Line points={pathPoints} color={colorB} lineWidth={14} transparent opacity={0.04} />
    </group>
  );
}

/* ================================================================
   節點裝飾環 — 活躍時旋轉的光環
   ================================================================ */

function NodeRing({ isActive, color }: { isActive: boolean; color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = clock.elapsedTime * 1.2;
    ref.current.rotation.z = clock.elapsedTime * 0.8;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    const target = isActive ? 0.5 : 0;
    mat.opacity += (target - mat.opacity) * 0.06;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.28, 0.012, 16, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} />
    </mesh>
  );
}

/* ================================================================
   經歷節點球體 + 文字標籤
   ================================================================ */

function NodeSphere({
  position,
  node,
  isActive,
  colorA,
  colorB,
  textColor,
  subTextColor,
}: {
  position: THREE.Vector3;
  node: ExperienceNode;
  isActive: boolean;
  colorA: string;
  colorB: string;
  textColor: string;
  subTextColor: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const scale = useRef(1);

  useFrame((_, delta) => {
    const target = isActive ? 1.5 : 1;
    scale.current += (target - scale.current) * delta * 5;
    if (meshRef.current) meshRef.current.scale.setScalar(scale.current);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(scale.current * 3);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = isActive ? 0.22 : 0.04;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* 外層光暈球 */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={colorB} transparent opacity={0.04} depthWrite={false} />
      </mesh>

      {/* 活躍旋轉環 */}
      <NodeRing isActive={isActive} color={colorB} />

      {/* 核心球 */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial
          color={colorA}
          emissive={isActive ? colorB : colorA}
          emissiveIntensity={isActive ? 1.2 : 0.3}
          toneMapped={false}
        />
      </mesh>

      {/* Icon 標記 */}
      <Text
        position={[0, 0.35, 0]}
        fontSize={0.12}
        fontWeight={700}
        color={isActive ? colorB : colorA}
        anchorX="center"
        anchorY="middle"
      >
        {node.icon}
      </Text>

      {/* Phase 標籤 */}
      <Text
        position={[0.55, 0.18, 0]}
        fontSize={0.13}
        fontWeight={700}
        color={isActive ? colorB : subTextColor}
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.06}
      >
        {node.year}
      </Text>

      {/* 標題 */}
      <Text
        position={[0.55, 0, 0]}
        fontSize={0.16}
        fontWeight={700}
        color={textColor}
        anchorX="left"
        anchorY="middle"
        maxWidth={3.5}
      >
        {node.title}
      </Text>

      {/* 描述 */}
      <Text
        position={[0.55, -0.2, 0]}
        fontSize={0.1}
        color={subTextColor}
        anchorX="left"
        anchorY="middle"
        maxWidth={3.5}
      >
        {node.description}
      </Text>
    </group>
  );
}

/* ================================================================
   攝影機控制器 — 跟隨路徑移動
   ================================================================ */

function CameraController({
  curve,
  scrollProgress,
}: {
  curve: THREE.CatmullRomCurve3;
  scrollProgress: number;
}) {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());

  useFrame(() => {
    const t = THREE.MathUtils.clamp(scrollProgress, 0, 0.98);
    const lookAheadT = THREE.MathUtils.clamp(t + 0.06, 0, 1);
    const targetPos = curve.getPointAt(t).clone();
    const lookAtTarget = curve.getPointAt(lookAheadT);

    targetPos.add(new THREE.Vector3(-3, 0.6, 3.5));
    currentPos.current.lerp(targetPos, 0.07);
    currentLookAt.current.lerp(lookAtTarget, 0.07);

    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

/* ================================================================
   路徑粒子飄散效果
   ================================================================ */

function PathParticles({ curve, colorA, colorB, isLight }: {
  curve: THREE.CatmullRomCurve3;
  colorA: string;
  colorB: string;
  isLight: boolean;
}) {
  const ref = useRef<THREE.Points>(null!);
  const count = 100;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const pt = curve.getPointAt(t);
      arr[i * 3] = pt.x + (Math.random() - 0.5) * 2;
      arr[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 2;
      arr[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 2;
    }
    return arr;
  }, [curve]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.015;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  const color = useMemo(() => {
    const a = new THREE.Color(colorA);
    const b = new THREE.Color(colorB);
    return a.lerp(b, 0.5);
  }, [colorA, colorB]);

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color={color}
        transparent
        opacity={isLight ? 0.35 : 0.55}
        sizeAttenuation
        blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ================================================================
   環境光粒子 — 底層氛圍
   ================================================================ */

function AmbientDust({ colorB, isLight }: { colorB: string; isLight: boolean }) {
  const ref = useRef<THREE.Points>(null!);
  const count = 200;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.008;
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.05) * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={colorB}
        transparent
        opacity={isLight ? 0.15 : 0.25}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ================================================================
   場景內部
   ================================================================ */

function TimelineScene({ scrollProgress }: { scrollProgress: number }) {
  const tc = useThemeColors();
  const curve = useMemo(() => buildCurve(experiences.length), []);

  const nodePositions = useMemo(
    () => experiences.map((_, i) => curve.getPointAt(i / (experiences.length - 1))),
    [curve],
  );

  const activeIndex = Math.min(
    Math.floor(scrollProgress * experiences.length),
    experiences.length - 1,
  );

  return (
    <>
      <ambientLight intensity={tc.isLight ? 0.55 : 0.2} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color={tc.colorB} distance={25} />
      <pointLight position={[-4, -3, 4]} intensity={0.5} color={tc.colorA} distance={20} />
      <pointLight position={[0, 8, 0]} intensity={0.3} color={tc.accentGlow} distance={18} />

      <GlowingPath curve={curve} colorA={tc.colorA} colorB={tc.colorB} />
      <PathParticles curve={curve} colorA={tc.colorA} colorB={tc.colorB} isLight={tc.isLight} />
      <AmbientDust colorB={tc.colorB} isLight={tc.isLight} />

      {experiences.map((node, i) => (
        <NodeSphere
          key={i}
          position={nodePositions[i]}
          node={node}
          isActive={i === activeIndex}
          colorA={tc.colorA}
          colorB={tc.colorB}
          textColor={tc.isLight ? '#1a1a2e' : '#ffffff'}
          subTextColor={tc.textSecondary}
        />
      ))}

      <CameraController curve={curve} scrollProgress={scrollProgress} />
    </>
  );
}

/* ================================================================
   2D HTML 重疊資訊面板
   ================================================================ */

function InfoOverlay({ scrollProgress }: { scrollProgress: number }) {
  const activeIndex = Math.min(
    Math.floor(scrollProgress * experiences.length),
    experiences.length - 1,
  );
  const node = experiences[activeIndex];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '2rem',
        left: '2rem',
        zIndex: 3,
        pointerEvents: 'none',
        maxWidth: '340px',
      }}
    >
      {/* 進度標籤 */}
      <div
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          borderRadius: '999px',
          background: 'var(--accent)',
          color: 'var(--accent-text)',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          marginBottom: '0.5rem',
        }}
      >
        {node.icon} {node.year}
      </div>

      {/* 標題 */}
      <h3
        style={{
          margin: '0 0 0.3rem',
          fontSize: '1.3rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          textShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        {node.title}
      </h3>

      {/* 描述 */}
      <p
        style={{
          margin: 0,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          textShadow: '0 1px 8px rgba(0,0,0,0.2)',
        }}
      >
        {node.description}
      </p>

      {/* 步驟指示點 */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '0.75rem' }}>
        {experiences.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === activeIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i === activeIndex ? 'var(--accent-light)' : 'var(--border-color)',
              transition: 'all 0.3s ease',
              boxShadow: i === activeIndex ? '0 0 10px var(--accent-glow)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   主元件 — 含捲動偵測
   ================================================================ */

export default function ExperienceTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const max = scrollHeight - clientHeight;
      if (max > 0) setScrollProgress(scrollTop / max);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {/* 區塊標題 */}
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem 0.5rem' }}>
        <h2 style={{
          fontSize: '2.2rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
        }}>
          Development Journey
        </h2>
        <div style={{
          width: 60,
          height: 3,
          background: 'linear-gradient(90deg, var(--accent), var(--accent-glow))',
          borderRadius: 2,
          margin: '0 auto 0.75rem',
        }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
          從第一行 HTML 到全端 3D 互動 — 捲動探索我的網頁開發旅程
        </p>
      </div>

      {/* 場景容器 */}
      <div style={{ position: 'relative', height: '650px' }}>
        {/* 3D Canvas */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Canvas
            camera={{ position: [0, 4, 7], fov: 48 }}
            style={{ background: 'transparent' }}
            dpr={[1, 1.5]}
          >
            <TimelineScene scrollProgress={scrollProgress} />
          </Canvas>
        </div>

        {/* 捲動驅動層 */}
        <div
          ref={containerRef}
          style={{ position: 'absolute', inset: 0, zIndex: 1, overflowY: 'auto' }}
        >
          <div style={{ height: '350%', pointerEvents: 'none' }} />
        </div>

        {/* HTML 資訊面板 */}
        <InfoOverlay scrollProgress={scrollProgress} />

        {/* 進度指示條 */}
        <div
          style={{
            position: 'absolute',
            right: '1.25rem',
            top: '1.5rem',
            bottom: '1.5rem',
            width: '3px',
            background: 'var(--border-color)',
            borderRadius: '2px',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${scrollProgress * 100}%`,
              background: 'linear-gradient(180deg, var(--accent), var(--accent-glow))',
              borderRadius: '2px',
              transition: 'height 0.1s ease-out',
              boxShadow: '0 0 10px var(--accent-glow), 0 0 20px var(--accent-glow)',
            }}
          />
          {/* 進度頂端光點 */}
          <div
            style={{
              position: 'absolute',
              top: `${scrollProgress * 100}%`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: 'var(--accent-light)',
              boxShadow: '0 0 12px var(--accent-glow)',
              transition: 'top 0.1s ease-out',
            }}
          />
        </div>

        {/* 捲動提示 */}
        {scrollProgress < 0.05 && (
          <div
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              right: '2.5rem',
              zIndex: 3,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.3rem',
              animation: 'fadeInUp 1s ease-out',
              opacity: 0.6,
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
              SCROLL
            </span>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none" style={{ animation: 'float 2s ease-in-out infinite' }}>
              <rect x="5" y="0" width="6" height="12" rx="3" stroke="var(--text-secondary)" strokeWidth="1.5" fill="none" />
              <circle cx="8" cy="5" r="1.5" fill="var(--accent-light)">
                <animate attributeName="cy" values="4;8;4" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <path d="M4 16 L8 20 L12 16" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </section>
  );
}
