import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SeriesPrelude({ reducedMotion = false }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    if (reducedMotion) return;
    let active = true;
    const context = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: () => (window.innerWidth <= 760 ? "top 90%" : "top 75%"),
            end: () => (window.innerWidth <= 760 ? "top 35%" : "top 15%"),
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(
          ".series-prelude-lead",
          { y: 20, opacity: 0.35 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power1.out" },
          0,
        )
        .fromTo(
          ".series-prelude-emphasis",
          { y: 28, opacity: 0.15 },
          { y: 0, opacity: 1, duration: 0.65, ease: "power1.out" },
          0.16,
        )
        .fromTo(
          ".series-prelude-support",
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power1.out" },
          0.48,
        );
    }, root);
    document.fonts.ready.then(() => {
      if (active && root.current) ScrollTrigger.refresh();
    });
    return () => {
      active = false;
      context.revert();
    };
  }, [reducedMotion]);

  return (
    <section
      id="series"
      ref={root}
      className={`series-prelude${reducedMotion ? " series-prelude-static" : ""}`}
      aria-labelledby="series-prelude-heading"
    >
      <div className="series-prelude-stage">
        <div className="series-prelude-copy">
          <h2 id="series-prelude-heading">
            <span className="series-prelude-lead">A SMALL ROOM.</span>
            <span className="series-prelude-emphasis">
              A BIGGER PERSPECTIVE.
            </span>
          </h2>
          <p className="series-prelude-support">
            A monthly gathering of{" "}
            <span className="series-prelude-nowrap">C-suite</span> leaders,
            brought together by one shared question.
          </p>
        </div>
      </div>
    </section>
  );
}
