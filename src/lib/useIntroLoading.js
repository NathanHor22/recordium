import { useCallback, useEffect, useState } from "react";

let enteredCollection = false;
const images = [
  "/assets/art-intro.png",
  "/assets/art-ai.png",
  "/assets/brand-board.jpeg",
];

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      (image.decode?.() || Promise.resolve()).catch(() => {}).then(resolve);
    image.onerror = resolve;
    image.src = src;
  });
}

export default function useIntroLoading(sceneReady, reducedMotion) {
  const [visible, setVisible] = useState(() => !enteredCollection);
  const [loaded, setLoaded] = useState(0);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [fillReady, setFillReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const finish = useCallback(() => setCompleting(true), []);
  const onFillComplete = useCallback(() => setFillReady(true), []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const tasks = [...images.map(preloadImage), document.fonts.ready];
    for (const task of tasks) {
      Promise.resolve(task)
        .catch(() => {})
        .then(() => {
          if (!cancelled)
            setLoaded((count) => Math.min(tasks.length, count + 1));
        });
    }
    const minimum = setTimeout(
      () => setMinimumElapsed(true),
      reducedMotion ? 0 : 1200,
    );
    const escape = setTimeout(() => setCanContinue(true), 6000);
    // Never leave the usable HTML collection trapped behind a failed WebGL/resource load.
    const deadline = setTimeout(finish, 12000);
    return () => {
      cancelled = true;
      clearTimeout(minimum);
      clearTimeout(escape);
      clearTimeout(deadline);
    };
  }, [visible, reducedMotion, finish]);

  useEffect(() => {
    if (visible && loaded === 4 && sceneReady && minimumElapsed) finish();
  }, [visible, loaded, sceneReady, minimumElapsed, finish]);

  useEffect(() => {
    if (!completing) return;
    enteredCollection = true;
    // A paused rendering loop must not prevent entry after resources are ready.
    const fallback = setTimeout(onFillComplete, reducedMotion ? 0 : 1000);
    return () => clearTimeout(fallback);
  }, [completing, reducedMotion, onFillComplete]);

  useEffect(() => {
    if (!completing || !fillReady) return;
    const fade = setTimeout(() => setExiting(true), reducedMotion ? 0 : 120);
    return () => clearTimeout(fade);
  }, [completing, fillReady, reducedMotion]);

  useEffect(() => {
    if (!exiting) return;
    const close = setTimeout(() => setVisible(false), reducedMotion ? 0 : 1020);
    return () => clearTimeout(close);
  }, [exiting, reducedMotion]);

  return {
    visible,
    exiting,
    canContinue,
    finish,
    onFillComplete,
    progress: completing
      ? 1
      : Math.min(0.94, 0.08 + (loaded / 4) * 0.7 + (sceneReady ? 0.18 : 0)),
  };
}
