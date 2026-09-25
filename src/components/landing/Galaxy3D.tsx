"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Galaxy() {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const count = 14000;
    const arms = 4;
    const radius = 10;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const inner = new THREE.Color("#ffd6f5");
    const mid = new THREE.Color("#a78bfa");
    const outer = new THREE.Color("#22d3ee");
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.4) * radius;
      const arm = ((i % arms) / arms) * Math.PI * 2;
      const spin = r * 0.9;
      const rnd = () => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.45 * (r + 0.6);
      positions[i * 3] = Math.cos(arm + spin) * r + rnd();
      positions[i * 3 + 1] = rnd() * 0.35;
      positions[i * 3 + 2] = Math.sin(arm + spin) * r + rnd();
      const t = r / radius;
      const c = t < 0.35 ? inner.clone().lerp(mid, t / 0.35) : mid.clone().lerp(outer, (t - 0.35) / 0.65);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    return { positions, colors };
  }, []);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} sizeAttenuation depthWrite={false} vertexColors blending={THREE.AdditiveBlending} transparent opacity={0.9} />
    </points>
  );
}

/** A little commit graph living inside the galaxy: bright "commit stars" joined by light. */
function Constellation() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(
    () => [
      { p: [-4, 0, 0], c: "#a78bfa" },
      { p: [-2.6, 0, 0], c: "#a78bfa" },
      { p: [-1.2, 0, 0], c: "#a78bfa" },
      { p: [0.2, 0, 0], c: "#a78bfa" },
      { p: [1.6, 0, 0], c: "#a78bfa" },
      { p: [3, 0, 0], c: "#a78bfa" },
      { p: [-0.2, 1.1, 0.4], c: "#22d3ee" },
      { p: [1, 1.2, 0.4], c: "#22d3ee" },
      { p: [0.6, -1.1, -0.3], c: "#f472b6" },
    ] as { p: [number, number, number]; c: string }[],
    [],
  );
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 7], [7, 4], [3, 8]];
  const lineGeo = useMemo(() => {
    const arr = new Float32Array(edges.length * 6);
    edges.forEach(([a, b], i) => arr.set([...nodes[a].p, ...nodes[b].p], i * 6));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.35;
    g.position.y = -3.4 + Math.sin(clock.elapsedTime * 0.6) * 0.12;
    g.children.forEach((m, i) => {
      if (m.type === "Mesh") m.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2 + i) * 0.18);
    });
  });

  return (
    <group ref={group} position={[0, -3.4, 1.5]} scale={0.75}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#c4b5fd" transparent opacity={0.45} />
      </lineSegments>
      {nodes.map((n, i) => (
        <mesh key={i} position={n.p}>
          <sphereGeometry args={[0.13, 20, 20]} />
          <meshBasicMaterial color={n.c} />
        </mesh>
      ))}
      {nodes.map((n, i) => (
        <mesh key={`halo${i}`} position={n.p}>
          <sphereGeometry args={[0.32, 16, 16]} />
          <meshBasicMaterial color={n.c} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig() {
  useFrame(({ camera, pointer }) => {
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.03;
    camera.position.y += (3.2 + pointer.y * 1.0 - camera.position.y) * 0.03;
    camera.lookAt(0, 0.6, 0);
  });
  return null;
}

export default function Galaxy3D() {
  return (
    <Canvas camera={{ position: [0, 3.2, 9.5], fov: 55 }} dpr={[1, 1.8]} gl={{ antialias: true, alpha: true }}>
      <group rotation={[0.12, 0, 0.08]} position={[0, -3.6, -1]}>
        <Galaxy />
      </group>
      <Constellation />
      <CameraRig />
    </Canvas>
  );
}
