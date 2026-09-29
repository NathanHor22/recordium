import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import Dialog from "./Dialog";

export default function EditionContent({ edition, onRequest }) {
  const [track, setTrack] = useState(0);
  const [photo, setPhoto] = useState(null);
  const isAI = edition.id === "ai";
  return (
    <article className="room-edition-copy">
      <section className="story-intro">
        {isAI && <span className="upcoming-badge">Upcoming conversation</span>}
        <h2 id="room-title">
          {isAI ? (
            <>
              THE WORK
              <br />
              AFTER AI<span>.</span>
            </>
          ) : (
            <>
              THE FIRST
              <br />
              CONVERSATION<span>.</span>
            </>
          )}
        </h2>
        <p className="edition-subtitle">{edition.subtitle}</p>
        <p className="edition-context">
          {isAI
            ? "Ten places. Date and venue to be announced."
            : "The inaugural conversation at Synapze, 2026."}
        </p>
        <blockquote>{edition.question}</blockquote>
        <p className="body-copy">{edition.introduction}</p>
        {isAI && (
          <button className="button button-dark" onClick={onRequest}>
            Request an invitation
          </button>
        )}
      </section>
      <section className="story-block track-section">
        <div className="story-section-head">
          <span className="eyebrow">
            {isAI ? "QUESTIONS FOR THE ROOM" : "THREADS FROM THE CONVERSATION"}
          </span>
        </div>
        {edition.tracks.map((item, index) => (
          <div
            key={item.title}
            className={`track ${track === index ? "track-open" : ""}`}
          >
            <button
              aria-expanded={track === index}
              aria-controls={`room-track-${index}`}
              onClick={() => setTrack(track === index ? null : index)}
            >
              <h3>{item.title}</h3>
              {track === index ? <Minus size={18} /> : <Plus size={18} />}
            </button>
            <div id={`room-track-${index}`} hidden={track !== index}>
              <p className="track-question">{item.question}</p>
              <p className="body-copy">{item.text}</p>
            </div>
          </div>
        ))}
      </section>
      {!isAI && (
        <>
          <section className="story-block room-note">
            <blockquote>
              "Nobody had the questions beforehand. Nobody had polished answers
              ready."
            </blockquote>
            <p className="body-copy">
              Some were still eating while answering. People shared what they
              had actually seen, experienced and wrestled with.
            </p>
            {edition.linkedinPost && (
              <a
                href={edition.linkedinPost}
                target="_blank"
                rel="noreferrer"
                className="text-button"
              >
                Read the public note on LinkedIn
              </a>
            )}
          </section>
          <section className="story-block">
            <h3 className="story-title">
              A DIFFERENT
              <br />
              STARTING POINT.
            </h3>
            <p className="body-copy">
              From early 20s to late 40s. Students, graduates, solopreneurs,
              business owners and senior professionals. Every perspective had a
              place at the table.
            </p>
            <p className="room-quote">
              Start with the people living the question.
              <br />
              Then bring everyone else to the table.
            </p>
          </section>
        </>
      )}
      {edition.photos.length > 0 && (
        <section className="story-block">
          <span className="eyebrow">INSIDE THE ROOM</span>
          <div className="photo-grid">
            {edition.photos.map((item, index) => (
              <button
                key={item.src}
                onClick={() => setPhoto(index)}
                aria-label={`Open photograph: ${item.alt}`}
              >
                <img src={item.src} alt={item.alt} loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      )}
      {isAI && (
        <section className="story-block">
          <h3 className="story-title">
            BRING WHAT
            <br />
            YOU'RE WRESTLING WITH.
          </h3>
          <p className="body-copy">
            We are bringing together ten people with relevant experience,
            different perspectives and an openness to listen. Each expression of
            interest is reviewed individually.
          </p>
          <p className="body-copy">
            An invitation follows when there is a fit for the room. The date and
            venue will be shared once confirmed.
          </p>
          <button className="button button-dark" onClick={onRequest}>
            Express your interest
          </button>
        </section>
      )}
      {photo !== null && (
        <Dialog
          title={edition.photos[photo].alt}
          className="photo-dialog"
          onClose={() => setPhoto(null)}
        >
          <img
            src={edition.photos[photo].src}
            alt={edition.photos[photo].alt}
          />
          <p>{edition.photos[photo].caption}</p>
          <div className="photo-controls">
            <button
              className="text-button"
              onClick={() =>
                setPhoto(
                  (photo + edition.photos.length - 1) % edition.photos.length,
                )
              }
            >
              Previous
            </button>
            <span className="mono">
              {photo + 1} / {edition.photos.length}
            </span>
            <button
              className="text-button"
              onClick={() => setPhoto((photo + 1) % edition.photos.length)}
            >
              Next
            </button>
          </div>
        </Dialog>
      )}
    </article>
  );
}
