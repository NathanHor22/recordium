import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function StoryStatement({ reducedMotion = false, onRequest }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    if (reducedMotion) return;
    let active = true;
    const context = gsap.context(() => {
      root.current.querySelectorAll("[data-story-beat]").forEach((beat) => {
        gsap.fromTo(
          beat.querySelectorAll("[data-story-reveal]"),
          { y: 24, opacity: 0.2 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.14,
            ease: "power1.out",
            scrollTrigger: {
              trigger: beat,
              start: "top 85%",
              end: () => (window.innerWidth <= 760 ? "top 35%" : "top 20%"),
              scrub: 0.45,
              invalidateOnRefresh: true,
            },
          },
        );
      });
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
    <div id="idea" ref={root} className="editorial-story">
      <section
        className="editorial-quote"
        data-story-beat
        aria-label="Navigating Work in 2026 at Synapze"
      >
        <div className="editorial-quote-inner">
          <blockquote data-story-reveal>
            <p>
              Nobody had the questions beforehand.
              <br />
              Nobody had polished answers ready.
            </p>
          </blockquote>
          <p className="editorial-quote-context" data-story-reveal>
            Navigating Work in 2026.
          </p>
        </div>
      </section>
      <section
        className="editorial-invitation"
        data-story-beat
        aria-labelledby="editorial-invitation-heading"
      >
        <div className="editorial-invitation-inner">
          <h2 id="editorial-invitation-heading" data-story-reveal>
            BRING YOUR PERSPECTIVE.
          </h2>
          <p data-story-reveal>
            The next conversation starts with the people in the room.
          </p>
          <button
            className="editorial-story-button"
            type="button"
            onClick={onRequest}
          >
            Request an invitation
          </button>
        </div>
      </section>
    </div>
  );
}
