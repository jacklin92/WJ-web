import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThemeColors, type ThemeColors } from './useThemeColors';

/* ================================================================ */
/*  Types                                                           */
/* ================================================================ */

export interface DemoProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  renderer: 'webgl' | 'canvas2d';
  renderCanvas2D?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, colors: ThemeColors) => (() => void) | void;
  SceneContent?: React.FC<{ colors: ThemeColors }>;
}

/* ================================================================ */
/*  Helpers                                                         */
/* ================================================================ */

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ================================================================ */
/*  WebGL: DNA Helix                                                */
/* ================================================================ */

const dnaVert = `
uniform float uTime;
attribute float aT;
varying float vT;
varying float vDist;
void main(){
  vT = aT;
  float t = aT * 6.2831853 * 3.0;
  float side = step(0.5, fract(aT * 240.0)) * 2.0 - 1.0;
  float r = 1.3 + sin(uTime * 0.8 + aT * 12.0) * 0.15;
  float x = cos(t + uTime * 0.4) * r * side;
  float z = sin(t + uTime * 0.4) * r * side;
  float y = aT * 10.0 - 5.0;
  vDist = length(vec2(x, z));
  vec4 mvPos = modelViewMatrix * vec4(x, y, z, 1.0);
  gl_PointSize = (4.5 - vDist * 0.8) * (300.0 / -mvPos.z);
  gl_Position = projectionMatrix * mvPos;
}`;

const dnaFrag = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorGlow;
varying float vT;
varying float vDist;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if(d > 0.5) discard;
  float glow = exp(-d * 6.0);
  vec3 col = mix(uColorA, uColorB, vT);
  col += uColorGlow * glow * 0.4;
  float alpha = smoothstep(0.5, 0.1, d) * (0.7 + glow * 0.3);
  gl_FragColor = vec4(col * 1.2, alpha);
}`;

/* DNA rungs (connecting bars between strands) */
const rungVert = `
uniform float uTime;
attribute float aT;
varying float vT;
void main(){
  vT = aT;
  float t = aT * 6.2831853 * 3.0;
  float r = 1.3 + sin(uTime * 0.8 + aT * 12.0) * 0.15;
  float phase = t + uTime * 0.4;
  float frac = fract(position.x); // 0..1 interpolation between strands
  float x1 = cos(phase) * r, z1 = sin(phase) * r;
  float x2 = cos(phase) * r * -1.0, z2 = sin(phase) * r * -1.0;
  float x = mix(x1, x2, frac);
  float z = mix(z1, z2, frac);
  float y = aT * 10.0 - 5.0;
  vec4 mvPos = modelViewMatrix * vec4(x, y, z, 1.0);
  gl_Position = projectionMatrix * mvPos;
}`;

const rungFrag = `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vT;
void main(){
  vec3 col = mix(uColorA, uColorB, vT);
  gl_FragColor = vec4(col, 0.18);
}`;

function DNAHelixScene({ colors }: { colors: ThemeColors }) {
  const ref = useRef<THREE.Group>(null!);
  const count = 600;
  const rungCount = 40;

  const { geo, mat, rungGeo, rungMat } = useMemo(() => {
    // particles
    const g = new THREE.BufferGeometry();
    const t = new Float32Array(count);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { t[i] = i / count; pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(colors.colorA) },
        uColorB: { value: new THREE.Color(colors.colorB) },
        uColorGlow: { value: new THREE.Color(colors.accentGlow) },
      },
      vertexShader: dnaVert, fragmentShader: dnaFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    // rungs
    const rPos = new Float32Array(rungCount * 2 * 3);
    const rT = new Float32Array(rungCount * 2);
    for (let i = 0; i < rungCount; i++) {
      const tVal = (i + 0.5) / rungCount;
      rPos[i * 6 + 0] = 0; rPos[i * 6 + 1] = 0; rPos[i * 6 + 2] = 0; // frac=0
      rPos[i * 6 + 3] = 1; rPos[i * 6 + 4] = 0; rPos[i * 6 + 5] = 0; // frac=1
      rT[i * 2] = tVal; rT[i * 2 + 1] = tVal;
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    rg.setAttribute('aT', new THREE.BufferAttribute(rT, 1));
    const rm = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(colors.colorA) },
        uColorB: { value: new THREE.Color(colors.colorB) },
      },
      vertexShader: rungVert, fragmentShader: rungFrag,
      transparent: true, depthWrite: false,
    });

    return { geo: g, mat: m, rungGeo: rg, rungMat: rm };
  }, []);

  useEffect(() => {
    mat.uniforms.uColorA.value.set(colors.colorA);
    mat.uniforms.uColorB.value.set(colors.colorB);
    mat.uniforms.uColorGlow.value.set(colors.accentGlow);
    mat.blending = colors.isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    rungMat.uniforms.uColorA.value.set(colors.colorA);
    rungMat.uniforms.uColorB.value.set(colors.colorB);
  }, [colors, mat, rungMat]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mat.uniforms.uTime.value = t;
    rungMat.uniforms.uTime.value = t;
    if (ref.current) ref.current.rotation.y = t * 0.06;
  });

  return (
    <group ref={ref}>
      <points geometry={geo} material={mat} />
      <lineSegments geometry={rungGeo} material={rungMat} />
    </group>
  );
}

/* ================================================================ */
/*  WebGL: Terrain                                                  */
/* ================================================================ */

const tVert = `
uniform float uTime;
varying float vH;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 p = position;
  float w = sin(p.x*1.8+uTime)*cos(p.z*1.4+uTime*0.7)
          + sin(p.x*3.5+uTime*1.3)*0.35
          + cos(p.z*2.8+uTime*0.5)*0.45
          + sin((p.x+p.z)*2.0+uTime*0.9)*0.25;
  p.y = w * 0.55;
  vH = p.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
}`;

const tFrag = `
uniform vec3 uCA;
uniform vec3 uCB;
uniform vec3 uCG;
varying float vH;
varying vec2 vUv;
void main(){
  float t = clamp((vH+0.8)/1.6, 0.0, 1.0);
  vec3 col = mix(uCA, uCB, t);
  col += uCG * pow(t, 3.0) * 0.3;
  float edge = smoothstep(0.0, 0.015, min(min(vUv.x,1.0-vUv.x), min(vUv.y,1.0-vUv.y)));
  gl_FragColor = vec4(col*1.15, 0.75 * edge);
}`;

function TerrainScene({ colors }: { colors: ThemeColors }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCA: { value: new THREE.Color(colors.colorA) },
      uCB: { value: new THREE.Color(colors.colorB) },
      uCG: { value: new THREE.Color(colors.accentGlow) },
    },
    vertexShader: tVert, fragmentShader: tFrag,
    wireframe: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }), []);

  useEffect(() => {
    mat.uniforms.uCA.value.set(colors.colorA);
    mat.uniforms.uCB.value.set(colors.colorB);
    mat.uniforms.uCG.value.set(colors.accentGlow);
  }, [colors, mat]);

  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime; });

  return (
    <group rotation={[-Math.PI / 3.2, 0, Math.PI / 7]}>
      <ambientLight intensity={colors.isLight ? 0.4 : 0.15} />
      <pointLight position={[0, 5, 3]} intensity={0.8} color={colors.colorB} distance={20} />
      <mesh material={mat}><planeGeometry args={[9, 9, 100, 100]} /></mesh>
    </group>
  );
}

/* ================================================================ */
/*  WebGL: Galaxy                                                   */
/* ================================================================ */

const gVert = `
uniform float uTime;
attribute float aSize;
attribute float aAngle;
attribute float aRadius;
attribute float aBranch;
varying vec3 vColor;
varying float vDist;

void main(){
  float spin = aRadius * 1.5 + uTime * 0.15;
  float angle = aBranch + spin;
  float x = cos(angle) * aRadius;
  float z = sin(angle) * aRadius;
  float y = sin(uTime * 0.5 + aRadius * 2.0) * 0.15 * (1.0 - aRadius/5.0);
  vDist = aRadius / 5.0;
  vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
  gl_PointSize = aSize * (250.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const gFrag = `
uniform vec3 uCA;
uniform vec3 uCB;
uniform vec3 uCG;
varying float vDist;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if(d > 0.5) discard;
  float glow = exp(-d * 5.0);
  vec3 core = uCG;
  vec3 col = vDist < 0.25
    ? mix(core, uCA, vDist * 4.0)
    : mix(uCA, uCB, (vDist - 0.25) / 0.75);
  col += core * glow * 0.25;
  float alpha = smoothstep(0.5, 0.05, d) * (0.6 + glow * 0.4);
  gl_FragColor = vec4(col * 1.3, alpha);
}`;

function GalaxyScene({ colors }: { colors: ThemeColors }) {
  const ref = useRef<THREE.Points>(null!);
  const count = 6000;

  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const angles = new Float32Array(count);
    const radii = new Float32Array(count);
    const branches = new Float32Array(count);
    const arms = 4;

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 0.55) * 5;
      const branch = (i % arms) * (Math.PI * 2 / arms);
      // tighter scatter near core, wider at edges
      const scatterAmt = 0.35 * Math.pow(r / 5, 0.7);
      const scatter = (Math.random() - 0.5) * 2 * scatterAmt;
      pos[i * 3] = scatter; pos[i * 3 + 1] = (Math.random() - 0.5) * 0.08; pos[i * 3 + 2] = scatter;
      // core particles larger
      sizes[i] = r < 0.5 ? (Math.random() * 6 + 4) : (Math.random() * 4 + 1.5);
      angles[i] = Math.random() * Math.PI * 2;
      radii[i] = r;
      branches[i] = branch + scatter * 0.4;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    g.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    g.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    g.setAttribute('aBranch', new THREE.BufferAttribute(branches, 1));

    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCA: { value: new THREE.Color(colors.colorA) },
        uCB: { value: new THREE.Color(colors.colorB) },
        uCG: { value: new THREE.Color(colors.accentGlow) },
      },
      vertexShader: gVert, fragmentShader: gFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { geo: g, mat: m };
  }, []);

  useEffect(() => {
    mat.uniforms.uCA.value.set(colors.colorA);
    mat.uniforms.uCB.value.set(colors.colorB);
    mat.uniforms.uCG.value.set(colors.accentGlow);
    mat.blending = colors.isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
  }, [colors, mat]);

  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime; });

  return <group rotation={[-0.65, 0, 0]}><points ref={ref} geometry={geo} material={mat} /></group>;
}

/* ================================================================ */
/*  Canvas2D: Neural Network                                        */
/* ================================================================ */

function neuralNetworkRenderer(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, colors: ThemeColors): () => void {
  const layers = [4, 6, 8, 6, 3];
  interface N { x: number; y: number; layer: number }
  interface C { from: number; to: number; w: number }
  const neurons: N[] = [];
  const conns: C[] = [];

  function build() {
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    neurons.length = 0; conns.length = 0;
    const mx = w * 0.1, uw = w - mx * 2, gx = uw / (layers.length - 1);
    layers.forEach((cnt, li) => {
      const gy = h / (cnt + 1);
      for (let ni = 0; ni < cnt; ni++) neurons.push({ x: mx + li * gx, y: gy * (ni + 1), layer: li });
    });
    let idx = 0;
    for (let li = 0; li < layers.length - 1; li++) {
      const s = idx, n = s + layers[li];
      for (let a = s; a < n; a++) for (let b = n; b < n + layers[li + 1]; b++) conns.push({ from: a, to: b, w: Math.random() });
      idx = n;
    }
  }
  build();

  const pulses: { ci: number; p: number; s: number }[] = [];
  let animId: number;

  function animate() {
    const t = performance.now() * 0.001;
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    // connections with layer-based gradient
    for (const c of conns) {
      const f = neurons[c.from], to = neurons[c.to];
      const lg = ctx.createLinearGradient(f.x, f.y, to.x, to.y);
      lg.addColorStop(0, rgba(colors.colorA, 0.05 + c.w * 0.05));
      lg.addColorStop(1, rgba(colors.colorB, 0.05 + c.w * 0.05));
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = lg;
      ctx.lineWidth = 0.6; ctx.stroke();
    }

    // spawn pulses
    if (Math.random() < 0.12) pulses.push({ ci: Math.floor(Math.random() * conns.length), p: 0, s: 0.012 + Math.random() * 0.018 });

    // draw pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pl = pulses[i]; pl.p += pl.s;
      if (pl.p > 1) { pulses.splice(i, 1); continue; }
      const c = conns[pl.ci], f = neurons[c.from], to = neurons[c.to];
      const px = f.x + (to.x - f.x) * pl.p, py = f.y + (to.y - f.y) * pl.p;

      // trail
      const tp = Math.max(0, pl.p - 0.15);
      const tx = f.x + (to.x - f.x) * tp, ty = f.y + (to.y - f.y) * tp;
      const tg = ctx.createLinearGradient(tx, ty, px, py);
      tg.addColorStop(0, 'transparent');
      tg.addColorStop(1, rgba(colors.colorB, 0.4));
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py);
      ctx.strokeStyle = tg; ctx.lineWidth = 2; ctx.stroke();

      const g = ctx.createRadialGradient(px, py, 0, px, py, 10);
      g.addColorStop(0, rgba(colors.accentGlow, 0.9));
      g.addColorStop(0.5, rgba(colors.colorB, 0.3));
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(px - 10, py - 10, 20, 20);
    }

    // neurons
    for (let ni = 0; ni < neurons.length; ni++) {
      const n = neurons[ni];
      const pulse = 0.85 + Math.sin(t * 2.5 + ni * 0.6) * 0.15;
      const r = 4.5 * pulse;
      const isIO = n.layer === 0 || n.layer === layers.length - 1;

      // outer glow
      const og = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5);
      og.addColorStop(0, rgba(isIO ? colors.colorB : colors.colorA, 0.2));
      og.addColorStop(1, 'transparent');
      ctx.fillStyle = og; ctx.fillRect(n.x - r * 5, n.y - r * 5, r * 10, r * 10);

      // core
      const cg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
      cg.addColorStop(0, isIO ? colors.accentGlow : colors.colorA);
      cg.addColorStop(1, isIO ? colors.colorB : colors.colorA);
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();

      // ring
      ctx.beginPath(); ctx.arc(n.x, n.y, r + 2, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(colors.colorB, 0.25); ctx.lineWidth = 0.8; ctx.stroke();
    }

    animId = requestAnimationFrame(animate);
  }
  animate();
  return () => cancelAnimationFrame(animId);
}

/* ================================================================ */
/*  Canvas2D: Audio Visualizer                                      */
/* ================================================================ */

function audioVisualizerRenderer(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, colors: ThemeColors): () => void {
  const N = 64;
  let animId: number;

  function animate() {
    const t = performance.now() * 0.001;
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const barW = w / (N * 1.6);
    const gap = barW * 0.6;
    const totalW = N * (barW + gap) - gap;
    const sx = (w - totalW) / 2;
    const cy = h * 0.48;

    // background ring
    ctx.save();
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, cy, 80 + i * 50 + Math.sin(t + i) * 10, 0, Math.PI * 2);
      ctx.strokeStyle = colors.colorB; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < N; i++) {
      const f = Math.abs(
        Math.sin(t * 2.5 + i * 0.18) * 0.45 +
        Math.sin(t * 1.6 + i * 0.32) * 0.35 +
        Math.cos(t * 3.4 + i * 0.12) * 0.2 +
        Math.sin(t * 4.0 + i * 0.08) * 0.1
      );
      const barH = f * h * 0.38 + 3;
      const x = sx + i * (barW + gap);
      const blend = i / N;

      // up bar with glow
      const gu = ctx.createLinearGradient(x, cy, x, cy - barH);
      gu.addColorStop(0, rgba(colors.colorA, 0.9));
      gu.addColorStop(0.6, rgba(colors.colorB, 0.85));
      gu.addColorStop(1, rgba(colors.accentGlow, 0.95));
      ctx.fillStyle = gu;
      ctx.beginPath(); ctx.roundRect(x, cy - barH, barW, barH, 2); ctx.fill();

      // mirror
      const gd = ctx.createLinearGradient(x, cy, x, cy + barH * 0.5);
      gd.addColorStop(0, rgba(colors.colorA, 0.35));
      gd.addColorStop(1, 'transparent');
      ctx.fillStyle = gd;
      ctx.beginPath(); ctx.roundRect(x, cy + 2, barW, barH * 0.5, 2); ctx.fill();

      // peak dot
      ctx.fillStyle = colors.accentGlow;
      ctx.shadowColor = colors.accentGlow;
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.roundRect(x - 0.5, cy - barH - 5, barW + 1, 3, 1.5); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // center line with glow
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = colors.colorA; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx - 15, cy); ctx.lineTo(sx + totalW + 15, cy); ctx.stroke();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = colors.borderColor; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx - 15, cy); ctx.lineTo(sx + totalW + 15, cy); ctx.stroke();
    ctx.restore();

    animId = requestAnimationFrame(animate);
  }
  animate();
  return () => cancelAnimationFrame(animId);
}

/* ================================================================ */
/*  Canvas2D Renderer                                               */
/* ================================================================ */

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
        canvas.width = rect.width * devicePixelRatio;
        canvas.height = rect.height * devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      }
    };
    resize(); window.addEventListener('resize', resize);
    const cleanup = project.renderCanvas2D?.(ctx, canvas, colors);
    return () => { window.removeEventListener('resize', resize); if (typeof cleanup === 'function') cleanup(); };
  }, [project, colors]);
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ================================================================ */
/*  DemoCard                                                        */
/* ================================================================ */

function DemoCard({ project, isSelected, onSelect }: { project: DemoProject; isSelected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block', width: '100%', padding: '0.7rem 0.85rem', textAlign: 'left',
        background: isSelected ? 'var(--bg-card)' : hovered ? 'var(--bg-card)' : 'transparent',
        border: `1px solid ${isSelected ? 'var(--accent)' : hovered ? 'var(--accent-dark)' : 'var(--border-color)'}`,
        borderRadius: '10px', cursor: 'pointer', transition: 'all 0.25s ease',
        fontFamily: 'inherit', backdropFilter: 'blur(4px)',
        boxShadow: isSelected ? '0 0 16px rgba(109,40,217,0.12)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'var(--accent-light)' : 'var(--border-color)', boxShadow: isSelected ? '0 0 8px var(--accent-glow)' : 'none', transition: 'all 0.3s' }} />
        <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: isSelected ? 'var(--accent-light)' : 'var(--text-primary)' }}>{project.title}</h4>
      </div>
      <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.4, paddingLeft: '12px' }}>{project.description}</p>
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', paddingLeft: '12px' }}>
        {project.tags.map(tag => (
          <span key={tag} style={{ fontSize: '0.55rem', padding: '1px 5px', borderRadius: '3px', background: isSelected ? 'var(--accent)' : 'var(--bg-secondary)', color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: 500, transition: 'all 0.25s' }}>{tag}</span>
        ))}
      </div>
    </button>
  );
}

/* ================================================================ */
/*  Default projects                                                */
/* ================================================================ */

const defaultProjects: DemoProject[] = [
  { id: 'dna', title: 'DNA 雙螺旋粒子', description: 'Shader 驅動的 600 粒子雙股螺旋，自發光漸變', tags: ['Shader', 'Particles', 'WebGL'], renderer: 'webgl', SceneContent: DNAHelixScene },
  { id: 'terrain', title: '波形地形生成', description: '四重波疊加的即時 GLSL wireframe 地形', tags: ['GLSL', 'Wireframe', 'Shader'], renderer: 'webgl', SceneContent: TerrainScene },
  { id: 'galaxy', title: '粒子星系模擬', description: '四臂螺旋 5000 粒子，自訂 Shader 光暈', tags: ['Shader', 'Particles', '5K'], renderer: 'webgl', SceneContent: GalaxyScene },
  { id: 'neural', title: '神經網路視覺化', description: '脈衝拖尾傳導動畫，多層前饋網路', tags: ['Canvas 2D', 'AI', 'Glow'], renderer: 'canvas2d', renderCanvas2D: neuralNetworkRenderer },
  { id: 'audio', title: '音頻波形分析', description: '64 頻段頻譜 + 鏡像反射 + 峰值追蹤', tags: ['Canvas 2D', 'Spectrum', '64ch'], renderer: 'canvas2d', renderCanvas2D: audioVisualizerRenderer },
];

/* ================================================================ */
/*  Main                                                            */
/* ================================================================ */

export default function LiveDemoShowcase({ projects = defaultProjects }: { projects?: DemoProject[] }) {
  const colors = useThemeColors();
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? '');
  const selected = projects.find(p => p.id === selectedId) ?? projects[0];
  const topBarH = 33;

  return (
    <section style={{ width: '100%', padding: '2.5rem 1rem 2rem' }}>
      <style>{`
        .demo-layout { display: flex; gap: 1rem; align-items: flex-start; }
        .demo-sidebar { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 0.4rem; }
        .demo-viewport { flex: 1; min-width: 0; }
        .demo-viewport-inner { height: 420px; }
        @media (max-width: 768px) {
          .demo-layout { flex-direction: column; }
          .demo-sidebar { width: 100%; flex-direction: row; overflow-x: auto; gap: 0.5rem; padding-bottom: 0.4rem;
            scrollbar-width: thin; -ms-overflow-style: none; }
          .demo-sidebar::-webkit-scrollbar { height: 3px; }
          .demo-sidebar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
          .demo-sidebar > button { min-width: 170px; flex-shrink: 0; }
          .demo-viewport-inner { height: 340px; }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Live Demo</h2>
        <div style={{ width: 60, height: 3, background: 'linear-gradient(90deg, var(--accent), var(--accent-glow))', borderRadius: 2, margin: '0 auto 0.6rem' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>即時互動展示區 — WebGL 與 Canvas 2D 視覺化</p>
      </div>

      <div className="demo-layout" style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* 選單 */}
        <div className="demo-sidebar">
          {projects.map(p => (
            <DemoCard key={p.id} project={p} isSelected={p.id === selectedId} onSelect={() => setSelectedId(p.id)} />
          ))}
        </div>

        {/* 渲染視窗 */}
        <div className="demo-viewport" style={{ borderRadius: '16px', padding: '1px', background: 'linear-gradient(135deg, var(--accent), var(--accent-glow), var(--accent-dark), var(--accent-glow), var(--accent))', backgroundSize: '300% 300%', animation: 'gradientShift 6s ease infinite' }}>
          <div className="demo-viewport-inner" style={{ borderRadius: '15px', overflow: 'hidden', background: 'var(--bg-secondary)', position: 'relative' }}>
            {/* top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.85rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(8px)', height: `${topBarH}px`, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {['#ff5f56', '#ffbd2e', '#27c93f'].map(c => <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginLeft: '0.3rem' }}>{selected?.title}</span>
              </div>
              <span style={{ fontSize: '0.5rem', padding: '1px 6px', borderRadius: '3px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{selected?.renderer.toUpperCase()}</span>
            </div>

            {/* corner decorations */}
            {(['tl', 'tr', 'bl', 'br'] as const).map(c => {
              const t = c[0] === 't', l = c[1] === 'l';
              return <div key={c} style={{ position: 'absolute', [t ? 'top' : 'bottom']: t ? `${topBarH + 4}px` : '4px', [l ? 'left' : 'right']: '4px', width: 14, height: 14, zIndex: 4, pointerEvents: 'none', borderTop: t ? '1.5px solid var(--accent-light)' : 'none', borderBottom: !t ? '1.5px solid var(--accent-light)' : 'none', borderLeft: l ? '1.5px solid var(--accent-light)' : 'none', borderRight: !l ? '1.5px solid var(--accent-light)' : 'none', opacity: 0.35 }} />;
            })}

            {/* render area */}
            <div style={{ width: '100%', height: `calc(100% - ${topBarH}px)` }}>
              {selected?.renderer === 'webgl' ? (
                <Canvas camera={{ position: [0, 0, 5], fov: 50 }} style={{ background: 'transparent' }} dpr={[1, 1.5]}>
                  {selected.SceneContent ? <selected.SceneContent colors={colors} /> : null}
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
