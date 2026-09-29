import { useEffect, useId, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import { lumaEventUrl } from "../lib/registration";
import "../registration.css";

function trapFocus(event) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll("button:not([disabled]), a[href]"),
  ).filter((element) => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

export default function RegistrationDialog({ onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="registration-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={trapFocus}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <div className="registration-topline">
        <span>FOR THE GREATER GOOD</span>
        <button
          ref={closeButtonRef}
          type="button"
          className="registration-close"
          onClick={onClose}
          aria-label="Close invitation details"
          title="Close"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="registration-content">
        <p className="registration-edition">The Work After AI</p>
        <h2 id={titleId}>
          {lumaEventUrl ? (
            <>
              Request an invitation<span>.</span>
            </>
          ) : (
            <>
              Invitations
              <br />
              opening soon<span>.</span>
            </>
          )}
        </h2>
        <div id={descriptionId} className="registration-description">
          <p>Date and venue to be announced.</p>
          <p>
            {lumaEventUrl
              ? "Invitation requests are reviewed individually. Continue to Luma to express your interest."
              : "Invitations will open once the next gathering is confirmed."}
          </p>
        </div>
        {lumaEventUrl ? (
          <a
            className="registration-action"
            href={lumaEventUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Continue to Luma <ExternalLink size={18} aria-hidden="true" />
          </a>
        ) : (
          <button
            className="registration-action"
            type="button"
            onClick={onClose}
          >
            Back to browsing
          </button>
        )}
      </div>
    </dialog>
  );
}
