import { useEffect, useMemo, useRef, useState } from "react";
import BrandLogo from "./BrandLogo";
import {
  Disc3,
  Check,
  MoreHorizontal,
  Download,
  Mail,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  APPLICATION_STATUSES,
  loadApplications,
  MAX_SEATS,
  subscribeApplications,
  updateApplication,
} from "../lib/applications";
import "../admin.css";

const statusClass = (status) =>
  `admin-status admin-status-${status.toLowerCase().replaceAll(" ", "-")}`;
const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

function ApplicantDetail({ application, confirmedCount, onClose }) {
  const [notes, setNotes] = useState(application.notes || "");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [nextStatus, setNextStatus] = useState(application.status);
  const drawerRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    setNextStatus(application.status);
  }, [application.status]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector("button")?.focus();
    const handleEscape = (event) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleEscape);
      previous?.focus();
    };
  }, []);

  function save(patch, message) {
    setError("");
    setFeedback("");
    try {
      updateApplication(application.id, patch);
      setFeedback(message);
      setPreview(false);
    } catch (failure) {
      setError(failure.message);
    }
  }

  function handleTrap(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...drawerRef.current.querySelectorAll(
        "button:not([disabled]), input, textarea, select, a[href]",
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

  return (
    <div
      className="admin-drawer-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="admin-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-applicant-title"
        ref={drawerRef}
        onKeyDown={handleTrap}
      >
        <div className="admin-drawer-top">
          <span className="admin-meta">
            APPLICATION /{" "}
            {application.sample ? "FICTIONAL SAMPLE" : "LOCAL REQUEST"}
          </span>
          <button
            className="admin-icon-button"
            onClick={onClose}
            aria-label="Close applicant"
            title="Close"
          >
            <X size={21} />
          </button>
        </div>
        <h2 id="admin-applicant-title">{application.name}</h2>
        <p className="admin-applicant-role">
          {application.role} / {application.organisation}
        </p>
        <span className={statusClass(application.status)}>
          {application.status}
        </span>
        <dl className="admin-contact">
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${application.email}`}>{application.email}</a>
            </dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>{formatDate(application.createdAt)}</dd>
          </div>
          {application.linkedin && (
            <div>
              <dt>Profile</dt>
              <dd>
                <a href={application.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </dd>
            </div>
          )}
        </dl>
        <section className="admin-detail-section">
          <h3>Perspective</h3>
          <p>{application.perspective}</p>
        </section>
        {application.question && (
          <section className="admin-detail-section">
            <h3>Their question</h3>
            <p>{application.question}</p>
          </section>
        )}
        <section className="admin-detail-section">
          <label className="admin-section-label" htmlFor="admin-notes">
            Curator notes
          </label>
          <textarea
            id="admin-notes"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setFeedback("");
            }}
            rows={4}
            maxLength={5000}
          />
          <button
            className="admin-button admin-small-button"
            onClick={() => save({ notes }, "Notes saved on this device.")}
            disabled={notes === (application.notes || "")}
          >
            Save notes <Check size={15} />
          </button>
        </section>
        <section className="admin-detail-section">
          <h3>Application status</h3>
          <div className="admin-status-controls">
            <select
              value={nextStatus}
              onChange={(event) => {
                setNextStatus(event.target.value);
                setFeedback("");
              }}
              aria-label="Application status"
            >
              {APPLICATION_STATUSES.filter(
                (status) =>
                  status !== "Confirmed" ||
                  application.status === "Invited" ||
                  application.status === "Confirmed",
              ).map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={
                    status === "Confirmed" &&
                    application.status !== "Confirmed" &&
                    confirmedCount >= MAX_SEATS
                  }
                >
                  {status}
                </option>
              ))}
            </select>
            <button
              className="admin-button"
              disabled={nextStatus === application.status}
              onClick={() =>
                nextStatus === "Invited"
                  ? setPreview(true)
                  : save(
                      { status: nextStatus },
                      nextStatus === "Confirmed"
                        ? "Seat confirmed manually. No email was sent."
                        : "Status updated.",
                    )
              }
            >
              Update
            </button>
          </div>
          {application.status !== "Invited" &&
            application.status !== "Confirmed" && (
              <button
                className="admin-button admin-dark-button admin-invite-button"
                onClick={() => {
                  setPreview(true);
                  setFeedback("");
                }}
              >
                <Mail size={16} /> Preview invitation
              </button>
            )}
          {application.status === "Invited" && (
            <button
              className="admin-button admin-dark-button admin-invite-button"
              disabled={confirmedCount >= MAX_SEATS}
              onClick={() =>
                save(
                  { status: "Confirmed" },
                  "Seat confirmed manually. No email was sent.",
                )
              }
            >
              <Check size={16} /> Confirm seat manually
            </button>
          )}
          {confirmedCount >= MAX_SEATS &&
            application.status !== "Confirmed" && (
              <p className="admin-muted">All 10 seats are confirmed.</p>
            )}
        </section>
        {preview && (
          <section className="admin-email-preview">
            <div className="admin-preview-heading">
              <h3>Invitation preview</h3>
              <button
                className="admin-icon-button"
                onClick={() => setPreview(false)}
                aria-label="Close invitation preview"
                title="Close preview"
              >
                <X size={17} />
              </button>
            </div>
            <p className="admin-meta">TO: {application.email}</p>
            <p>
              <strong>A seat at the table / The Work After AI</strong>
            </p>
            <p>Hi {application.name.split(" ")[0]},</p>
            <p>
              We would love to welcome your perspective to the next
              Conversations For The Greater Good roundtable: The Work After AI.
            </p>
            <p>Date and venue to be confirmed.</p>
            <p className="admin-demo-note">
              Demo preview. This action only updates the local status; no email
              will be sent.
            </p>
            <button
              className="admin-button admin-dark-button"
              onClick={() =>
                save(
                  { status: "Invited" },
                  "Marked invited. No email was sent.",
                )
              }
            >
              <Check size={16} /> Mark invited
            </button>
          </section>
        )}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <p className="admin-feedback" role="status">
          {feedback}
        </p>
      </aside>
    </div>
  );
}

export default function Admin({ onClose }) {
  const mainRef = useRef(null);
  const [store, setStore] = useState(loadApplications);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All applications");
  const [selectedId, setSelectedId] = useState(null);
  const applications = store.applications;
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(
    () => subscribeApplications(() => setStore(loadApplications())),
    [],
  );
  const confirmedCount = applications.filter(
    (application) => application.status === "Confirmed",
  ).length;
  const selected = applications.find(
    (application) => application.id === selectedId,
  );
  const filtered = useMemo(
    () =>
      applications.filter(
        (application) =>
          (status === "All applications" || application.status === status) &&
          [
            application.name,
            application.email,
            application.role,
            application.organisation,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase().trim()),
      ),
    [applications, search, status],
  );

  function exportApplications() {
    const csvValue = (value) =>
      `"${String(value ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const rows = [
      [
        "Name",
        "Email",
        "Organisation",
        "Role",
        "Status",
        "Perspective",
        "Question",
        "Notes",
        "Fictional sample",
      ],
      ...filtered.map((application) => [
        application.name,
        application.email,
        application.organisation,
        application.role,
        application.status,
        application.perspective,
        application.question,
        application.notes,
        application.sample ? "Yes" : "No",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF", rows.map((row) => row.map(csvValue).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8;" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "ftgg-work-after-ai-applications.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main
      className="admin-page"
      ref={mainRef}
      tabIndex={-1}
      aria-label="Curator workspace"
    >
      <header className="admin-header">
        <button
          className="admin-back"
          onClick={onClose}
          aria-label="Back to the collection"
          title="Back to the collection"
        >
          <Disc3 size={17} />
          <span>Collection</span>
        </button>
        <span className="admin-brand">
          <BrandLogo compact /> <span>Curator workspace</span>
        </span>
        <span className="admin-demo-badge">Demo workspace</span>
      </header>
      <div className="admin-content">
        <div className="admin-page-heading">
          <div>
            <p className="admin-meta">UPCOMING EDITION</p>
            <h1>The Work After AI</h1>
            <p className="admin-muted">Date and venue to be confirmed</p>
          </div>
          <button
            className="admin-button admin-export"
            onClick={exportApplications}
            disabled={!filtered.length}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
        <p className="admin-workspace-notice">
          Local demo on this device. Sample applicants are fictional. Requests
          and notes stay in this browser; invitations are not sent.
        </p>
        {store.error && (
          <p className="admin-error" role="alert">
            {store.error}
          </p>
        )}
        <div className="admin-stats">
          <div>
            <span>Total requests</span>
            <strong>{applications.length}</strong>
          </div>
          <div>
            <span>To review</span>
            <strong>
              {
                applications.filter(
                  (application) => application.status === "New",
                ).length
              }
            </strong>
          </div>
          <div>
            <span>Shortlisted</span>
            <strong>
              {
                applications.filter(
                  (application) => application.status === "Shortlisted",
                ).length
              }
            </strong>
          </div>
          <div>
            <span>
              <Users size={14} /> Confirmed seats
            </span>
            <strong>
              {confirmedCount}
              <small> / {MAX_SEATS}</small>
            </strong>
          </div>
        </div>
        <div className="admin-list-heading">
          <h2>Applications</h2>
          <span className="admin-meta">
            {filtered.length} {filtered.length === 1 ? "REQUEST" : "REQUESTS"}
          </span>
        </div>
        <div className="admin-filter-row">
          <label className="admin-search">
            <Search size={17} />
            <input
              aria-label="Search applicants"
              placeholder="Search name, role or organisation"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                className="admin-icon-button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option>All applications</option>
            {APPLICATION_STATUSES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Applicant</th>
                <th scope="col">Role / organisation</th>
                <th scope="col">Status</th>
                <th scope="col">Received</th>
                <th scope="col">
                  <span className="admin-sr-only">View application</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((application) => (
                <tr key={application.id}>
                  <td>
                    <button
                      className="admin-applicant-button"
                      onClick={() => setSelectedId(application.id)}
                    >
                      {application.name}
                      {application.sample && (
                        <span className="admin-sample">Sample</span>
                      )}
                    </button>
                    <span className="admin-table-email">
                      {application.email}
                    </span>
                  </td>
                  <td>
                    <span>{application.role}</span>
                    <span className="admin-table-secondary">
                      {application.organisation}
                    </span>
                  </td>
                  <td>
                    <span className={statusClass(application.status)}>
                      {application.status}
                    </span>
                  </td>
                  <td className="admin-date">
                    {formatDate(application.createdAt)}
                  </td>
                  <td>
                    <button
                      className="admin-icon-button"
                      onClick={() => setSelectedId(application.id)}
                      aria-label={`View application from ${application.name}`}
                      title="View application"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="admin-empty">
              <Search size={24} />
              <h3>
                {store.error
                  ? "Workspace unavailable"
                  : "No applications found"}
              </h3>
              <p>
                {store.error
                  ? "Resolve the storage issue to access requests."
                  : "Try a different name or application status."}
              </p>
              {!store.error && (
                <button
                  className="admin-button"
                  onClick={() => {
                    setSearch("");
                    setStatus("All applications");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {selected && (
        <ApplicantDetail
          key={selected.id}
          application={selected}
          confirmedCount={confirmedCount}
          onClose={() => setSelectedId(null)}
        />
      )}
    </main>
  );
}
