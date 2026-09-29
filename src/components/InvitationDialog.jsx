import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { createApplication } from "../lib/applications";
import "../admin.css";

function trapFocus(event) {
  if (event.key !== "Tab") return;
  const controls = [
    ...event.currentTarget.querySelectorAll(
      "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], select:not([disabled])",
    ),
  ];
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

export default function InvitationDialog({ onClose }) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (success) titleRef.current?.focus();
  }, [success]);

  function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const linkedin = String(values.get("linkedin") || "").trim();
    if (linkedin) {
      let valid = false;
      try {
        const url = new URL(linkedin);
        valid =
          url.protocol === "https:" &&
          ["linkedin.com", "www.linkedin.com"].includes(url.hostname) &&
          /^\/in\/[^/]+\/?$/.test(url.pathname);
      } catch {
        /* Native URL validation handles malformed URLs. */
      }
      if (!valid) {
        setError(
          "Use a LinkedIn profile URL beginning with https://www.linkedin.com/in/",
        );
        form.elements.linkedin.focus();
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      createApplication({
        name: String(values.get("name")),
        email: String(values.get("email")),
        organisation: String(values.get("organisation")),
        role: String(values.get("role")),
        linkedin,
        perspective: String(values.get("perspective")),
        question: String(values.get("question") || ""),
        consent: values.get("consent") === "on",
      });
      setSuccess(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="invitation-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="invitation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invitation-title"
        ref={dialogRef}
        onKeyDown={trapFocus}
      >
        <div className="invitation-topline">
          <span className="invitation-kicker">FOR THE GREATER GOOD</span>
          <button
            className="invitation-icon-button"
            onClick={onClose}
            aria-label="Close invitation request"
            title="Close"
          >
            <X size={21} />
          </button>
        </div>
        {success ? (
          <div className="invitation-success">
            <span className="invitation-success-mark">
              <Check size={28} />
            </span>
            <p className="invitation-kicker">THE WORK AFTER AI</p>
            <h2 id="invitation-title" tabIndex={-1} ref={titleRef}>
              A place to begin.
            </h2>
            <p>
              Your request is saved in this browser's demo workspace. No request
              or email has been sent to the organisers.
            </p>
            <button className="invitation-submit" onClick={onClose}>
              Done <Check size={18} />
            </button>
          </div>
        ) : (
          <>
            <p className="invitation-kicker invitation-edition">
              UPCOMING / THE WORK AFTER AI
            </p>
            <h2 id="invitation-title">Bring your perspective.</h2>
            <p className="invitation-intro">
              Different experiences. One table. Tell us what you would bring to
              the conversation.
            </p>
            <form onSubmit={handleSubmit} className="invitation-form">
              <div className="invitation-fields">
                <label>
                  Your name <span aria-hidden="true">*</span>
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  Email address <span aria-hidden="true">*</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={180}
                  />
                </label>
                <label>
                  Organisation <span aria-hidden="true">*</span>
                  <input
                    name="organisation"
                    autoComplete="organization"
                    required
                    maxLength={120}
                  />
                </label>
                <label>
                  Role <span aria-hidden="true">*</span>
                  <input
                    name="role"
                    autoComplete="organization-title"
                    required
                    maxLength={120}
                  />
                </label>
              </div>
              <label>
                LinkedIn profile{" "}
                <span className="invitation-optional">Optional</span>
                <input
                  name="linkedin"
                  type="url"
                  placeholder="https://www.linkedin.com/in/your-name"
                  maxLength={300}
                />
              </label>
              <label>
                What perspective would you bring?{" "}
                <span aria-hidden="true">*</span>
                <textarea
                  name="perspective"
                  rows={3}
                  required
                  maxLength={2000}
                />
              </label>
              <label>
                A question you are living with{" "}
                <span className="invitation-optional">Optional</span>
                <textarea name="question" rows={2} maxLength={1000} />
              </label>
              <label className="invitation-consent">
                <input name="consent" type="checkbox" required />
                <span>
                  I agree to be contacted about this gathering using the details
                  provided.
                </span>
              </label>
              {error && (
                <p className="invitation-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="invitation-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving request..." : "Request an invitation"}
              </button>
              <p className="invitation-demo">
                Prototype: requests are saved on this device only. No email is
                sent. Fields marked * are required.
              </p>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
