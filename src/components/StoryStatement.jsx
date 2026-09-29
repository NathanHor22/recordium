import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function StoryStatement({ reducedMotion, onRequest }) {
  const root = useRef(null);
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const context = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top 65%",
            end: "bottom bottom",
            scrub: 0.6,
          },
        })
        .fromTo(
          ".statement-first",
          { y: 65, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.35 },
        )
        .to(
          ".statement-first",
          { y: -90, scale: 1.08, autoAlpha: 0, duration: 0.3 },
          0.62,
        )
        .fromTo(
          ".statement-next",
          { y: 90, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.4 },
          0.8,
        );
    }, root);
    return () => context.revert();
  }, [reducedMotion]);
  return (
    <section
      id="idea"
      ref={root}
      className="story-statement"
      aria-label="The monthly conversation series"
    >
      <div className="statement-sticky">
        <div className="statement-first">
          <h2>
            A SMALL ROOM.
            <br />
            <span>A BIGGER PERSPECTIVE.</span>
          </h2>
          <p>
            A monthly gathering of C-suite leaders for honest conversations.
            <br />
            One shared question. Different experiences around the table.
          </p>
        </div>
        <div className="statement-next">
          <h2>BRING YOUR PERSPECTIVE.</h2>
          <p>The next conversation starts with the people in the room.</p>
          <button className="button button-light" onClick={onRequest}>
            Request an invitation
          </button>
        </div>
      </div>
    </section>
  );
}
