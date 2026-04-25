import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function SpinningKnot({ position, color, scale = 1, speed = 1 }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.3 * speed;
    ref.current.rotation.y += delta * 0.4 * speed;
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <torusKnotGeometry args={[1, 0.3, 128, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

function WireframeSphere({ position, color, scale = 1 }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.2;
    ref.current.rotation.y += delta * 0.15;
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  );
}

function Stars() {
  const pointsRef = useRef();
  const positions = useMemo(() => {
    const count = 1200;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

export default function ThreeScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 8], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#00fff7" />
      <pointLight position={[-10, -10, -5]} intensity={1} color="#7c3aed" />
      <pointLight position={[0, 8, 5]} intensity={0.8} color="#ec4899" />

      <Stars />

      <SpinningKnot position={[-4, 1, -2]} color="#00fff7" scale={0.8} />
      <SpinningKnot position={[4, -1, -3]} color="#7c3aed" scale={0.9} speed={1.3} />
      <WireframeSphere position={[0, 2, -4]} color="#ec4899" scale={1.1} />
      <WireframeSphere position={[-5, -2, -5]} color="#3b82f6" scale={0.7} />
      <WireframeSphere position={[5, 2.5, -6]} color="#00fff7" scale={0.6} />
    </Canvas>
  );
}