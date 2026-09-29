import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import BrandLogo from "./BrandLogo";
import "../vinyl-loader.css";

const PHRASES = [
  "Cleaning the vinyl",
  "Finding the groove",
  "Spinning up",
  "Ready when you are",
];

// One continuous groove makes the colour travel from the label to the rim.
const SPIRAL = Array.from({ length: 561 }, (_, index) => {
  const fraction = index / 560;
  const angle = fraction * Math.PI * 14 - Math.PI / 2;
  const radius = 51 + fraction * 96;
  return `${index ? "L" : "M"}${(160 + Math.cos(angle) * radius).toFixed(2)},${(160 + Math.sin(angle) * radius).toFixed(2)}`;
}).join(" ");

const GROOVES = Array.from({ length: 28 }, (_, index) => 54 + index * 3.4);

export default function VinylLoader({
  progress = 0,
  exiting = false,
  reducedMotion = false,
  getTarget,
  onContinue,
}) {
  const disc = useRef(null);
  const targetGetter = useRef(getTarget);
  targetGetter.current = getTarget;
  useLayoutEffect(() => {
    if (!exiting || reducedMotion || !disc.current) return;
    const element = disc.current;
    let target = targetGetter.current?.();
    const bounds = element.getBoundingClientRect();
    const flight = { progress: 0 };
    const tween = gsap.to(flight, {
      progress: 1,
      duration: 0.85,
      ease: "power3.inOut",
      onUpdate: () => {
        // Keep following the platter while the scene's camera settles.
        target = targetGetter.current?.() || target;
        const amount = flight.progress;
        gsap.set(
          element,
          target && target.width > 0
            ? {
                x:
                  (target.x +
                    target.width / 2 -
                    bounds.left -
                    bounds.width / 2) *
                  amount,
                y:
                  (target.y +
                    target.height / 2 -
                    bounds.top -
                    bounds.height / 2) *
                  amount,
                scaleX: 1 + (target.width / bounds.width - 1) * amount,
                scaleY: 1 + (target.height / bounds.height - 1) * amount,
              }
            : {
                scale: 1 - 0.15 * amount,
                y: 20 * amount,
              },
        );
      },
    });
    return () => tween.kill();
  }, [exiting, reducedMotion]);
  const readiness = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  const phraseIndex =
    readiness >= 1 ? 3 : readiness >= 0.62 ? 2 : readiness >= 0.28 ? 1 : 0;

  return (
    <section
      className={`vinyl-loader${exiting ? " vinyl-loader-exiting" : ""}${reducedMotion ? " vinyl-loader-reduced" : ""}`}
      aria-label="For the Greater Good is loading"
      data-ready={readiness === 1}
    >
      <div className="vinyl-loader-inner">
        <BrandLogo className="vinyl-loader-brand" />
        <div ref={disc} className="vinyl-loader-disc" aria-hidden="true">
          <svg
            className="vinyl-loader-record"
            viewBox="0 0 320 320"
            focusable="false"
          >
            <circle className="vinyl-loader-rim" cx="160" cy="160" r="153" />
            <circle
              className="vinyl-loader-surface"
              cx="160"
              cy="160"
              r="149"
            />
            <path
              className="vinyl-loader-colour"
              d={SPIRAL}
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - readiness}
              style={{ opacity: readiness > 0 ? 1 : 0 }}
            />
            <g className="vinyl-loader-grooves">
              {GROOVES.map((radius) => (
                <circle key={radius} cx="160" cy="160" r={radius} />
              ))}
            </g>
            <circle className="vinyl-loader-label" cx="160" cy="160" r="46" />
            <circle
              className="vinyl-loader-label-ring"
              cx="160"
              cy="160"
              r="36"
            />
            <circle
              className="vinyl-loader-label-mark"
              cx="160"
              cy="133"
              r="4"
            />
            <circle className="vinyl-loader-spindle" cx="160" cy="160" r="6" />
            <path
              className="vinyl-loader-reflection"
              d="M58 58 A144 144 0 0 1 236 37"
            />
          </svg>
        </div>
        <div className="vinyl-loader-caption">
          <div className="vinyl-loader-phrases" aria-hidden="true">
            {PHRASES.map((phrase, index) => (
              <span
                key={phrase}
                className={
                  index === phraseIndex ? "vinyl-loader-phrase-active" : ""
                }
              >
                {phrase}
              </span>
            ))}
          </div>
          <span
            className="vinyl-loader-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {PHRASES[phraseIndex]}
          </span>
        </div>
        <div className="vinyl-loader-action">
          {onContinue && (
            <button
              type="button"
              className="vinyl-loader-continue"
              onClick={onContinue}
              disabled={exiting}
            >
              Enter the collection
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
