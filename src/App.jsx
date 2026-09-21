import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  Disc3,
  Pause,
  Play,
  Plus,
  Minus,
  X,
  Menu,
  ExternalLink,
} from "lucide-react";
import { editions } from "./data";
import Dialog from "./components/Dialog";
import InvitationDialog from "./components/InvitationDialog";
import "./admin.css";

const RecordScene = lazy(() => import("./components/RecordScene"));
const Admin = lazy(() => import("./components/Admin"));

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Sleeve({ edition = "intro", className = "" }) {
  const isAI = edition === "ai";
  return (
    <div
      className={`sleeve-art ${isAI ? "sleeve-ai" : "sleeve-intro"} ${className}`}
      aria-hidden="true"
    >
      <img src={`/assets/art-${edition}.png`} alt="" />
      <span className="sleeve-catalogue">
        FOR THE GREATER GOOD <span>{isAI ? "NEXT" : "001"}</span>
      </span>
      <span className="sleeve-heading">
        {isAI ? (
          <>
            THE WORK
            <br />
            AFTER AI
          </>
        ) : (
          <>
            CONVERSATIONS
            <br />
            FOR THE
            <br />
            GREATER GOOD
          </>
        )}
      </span>
      <span className="sleeve-footer">
        {isAI ? "A NEW QUESTION. A NEW ROOM." : "THE FIRST CONVERSATION"}
        <Disc3 size={18} />
      </span>
    </div>
  );
}

function SceneFallback({ onSelect }) {
  return (
    <div className="scene-fallback">
      <button
        aria-label="Explore the first conversation"
        onClick={() => onSelect("intro")}
      >
        <Sleeve />
      </button>
      <button
        aria-label="Explore The Work After AI"
        onClick={() => onSelect("ai")}
      >
        <Sleeve edition="ai" />
      </button>
    </div>
  );
}

function Scene(props) {
  return (
    <SceneBoundary
      fallback={<SceneFallback onSelect={props.onSelect || (() => {})} />}
    >
      <Suspense
        fallback={
          <div className="scene-loading">
            <Disc3 size={28} />
            <span className="mono">SETTING THE RECORD</span>
          </div>
        }
      >
        <RecordScene {...props} />
      </Suspense>
    </SceneBoundary>
  );
}

function Header({ onRequest, current, navigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [current]);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const follow = (path) => {
    setMenuOpen(false);
    navigate(path);
  };
  return (
    <header className="site-header">
      <a href="#/" className="brand" aria-label="For the Greater Good home">
        <span className="brand-mark">
          <Disc3 size={30} strokeWidth={1.5} />
        </span>
        <span>
          FOR THE
          <br />
          GREATER GOOD<span className="brand-period">.</span>
        </span>
      </a>
      <nav className="desktop-nav" aria-label="Main navigation">
        <a href="#/" className={current === "/" ? "nav-active" : ""}>
          The collection<span className="nav-count">02</span>
        </a>
        <a href="#/about">
          The idea
          <ArrowUpRight size={14} />
        </a>
      </nav>
      <div className="header-actions">
        <button
          className="button button-dark header-request"
          onClick={onRequest}
        >
          Request an invitation
          <ArrowUpRight size={16} />
        </button>
        <button
          className="icon-button mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      {menuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button onClick={() => follow("/")}>
            The collection
            <ArrowRight size={18} />
          </button>
          <button onClick={() => follow("/about")}>
            The idea
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onRequest();
            }}
          >
            Request an invitation
            <ArrowUpRight size={18} />
          </button>
        </nav>
      )}
    </header>
  );
}

function Home({ selectEdition, onRequest, reducedMotion }) {
  const collection = useRef(null);
  return (
    <main>
      <section className="home-stage" aria-labelledby="home-title">
        <div className="stage-eyebrow mono">
          <span>
            <span className="status-dot" />
            AN INDEPENDENT CONVERSATION SERIES
          </span>
          <span>
            EST. 2026 <span className="meta-divider">/</span> MALAYSIA
          </span>
        </div>
        <div className="hero-heading">
          <h1 id="home-title">
            FOR THE
            <br />
            GREATER GOOD<span>.</span>
          </h1>
          <div className="hero-side-note">
            <span className="asterisk">*</span>
            <p>
              Good questions.
              <br />
              Different perspectives.
              <br />
              Something worth taking away.
            </p>
          </div>
        </div>
        <div
          className="collection-scene"
          role="group"
          aria-label="The conversation record collection"
        >
          <Scene
            mode="collection"
            onSelect={selectEdition}
            reducedMotion={reducedMotion}
          />
        </div>
        <div className="stage-bottom">
          <p>
            A small room.
            <br />A consequential question.
            <br />
            <strong>The right people.</strong>
          </p>
          <button
            className="text-button collection-jump"
            onClick={() =>
              collection.current?.scrollIntoView({
                behavior: reducedMotion ? "instant" : "smooth",
              })
            }
          >
            <span className="mono">EXPLORE THE COLLECTION</span>
            <span className="circle-arrow">
              <ArrowDown size={20} />
            </span>
          </button>
          <span className="stage-index mono">
            <span className="live-dot" /> TWO RECORDS. MANY PERSPECTIVES.
          </span>
        </div>
      </section>
      <section
        ref={collection}
        id="collection"
        className="collection-section section-inset"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE CONVERSATION COLLECTION</span>
            <h2>
              EVERY ROOM.
              <br />
              ITS OWN RECORD.
            </h2>
          </div>
          <p>
            Different people. Shared questions.
            <br />A collection that keeps growing.
          </p>
        </div>
        <div className="edition-list">
          <button
            className="edition-row"
            onClick={() => selectEdition("intro")}
          >
            <span className="edition-row-number mono">001</span>
            <div className="edition-thumb">
              <Sleeve />
            </div>
            <div className="edition-row-title">
              <span className="eyebrow">IN THE COLLECTION</span>
              <h3>The first conversation</h3>
              <p>Navigating work in 2026</p>
            </div>
            <span className="edition-location mono">
              SYNAPZE OFFICE
              <br />
              2026
            </span>
            <span className="row-arrow">
              <ArrowUpRight />
            </span>
          </button>
          <button className="edition-row" onClick={() => selectEdition("ai")}>
            <span className="edition-row-number mono">NEXT</span>
            <div className="edition-thumb">
              <Sleeve edition="ai" />
            </div>
            <div className="edition-row-title">
              <span className="eyebrow">
                <span className="status-dot" />
                UPCOMING CONVERSATION
              </span>
              <h3>The work after AI</h3>
              <p>
                What happens when intelligence becomes part of the workforce?
              </p>
            </div>
            <span className="edition-location mono">
              EXPRESSIONS
              <br />
              OF INTEREST OPEN
            </span>
            <span className="row-arrow">
              <ArrowUpRight />
            </span>
          </button>
        </div>
      </section>
      <section className="manifesto-band section-inset">
        <span className="eyebrow">THE IDEA IS SIMPLE</span>
        <div>
          <h2>
            START WITH THE PEOPLE
            <br />
            LIVING THE QUESTION.
          </h2>
          <p>Then bring everyone else to the table.</p>
          <a className="text-button" href="#/about">
            A little more about us
            <ArrowUpRight size={19} />
          </a>
        </div>
        <span className="manifesto-symbol" aria-hidden="true">
          *
        </span>
      </section>
      <section className="next-band section-inset">
        <div>
          <span className="eyebrow">THE NEXT CONVERSATION STARTS WITH YOU</span>
          <h2>
            BRING YOUR
            <br />
            PERSPECTIVE.
          </h2>
        </div>
        <div>
          <p>
            Every room is individually curated.
            <br />
            Tell us what you would bring to the table.
          </p>
          <button className="button button-dark" onClick={onRequest}>
            Request an invitation
            <ArrowUpRight size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}

function Participant({ person, onClose }) {
  return (
    <Dialog
      title={`${person.name}'s record`}
      onClose={onClose}
      className="participant-dialog"
    >
      <span className="eyebrow">THE PEOPLE IN THE ROOM / 001</span>
      <div className="profile-record">
        <div className="profile-record-label">
          <span>{person.initials}</span>
          <span className="mono">FTGG / 001</span>
        </div>
      </div>
      <h2>{person.name}</h2>
      <p className="participant-role">{person.role}</p>
      <p>{person.perspective}</p>
      {person.linkedin && (
        <a
          href={person.linkedin}
          target="_blank"
          rel="noreferrer"
          className="text-button"
        >
          LinkedIn
          <ArrowUpRight size={18} />
        </a>
      )}
    </Dialog>
  );
}

function PhotoGallery({ photos }) {
  const [active, setActive] = useState(null);
  if (!photos.length) return null;
  return (
    <section className="story-block">
      <span className="eyebrow">INSIDE THE ROOM</span>
      <div className="photo-grid">
        {photos.map((photo, index) => (
          <button
            key={photo.src}
            onClick={() => setActive(index)}
            aria-label={`Open photograph: ${photo.alt}`}
          >
            <img src={photo.src} alt={photo.alt} loading="lazy" />
          </button>
        ))}
      </div>
      {active !== null && (
        <Dialog
          title={photos[active].alt}
          onClose={() => setActive(null)}
          className="photo-dialog"
        >
          <img src={photos[active].src} alt={photos[active].alt} />
          <p>{photos[active].caption}</p>
          <div className="photo-controls">
            <button
              className="icon-button"
              aria-label="Previous photograph"
              onClick={() =>
                setActive((active + photos.length - 1) % photos.length)
              }
            >
              <ArrowLeft />
            </button>
            <span className="mono">
              {active + 1} / {photos.length}
            </span>
            <button
              className="icon-button"
              aria-label="Next photograph"
              onClick={() => setActive((active + 1) % photos.length)}
            >
              <ArrowRight />
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

function Edition({ id, onRequest, selectEdition, reducedMotion }) {
  const edition = editions[id] || editions.intro;
  const isAI = edition.id === "ai";
  const [paused, setPaused] = useState(false);
  const [activeTrack, setActiveTrack] = useState(0);
  const [openTrack, setOpenTrack] = useState(0);
  const [participant, setParticipant] = useState(null);
  const storyRef = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      if (!storyRef.current) return;
      const box = storyRef.current.getBoundingClientRect();
      setProgress(
        Math.max(
          0,
          Math.min(
            1,
            (160 - box.top) /
              Math.max(1, box.height - window.innerHeight + 160),
          ),
        ),
      );
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);
  const track = Math.min(2, Math.floor(progress * 3));
  useEffect(() => setActiveTrack(track), [track]);
  return (
    <main className={`edition-page ${isAI ? "edition-page-ai" : ""}`}>
      <div className="edition-topline section-inset">
        <a href="#/" className="text-button">
          <ArrowLeft size={17} />
          Back to the collection
        </a>
        <span className="mono">
          {edition.catalogue}
          <span className="meta-divider">/</span>
          {isAI ? "UPCOMING" : "SIDE A"}
        </span>
      </div>
      <div className="edition-layout">
        <aside className="edition-player" aria-label="Edition turntable">
          <div className="player-meta mono">
            <span>
              <span className="status-dot" />
              {isAI ? "ON THE HORIZON" : "ON THE RECORD"}
            </span>
            <span>{isAI ? "NEXT" : "001"}</span>
          </div>
          <div className="edition-canvas">
            <Scene
              key={id}
              mode="edition"
              edition={id}
              onSelect={selectEdition}
              progress={progress}
              paused={paused}
              reducedMotion={reducedMotion}
            />
          </div>
          <div className="player-bottom">
            <div>
              <span className="eyebrow">
                {isAI ? "THE NEXT CONVERSATION" : `TRACK 0${activeTrack + 1}`}
              </span>
              <p>
                {isAI ? "The work after AI" : edition.tracks[activeTrack].title}
              </p>
            </div>
            <button
              className="icon-button player-toggle"
              aria-label={
                paused ? "Resume record rotation" : "Pause record rotation"
              }
              title={
                paused ? "Resume record rotation" : "Pause record rotation"
              }
              aria-pressed={paused}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
          </div>
          <div className="player-progress">
            <span style={{ width: `${Math.max(2, progress * 100)}%` }} />
          </div>
          <div className="player-caption mono">
            <span>
              {isAI
                ? "A NEW QUESTION. A NEW ROOM."
                : "DIFFERENT PERSPECTIVES. ONE TABLE."}
            </span>
            <Disc3 size={16} />
          </div>
        </aside>
        <article ref={storyRef} className="edition-story">
          <section className="story-intro">
            <span className="eyebrow">
              {isAI ? "UPCOMING CONVERSATION" : "EDITION 001 / THE BEGINNING"}
            </span>
            <h1>
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
            </h1>
            <p className="edition-subtitle">{edition.subtitle}</p>
            <div className="edition-facts mono">
              <span>
                {isAI
                  ? "10 PLACES / INDIVIDUALLY CURATED"
                  : "2026 / SYNAPZE OFFICE"}
              </span>
              <span>
                {isAI
                  ? "DATE TO BE ANNOUNCED"
                  : "MANY PERSPECTIVES / ONE TABLE"}
              </span>
            </div>
            <blockquote>{edition.question}</blockquote>
            <p className="body-copy">{edition.introduction}</p>
            {isAI && (
              <button className="button button-dark" onClick={onRequest}>
                Request an invitation
                <ArrowUpRight size={18} />
              </button>
            )}
          </section>
          <section className="story-block track-section">
            <div className="story-section-head">
              <span className="eyebrow">
                {isAI
                  ? "QUESTIONS FOR THE ROOM"
                  : "THREADS FROM THE CONVERSATION"}
              </span>
              <span className="mono">03 TRACKS</span>
            </div>
            {edition.tracks.map((item, index) => (
              <div
                className={`track ${openTrack === index ? "track-open" : ""}`}
                key={item.title}
              >
                <button
                  aria-expanded={openTrack === index}
                  aria-controls={`track-${index}`}
                  onClick={() => {
                    setOpenTrack(openTrack === index ? null : index);
                    setActiveTrack(index);
                  }}
                >
                  <span className="mono">0{index + 1}</span>
                  <h2>{item.title}</h2>
                  {openTrack === index ? (
                    <Minus size={19} />
                  ) : (
                    <Plus size={19} />
                  )}
                </button>
                <div id={`track-${index}`} hidden={openTrack !== index}>
                  <p className="track-question">{item.question}</p>
                  <p className="body-copy">{item.text}</p>
                </div>
              </div>
            ))}
          </section>
          {!isAI && (
            <>
              <section className="story-block room-note">
                <span className="eyebrow">A NOTE FROM THE ROOM</span>
                <blockquote>
                  "Nobody had the questions beforehand. Nobody had polished
                  answers ready."
                </blockquote>
                <p className="body-copy">
                  Some were still eating while answering. People shared what
                  they had actually seen, experienced and wrestled with.
                </p>
                {edition.linkedinPost && (
                  <a
                    href={edition.linkedinPost}
                    target="_blank"
                    rel="noreferrer"
                    className="text-button"
                  >
                    Read the public note on LinkedIn
                    <ExternalLink size={16} />
                  </a>
                )}
              </section>
              <PhotoGallery photos={edition.photos} />
              <section className="story-block">
                <span className="eyebrow">THE PEOPLE IN THE ROOM</span>
                <h2 className="story-title">
                  A DIFFERENT
                  <br />
                  STARTING POINT.
                </h2>
                <p className="body-copy">
                  From early 20s to late 40s. Students, graduates, solopreneurs,
                  business owners and senior professionals. Every perspective
                  had a place at the table.
                </p>
                <div className="participant-list">
                  {edition.participants.map((person) => (
                    <button
                      key={person.id}
                      className="participant-item"
                      onClick={() => setParticipant(person)}
                    >
                      <span className="mini-record">
                        <span>{person.initials}</span>
                      </span>
                      <span>
                        <strong>{person.name}</strong>
                        <span>{person.role}</span>
                      </span>
                      <ArrowUpRight size={21} />
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
          {isAI && (
            <section className="story-block">
              <span className="eyebrow">A SEAT AT THE TABLE</span>
              <h2 className="story-title">
                BRING WHAT
                <br />
                YOU'RE WRESTLING WITH.
              </h2>
              <p className="body-copy">
                We are bringing together ten people with relevant experience,
                different perspectives and an openness to listen. Each
                expression of interest is reviewed individually.
              </p>
              <p className="body-copy">
                An invitation follows when there is a fit for the room. The date
                and venue will be shared once confirmed.
              </p>
              <button className="button button-dark" onClick={onRequest}>
                Express your interest
                <ArrowUpRight size={18} />
              </button>
            </section>
          )}
          <section className="story-block story-next">
            <span className="eyebrow">
              {isAI ? "WHERE IT BEGAN" : "THE NEXT RECORD"}
            </span>
            <button onClick={() => selectEdition(isAI ? "intro" : "ai")}>
              <h2>{isAI ? "THE FIRST CONVERSATION" : "THE WORK AFTER AI"}</h2>
              <ArrowUpRight size={32} />
            </button>
            <p>
              {isAI
                ? "Return to the conversation that started it all."
                : "A new question. A new room. Your perspective?"}
            </p>
          </section>
        </article>
      </div>
      {participant && (
        <Participant
          person={participant}
          onClose={() => setParticipant(null)}
        />
      )}
    </main>
  );
}

function About({ onRequest }) {
  return (
    <main className="about-page section-inset">
      <a href="#/" className="text-button">
        <ArrowLeft size={17} />
        Back to the collection
      </a>
      <span className="eyebrow">THE REASON WE COME TOGETHER</span>
      <h1>
        GOOD QUESTIONS
        <br />
        DESERVE
        <br />
        GOOD COMPANY<span>.</span>
      </h1>
      <div className="about-columns">
        <span className="asterisk">*</span>
        <div>
          <p className="about-lead">
            Start with the people living the question. Then bring everyone else
            to the table.
          </p>
          <p>
            Conversations for the Greater Good is an independent series of
            small, curated roundtables. We bring together people with different
            experiences to explore questions that matter.
          </p>
          <p>
            Our first gathering at the Synapze office began with a student about
            to graduate. Around him were graduates, solopreneurs, business
            owners and senior professionals, each with something to contribute.
          </p>
          <p>
            No prepared answers. No single person expected to have the answer.
            Just people sharing what they have seen, experienced and wrestled
            with.
          </p>
          <button className="button button-dark" onClick={onRequest}>
            Bring your perspective
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <a href="#/" className="footer-brand">
        FOR THE GREATER GOOD<span>.</span>
      </a>
      <span className="mono">INDEPENDENT MINDS. SHARED QUESTIONS.</span>
      <a href="#/admin" className="curator-link">
        Curator workspace
        <ArrowUpRight size={14} />
      </a>
      <span className="mono footer-year">2026</span>
    </footer>
  );
}

export default function App() {
  const [route, setRoute] = useState(
    () => window.location.hash.slice(1) || "/",
  );
  const [invitation, setInvitation] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const update = () => {
      setRoute(window.location.hash.slice(1) || "/");
      setInvitation(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    const title = route.startsWith("/edition/")
      ? editions[route.split("/")[2]]?.title
      : route === "/about"
        ? "The idea"
        : route === "/admin"
          ? "Curator workspace"
          : "The conversation collection";
    document.title = `${title || "The collection"} - For the Greater Good`;
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [route]);
  const navigate = (path) => {
    if (route === path)
      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "instant" : "smooth",
      });
    else window.location.hash = path;
  };
  const selectEdition = (id) => navigate(`/edition/${id}`);
  if (route === "/admin")
    return (
      <Suspense
        fallback={<div className="page-loading">Opening the workspace...</div>}
      >
        <Admin onClose={() => navigate("/")} />
      </Suspense>
    );
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("main-content");
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <Header
        onRequest={() => setInvitation(true)}
        current={route}
        navigate={navigate}
      />
      <div id="main-content" tabIndex={-1}>
        {route.startsWith("/edition/") && editions[route.split("/")[2]] ? (
          <Edition
            key={route}
            id={route.split("/")[2]}
            onRequest={() => setInvitation(true)}
            selectEdition={selectEdition}
            reducedMotion={reducedMotion}
          />
        ) : route === "/about" ? (
          <About onRequest={() => setInvitation(true)} />
        ) : (
          <Home
            selectEdition={selectEdition}
            onRequest={() => setInvitation(true)}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
      <Footer />
      {invitation && <InvitationDialog onClose={() => setInvitation(false)} />}
    </>
  );
}
