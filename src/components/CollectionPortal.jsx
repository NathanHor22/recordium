import { useLayoutEffect, useRef } from "react";
import { Disc3 } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function CollectionPortal({ onSelect, reducedMotion }) {
  const root = useRef(null);
  const title = useRef(null);
  const reveal = useRef(null);
  const progress = useRef(null);
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top 85%",
          end: "bottom bottom",
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
      });
      timeline
        .fromTo(
          title.current,
          { scale: 0.25, y: 70, opacity: 0.5 },
          { scale: 1, y: 0, opacity: 1, duration: 0.42, ease: "power2.out" },
        )
        .to(
          title.current,
          {
            scale: 1.45,
            opacity: 0,
            duration: 0.28,
            ease: "power2.in",
          },
          0.5,
        )
        .fromTo(
          reveal.current,
          { y: 60, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.32, ease: "power2.out" },
          0.65,
        )
        .fromTo(
          ".catalogue-object",
          { y: 65, rotate: 3 },
          {
            y: 0,
            rotate: 0,
            duration: 0.35,
            stagger: 0.06,
            ease: "power2.out",
          },
          0.68,
        )
        .to({}, { duration: 0.2 });
      gsap.to(progress.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: true,
        },
      });
    }, root);
    document.fonts.ready.then(() => {
      if (root.current) ScrollTrigger.refresh();
    });
    return () => context.revert();
  }, [reducedMotion]);
  return (
    <section
      id="collection"
      ref={root}
      className="collection-portal"
      aria-labelledby="collection-heading"
    >
      <div className="portal-sticky">
        <div className="portal-title-stage" aria-hidden="true">
          <div ref={title} className="portal-title">
            <span>EXPLORE</span>
            <strong>
              THE COLLECTION<span>.</span>
            </strong>
          </div>
        </div>
        <div ref={reveal} className="collection-reveal section-inset">
          <div className="collection-reveal-heading">
            <div>
              <h2 id="collection-heading">EVERY ROOM. ITS OWN RECORD.</h2>
            </div>
            <p>
              Different people. Shared questions. A collection that keeps
              growing.
            </p>
          </div>
          <div className="collection-sleeves">
            <button
              className="catalogue-record catalogue-record-intro"
              onClick={() => onSelect("intro")}
              aria-label="Open The first conversation"
            >
              <div className="catalogue-object">
                <span className="catalogue-vinyl">
                  <span>
                    <Disc3 size={40} />
                  </span>
                </span>
                <div className="catalogue-cover">
                  <img src="/assets/art-intro.png" alt="" />
                  <span className="mono catalogue-topline">
                    FTGG - 001 <span>SYNAPZE / 2026</span>
                  </span>
                  <span className="catalogue-cover-title">
                    CONVERSATIONS
                    <br />
                    FOR THE
                    <br />
                    GREATER GOOD
                  </span>
                  <span className="catalogue-bottomline mono">
                    THE FIRST CONVERSATION
                  </span>
                </div>
              </div>
              <div className="catalogue-caption">
                <h3>The first conversation</h3>
                <p>Navigating work in 2026</p>
              </div>
            </button>
            <button
              className="catalogue-record catalogue-record-ai"
              onClick={() => onSelect("ai")}
              aria-label="Open The work after AI"
            >
              <div className="catalogue-object">
                <span className="catalogue-vinyl">
                  <span>
                    <Disc3 size={40} />
                  </span>
                </span>
                <div className="catalogue-cover">
                  <img src="/assets/art-ai.png" alt="" />
                  <span className="mono catalogue-topline">
                    FTGG - NEXT <span>UPCOMING</span>
                  </span>
                  <span className="catalogue-cover-title">
                    THE WORK
                    <br />
                    AFTER AI
                  </span>
                  <span className="catalogue-bottomline mono">
                    A NEW QUESTION. A NEW ROOM.
                  </span>
                </div>
              </div>
              <div className="catalogue-caption">
                <span className="upcoming-badge">Upcoming</span>
                <h3>The work after AI</h3>
                <p>
                  What happens when intelligence becomes part of the workforce?
                </p>
              </div>
            </button>
          </div>
        </div>
        <div className="portal-progress" aria-hidden="true">
          <span ref={progress} />
        </div>
      </div>
    </section>
  );
}
