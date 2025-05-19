'use client';

import React, { useCallback } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { Engine } from 'tsparticles-engine';

interface ParticleBackgroundProps {
  id?: string;
  className?: string;
  particleColor?: string;
  background?: string;
  particleDensity?: number;
  speed?: number;
  minSize?: number;
  maxSize?: number;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  id = 'tsparticles',
  className,
  particleColor = '#ffffff',
  background = 'transparent',
  particleDensity = 80,
  speed = 2,
  minSize = 0.6,
  maxSize = 2,
}) => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      id={id}
      className={`w-full h-full absolute top-0 left-0 ${className || ''}`}
      init={particlesInit}
      options={{
        fullScreen: false,
        background: {
          color: {
            value: background,
          },
        },
        fpsLimit: 60,
        particles: {
          color: {
            value: particleColor,
          },
          number: {
            density: {
              enable: true,
              area: 800,
            },
            value: particleDensity,
          },
          opacity: {
            value: { min: 0.1, max: 0.8 },
            animation: {
              enable: true,
              speed: 0.5,
              sync: false,
            },
          },
          size: {
            value: { min: minSize, max: maxSize },
            random: true,
          },
          move: {
            enable: true,
            direction: 'none',
            outModes: {
              default: 'out',
            },
            random: true,
            speed: speed,
            straight: false,
          },
          twinkle: {
            particles: {
              enable: true,
              frequency: 0.05,
              opacity: 1,
            },
          },
        },
        detectRetina: true,
      }}
    />
  );
};

export default ParticleBackground; 