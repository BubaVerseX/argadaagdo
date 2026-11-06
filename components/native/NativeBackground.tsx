"use client";

import { useEffect, useRef } from "react";

// Design D (docs/design-v3/backgrounds.html, "Your mix (A + C)"): fine mint
// lines flowing slowly on deep green, with small detailed leaves floating on
// top. App only (mounted by NativeShell).
//
// Kept cheap on purpose: the canvas redraws 15 times a second at most,
// at no more than 1.5x pixel density, and stops completely while the app is in
// the background or the screen is hidden. The leaves are CSS transforms, which
// the GPU animates without JavaScript. With "Reduce motion" on, the lines are
// drawn once and nothing moves.

const LEAVES = [
  { left: "6%", top: "18%", size: 46, fill: "#B8E6C4", vein: "#164A3F", delay: 0, duration: 14, detailed: true },
  { right: "7%", top: "11%", size: 38, fill: "#8FD19E", vein: "#0F3A32", delay: -3, duration: 17, detailed: true },
  { left: "31%", top: "39%", size: 34, fill: "#E7A93A", vein: "#FFF3D6", delay: -7, duration: 14, detailed: true },
  { right: "10%", top: "52%", size: 50, fill: "#B8E6C4", vein: "#164A3F", delay: -10, duration: 19, detailed: true },
  { left: "8%", top: "70%", size: 30, fill: "#8FD19E", vein: "#0F3A32", delay: -5, duration: 15, detailed: false },
  { right: "28%", top: "30%", size: 28, fill: "#E07A57", vein: "#FFE3D8", delay: -12, duration: 14, detailed: false },
  { right: "18%", top: "84%", size: 32, fill: "#B8E6C4", vein: "#164A3F", delay: -8, duration: 18, detailed: false },
];

function Leaf({ fill, vein, detailed }: { fill: string; vein: string; detailed: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M18 84 C14 50 38 20 84 14 C88 52 62 82 22 86 Z" fill={fill} />
      <path d="M20 84 C40 62 58 42 82 16" stroke={vein} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {detailed && (
        <path
          d="M36 64 L30 48 M46 54 L42 36 M56 44 L54 28 M44 60 L60 60 M54 50 L70 48 M64 40 L76 36"
          stroke={vein}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function NativeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let time = 0;
    let frame = 0;
    let lastDraw = 0;
    let running = false;

    function resize() {
      // Faint 1px lines: 1.5x density looks the same as 3x and costs a quarter.
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.round(width * ratio);
      canvas!.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }

    function draw() {
      context!.clearRect(0, 0, width, height);
      const lines = Math.max(18, Math.round(height / 34));
      const gap = height / (lines - 2);
      context!.lineWidth = 1;
      for (let i = 0; i < lines; i++) {
        const base = height * 0.06 + i * gap;
        context!.beginPath();
        for (let x = 0; x <= width + 8; x += 8) {
          const y =
            base +
            Math.sin(x * 0.018 + time * 0.6 + i * 0.35) * 14 +
            Math.sin(x * 0.007 - time * 0.4 + i * 0.2) * 22;
          if (x === 0) context!.moveTo(x, y);
          else context!.lineTo(x, y);
        }
        const alpha = 0.06 + 0.16 * Math.max(0, Math.sin(i * 0.4 + time * 0.3));
        context!.strokeStyle = `rgba(184,230,196,${alpha.toFixed(3)})`;
        context!.stroke();
      }
    }

    function loop(now: number) {
      frame = requestAnimationFrame(loop);
      if (now - lastDraw < 66) return;
      // Same speed as the mock-up at 60 fps, drawn 15 times a second: the
      // lines move a fraction of a pixel per frame, so it looks as smooth.
      time += 0.012 * Math.min(4, (now - lastDraw) / 16.7);
      lastDraw = now;
      draw();
    }

    function start() {
      if (running || still.matches || document.hidden) return;
      running = true;
      lastDraw = performance.now();
      frame = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(frame);
    }

    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotionChange = () => (still.matches ? (stop(), draw()) : start());

    // The app going to the background (Capacitor), besides the page being hidden.
    const app = (window as unknown as {
      Capacitor?: {
        Plugins?: {
          App?: {
            addListener?: (
              event: "appStateChange",
              callback: (state: { isActive: boolean }) => void
            ) => Promise<{ remove: () => Promise<void> }>;
          };
        };
      };
    }).Capacitor?.Plugins?.App;
    const appListener = app?.addListener?.("appStateChange", (state) =>
      state.isActive ? start() : stop()
    );

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    still.addEventListener("change", onMotionChange);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      still.removeEventListener("change", onMotionChange);
      void appListener?.then((handle) => handle.remove());
    };
  }, []);

  return (
    <div aria-hidden="true" className="native-bg">
      <canvas ref={canvasRef} />
      {LEAVES.map(({ fill, vein, detailed, size, delay, duration, ...position }, index) => (
        <span
          key={index}
          className="native-bg-leaf"
          style={{
            ...position,
            width: size,
            height: size,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        >
          <Leaf fill={fill} vein={vein} detailed={detailed} />
        </span>
      ))}
    </div>
  );
}
