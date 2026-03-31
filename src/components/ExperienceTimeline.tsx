import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColors } from './useThemeColors';

/* ================================================================
   資料定義 — 經歷節點
   ================================================================ */

interface ExperienceNode {
  year: string;
  title: string;
  description: string;
}

const experiences: ExperienceNode[] = [
  { year: '2020', title: '開始學習前端開發', description: 'HTML / CSS / JavaScript 基礎' },
  { year: '2021', title: '首份實習工作', description: 'React 專案開發與維護' },
  { year: '2022', title: '全端開發經驗', description: 'Node.js / Express / PostgreSQL' },
  { year: '2023', title: '深入 3D 網頁技術', description: 'Three.js / WebGL / Shader' },
  { year: '2024', title: 'AI 整合應用', description: 'MediaPipe / TensorFlow.js' },
  { year: '2025', title: '持續精進中', description: '打造互動式作品集' },
];

/* ================================================================
   3D 路徑曲線
   ================================================================ */

function buildCurve(nodeCount: number): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const t = i / (nodeCount - 1);
    const x = Math.sin(t * Math.PI * 2) * 1.8;
    const y = 3 - t * 6;
    const z = Math.cos(t * Math.PI * 1.5) * 1.2;
    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

/* ================================================================
   發光路徑線條
   ================================================================ */

function GlowingPath({ curve, color }: { curve: THREE.CatmullRomCurve3; color: string }) {
  const pathPoints = useMemo(() => curve.getPoints(200), [curve]);
  return (
    <group>
      <Line points={pathPoints} color={color} lineWidth={2.5} transparent opacity={0.9} />
      <Line points={pathPoints} color={color} lineWidth={6} transparent opacity={0.15} />
    </group>
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
  const scale = useRef(1);

  useFrame((_, delta) => {
    const target = isActive ? 1.4 : 1;
    scale.current += (target - scale.current) * delta * 4;
    if (meshRef.current) meshRef.current.scale.setScalar(scale.current);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(scale.current * 2.5);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = isActive ? 0.18 : 0.06;
    }
  });

  return (
    <group position={position}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={colorB} transparent opacity={0.06} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial
          color={colorA}
          emissive={colorA}
          emissiveIntensity={isActive ? 0.8 : 0.3}
        />
      </mesh>
      <Text position={[0.5, 0.2, 0]} fontSize={0.22} fontWeight={700} color={isActive ? colorB : textColor} anchorX="left" anchorY="middle">
        {node.year}
      </Text>
      <Text position={[0.5, 0, 0]} fontSize={0.14} color={textColor} anchorX="left" anchorY="middle" maxWidth={3}>
        {node.title}
      </Text>
      <Text position={[0.5, -0.2, 0]} fontSize={0.1} color={subTextColor} anchorX="left" anchorY="middle" maxWidth={3}>
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
    const lookAheadT = THREE.MathUtils.clamp(t + 0.05, 0, 1);
    const targetPos = curve.getPointAt(t).clone();
    const lookAtTarget = curve.getPointAt(lookAheadT);

    targetPos.add(new THREE.Vector3(-2.5, 0.5, 3));
    currentPos.current.lerp(targetPos, 0.08);
    currentLookAt.current.lerp(lookAtTarget, 0.08);

    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

/* ================================================================
   粒子飄散效果
   ================================================================ */

function PathParticles({ curve, colorA, colorB, isLight }: {
  curve: THREE.CatmullRomCurve3;
  colorA: string;
  colorB: string;
  isLight: boolean;
}) {
  const ref = useRef<THREE.Points>(null!);
  const count = 60;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const pt = curve.getPointAt(t);
      arr[i * 3] = pt.x + (Math.random() - 0.5) * 1.5;
      arr[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 1.5;
      arr[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 1.5;
    }
    return arr;
  }, [curve]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  const color = useMemo(() => {
    // 混合 colorA 與 colorB
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
        size={0.04}
        color={color}
        transparent
        opacity={isLight ? 0.4 : 0.5}
        sizeAttenuation
        blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
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
      <ambientLight intensity={tc.isLight ? 0.5 : 0.25} />
      <pointLight position={[4, 4, 4]} intensity={0.7} color={tc.colorB} />
      <pointLight position={[-4, -2, 3]} intensity={0.4} color={tc.colorA} />

      <GlowingPath curve={curve} color={tc.colorB} />
      <PathParticles curve={curve} colorA={tc.colorA} colorB={tc.colorB} isLight={tc.isLight} />

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
      <div style={{ textAlign: 'center', padding: '3rem 1rem 0' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Experience Timeline
        </h2>
        <div style={{ width: 60, height: 3, background: 'linear-gradient(90deg, var(--accent), var(--accent-glow))', borderRadius: 2, margin: '0 auto 0.75rem' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          向下捲動以瀏覽 3D 經歷路徑
        </p>
      </div>

      <div style={{ position: 'relative', height: '600px' }}>
        {/* 3D Canvas */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Canvas camera={{ position: [0, 3, 6], fov: 50 }} style={{ background: 'transparent' }}>
            <TimelineScene scrollProgress={scrollProgress} />
          </Canvas>
        </div>

        {/* 捲動驅動層 */}
        <div
          ref={containerRef}
          style={{ position: 'absolute', inset: 0, zIndex: 1, overflowY: 'auto' }}
        >
          <div style={{ height: '300%', pointerEvents: 'none' }} />
        </div>

        {/* 進度指示條 */}
        <div
          style={{
            position: 'absolute',
            right: '1rem',
            top: '1rem',
            bottom: '1rem',
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
              background: 'var(--accent-light)',
              borderRadius: '2px',
              transition: 'height 0.1s ease-out',
              boxShadow: `0 0 8px var(--accent-glow)`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
