import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

type ThemeMode = 'night' | 'day' | 'custom';

interface ThemeColors {
  fog: string;
  particles: number[][];
  wireColor: string;
  wireEmissive: string;
  lightA: string;
  lightB: string;
  lightC: string;
  ringOpacity: number;
  lineOpacity: number;
  starsCount: number;
}

const NIGHT_COLORS: ThemeColors = {
  fog: '#0f0f1a',
  particles: [
    [0.659, 0.545, 0.976], [0.427, 0.157, 0.851],
    [0.545, 0.361, 1.0], [0.878, 0.749, 1.0],
  ],
  wireColor: '#6d28d9',
  wireEmissive: '#4c1d95',
  lightA: '#a78bfa',
  lightB: '#6d28d9',
  lightC: '#c084fc',
  ringOpacity: 0.5,
  lineOpacity: 0.12,
  starsCount: 2500,
};

const DAY_COLORS: ThemeColors = {
  fog: '#f5f5f7',
  particles: [
    [0.4, 0.3, 0.75], [0.3, 0.15, 0.65],
    [0.5, 0.35, 0.85], [0.6, 0.5, 0.9],
  ],
  wireColor: '#7c3aed',
  wireEmissive: '#6d28d9',
  lightA: '#8b5cf6',
  lightB: '#7c3aed',
  lightC: '#a78bfa',
  ringOpacity: 0.35,
  lineOpacity: 0.08,
  starsCount: 800,
};

function getThemeColors(theme: ThemeMode): ThemeColors {
  return theme === 'day' ? DAY_COLORS : NIGHT_COLORS;
}

function useThemeState() {
  const [theme, setTheme] = useState<ThemeMode>('night');
  useEffect(() => {
    const update = () => {
      const t = document.documentElement.getAttribute('data-theme') as ThemeMode;
      setTheme(t || 'night');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/* ---------- Geometry Variants ---------- */

const GEO_VARIANTS = [
  { type: 'icosahedron', args: [1.5, 1] as [number, number] },
  { type: 'octahedron', args: [1.8, 0] as [number, number] },
  { type: 'dodecahedron', args: [1.5, 0] as [number, number] },
  { type: 'torusKnot', args: [1, 0.35, 128, 32] as [number, number, number, number] },
  { type: 'tetrahedron', args: [2, 0] as [number, number] },
  { type: 'torus', args: [1.2, 0.4, 16, 80] as [number, number, number, number] },
];

const RING_COLORS = ['#a78bfa', '#6d28d9', '#c084fc', '#8b5cf6', '#7c3aed', '#a855f7'];

/* ---------- Sub-components ---------- */

function MouseTracker({ mousePos }: { mousePos: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x += (mousePos.current.x * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (mousePos.current.y * 0.3 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function DynamicFog({ color }: { color: string }) {
  const ref = useRef<THREE.Fog>(null!);
  useEffect(() => {
    if (ref.current) ref.current.color.set(color);
  }, [color]);
  return <fog ref={ref} attach="fog" args={[color, 15, 35]} />;
}

function FloatingParticles({ count = 150, mousePos, palette }: {
  count?: number;
  mousePos: React.MutableRefObject<{ x: number; y: number }>;
  palette: number[][];
}) {
  const mesh = useRef<THREE.Points>(null!);
  const initialPositions = useRef<Float32Array>(null!);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    initialPositions.current = new Float32Array(pos);
    return pos;
  }, [count]);

  const colors = useMemo(() => {
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    return col;
  }, [count, palette]);

  useFrame((state) => {
    if (!mesh.current || !initialPositions.current) return;
    const time = state.clock.elapsedTime;
    const posArray = mesh.current.geometry.attributes.position.array as Float32Array;
    const mx = mousePos.current.x;
    const my = mousePos.current.y;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      posArray[ix] = initialPositions.current[ix] + Math.sin(time * 0.3 + i * 0.1) * 0.3 + mx * 0.15;
      posArray[ix + 1] = initialPositions.current[ix + 1] + Math.cos(time * 0.2 + i * 0.15) * 0.3 + my * 0.15;
      posArray[ix + 2] = initialPositions.current[ix + 2] + Math.sin(time * 0.1 + i * 0.05) * 0.2;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.rotation.y = time * 0.015;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.9} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function GlowingRing({ position, color, speed, size, opacity }: {
  position: [number, number, number];
  color: string;
  speed: number;
  size: number;
  opacity: number;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    mesh.current.rotation.x = t * speed * 0.5;
    mesh.current.rotation.y = t * speed * 0.3;
    mesh.current.rotation.z = t * speed * 0.2;
  });
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={mesh} position={position}>
        <torusGeometry args={[size, 0.02, 16, 100]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={opacity} toneMapped={false} />
      </mesh>
    </Float>
  );
}

function CentralGeometry({ mousePos, geoIndex, wireColor, wireEmissive }: {
  mousePos: React.MutableRefObject<{ x: number; y: number }>;
  geoIndex: number;
  wireColor: string;
  wireEmissive: string;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    mesh.current.rotation.x = t * 0.15 + mousePos.current.y * 0.3;
    mesh.current.rotation.y = t * 0.1 + mousePos.current.x * 0.3;
    const scale = 1 + Math.sin(t * 0.5) * 0.05;
    mesh.current.scale.setScalar(scale);
    if (materialRef.current) {
      const hue = (t * 0.02) % 1;
      materialRef.current.emissive.setHSL(0.75 + hue * 0.1, 0.8, 0.15);
    }
  });

  const geo = GEO_VARIANTS[geoIndex];

  const renderGeometry = () => {
    switch (geo.type) {
      case 'icosahedron': return <icosahedronGeometry args={geo.args as [number, number]} />;
      case 'octahedron': return <octahedronGeometry args={geo.args as [number, number]} />;
      case 'dodecahedron': return <dodecahedronGeometry args={geo.args as [number, number]} />;
      case 'torusKnot': return <torusKnotGeometry args={geo.args as [number, number, number, number]} />;
      case 'tetrahedron': return <tetrahedronGeometry args={geo.args as [number, number]} />;
      case 'torus': return <torusGeometry args={geo.args as [number, number, number, number]} />;
      default: return <icosahedronGeometry args={[1.5, 1]} />;
    }
  };

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={mesh}>
        {renderGeometry()}
        <meshStandardMaterial
          ref={materialRef}
          color={wireColor}
          emissive={wireEmissive}
          emissiveIntensity={0.5}
          wireframe
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}

function ConnectionLines({ opacity }: { opacity: number }) {
  const ref = useRef<THREE.LineSegments>(null!);

  const points = useMemo(() => {
    const pts: number[] = [];
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 30; i++) {
      positions.push([
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
      ]);
    }
    for (let i = 0; i < 30; i++) {
      for (let j = i + 1; j < 30; j++) {
        const dx = positions[i][0] - positions[j][0];
        const dy = positions[i][1] - positions[j][1];
        const dz = positions[i][2] - positions[j][2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 5) {
          pts.push(...positions[i], ...positions[j]);
        }
      }
    }
    return new Float32Array(pts);
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
      ref.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#6d28d9" transparent opacity={opacity} />
    </lineSegments>
  );
}

/* ---------- Main Component ---------- */

export default function ThreeScene() {
  const mousePos = useRef({ x: 0, y: 0 });
  const theme = useThemeState();
  const colors = getThemeColors(theme);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  // Random selections (stable per page load)
  const geoIndex = useMemo(() => Math.floor(Math.random() * GEO_VARIANTS.length), []);

  const ringConfigs = useMemo(() => {
    const count = 3 + Math.floor(Math.random() * 2);
    return Array.from({ length: count }, () => ({
      position: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
        -2 - Math.random() * 4,
      ] as [number, number, number],
      color: RING_COLORS[Math.floor(Math.random() * RING_COLORS.length)],
      speed: 0.2 + Math.random() * 0.4,
      size: 0.6 + Math.random() * 1.2,
    }));
  }, []);

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
    >
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }} style={{ background: 'transparent' }} dpr={[1, 1.5]}>
        <DynamicFog color={colors.fog} />
        <ambientLight intensity={theme === 'day' ? 0.5 : 0.2} />
        <pointLight position={[5, 5, 5]} intensity={1} color={colors.lightA} distance={20} />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color={colors.lightB} distance={20} />
        <pointLight position={[0, 8, 0]} intensity={0.4} color={colors.lightC} distance={15} />

        <Stars radius={60} depth={100} count={colors.starsCount} factor={3} saturation={0.3} fade speed={0.3} />
        <FloatingParticles mousePos={mousePos} palette={colors.particles} />
        <CentralGeometry mousePos={mousePos} geoIndex={geoIndex} wireColor={colors.wireColor} wireEmissive={colors.wireEmissive} />
        <ConnectionLines opacity={colors.lineOpacity} />

        {ringConfigs.map((ring, i) => (
          <GlowingRing
            key={i}
            position={ring.position}
            color={ring.color}
            speed={ring.speed}
            size={ring.size}
            opacity={colors.ringOpacity}
          />
        ))}

        <MouseTracker mousePos={mousePos} />
      </Canvas>
    </div>
  );
}
