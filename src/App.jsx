import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Check, Disc3, Share2, X } from "lucide-react";
import gsap from "gsap";
import { alumni, editions } from "./data";
import FogBackground from "./components/FogBackground";
import CollectionPortal from "./components/CollectionPortal";
import AlumniCollection from "./components/AlumniCollection";
import EditionContent from "./components/EditionContent";
import StoryStatement from "./components/StoryStatement";
import SeriesPrelude from "./components/SeriesPrelude";
import RegistrationDialog from "./components/RegistrationDialog";
import BrandLogo from "./components/BrandLogo";
import VinylLoader from "./components/VinylLoader";
import useIntroLoading from "./lib/useIntroLoading";

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
  componentDidCatch() {
    this.props.onReady?.();
    this.props.onFailure?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Header({ onNavigate }) {
  return (
    <header className="site-header">
      <a
        href="#/"
        className="brand"
        aria-label="For the Greater Good home"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("home");
        }}
      >
        <BrandLogo className="header-logo" />
        <BrandLogo compact className="header-logo-compact" />
      </a>
      <nav className="desktop-nav" aria-label="Main navigation">
        <button onClick={() => onNavigate("collection")}>The collection</button>
        <button onClick={() => onNavigate("alumni")}>The alumni</button>
      </nav>
    </header>
  );
}

function ListeningRoom({
  edition,
  requestedEdition,
  closing,
  returning,
  changing,
  suspended,
  onClose,
  onSelect,
  onRequest,
  onProgress,
}) {
  const ref = useRef(null);
  const story = useRef(null);
  const closeRef = useRef(onClose);
  const [shared, setShared] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const shareTimer = useRef(null);
  closeRef.current = onClose;
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector(".room-close")?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => {
    story.current?.scrollTo(0, 0);
    onProgress(0);
    setShared(false);
    setShareLink("");
    clearTimeout(shareTimer.current);
  }, [edition.id, onProgress]);
  useEffect(() => () => clearTimeout(shareTimer.current), []);
  const share = async () => {
    const url = new URL(window.location.href);
    url.hash = `/edition/${edition.id}`;
    try {
      await navigator.clipboard.writeText(url.href);
      if (!ref.current) return;
      setShared(true);
      clearTimeout(shareTimer.current);
      shareTimer.current = setTimeout(() => setShared(false), 2200);
    } catch {
      if (ref.current) setShareLink(url.href);
    }
  };
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
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]',
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
      className={`listening-room ${closing ? "is-closing" : ""} ${returning ? "is-returning" : ""} ${changing ? "is-changing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-title"
      data-edition={edition.id}
      inert={suspended || undefined}
    >
      <div className="room-scrim" />
      <div className="room-topbar">
        <div className="room-brand">
          <BrandLogo compact className="room-logo" />
          <span>For the Greater Good.</span>
        </div>
        <div className="room-actions">
          <span className="room-share-status" role="status">
            {shared ? "Link copied" : ""}
          </span>
          <button
            className="icon-button"
            aria-label="Copy conversation link"
            title="Copy conversation link"
            onClick={share}
          >
            {shared ? <Check size={19} /> : <Share2 size={19} />}
          </button>
          <button
            className="icon-button room-close"
            aria-label="Close edition"
            title="Close edition"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
      </div>
      {shareLink && (
        <div className="room-share-fallback">
          <label>
            Conversation link
            <input
              value={shareLink}
              readOnly
              autoFocus
              onFocus={(event) => event.target.select()}
            />
          </label>
        </div>
      )}
      <div
        ref={story}
        className="room-story"
        onScroll={updateProgress}
        tabIndex={0}
        aria-label={`${edition.title} story`}
        aria-busy={changing}
        inert={changing || undefined}
      >
        <div key={edition.id} className="room-copy-arrival">
          <EditionContent edition={edition} onRequest={onRequest} />
        </div>
      </div>
      <div className="room-player-controls">
        <div className="room-record-switch" aria-label="Select a record">
          {Object.values(editions).map((item) => (
            <button
              key={item.id}
              className={item.id === requestedEdition ? "is-current" : ""}
              aria-pressed={item.id === requestedEdition}
              onClick={() => onSelect(item.id)}
            >
              {item.title}
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
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const intro = useIntroLoading(sceneReady, reducedMotion);
  const [selected, setSelected] = useState(initialEdition || null);
  const [roomOpen, setRoomOpen] = useState(Boolean(initialEdition));
  const [docked, setDocked] = useState(Boolean(initialEdition));
  const [presented, setPresented] = useState(initialEdition || null);
  const [invitation, setInvitation] = useState(false);
  const [progress, setProgress] = useState(0);
  const anchor = useRef(null);
  const world = useRef(null);
  const introTarget = useRef(null);
  const registerIntroTarget = useCallback((getTarget) => {
    introTarget.current = getTarget;
  }, []);
  const transfer = useRef(null);
  const closingTimer = useRef(null);
  const returnGuard = useRef(null);
  const firstLayout = useRef(true);
  const selectedTransfer = useRef(false);
  const selectionTrigger = useRef(null);
  const invitationTrigger = useRef(null);
  const previousOverlay = useRef({ selected, invitation });
  const lastEdition = useRef(initialEdition || "intro");
  const previousRouteEdition = useRef(initialEdition);
  const sceneEdition = selected || lastEdition.current;
  const activeRef = useRef(roomOpen);
  activeRef.current = roomOpen;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const dockedRef = useRef(docked);
  dockedRef.current = docked;

  useEffect(() => {
    if (!intro.visible) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [intro.visible]);

  useEffect(() => {
    const previous = previousOverlay.current;
    previousOverlay.current = { selected, invitation };
    let target;
    if (previous.selected && !selected && !invitation) {
      target = selectionTrigger.current;
    } else if (previous.invitation && !invitation) {
      target = invitationTrigger.current?.isConnected
        ? invitationTrigger.current
        : document.querySelector(".room-close") || selectionTrigger.current;
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
  useEffect(() => {
    if (sceneFailed && selected) setPresented(selected);
  }, [sceneFailed, selected]);

  const openInvitation = () => {
    invitationTrigger.current = document.activeElement;
    setInvitation(true);
  };

  const selectEdition = (id) => {
    if (!editions[id]) return;
    if (selected === id && roomOpen) return;
    clearTimeout(closingTimer.current);
    clearTimeout(returnGuard.current);
    if (!selected) {
      const trigger = document.activeElement;
      selectionTrigger.current = trigger?.matches("button, a")
        ? trigger
        : document.querySelector(`.record-choice-${id}`);
    }
    lastEdition.current = id;
    setSelected(id);
    if (!selected || sceneFailed || !sceneReady) setPresented(id);
    setRoomOpen(true);
    setDocked(true);
  };
  const recordReturned = useCallback(() => {
    if (activeRef.current || !selectedRef.current) return;
    clearTimeout(returnGuard.current);
    clearTimeout(closingTimer.current);
    setDocked(false);
    closingTimer.current = setTimeout(
      () => {
        if (activeRef.current) return;
        setSelected(null);
        setPresented(null);
      },
      reducedMotion ? 0 : 780,
    );
  }, [reducedMotion]);
  const presentEdition = useCallback((id) => {
    if (activeRef.current) setPresented(id);
  }, []);
  const closeEdition = () => {
    if (!roomOpen) return;
    activeRef.current = false;
    setRoomOpen(false);
    // Static artwork or a lost WebGL context must never trap the reading view.
    clearTimeout(returnGuard.current);
    returnGuard.current = setTimeout(
      recordReturned,
      reducedMotion || sceneFailed ? 0 : 4000,
    );
  };
  useEffect(() => {
    if (previousRouteEdition.current === initialEdition) return;
    previousRouteEdition.current = initialEdition;
    if (initialEdition) selectEdition(initialEdition);
    else if (selectedRef.current) closeEdition();
  }, [initialEdition]);
  useEffect(
    () => () => {
      clearTimeout(closingTimer.current);
      clearTimeout(returnGuard.current);
      if (transfer.current) {
        gsap.killTweensOf(transfer.current);
        transfer.current.remove();
      }
    },
    [],
  );

  // One fixed canvas follows the collection anchor, then glides into the reading view.
  useLayoutEffect(() => {
    const element = world.current;
    if (!element || !anchor.current) return;
    const target = () => {
      if (dockedRef.current) {
        const mobile = window.innerWidth <= 760;
        return {
          left: mobile ? 0 : window.innerWidth * 0.47,
          top: mobile ? 66 : 85,
          width: mobile ? window.innerWidth : window.innerWidth * 0.53,
          height: mobile
            ? Math.min(240, window.innerHeight * 0.26)
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
    if (transfer.current) {
      gsap.killTweensOf(transfer.current);
      transfer.current.remove();
      transfer.current = null;
    }
    let transition;
    if (firstLayout.current || reducedMotion) {
      gsap.set(element, { ...target(), x: 0 });
    } else {
      const destination = target();
      transition = gsap.timeline({
        onComplete: () => gsap.set(element, target()),
      });
      const source = selectionTrigger.current
        ?.closest(".catalogue-record")
        ?.querySelector(".catalogue-object");
      const sourceRect = source?.getBoundingClientRect();
      const fromCatalogue =
        docked &&
        sourceRect &&
        sourceRect.bottom > 0 &&
        sourceRect.top < window.innerHeight &&
        !selectedTransfer.current;
      const canvasRect = element.getBoundingClientRect();
      const fadeIntoPlace =
        fromCatalogue ||
        (docked &&
          (canvasRect.bottom <= 0 || canvasRect.top >= window.innerHeight));
      if (fadeIntoPlace) {
        gsap.set(element, { ...destination, autoAlpha: 0 });
      }
      if (fromCatalogue) {
        const flight = document.createElement("div");
        flight.className = `catalogue-transfer catalogue-record-${sceneEdition}`;
        flight.setAttribute("aria-hidden", "true");
        flight.append(source.cloneNode(true));
        document.body.append(flight);
        transfer.current = flight;
        gsap.set(flight, {
          left: sourceRect.left,
          top: sourceRect.top,
          width: sourceRect.width,
          height: sourceRect.height,
        });
        gsap.to(flight, {
          left: destination.left + destination.width * 0.18,
          top: destination.top + destination.height * 0.09,
          scale: window.innerWidth <= 760 ? 0.8 : 1.05,
          rotation: sceneEdition === "ai" ? -4 : 4,
          duration: 0.8,
          ease: "power3.inOut",
        });
        gsap.to(flight, {
          opacity: 0,
          delay: 0.38,
          duration: 0.4,
          onComplete: () => {
            flight.remove();
            if (transfer.current === flight) transfer.current = null;
          },
        });
      }
      selectedTransfer.current = docked;
      transition.to(element, {
        autoAlpha: fadeIntoPlace ? 0 : 0.72,
        duration: 0.16,
        ease: "power1.inOut",
      });
      transition.to(
        element,
        {
          left: destination.left,
          top: destination.top,
          width: destination.width,
          height: destination.height,
          duration: 0.75,
          ease: "power3.inOut",
        },
        0,
      );
      transition.to(
        element,
        {
          autoAlpha: destination.autoAlpha,
          duration: 0.55,
          ease: "power2.out",
        },
        fadeIntoPlace ? 0.25 : 0.16,
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
  }, [docked, reducedMotion]);

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
      className={`experience ${reducedMotion ? "reduced-motion" : ""} ${selected ? "has-open-record" : ""} ${intro.visible ? "intro-pending" : ""} ${intro.exiting ? "intro-revealing" : ""}`}
    >
      <FogBackground reducedMotion={reducedMotion} />
      <div
        className="public-content"
        inert={Boolean(selected || invitation || intro.visible) || undefined}
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
        <Header onNavigate={navigate} />
        <main id="main-content" tabIndex={-1}>
          <section
            id="home"
            className="home-stage"
            aria-labelledby="home-title"
          >
            <div className="hero-heading">
              <h1 id="home-title">
                <span className="hero-word-mask">
                  <span>FOR THE</span>
                </span>{" "}
                <span className="hero-word-mask">
                  <span>GREATER</span>
                </span>{" "}
                <span className="hero-word-mask">
                  <span>GOOD</span>
                </span>
                <span className="hero-period">.</span>
              </h1>
              <h2 className="hero-support">
                Good questions. Different perspectives. Something worth taking
                away.
              </h2>
            </div>
            <div ref={anchor} className="collection-scene" aria-hidden="true" />
            <div className="hero-record-index" aria-label="Open a conversation">
              <button
                className="record-choice record-choice-intro"
                onClick={() => selectEdition("intro")}
              >
                {editions.intro.title}
              </button>
              <button
                className="record-choice record-choice-ai"
                onClick={() => selectEdition("ai")}
              >
                {editions.ai.title}{" "}
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
          <SeriesPrelude reducedMotion={reducedMotion} />
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
            <BrandLogo className="footer-logo" />
          </a>
          <button className="button button-dark" onClick={openInvitation}>
            Request an invitation
          </button>
        </footer>
      </div>
      <div
        ref={world}
        inert={Boolean(selected || invitation || intro.visible) || undefined}
        className={`world-canvas ${selected ? "world-canvas-reading" : ""}`}
        aria-hidden={selected ? "true" : undefined}
        role={selected ? undefined : "group"}
        aria-label={selected ? undefined : "The conversation record collection"}
      >
        <SceneBoundary
          onReady={() => setSceneReady(true)}
          onFailure={() => setSceneFailed(true)}
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
              onReady={() => setSceneReady(true)}
              onIntroTargetReady={registerIntroTarget}
              onPresentedEdition={presentEdition}
              onRecordReturned={recordReturned}
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
          edition={editions[presented || selected]}
          requestedEdition={selected}
          closing={!docked}
          returning={!roomOpen && docked}
          changing={roomOpen && selected !== presented && !sceneFailed}
          suspended={invitation || intro.visible}
          onClose={closeEdition}
          onSelect={selectEdition}
          onRequest={openInvitation}
          onProgress={setProgress}
        />
      )}
      {invitation && (
        <RegistrationDialog onClose={() => setInvitation(false)} />
      )}
      {intro.visible && (
        <VinylLoader
          progress={intro.progress}
          exiting={intro.exiting}
          reducedMotion={reducedMotion}
          getTarget={() => introTarget.current?.()}
          onContinue={intro.canContinue ? intro.finish : undefined}
          onFillComplete={intro.onFillComplete}
        />
      )}
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
