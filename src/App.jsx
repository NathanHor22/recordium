import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Disc3, Menu, X } from "lucide-react";
import gsap from "gsap";
import { alumni, editions } from "./data";
import FogBackground from "./components/FogBackground";
import CollectionPortal from "./components/CollectionPortal";
import AlumniCollection from "./components/AlumniCollection";
import EditionContent from "./components/EditionContent";
import StoryStatement from "./components/StoryStatement";
import InvitationDialog from "./components/InvitationDialog";

const RecordScene = lazy(() => import("./components/RecordScene"));
const Admin = lazy(() => import("./components/Admin"));

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
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

function Header({ onRequest, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const escape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  const navigate = (id) => {
    setMenuOpen(false);
    onNavigate(id);
  };
  return (
    <header className="site-header">
      <a
        href="#/"
        className="brand"
        aria-label="For the Greater Good home"
        onClick={(event) => {
          event.preventDefault();
          navigate("home");
        }}
      >
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
        <button onClick={() => navigate("collection")}>The collection</button>
        <button onClick={() => navigate("alumni")}>The alumni</button>
        <button onClick={() => navigate("idea")}>The series</button>
      </nav>
      <div className="header-actions">
        <button
          className="button button-dark header-request"
          onClick={onRequest}
        >
          Request an invitation
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
          <button onClick={() => navigate("collection")}>The collection</button>
          <button onClick={() => navigate("alumni")}>The alumni</button>
          <button onClick={() => navigate("idea")}>The series</button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onRequest();
            }}
          >
            Request an invitation
          </button>
        </nav>
      )}
    </header>
  );
}

function ListeningRoom({
  edition,
  closing,
  suspended,
  onClose,
  onSelect,
  onRequest,
  onProgress,
}) {
  const ref = useRef(null);
  const story = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector("button")?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => {
    story.current?.scrollTo(0, 0);
    onProgress(0);
  }, [edition.id, onProgress]);
  useEffect(() => {
    if (suspended) return;
    const key = (event) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...ref.current.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex="0"]',
        ),
      ].filter(
        (element) =>
          element.getClientRects().length &&
          !element.closest("[hidden], [inert]"),
      );
      const first = controls[0],
        last = controls.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !ref.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !ref.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [suspended]);
  const updateProgress = (event) => {
    const element = event.currentTarget;
    const value =
      element.scrollTop /
      Math.max(1, element.scrollHeight - element.clientHeight);
    onProgress(value);
  };
  return (
    <section
      ref={ref}
      className={`listening-room ${closing ? "is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-title"
      inert={suspended || undefined}
    >
      <div className="room-scrim" />
      <div className="room-topbar">
        <span className="room-brand">For the Greater Good.</span>
        <button
          className="icon-button room-close"
          aria-label="Close edition"
          title="Close edition"
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      <div
        ref={story}
        className="room-story"
        onScroll={updateProgress}
        tabIndex={0}
        aria-label={`${edition.title} story`}
      >
        <EditionContent
          key={edition.id}
          edition={edition}
          onRequest={onRequest}
        />
      </div>
      <div className="room-player-controls">
        <div className="room-record-switch" aria-label="Select a record">
          {Object.values(editions).map((item) => (
            <button
              key={item.id}
              className={item.id === edition.id ? "is-current" : ""}
              aria-pressed={item.id === edition.id}
              onClick={() => onSelect(item.id)}
            >
              {item.id === "intro"
                ? "The first conversation"
                : "The work after AI"}
              {item.id === "ai" && (
                <span className="upcoming-badge">Upcoming</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Experience({ initialEdition }) {
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState(initialEdition || null);
  const [roomOpen, setRoomOpen] = useState(Boolean(initialEdition));
  const [invitation, setInvitation] = useState(false);
  const [progress, setProgress] = useState(0);
  const anchor = useRef(null);
  const world = useRef(null);
  const closingTimer = useRef(null);
  const firstLayout = useRef(true);
  const selectionTrigger = useRef(null);
  const invitationTrigger = useRef(null);
  const previousOverlay = useRef({ selected, invitation });
  const lastEdition = useRef(initialEdition || "intro");
  const sceneEdition = selected || lastEdition.current;
  const activeRef = useRef(roomOpen);
  activeRef.current = roomOpen;

  useEffect(() => {
    const previous = previousOverlay.current;
    previousOverlay.current = { selected, invitation };
    let target;
    if (previous.selected && !selected && !invitation) {
      target = selectionTrigger.current;
    } else if (previous.invitation && !invitation) {
      target = invitationTrigger.current?.isConnected
        ? invitationTrigger.current
        : selectionTrigger.current;
    }
    if (!target) return;
    // Restore only after React has removed inert from the triggering surface.
    const frame = requestAnimationFrame(() => {
      if (target.isConnected && !target.closest("[inert]")) {
        target.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, invitation]);

  const openInvitation = () => {
    invitationTrigger.current = document.activeElement;
    setInvitation(true);
  };

  const selectEdition = (id) => {
    if (!editions[id]) return;
    clearTimeout(closingTimer.current);
    if (!selected) selectionTrigger.current = document.activeElement;
    lastEdition.current = id;
    setProgress(0);
    setSelected(id);
    setRoomOpen(true);
  };
  const closeEdition = () => {
    setRoomOpen(false);
    clearTimeout(closingTimer.current);
    closingTimer.current = setTimeout(
      () => {
        setSelected(null);
      },
      reducedMotion ? 0 : 850,
    );
  };
  useEffect(() => () => clearTimeout(closingTimer.current), []);

  // One fixed canvas follows the collection anchor, then glides into the reading view.
  useLayoutEffect(() => {
    const element = world.current;
    if (!element || !anchor.current) return;
    const target = () => {
      if (activeRef.current) {
        const mobile = window.innerWidth <= 760;
        return {
          left: mobile ? 0 : window.innerWidth * 0.47,
          top: mobile ? 66 : 85,
          width: mobile ? window.innerWidth : window.innerWidth * 0.53,
          height: mobile
            ? Math.min(285, window.innerHeight * 0.33)
            : window.innerHeight - 205,
          autoAlpha: 1,
        };
      }
      const rect = anchor.current.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        autoAlpha: rect.bottom > 0 && rect.top < window.innerHeight ? 1 : 0,
      };
    };
    gsap.killTweensOf(element);
    let transition;
    if (firstLayout.current || reducedMotion) {
      gsap.set(element, { ...target(), x: 0 });
    } else {
      const destination = target();
      transition = gsap.timeline();
      transition.to(element, {
        autoAlpha: 0,
        duration: 0.16,
        ease: "power1.in",
      });
      transition.to(
        element,
        {
          left: destination.left,
          top: destination.top,
          width: destination.width,
          height: destination.height,
          duration: 0.85,
          ease: "power3.inOut",
        },
        0,
      );
      transition.to(
        element,
        {
          autoAlpha: destination.autoAlpha,
          duration: 0.65,
          ease: "power2.out",
        },
        0.23,
      );
      transition.set(element, { x: roomOpen ? -32 : 0 }, 0.16);
      transition.to(
        element,
        { x: 0, duration: 0.65, ease: "power2.out" },
        0.23,
      );
    }
    firstLayout.current = false;
    let frame;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!gsap.isTweening(element)) gsap.set(element, target());
      });
    };
    window.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("resize", follow);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", follow);
      window.removeEventListener("resize", follow);
      gsap.killTweensOf(element);
      transition?.kill();
    };
  }, [roomOpen, reducedMotion, sceneEdition]);

  const navigate = (id) => {
    if (id === "home") {
      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "instant" : "smooth",
      });
      return;
    }
    document.getElementById(id)?.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
      block: "start",
    });
  };
  return (
    <div
      className={`experience ${reducedMotion ? "reduced-motion" : ""} ${selected ? "has-open-record" : ""}`}
    >
      <FogBackground reducedMotion={reducedMotion} />
      <div
        className="public-content"
        inert={Boolean(selected || invitation) || undefined}
      >
        <a
          className="skip-link"
          href="#main-content"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById("main-content")?.focus();
          }}
        >
          Skip to content
        </a>
        <Header onRequest={openInvitation} onNavigate={navigate} />
        <main id="main-content" tabIndex={-1}>
          <section
            id="home"
            className="home-stage"
            aria-labelledby="home-title"
          >
            <div className="hero-heading">
              <h1 id="home-title">
                FOR THE GREATER GOOD<span>.</span>
              </h1>
              <h2 className="hero-support">
                Good questions. Different perspectives. Something worth taking
                away.
              </h2>
            </div>
            <div ref={anchor} className="collection-scene" aria-hidden="true" />
            <div className="hero-record-index" aria-label="Open a conversation">
              <button
                className="record-choice"
                onClick={() => selectEdition("intro")}
              >
                The first conversation
              </button>
              <button
                className="record-choice"
                onClick={() => selectEdition("ai")}
              >
                The work after AI{" "}
                <span className="upcoming-badge">Upcoming</span>
              </button>
            </div>
            <div className="stage-bottom">
              <button
                className="collection-jump"
                onClick={() => navigate("collection")}
              >
                <Disc3 size={18} /> Explore the collection
              </button>
            </div>
          </section>
          <CollectionPortal
            onSelect={selectEdition}
            reducedMotion={reducedMotion}
          />
          <AlumniCollection people={alumni} />
          <StoryStatement
            reducedMotion={reducedMotion}
            onRequest={openInvitation}
          />
        </main>
        <footer className="site-footer">
          <a
            href="#/"
            className="footer-brand"
            onClick={(event) => {
              event.preventDefault();
              navigate("home");
            }}
          >
            FOR THE GREATER GOOD<span>.</span>
          </a>
          <a href="#/admin" className="curator-link">
            Curator workspace
          </a>
        </footer>
      </div>
      <div
        ref={world}
        className={`world-canvas ${selected ? "world-canvas-reading" : ""}`}
        aria-hidden={selected ? "true" : undefined}
        role={selected ? undefined : "group"}
        aria-label={selected ? undefined : "The conversation record collection"}
      >
        <SceneBoundary
          fallback={
            <div className="record-fallback">
              <img src={`/assets/art-${selected || "ai"}.png`} alt="" />
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="scene-loading">
                <Disc3 size={26} />
                <span className="mono">SETTING THE RECORD</span>
              </div>
            }
          >
            <RecordScene
              mode={roomOpen ? "edition" : "collection"}
              presentation="immersive"
              edition={sceneEdition}
              onSelect={selectEdition}
              progress={progress}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </SceneBoundary>
      </div>
      {selected && (
        <ListeningRoom
          edition={editions[selected]}
          closing={!roomOpen}
          suspended={invitation}
          onClose={closeEdition}
          onSelect={selectEdition}
          onRequest={openInvitation}
          onProgress={setProgress}
        />
      )}
      {invitation && <InvitationDialog onClose={() => setInvitation(false)} />}
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(
    () => window.location.hash.slice(1) || "/",
  );
  useEffect(() => {
    const update = () => {
      setRoute(window.location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    document.title =
      route === "/admin"
        ? "Curator workspace - For the Greater Good"
        : "The conversation collection - For the Greater Good";
  }, [route]);
  if (route === "/admin")
    return (
      <Suspense
        fallback={<div className="page-loading">Opening the workspace...</div>}
      >
        <Admin
          onClose={() => {
            window.location.hash = "/";
          }}
        />
      </Suspense>
    );
  return (
    <Experience
      initialEdition={
        editions[route.split("/")[2]] ? route.split("/")[2] : null
      }
    />
  );
}
