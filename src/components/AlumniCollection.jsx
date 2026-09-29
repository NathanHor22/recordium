import { useEffect, useId, useRef, useState } from "react";
import { Linkedin, Plus, X } from "lucide-react";
import "../alumni.css";

function linkedinLink(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["linkedin.com", "www.linkedin.com"].includes(url.hostname) &&
      /^\/(?:in|company)\/[^/]+\/?$/.test(url.pathname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function AlumniRecord({ person }) {
  const [flipped, setFlipped] = useState(false);
  const [portraitFailed, setPortraitFailed] = useState(false);
  const flipRef = useRef(null);
  const detailId = useId();
  const portrait =
    typeof person.portrait === "string"
      ? person.portrait
      : person.portrait?.src;
  const initials =
    person.initials ||
    person.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
  const linkedin = linkedinLink(person.linkedin);
  const role = person.organisation
    ? `${person.role} at ${person.organisation}`
    : person.role;

  useEffect(() => {
    setPortraitFailed(false);
  }, [portrait]);

  function turnRecord(event) {
    if (event.target.closest("a")) return;
    setFlipped((current) => !current);
    flipRef.current?.focus({ preventScroll: true });
  }

  return (
    <article className="alumni-record">
      <div
        className={`alumni-album ${flipped ? "alumni-album-flipped" : ""}`}
        role="group"
        aria-label={`${person.name}'s album`}
        onClick={turnRecord}
      >
        <button
          ref={flipRef}
          type="button"
          className="alumni-flip-button"
          aria-label={
            flipped
              ? `Flip ${person.name}'s album back`
              : `Show details about ${person.name}`
          }
          aria-expanded={flipped}
          aria-controls={detailId}
          title={flipped ? "Back to the portrait" : `Meet ${person.name}`}
        />
        <div className="alumni-vinyl-edge" aria-hidden="true" />
        <div className="alumni-sleeve-turner">
          <div className="alumni-face alumni-front" aria-hidden={flipped}>
            {portrait && !portraitFailed ? (
              <img
                className="alumni-portrait"
                src={portrait}
                alt=""
                loading="lazy"
                style={{
                  objectPosition: person.portrait?.position || "center 40%",
                }}
                onError={() => setPortraitFailed(true)}
              />
            ) : (
              <div className="alumni-initials-art" aria-hidden="true">
                <span>{initials}</span>
              </div>
            )}
            <div className="alumni-portrait-overlay">
              <h3>{person.name}</h3>
            </div>
          </div>
          <div
            className="alumni-face alumni-back"
            id={detailId}
            aria-hidden={!flipped}
          >
            <div
              className="alumni-back-copy"
              tabIndex={flipped ? 0 : -1}
              role="region"
              aria-label={`About ${person.name}`}
            >
              <h3>{person.name}</h3>
              <p className="alumni-role">{role}</p>
              {person.perspective && (
                <p className="alumni-perspective">{person.perspective}</p>
              )}
            </div>
            {linkedin && (
              <div className="alumni-back-footer">
                <a
                  href={linkedin}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={flipped ? 0 : -1}
                  aria-label={`${person.name}: Find out more on LinkedIn`}
                >
                  <Linkedin size={18} strokeWidth={1.7} /> Find out more
                </a>
              </div>
            )}
          </div>
        </div>
        <span className="alumni-flip-symbol" aria-hidden="true">
          {flipped ? <X size={20} /> : <Plus size={20} />}
        </span>
      </div>
    </article>
  );
}

export default function AlumniCollection({ people = [] }) {
  if (!people.length) return null;
  return (
    <section
      className="alumni-collection"
      aria-labelledby="alumni-heading"
      id="alumni"
    >
      <div className="alumni-introduction">
        <h2 id="alumni-heading">THE PEOPLE BEHIND THE RECORDS.</h2>
        <p>
          Different lives. Different perspectives. Something to bring to the
          table.
        </p>
      </div>
      <div className="alumni-records">
        {people.map((person) => (
          <AlumniRecord key={person.id || person.name} person={person} />
        ))}
      </div>
    </section>
  );
}
