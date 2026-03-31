import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

/* ========== Theme Helpers ========== */

function useThemeState() {
  const [isLightBg, setIsLightBg] = useState(false);
  useEffect(() => {
    const update = () => setIsLightBg(document.documentElement.getAttribute('data-bg-light') === 'true');
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bg-light'] });
    window.addEventListener('wj-theme-update', update);
    return () => { obs.disconnect(); window.removeEventListener('wj-theme-update', update); };
  }, []);
  return isLightBg;
}

function useBgColor() {
  const [bg, setBg] = useState('#0f0f1a');
  useEffect(() => {
    const update = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
      if (v) setBg(v);
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    window.addEventListener('wj-theme-update', update);
    return () => { obs.disconnect(); window.removeEventListener('wj-theme-update', update); };
  }, []);
  return bg;
}

function useGeoColors() {
  const [colors, setColors] = useState({ colorA: '#6d28d9', colorB: '#c084fc' });
  useEffect(() => {
    const load = () => {
      try { const s = localStorage.getItem('wj-geo-colors'); if (s) setColors(JSON.parse(s)); } catch {}
    };
    load();
    window.addEventListener('wj-geo-colors', load);
    window.addEventListener('storage', load);
    return () => { window.removeEventListener('wj-geo-colors', load); window.removeEventListener('storage', load); };
  }, []);
  return colors;
}

function hexToRgbArray(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function lerpHex(a: string, b: string, t: number): string {
  const [ra, ga, ba] = hexToRgbArray(a).map(v => v * 255);
  const [rb, gb, bb] = hexToRgbArray(b).map(v => v * 255);
  const r = Math.round(ra + (rb - ra) * t);
  const g = Math.round(ga + (gb - ga) * t);
  const bv = Math.round(ba + (bb - ba) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

/* ========== Geometry Variants (12) ========== */

const GEO_VARIANTS: { type: string; args: number[] }[] = [
  { type: 'icosahedron', args: [1.5, 1] },
  { type: 'octahedron', args: [1.8, 0] },
  { type: 'dodecahedron', args: [1.5, 0] },
  { type: 'torusKnot', args: [1, 0.35, 128, 32] },
  { type: 'tetrahedron', args: [2, 0] },
  { type: 'torus', args: [1.2, 0.4, 16, 80] },
  { type: 'cone', args: [1.3, 2.5, 6] },
  { type: 'cylinder', args: [0.8, 1.2, 2.5, 8] },
  { type: 'sphere', args: [1.5, 8, 6] },
  { type: 'capsule', args: [0.8, 1.5, 4, 8] },
  { type: 'torusKnot2', args: [1.2, 0.3, 100, 16, 3, 5] },
  { type: 'box', args: [2, 2, 2, 2, 2, 2] },
];

/* ========== Sub-components ========== */

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
  useEffect(() => { if (ref.current) ref.current.color.set(color); }, [color]);
  return <fog ref={ref} attach="fog" args={[color, 15, 35]} />;
}

function FloatingParticles({ count = 150, mousePos, isLight }: {
  count?: number;
  mousePos: React.MutableRefObject<{ x: number; y: number }>;
  isLight: boolean;
}) {
  const mesh = useRef<THREE.Points>(null!);
  const matRef = useRef<THREE.PointsMaterial>(null!);
  const colorAttrRef = useRef<THREE.BufferAttribute>(null!);
  const initialPositions = useRef<Float32Array>(null!);
  const geoColors = useGeoColors();

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

  const colors = useMemo(() => new Float32Array(count * 3), [count]);

  useEffect(() => {
    const a = hexToRgbArray(geoColors.colorA);
    const b = hexToRgbArray(geoColors.colorB);
    const mid1: [number, number, number] = [a[0] * 0.7 + b[0] * 0.3, a[1] * 0.7 + b[1] * 0.3, a[2] * 0.7 + b[2] * 0.3];
    const mid2: [number, number, number] = [a[0] * 0.3 + b[0] * 0.7, a[1] * 0.3 + b[1] * 0.7, a[2] * 0.3 + b[2] * 0.7];
    const palette = [a, b, mid1, mid2];
    const factor = isLight ? 0.75 : 1.0;
    for (let i = 0; i < count; i++) {
      const c = palette[i % palette.length];
      colors[i * 3] = c[0] * factor;
      colors[i * 3 + 1] = c[1] * factor;
      colors[i * 3 + 2] = c[2] * factor;
    }
    if (colorAttrRef.current) {
      colorAttrRef.current.needsUpdate = true;
    }
  }, [geoColors.colorA, geoColors.colorB, isLight, count, colors]);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      matRef.current.opacity = isLight ? 0.7 : 0.9;
      matRef.current.needsUpdate = true;
    }
  }, [isLight]);

  useFrame((state) => {
    if (!mesh.current || !initialPositions.current) return;
    const t = state.clock.elapsedTime;
    const arr = mesh.current.geometry.attributes.position.array as Float32Array;
    const mx = mousePos.current.x, my = mousePos.current.y;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix] = initialPositions.current[ix] + Math.sin(t * 0.3 + i * 0.1) * 0.3 + mx * 0.15;
      arr[ix + 1] = initialPositions.current[ix + 1] + Math.cos(t * 0.2 + i * 0.15) * 0.3 + my * 0.15;
      arr[ix + 2] = initialPositions.current[ix + 2] + Math.sin(t * 0.1 + i * 0.05) * 0.2;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.rotation.y = t * 0.015;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute ref={colorAttrRef} attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={matRef} size={0.08} vertexColors transparent opacity={0.9} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function GlowingRing({ position, color, speed, size, opacity }: {
  position: [number, number, number]; color: string; speed: number; size: number; opacity: number;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
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

/* ========== Gradient Shader Material ========== */

const gradientVert = `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const gradientFrag = `
uniform vec3 colorA;
uniform vec3 colorB;
uniform float uOpacity;
uniform float time;
varying vec3 vPos;
void main() {
  float t = clamp((vPos.y + 2.0) / 4.0, 0.0, 1.0);
  t += sin(vPos.x * 2.5 + time * 0.4) * 0.08;
  t = clamp(t, 0.0, 1.0);
  vec3 col = mix(colorA, colorB, t);
  col *= 1.15;
  gl_FragColor = vec4(col, uOpacity);
}`;

function CentralGeometry({ mousePos, geoIndex }: {
  mousePos: React.MutableRefObject<{ x: number; y: number }>; geoIndex: number;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const geoColors = useGeoColors();

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      colorA: { value: new THREE.Color('#6d28d9') },
      colorB: { value: new THREE.Color('#c084fc') },
      uOpacity: { value: 0.5 },
      time: { value: 0 },
    },
    vertexShader: gradientVert,
    fragmentShader: gradientFrag,
    wireframe: true,
    transparent: true,
    depthWrite: false,
  }), []);

  useEffect(() => {
    material.uniforms.colorA.value.set(geoColors.colorA);
    material.uniforms.colorB.value.set(geoColors.colorB);
  }, [geoColors, material]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    mesh.current.rotation.x = t * 0.15 + mousePos.current.y * 0.3;
    mesh.current.rotation.y = t * 0.1 + mousePos.current.x * 0.3;
    mesh.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.05);
    material.uniforms.time.value = t;
  });

  const geo = GEO_VARIANTS[geoIndex];
  const renderGeo = () => {
    switch (geo.type) {
      case 'icosahedron': return <icosahedronGeometry args={geo.args as [number, number]} />;
      case 'octahedron': return <octahedronGeometry args={geo.args as [number, number]} />;
      case 'dodecahedron': return <dodecahedronGeometry args={geo.args as [number, number]} />;
      case 'tetrahedron': return <tetrahedronGeometry args={geo.args as [number, number]} />;
      case 'torusKnot':
      case 'torusKnot2': return <torusKnotGeometry args={geo.args as any} />;
      case 'torus': return <torusGeometry args={geo.args as any} />;
      case 'cone': return <coneGeometry args={geo.args as any} />;
      case 'cylinder': return <cylinderGeometry args={geo.args as any} />;
      case 'sphere': return <sphereGeometry args={geo.args as any} />;
      case 'capsule': return <capsuleGeometry args={geo.args as any} />;
      case 'box': return <boxGeometry args={geo.args as any} />;
      default: return <icosahedronGeometry args={[1.5, 1]} />;
    }
  };

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={mesh} material={material}>
        {renderGeo()}
      </mesh>
    </Float>
  );
}

function ConnectionLines({ opacity }: { opacity: number }) {
  const ref = useRef<THREE.LineSegments>(null!);
  const geoColors = useGeoColors();
  const points = useMemo(() => {
    const pts: number[] = [];
    const pos: [number, number, number][] = [];
    for (let i = 0; i < 30; i++) pos.push([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16]);
    for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) {
      const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], dz = pos[i][2] - pos[j][2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 5) pts.push(...pos[i], ...pos[j]);
    }
    return new Float32Array(pts);
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) { ref.current.rotation.y = clock.elapsedTime * 0.02; ref.current.rotation.x = clock.elapsedTime * 0.01; }
  });
  return (
    <lineSegments ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry>
      <lineBasicMaterial color={geoColors.colorA} transparent opacity={opacity} />
    </lineSegments>
  );
}

/* ========== Main ========== */

export default function ThreeScene() {
  const mousePos = useRef({ x: 0, y: 0 });
  const isLightBg = useThemeState();
  const bgColor = useBgColor();
  const geoColors = useGeoColors();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  const geoIndex = useMemo(() => Math.floor(Math.random() * GEO_VARIANTS.length), []);
  const ringConfigs = useMemo(() => Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => ({
    position: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, -2 - Math.random() * 4] as [number, number, number],
    speed: 0.2 + Math.random() * 0.4,
    size: 0.6 + Math.random() * 1.2,
    colorT: Math.random(),
  })), []);

  return (
    <div onMouseMove={handleMouseMove} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }} style={{ background: 'transparent' }} dpr={[1, 1.5]}>
        <DynamicFog color={bgColor} />
        <ambientLight intensity={isLightBg ? 0.6 : 0.2} />
        <pointLight position={[5, 5, 5]} intensity={1} color={isLightBg ? '#8b5cf6' : '#a78bfa'} distance={20} />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color="#6d28d9" distance={20} />
        <pointLight position={[0, 8, 0]} intensity={0.4} color={isLightBg ? '#a78bfa' : '#c084fc'} distance={15} />

        {!isLightBg && <Stars radius={60} depth={100} count={2500} factor={3} saturation={0.3} fade speed={0.3} />}
        <FloatingParticles mousePos={mousePos} isLight={isLightBg} />
        <CentralGeometry mousePos={mousePos} geoIndex={geoIndex} />
        <ConnectionLines opacity={isLightBg ? 0.06 : 0.12} />

        {ringConfigs.map((r, i) => (
          <GlowingRing key={i} position={r.position} color={lerpHex(geoColors.colorA, geoColors.colorB, r.colorT)} speed={r.speed} size={r.size} opacity={isLightBg ? 0.4 : 0.5} />
        ))}
        <MouseTracker mousePos={mousePos} />
      </Canvas>
    </div>
  );
}
