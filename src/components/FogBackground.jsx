import { useEffect, useRef, useState } from "react";
import "../fog.css";

function disposeFog(effect) {
  if (!effect) return;
  const renderer = effect.renderer;
  try {
    effect.destroy();
  } catch {
    // A failed Vanta initialization can already have detached its canvas.
    window.cancelAnimationFrame(effect.req);
  } finally {
    // Vanta removes its canvas but does not release the renderer/context itself.
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  }
}

export default function FogBackground({
  reducedMotion = false,
  paused = false,
}) {
  const hostRef = useRef(null);
  const frameRef = useRef(null);
  const hasFrame = useRef(false);
  const [status, setStatus] = useState("loading");
  const stopped = reducedMotion || paused;

  useEffect(() => {
    const host = hostRef.current;
    const frame = frameRef.current;
    let cancelled = false;
    let effect = null;

    const captureFrame = () => {
      const renderer = effect?.renderer;
      if (!renderer || !effect.scene || !effect.camera) return;
      try {
        // Render immediately before copying because WebGL clears its draw buffer.
        renderer.render(effect.scene, effect.camera);
        frame.width = renderer.domElement.width;
        frame.height = renderer.domElement.height;
        const context = frame.getContext("2d");
        if (!context) return;
        context.drawImage(renderer.domElement, 0, 0);
        hasFrame.current = true;
      } catch {
        // The CSS background remains available if WebGL loses its context.
      }
    };

    if (stopped && hasFrame.current) {
      setStatus("paused");
      return undefined;
    }

    setStatus("loading");

    const startFog = async () => {
      try {
        const [{ default: FOG }, THREE] = await Promise.all([
          import("vanta/src/vanta.fog.js"),
          import("three"),
        ]);
        if (cancelled) return;

        // Preserve Vanta's original color values without patching shared Three colors.
        class VantaColor extends THREE.Color {
          constructor(value) {
            super(value);
            if (typeof value === "number") {
              this.setHex(value, THREE.LinearSRGBColorSpace);
            }
          }
        }

        effect = FOG({
          el: host,
          THREE: { ...THREE, Color: VantaColor },
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          highlightColor: 0xdbdbdb,
          midtoneColor: 0x5d5d65,
          lowlightColor: 0x4a4aa4,
          baseColor: 0xffffff,
          backgroundColor: 0xffffff,
          zoom: 1.1,
        });

        if (!effect.renderer || !effect.scene || !effect.camera) {
          throw new Error("Fog renderer could not initialize");
        }

        if (stopped) {
          captureFrame();
          disposeFog(effect);
          effect = null;
          setStatus(hasFrame.current ? "paused" : "fallback");
        } else {
          setStatus("live");
        }
      } catch {
        // Constructor failures may leave a partial Vanta instance to release.
        const partial = window.VANTA?.current;
        if (!effect && partial?.el === host) effect = partial;
        disposeFog(effect);
        effect = null;
        if (!cancelled) setStatus("fallback");
      }
    };

    startFog();

    return () => {
      cancelled = true;
      captureFrame();
      disposeFog(effect);
      effect = null;
    };
  }, [stopped]);

  return (
    <div className="fog-background" data-state={status} aria-hidden="true">
      <canvas className="fog-background__frame" ref={frameRef} />
      <div className="fog-background__effect" ref={hostRef} />
    </div>
  );
}
