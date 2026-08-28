'use client';
import { useEffect, useRef } from 'react';

/**
 * CyberBackground — lightweight canvas animation.
 * Renders: scrolling dot-grid, floating particles, network connection lines,
 * and small "data pulse" rings. Pure requestAnimationFrame, no libraries.
 * Designed to stay under 2% CPU on modern hardware.
 */
export default function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctxMaybe = canvasEl.getContext('2d');
    if (!ctxMaybe) return;
    // Keep stable non-null references inside the closure
    const canvas = canvasEl;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx = ctxMaybe!;

    let animId: number;
    let W = 0, H = 0;

    // ── Particle pool ───────────────────────────────────────
    const PARTICLE_COUNT = 55;
    type Particle = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; pulse: number };
    const particles: Particle[] = [];

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.8 + 0.6,
          alpha: Math.random() * 0.5 + 0.15,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    // ── Data pulse rings ─────────────────────────────────────
    type Ring = { x: number; y: number; radius: number; maxR: number; alpha: number; color: string };
    const rings: Ring[] = [];
    const RING_COLORS = ['rgba(6,182,212,', 'rgba(59,130,246,', 'rgba(124,58,237,', 'rgba(16,185,129,'];

    function spawnRing() {
      if (rings.length > 8) return;
      rings.push({
        x: Math.random() * W,
        y: Math.random() * H,
        radius: 0,
        maxR: Math.random() * 60 + 30,
        alpha: 0.6,
        color: RING_COLORS[Math.floor(Math.random() * RING_COLORS.length)],
      });
    }

    // ── Resize handler ────────────────────────────────────────
    function resize() {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
      initParticles();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let frame = 0;
    // ── Draw loop ─────────────────────────────────────────────
    function draw() {
      animId = requestAnimationFrame(draw);
      frame++;

      // Clear with very subtle trail for ghosting effect
      ctx.fillStyle = 'rgba(5,8,16,0.18)';
      ctx.fillRect(0, 0, W, H);

      // ── Dot grid ──────────────────────────────────────────
      const gridStep = 36;
      const offset = (frame * 0.18) % gridStep;
      ctx.fillStyle = 'rgba(30,50,90,0.45)';
      for (let x = -gridStep + offset; x < W + gridStep; x += gridStep) {
        for (let y = 0; y < H; y += gridStep) {
          ctx.beginPath();
          ctx.arc(x, y, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Horizontal scan line ───────────────────────────────
      const scanY = (frame * 0.6) % H;
      const sg = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 8);
      sg.addColorStop(0, 'rgba(6,182,212,0)');
      sg.addColorStop(1, 'rgba(6,182,212,0.04)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 40, W, 48);

      // ── Network connection lines between nearby particles ──
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.18;
            ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // ── Particles ──────────────────────────────────────────
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.04;

        // Wrap around
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        const a = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
        ctx.fillStyle = `rgba(96,165,250,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Data pulse rings ────────────────────────────────────
      if (frame % 90 === 0) spawnRing();

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.radius += 0.9;
        ring.alpha -= 0.008;
        if (ring.alpha <= 0) { rings.splice(i, 1); continue; }

        ctx.strokeStyle = ring.color + ring.alpha + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
