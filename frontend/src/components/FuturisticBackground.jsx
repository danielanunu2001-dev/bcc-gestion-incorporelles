import React, { Suspense, lazy, useMemo } from 'react';
import { motion } from 'framer-motion';

const ThreeScene = lazy(() => import('./ThreeScene'));

class Canvas3DBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn('[FuturisticBackground] 3D scene failed, using CSS fallback:', error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function CSSLayers() {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        size: 2 + Math.random() * 5,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 12 + Math.random() * 18,
        delay: Math.random() * 8,
        color: ['#00fff7', '#7c3aed', '#3b82f6', '#ec4899'][
          Math.floor(Math.random() * 4)
        ],
      })),
    []
  );

  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          inset: '-20%',
          background:
            'conic-gradient(from 0deg at 50% 50%, rgba(0,255,247,0.08), rgba(124,58,237,0.08), rgba(236,72,153,0.08), rgba(0,255,247,0.08))',
          filter: 'blur(60px)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(0,255,247,0.08) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(0,255,247,0.08) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, transparent 80%)',
        }}
      />

      {particles.map((p) => (
        <motion.span
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            opacity: 0.7,
          }}
          animate={{
            y: [0, -40, 0, 40, 0],
            x: [0, 20, 0, -20, 0],
            opacity: [0.3, 0.9, 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      <motion.div
        style={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0,255,247,0.35) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(124,58,237,0.40) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.6, 0.95, 0.6] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          background:
            'linear-gradient(90deg, transparent, rgba(0,255,247,0.6), transparent)',
          boxShadow: '0 0 20px rgba(0,255,247,0.8)',
        }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
    </>
  );
}

function FuturisticBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at 20% 10%, rgba(124,58,237,0.35) 0%, transparent 60%),' +
          'radial-gradient(ellipse at 80% 90%, rgba(0,255,247,0.30) 0%, transparent 60%),' +
          'radial-gradient(ellipse at 50% 50%, rgba(0,255,247,0.10) 0%, transparent 70%),' +
          'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
      }}
    >
      <CSSLayers />

      <Canvas3DBoundary>
        <Suspense fallback={null}>
          <ThreeScene />
        </Suspense>
      </Canvas3DBoundary>
    </div>
  );
}

export default FuturisticBackground;