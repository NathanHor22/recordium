import { useEffect, useId, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import "../gallery.css";
import "../carousel.css";

function PhotoLightbox({
  photos,
  initialIndex,
  title,
  onClose,
  onSelectPhoto,
}) {
  const [active, setActive] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef(null);
  const stageRef = useRef(null);
  const titleId = useId();
  const captionId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const photo = photos[active];

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    dialog.querySelector(".event-lightbox-close")?.focus();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    stage.scrollLeft = zoomed
      ? Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2)
      : 0;
    stage.scrollTop = zoomed
      ? Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2)
      : 0;
  }, [zoomed]);

  function selectPhoto(index) {
    setActive(index);
    setZoomed(false);
    onSelectPhoto?.(index);
  }

  function handleKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (zoomed && event.target === stageRef.current) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectPhoto((active + photos.length - 1) % photos.length);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      selectPhoto((active + 1) % photos.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectPhoto(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectPhoto(photos.length - 1);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="event-lightbox"
      aria-labelledby={titleId}
      aria-describedby={captionId}
      onKeyDown={handleKey}
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) closeRef.current();
      }}
    >
      <div className="event-lightbox-content">
        <header className="event-lightbox-header">
          <h2 id={titleId}>{title}</h2>
          <div className="event-lightbox-tools">
            <button
              type="button"
              className="event-lightbox-tool"
              onClick={() => setZoomed((value) => !value)}
              aria-label={zoomed ? "Fit photograph" : "Zoom photograph"}
              aria-pressed={zoomed}
              title={zoomed ? "Fit photograph" : "Zoom photograph"}
            >
              {zoomed ? <ZoomOut size={22} /> : <ZoomIn size={22} />}
            </button>
            <button
              type="button"
              className="event-lightbox-tool event-lightbox-close"
              onClick={onClose}
              aria-label="Close photographs"
              title="Close photographs"
            >
              <X size={22} />
            </button>
          </div>
        </header>
        <figure className="event-lightbox-figure">
          <div
            ref={stageRef}
            className={`event-lightbox-image-stage${zoomed ? " event-lightbox-image-zoomed" : ""}`}
            tabIndex={zoomed ? 0 : undefined}
            role={zoomed ? "region" : undefined}
            aria-label={zoomed ? "Enlarged photograph" : undefined}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
            />
          </div>
          <figcaption id={captionId}>
            <span>{photo.caption || photo.alt}</span>
            <span
              className="event-lightbox-count"
              role="status"
              aria-live="polite"
              aria-label={`Photograph ${active + 1} of ${photos.length}`}
            >
              {active + 1} / {photos.length}
            </span>
          </figcaption>
        </figure>
        {photos.length > 1 && (
          <div
            className="event-lightbox-thumbnails"
            aria-label="Choose a photograph"
          >
            {photos.map((item, index) => (
              <button
                type="button"
                key={item.src}
                onClick={() => selectPhoto(index)}
                aria-label={`View photograph ${index + 1}: ${item.alt}`}
                aria-pressed={index === active}
                title={`Photograph ${index + 1}`}
              >
                <img
                  src={item.src}
                  alt=""
                  width={item.width}
                  height={item.height}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}

function PhotoCarousel({ photos, selectedIndex, onSelectPhoto, onOpen }) {
  const thumbnailRefs = useRef([]);
  const pointerStart = useRef(null);
  const suppressClick = useRef(false);
  const photo = photos[selectedIndex];

  function handleKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let next;
    if (event.key === "ArrowLeft") {
      next = (selectedIndex + photos.length - 1) % photos.length;
    } else if (event.key === "ArrowRight") {
      next = (selectedIndex + 1) % photos.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = photos.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onSelectPhoto(next);
    if (event.target.closest(".event-carousel-thumbnails")) {
      thumbnailRefs.current[next]?.focus({ preventScroll: true });
    }
  }

  function handlePointerDown(event) {
    suppressClick.current = false;
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    pointerStart.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) < 45 || Math.abs(x) < Math.abs(y) * 1.25) return;
    suppressClick.current = true;
    event.preventDefault();
    onSelectPhoto(
      (selectedIndex + (x < 0 ? 1 : photos.length - 1)) % photos.length,
    );
  }

  return (
    <div
      className="event-carousel"
      onKeyDown={handleKey}
      data-selected-index={selectedIndex}
      role="group"
      aria-label="Conversation photographs"
      aria-roledescription="carousel"
    >
      <figure className="event-carousel-figure">
        <button
          type="button"
          className="event-carousel-open"
          aria-label={`Enlarge photograph ${selectedIndex + 1}: ${photo.alt}`}
          title="Enlarge photograph"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            pointerStart.current = null;
          }}
          onClick={(event) => {
            if (suppressClick.current && event.detail !== 0) {
              suppressClick.current = false;
              return;
            }
            onOpen(selectedIndex);
          }}
        >
          {photos.map((item, index) => (
            <img
              key={item.src}
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              loading="lazy"
              decoding="async"
              draggable="false"
              className={index === selectedIndex ? "is-active" : undefined}
              aria-hidden={index !== selectedIndex}
            />
          ))}
          <span className="event-carousel-zoom" aria-hidden="true">
            <ZoomIn size={20} />
          </span>
        </button>
        <figcaption
          className="event-carousel-caption"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="event-carousel-caption-stack">
            {photos.map((item, index) => (
              <span
                key={item.src}
                className={index === selectedIndex ? "is-active" : undefined}
                aria-hidden={index !== selectedIndex}
              >
                {item.caption || item.alt}
              </span>
            ))}
          </span>
          <span
            className="event-carousel-count"
            aria-label={`Photograph ${selectedIndex + 1} of ${photos.length}`}
          >
            {selectedIndex + 1} / {photos.length}
          </span>
        </figcaption>
      </figure>
      {photos.length > 1 && (
        <div
          className="event-carousel-thumbnails"
          role="group"
          aria-label="Choose a photograph"
        >
          {photos.map((item, index) => (
            <button
              key={item.src}
              type="button"
              ref={(element) => {
                thumbnailRefs.current[index] = element;
              }}
              onClick={() => onSelectPhoto(index)}
              aria-label={`Select photograph ${index + 1}: ${item.alt}`}
              aria-pressed={index === selectedIndex}
              title={`Photograph ${index + 1}`}
            >
              <img
                src={item.src}
                alt=""
                width={item.width}
                height={item.height}
                loading="lazy"
                draggable="false"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventGallery({
  photos = [],
  title = "Inside the room",
  featured = false,
  className = "",
  carousel = false,
  selectedIndex = 0,
  onSelectPhoto,
}) {
  const [active, setActive] = useState(null);
  const [localIndex, setLocalIndex] = useState(selectedIndex);
  const headingId = useId();
  if (!photos.length) return null;
  const index = onSelectPhoto ? selectedIndex : localIndex;
  const currentIndex = Math.max(
    0,
    Math.min(photos.length - 1, Number.isInteger(index) ? index : 0),
  );

  function selectCarouselPhoto(next) {
    setLocalIndex(next);
    onSelectPhoto?.(next);
  }

  return (
    <section
      className={`event-gallery${featured ? " event-gallery-featured" : ""} ${className}`}
      aria-labelledby={title ? headingId : undefined}
      aria-label={title ? undefined : "Photographs from the first conversation"}
    >
      {title && (
        <h3 className="event-gallery-title" id={headingId}>
          {title}
        </h3>
      )}
      {carousel ? (
        <PhotoCarousel
          photos={photos}
          selectedIndex={currentIndex}
          onSelectPhoto={selectCarouselPhoto}
          onOpen={setActive}
        />
      ) : (
        <div className="event-gallery-grid">
          {photos.map((photo, index) => (
            <figure className="event-gallery-photo" key={photo.src}>
              <button
                type="button"
                className="event-gallery-open"
                onClick={() => setActive(index)}
                aria-label={`Enlarge photograph ${index + 1}: ${photo.alt}`}
                title="Enlarge photograph"
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  decoding="async"
                />
                <span className="event-gallery-zoom" aria-hidden="true">
                  <ZoomIn size={20} />
                </span>
              </button>
              {photo.caption && <figcaption>{photo.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {active !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={active}
          title={title || "The first conversation"}
          onClose={() => setActive(null)}
          onSelectPhoto={carousel ? selectCarouselPhoto : undefined}
        />
      )}
    </section>
  );
}
