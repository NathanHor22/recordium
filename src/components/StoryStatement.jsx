import { useLayoutEffect, useRef, useState } from "react";
import { Disc3 } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { editions } from "../data";
import EventGallery from "./EventGallery";

gsap.registerPlugin(ScrollTrigger);

const conversationMoments = [
  {
    title: "Start with the people living the question.",
    text: "Students, graduates, solopreneurs, business owners and senior professionals. Different experiences of work, brought to the same table.",
  },
  {
    title: "Not another prediction about work.",
    text: 'The opening question went to Jordan, a student about to graduate: "What\'s the thing university students are struggling with today?"',
  },
  {
    title: "More conversation. Less performance.",
    text: "Nobody had the questions beforehand. No polished answers. Just people sharing what they had seen, experienced and wrestled with.",
  },
  {
    title: "The work is changing. People still matter.",
    text: "From AI and education to mentorship and entrepreneurship, the conversation kept returning to judgement, communication and connection.",
  },
];

export function ConversationStory({ onSelect }) {
  const [activePhoto, setActivePhoto] = useState(0);
  return (
    <section
      className="event-story"
      aria-labelledby="event-story-heading"
      data-slide-index={activePhoto}
    >
      <div className="event-story-inner">
        <EventGallery
          photos={editions.intro.photos}
          title={null}
          carousel
          selectedIndex={activePhoto}
          onSelectPhoto={setActivePhoto}
        />
        <div className="event-story-copy">
          <div className="event-story-header">
            <h2 id="event-story-heading">THE FIRST CONVERSATION.</h2>
            <p>At Synapze, a conversation about navigating work in 2026.</p>
          </div>
          <div
            className="event-story-moments"
            aria-live="polite"
            aria-atomic="true"
          >
            {conversationMoments.map((moment, index) => (
              <div
                key={moment.title}
                className={`event-story-moment${activePhoto === index ? " is-active" : ""}`}
                aria-hidden={activePhoto !== index}
                inert={activePhoto !== index || undefined}
              >
                <h3>{moment.title}</h3>
                <p>{moment.text}</p>
              </div>
            ))}
          </div>
          {onSelect && (
            <button
              className="event-story-action"
              type="button"
              onClick={() => onSelect("intro")}
            >
              <Disc3 size={18} aria-hidden="true" />
              Explore the conversation
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function StoryStatement({
  reducedMotion = false,
  onRequest,
  onSelect,
}) {
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
        aria-label="The first conversation at Synapze"
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
            The first Conversations for the Greater Good roundtable. Synapze
            office, 2026.
          </p>
          {onSelect && (
            <button
              className="editorial-story-button"
              type="button"
              onClick={() => onSelect("intro")}
            >
              The first conversation
            </button>
          )}
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
