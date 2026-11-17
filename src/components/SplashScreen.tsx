import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const KERALA_HUBS = ['Tirur', 'Kochi', 'Kozhikode', 'Thrissur', 'Malappuram', 'Trivandrum'];

export const SplashScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [progress, setProgress] = useState(0.14);
  const [hubIndex, setHubIndex] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('lc-reduced-motion'));

    if (prefersReduced) {
      const quick = setTimeout(() => onDone(), 140);
      return () => clearTimeout(quick);
    }

    const cycle = setInterval(() => {
      setHubIndex((prev) => (prev + 1) % KERALA_HUBS.length);
    }, 300);
    const t1 = setTimeout(() => setProgress(0.48), 220);
    const t2 = setTimeout(() => setProgress(0.84), 760);
    const t3 = setTimeout(() => setProgress(1), 1320);
    const t4 = setTimeout(() => onDone(), 1820);

    return () => {
      clearInterval(cycle);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.045, filter: 'blur(4px)' }}
      transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(ellipse 88% 78% at 50% 42%, #195E46 0%, #0E3D2D 52%, #072017 100%)',
      }}
    >
      {/* Subtle architectural latitude grid + drifting Kerala brass halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(248,247,244,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(248,247,244,0.22) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <motion.div
        aria-hidden="true"
        animate={{ scale: [0.94, 1.08, 0.94], opacity: [0.22, 0.34, 0.22] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute h-[460px] w-[460px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(201,155,44,0.48) 0%, transparent 70%)',
        }}
      />

      {/* Top corner architectural telemetry with vertical slot flip for Kerala towns */}
      <div className="pointer-events-none absolute top-6 left-6 right-6 flex items-center justify-between text-[11px] font-medium tracking-[0.18em] uppercase text-[#E6F2EC]/70">
        <span>Kerala · Zero Commission</span>
        <div className="h-4 overflow-hidden flex items-center justify-end min-w-[110px]">
          <AnimatePresence mode="wait">
            <motion.span
              key={KERALA_HUBS[hubIndex]}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono-nums text-[#E5BA4C]"
            >
              {KERALA_HUBS[hubIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-md"
      >
        {/* Dual Counter-Rotating Compass Calibration Crest */}
        <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
          <motion.span
            aria-hidden="true"
            animate={{ scale: [0.84, 1.46], opacity: [0.55, 0] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full border border-[#C99B2C]/80"
          />

          {/* Outer clockwise calibrated brass dial */}
          <motion.svg
            aria-hidden="true"
            viewBox="0 0 160 160"
            className="absolute inset-0 h-full w-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="80"
              cy="80"
              r="72"
              fill="none"
              stroke="rgba(201, 155, 44, 0.45)"
              strokeWidth="1.25"
              strokeDasharray="3 7"
            />
            <circle cx="80" cy="8" r="2.6" fill="#C99B2C" />
            <circle cx="152" cy="80" r="2" fill="#E6F2EC" />
            <circle cx="80" cy="152" r="2.6" fill="#C99B2C" />
            <circle cx="8" cy="80" r="2" fill="#E6F2EC" />
          </motion.svg>

          {/* Inner counter-clockwise precision arc */}
          <motion.svg
            aria-hidden="true"
            viewBox="0 0 160 160"
            className="absolute inset-0 h-full w-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="80"
              cy="80"
              r="58"
              fill="none"
              stroke="rgba(230, 242, 236, 0.35)"
              strokeWidth="1"
              strokeDasharray="24 14 6 14"
            />
          </motion.svg>

          {/* Elevated Ivory Crest with Vector Path-Draw Neighbourhood Pin */}
          <motion.div
            initial={{ scale: 0.76, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.08 }}
            className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-[#F8F7F4] shadow-2xl border border-[#C99B2C]/60"
          >
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <motion.path
                d="M32 9C21.5 9 13 17.5 13 28c0 14.3 16.5 25 18 26a1.9 1.9 0 0 0 2 0c1.5-1 18-11.7 18-26 0-10.5-8.5-19-19-19z"
                fill="#134E3A"
                stroke="#C99B2C"
                strokeWidth="1.5"
                initial={{ pathLength: 0, fillOpacity: 0.15 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
              />
              <circle cx="32" cy="27" r="9.8" fill="#F8F7F4" />
              <motion.path
                d="M32 19.5L34.3 25L39.8 27L34.3 29L32 34.5L29.7 29L24.2 27L29.7 25Z"
                fill="#C99B2C"
                initial={{ scale: 0.4, rotate: -45 }}
                animate={{ scale: 1, rotate: [0, 90, 180] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ originX: '32px', originY: '27px' }}
              />
            </svg>
          </motion.div>
        </div>

        {/* Multilingual Kerala Identity with Architectural Mask Reveal */}
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.32em' }}
          animate={{ opacity: 0.88, letterSpacing: '0.22em' }}
          transition={{ duration: 0.65, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs font-medium uppercase text-[#E6F2EC]"
        >
          ലോക്കൽ കണക്റ്റ് · लोकल कनेक्ट
        </motion.p>

        <div className="overflow-hidden mt-2">
          <motion.h1
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.56, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#F8F7F4]"
          >
            LocalConnect
          </motion.h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.92, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2.5 text-sm sm:text-base text-[#E6F2EC] font-medium"
        >
          Your Neighbourhood. Your Services.
        </motion.p>

        {/* Smooth GPU-composited hairline progress track */}
        <div className="mt-8 w-60 h-[3px] rounded-full bg-white/15 overflow-hidden">
          <motion.div
            className="h-full w-full origin-left bg-gradient-to-r from-[#C99B2C] via-[#E5BA4C] to-[#F8F7F4]"
            initial={{ scaleX: 0.14 }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <motion.button
          type="button"
          onClick={onDone}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-6 rounded-lg border border-white/25 bg-white/10 px-5 py-2 text-xs font-semibold text-[#F8F7F4] backdrop-blur-sm hover:bg-white/20 transition-colors"
        >
          Enter Marketplace
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
