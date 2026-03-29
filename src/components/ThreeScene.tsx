import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

function MouseTracker({ mousePos }: { mousePos: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.x += (mousePos.current.x * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (mousePos.current.y * 0.3 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function FloatingParticles({ count = 150, mousePos }: { count?: number; mousePos: React.MutableRefObject<{ x: number; y: number }> }) {
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
    const palette = [
      [0.659, 0.545, 0.976],
      [0.427, 0.157, 0.851],
      [0.545, 0.361, 1.0],
      [0.878, 0.749, 1.0],
    ];
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    return col;
  }, [count]);

  useFrame((state) => {
    if (!mesh.current || !initialPositions.current) return;
    const time = state.clock.elapsedTime;
    const posArray = mesh.current.geometry.attributes.position.array as Float32Array;
    const mx = mousePos.current.x;
    const my = mousePos.current.y;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const baseX = initialPositions.current[ix];
      const baseY = initialPositions.current[ix + 1];
      const baseZ = initialPositions.current[ix + 2];

      posArray[ix] = baseX + Math.sin(time * 0.3 + i * 0.1) * 0.3 + mx * 0.15;
      posArray[ix + 1] = baseY + Math.cos(time * 0.2 + i * 0.15) * 0.3 + my * 0.15;
      posArray[ix + 2] = baseZ + Math.sin(time * 0.1 + i * 0.05) * 0.2;
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
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function GlowingRing({ position, color, speed, size }: {
  position: [number, number, number];
  color: string;
  speed: number;
  size: number;
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
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}

function CentralGeometry({ mousePos }: { mousePos: React.MutableRefObject<{ x: number; y: number }> }) {
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

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#6d28d9"
          emissive="#4c1d95"
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

function ConnectionLines() {
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
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 5) {
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
      <lineBasicMaterial color="#6d28d9" transparent opacity={0.12} />
    </lineSegments>
  );
}

export default function ThreeScene() {
  const mousePos = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 55 }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <fog attach="fog" args={['#0f0f1a', 15, 35]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#a78bfa" distance={20} />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color="#6d28d9" distance={20} />
        <pointLight position={[0, 8, 0]} intensity={0.4} color="#c084fc" distance={15} />

        <Stars radius={60} depth={100} count={2500} factor={3} saturation={0.3} fade speed={0.3} />
        <FloatingParticles mousePos={mousePos} />
        <CentralGeometry mousePos={mousePos} />
        <ConnectionLines />

        <GlowingRing position={[3, 2, -3]} color="#a78bfa" speed={0.4} size={1.2} />
        <GlowingRing position={[-3, -1, -2]} color="#6d28d9" speed={0.3} size={0.8} />
        <GlowingRing position={[0, -3, -4]} color="#c084fc" speed={0.5} size={1.5} />

        <MouseTracker mousePos={mousePos} />
      </Canvas>
    </div>
  );
}
