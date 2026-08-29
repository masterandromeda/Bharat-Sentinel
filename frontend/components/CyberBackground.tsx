'use client';
import { useEffect, useRef } from 'react';

/**
 * CyberBackground — premium enterprise SOC canvas animation.
 * Grid nodes + connecting network lines + orbiting threat dots +
 * data pulse rings + horizontal scan line. Pure rAF, no libs.
 */
export default function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctxMaybe = canvasEl.getContext('2d');
    if (!ctxMaybe) return;
    const canvas = canvasEl;
    const ctx = ctxMaybe;

    let animId: number;
    let W = 0, H = 0;

    // ── Node (particle) pool ───────────────────────────────────────
    const NODE_COUNT = 70;
    type Node = {
      x: number; y: number;
      vx: number; vy: number;
      r: number; alpha: number;
      pulse: number; color: string;
    };
    const nodes: Node[] = [];
    const NODE_COLORS = [
      'rgba(96,165,250,', 'rgba(6,182,212,', 'rgba(167,139,250,', 'rgba(52,211,153,',
    ];

    function initNodes() {
      nodes.length = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
          r: Math.random() * 2 + 0.8,
          alpha: Math.random() * 0.55 + 0.15,
          pulse: Math.random() * Math.PI * 2,
          color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
        });
      }
    }

    // ── Pulse rings ────────────────────────────────────────────────
    type Ring = { x: number; y: number; r: number; maxR: number; alpha: number; color: string };
    const rings: Ring[] = [];
    const RING_COLORS = [
      'rgba(6,182,212,', 'rgba(59,130,246,', 'rgba(124,58,237,', 'rgba(16,185,129,',
    ];

    function spawnRing() {
      if (rings.length >= 10) return;
      rings.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0,
        maxR: Math.random() * 80 + 40,
        alpha: 0.55,
        color: RING_COLORS[Math.floor(Math.random() * RING_COLORS.length)],
      });
    }

    // ── Threat streaks (moving diagonal lines) ─────────────────────
    type Streak = { x: number; y: number; len: number; speed: number; alpha: number; color: string };
    const streaks: Streak[] = [];
    const STREAK_COLORS = ['rgba(239,68,68,', 'rgba(245,158,11,', 'rgba(6,182,212,'];

    function spawnStreak() {
      if (streaks.length >= 6) return;
      streaks.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.6,
        len: Math.random() * 60 + 30,
        speed: Math.random() * 1.5 + 0.8,
        alpha: Math.random() * 0.3 + 0.1,
        color: STREAK_COLORS[Math.floor(Math.random() * STREAK_COLORS.length)],
      });
    }

    // ── Resize ─────────────────────────────────────────────────────
    function resize() {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
      initNodes();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let frame = 0;

    function draw() {
      animId = requestAnimationFrame(draw);
      frame++;

      // Deep trailing clear
      ctx.fillStyle = 'rgba(3,5,15,0.22)';
      ctx.fillRect(0, 0, W, H);

      // ── Background hex grid (static subtle) ───────────────────
      const gs = 44;
      ctx.strokeStyle = 'rgba(20,35,70,0.35)';
      ctx.lineWidth = 0.5;
      const offsetX = (frame * 0.12) % gs;
      for (let x = -gs + offsetX; x < W + gs; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // ── Diagonal grid accent ──────────────────────────────────
      ctx.strokeStyle = 'rgba(30,50,90,0.12)';
      ctx.lineWidth = 0.3;
      for (let x = -H; x < W + H; x += gs * 2.5) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke();
      }

      // ── Horizontal scan line ──────────────────────────────────
      const scanY = (frame * 0.45) % H;
      const sg = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 10);
      sg.addColorStop(0, 'rgba(6,182,212,0)');
      sg.addColorStop(0.8, 'rgba(6,182,212,0.05)');
      sg.addColorStop(1, 'rgba(6,182,212,0.02)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 50, W, 60);

      // ── Network lines between nearby nodes ────────────────────
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.2;
            ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // ── Nodes ─────────────────────────────────────────────────
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.035;
        if (n.x < -10) n.x = W + 10;
        if (n.x > W + 10) n.x = -10;
        if (n.y < -10) n.y = H + 10;
        if (n.y > H + 10) n.y = -10;
        const a = n.alpha * (0.65 + 0.35 * Math.sin(n.pulse));
        ctx.fillStyle = n.color + a + ')';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Pulse rings ────────────────────────────────────────────
      if (frame % 75 === 0) spawnRing();
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += 0.85; ring.alpha -= 0.007;
        if (ring.alpha <= 0) { rings.splice(i, 1); continue; }
        ctx.strokeStyle = ring.color + ring.alpha + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        // Inner dot
        if (ring.r < 8) {
          ctx.fillStyle = ring.color + (ring.alpha * 0.6) + ')';
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Threat streaks ─────────────────────────────────────────
      if (frame % 120 === 0) spawnStreak();
      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        s.x += s.speed; s.y += s.speed * 0.6;
        s.alpha -= 0.003;
        if (s.alpha <= 0 || s.x > W + s.len || s.y > H + s.len) {
          streaks.splice(i, 1); continue;
        }
        ctx.strokeStyle = s.color + s.alpha + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.len * 0.7, s.y + s.len * 0.4);
        ctx.stroke();
      }

      // ── Corner glow accents ────────────────────────────────────
      if (frame % 6 === 0) {
        const glowA = 0.02 + 0.015 * Math.sin(frame * 0.03);
        const tlGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.35);
        tlGrad.addColorStop(0, `rgba(37,99,235,${glowA})`);
        tlGrad.addColorStop(1, 'rgba(37,99,235,0)');
        ctx.fillStyle = tlGrad;
        ctx.fillRect(0, 0, W * 0.35, H * 0.35);

        const brGrad = ctx.createRadialGradient(W, H, 0, W, H, W * 0.3);
        brGrad.addColorStop(0, `rgba(124,58,237,${glowA * 0.8})`);
        brGrad.addColorStop(1, 'rgba(124,58,237,0)');
        ctx.fillStyle = brGrad;
        ctx.fillRect(W * 0.65, H * 0.65, W * 0.35, H * 0.35);
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
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none', display: 'block',
      }}
    />
  );
}
