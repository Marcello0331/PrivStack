'use client';

import { useEffect } from 'react';

type AppearanceSettings = Record<string, string>;

const BACKGROUND_PRESETS: Record<string, string> = {
  none: 'none',
  aurora: 'linear-gradient(135deg, #111111, #202020)',
  homarr: 'linear-gradient(135deg, #111111, #202020)',
  ember: 'radial-gradient(circle at top left, rgba(239, 68, 68, 0.22), transparent 32%), radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.22), transparent 34%)',
  forest: 'radial-gradient(circle at top left, rgba(34, 197, 94, 0.22), transparent 32%), radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.22), transparent 34%)',
  mono: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(31, 41, 55, 0.35))',
};

function clampNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function normalizeBoolean(value: string | undefined, fallback: boolean) {
  if (value === '0' || value === 'false') return false;
  if (value === '1' || value === 'true') return true;
  return fallback;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return '59, 130, 246';

  const value = Number.parseInt(normalized, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function applyAppearance(settings: AppearanceSettings) {
  const theme = settings.theme_mode === 'light' ? 'light' : 'dark';
  const accent = /^#[0-9a-f]{6}$/i.test(settings.accent_color || '') ? settings.accent_color : '#ef6b63';
  const glassOpacity = clampNumber(settings.glass_opacity, 0.16, 0, 0.4);
  const glassBlur = clampNumber(settings.glass_blur, 10, 0, 30);
  const backgroundType = settings.background_type || 'preset';
  const backgroundValue = settings.background_value || 'homarr';
  const body = document.body;

  document.documentElement.dataset.theme = theme;
  body.style.setProperty('--accent-color', accent);
  body.style.setProperty('--accent-rgb', hexToRgb(accent));
  body.style.setProperty('--glass-opacity', String(glassOpacity));
  body.style.setProperty('--glass-sm-opacity', String(Math.max(glassOpacity - 0.02, 0)));
  body.style.setProperty('--glass-blur', `${glassBlur}px`);
  body.style.setProperty('--dashboard-bg', theme === 'light' ? '#f4f7fb' : '#111111');
  body.style.setProperty('--dashboard-fg', theme === 'light' ? '#111827' : '#ffffff');
  body.style.setProperty('--dashboard-muted', theme === 'light' ? '#4b5563' : '#9ca3af');

  if (backgroundType === 'image' && backgroundValue) {
    body.style.setProperty('--dashboard-bg-layer', `linear-gradient(rgba(10, 10, 10, 0.32), rgba(10, 10, 10, 0.58)), url("${backgroundValue}")`);
  } else if (backgroundType === 'custom' && backgroundValue) {
    body.style.setProperty('--dashboard-bg-layer', backgroundValue);
  } else {
    body.style.setProperty('--dashboard-bg-layer', BACKGROUND_PRESETS[backgroundValue] || BACKGROUND_PRESETS.aurora);
  }

  window.dispatchEvent(new CustomEvent('privstack:appearance', {
    detail: {
      accent,
      particlesEnabled: normalizeBoolean(settings.particles_enabled, true),
    },
  }));
}

function installParticleBackground() {
  if (document.getElementById('particle-canvas')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const particles = Array.from({ length: 50 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    radius: Math.random() + 0.5,
    opacity: Math.random() * 0.5 + 0.1,
  }));

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const draw = () => {
    if (canvas.dataset.enabled === '0') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      requestAnimationFrame(draw);
      return;
    }

    const accent = getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim() || '59, 130, 246';
    ctx.fillStyle = 'rgba(10, 10, 15, 0.01)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = canvas.height;
      if (particle.y > canvas.height) particle.y = 0;

      ctx.fillStyle = `rgba(${accent}, ${particle.opacity})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  };

  resize();
  draw();
  window.addEventListener('resize', resize);
  window.addEventListener('privstack:appearance', ((event: CustomEvent) => {
    canvas.dataset.enabled = event.detail?.particlesEnabled ? '1' : '0';
  }) as EventListener);
}

export default function AppearanceController() {
  useEffect(() => {
    installParticleBackground();

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        if (!response.ok) return;
        applyAppearance(await response.json());
      } catch {
        applyAppearance({});
      }
    };

    loadSettings();
    window.addEventListener('privstack:settings-saved', loadSettings);
    return () => window.removeEventListener('privstack:settings-saved', loadSettings);
  }, []);

  return null;
}
