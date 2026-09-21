export const APPLICATION_STATUSES = [
  "New",
  "Shortlisted",
  "Invited",
  "Confirmed",
  "Future edition",
  "Declined",
];
export const MAX_SEATS = 10;

const STORAGE_KEY = "ftgg-applications-v1";
const UPDATE_EVENT = "ftgg-applications-updated";

const sampleApplications = [
  [
    "sample-01",
    "Amelia Tan",
    "Independent consultant",
    "Organisation design consultant",
    "New",
    "I work with small teams adapting their hiring and responsibilities as AI becomes part of everyday work.",
  ],
  [
    "sample-02",
    "Daniel Rao",
    "Early career",
    "Recent graduate",
    "New",
    "I would bring a graduate perspective on finding a first role when entry-level tasks are changing.",
  ],
  [
    "sample-03",
    "Sofia Lee",
    "Independent studio",
    "Founder",
    "Shortlisted",
    "I am building a small creative business and thinking about what to delegate to tools and what to keep human.",
  ],
  [
    "sample-04",
    "Nathan Koh",
    "Professional services",
    "People and culture lead",
    "Invited",
    "Our team is rethinking how mentorship works when junior colleagues learn alongside AI.",
  ],
  [
    "sample-05",
    "Maya Fernando",
    "Independent researcher",
    "Workplace researcher",
    "Confirmed",
    "My research looks at belonging and how people make decisions in increasingly distributed teams.",
  ],
  [
    "sample-06",
    "Ethan Lim",
    "Higher education",
    "Student",
    "Future edition",
    "I want to discuss the difference between what university assesses and what employers value.",
  ],
].map(([id, name, organisation, role, status, perspective], index) => ({
  id,
  name,
  organisation,
  role,
  status,
  perspective,
  email: `${name.toLowerCase().replaceAll(" ", ".")}@example.com`,
  linkedin: "",
  question: "",
  notes: "",
  consent: true,
  sample: true,
  edition: "The Work After AI",
  createdAt: new Date(Date.UTC(2026, 8, 12 + index, 9)).toISOString(),
}));

function validateRecords(records) {
  if (
    !Array.isArray(records) ||
    records.some(
      (record) =>
        !record ||
        typeof record.id !== "string" ||
        typeof record.name !== "string" ||
        typeof record.email !== "string" ||
        !APPLICATION_STATUSES.includes(record.status),
    )
  ) {
    throw new Error(
      "The saved workspace could not be read. Your existing data has not been changed.",
    );
  }
  return records;
}

function readRecords() {
  let saved;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error(
      "Browser storage is unavailable. Allow local storage to save and view requests.",
    );
  }
  if (saved === null)
    return sampleApplications.map((application) => ({ ...application }));
  try {
    return validateRecords(JSON.parse(saved));
  } catch {
    throw new Error(
      "The saved workspace could not be read. Your existing data has not been changed.",
    );
  }
}

function writeRecords(records) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    throw new Error(
      "This browser could not save your changes. Check that local storage is allowed and try again.",
    );
  }
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

export function loadApplications() {
  try {
    return { applications: readRecords(), error: "" };
  } catch (error) {
    return { applications: [], error: error.message };
  }
}

export function createApplication(input) {
  const applications = readRecords();
  const email = input.email.trim().toLowerCase();
  if (
    applications.some(
      (application) =>
        !application.sample && application.email.toLowerCase() === email,
    )
  ) {
    throw new Error(
      "A request with this email is already saved in this browser.",
    );
  }
  if (
    !input.consent ||
    !input.name.trim() ||
    !email ||
    !input.organisation.trim() ||
    !input.role.trim() ||
    !input.perspective.trim()
  )
    throw new Error("Please complete all required fields.");
  const application = {
    id:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `request-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: input.name.trim(),
    email,
    organisation: input.organisation.trim(),
    role: input.role.trim(),
    linkedin: input.linkedin.trim(),
    perspective: input.perspective.trim(),
    question: input.question.trim(),
    consent: true,
    sample: false,
    status: "New",
    notes: "",
    edition: "The Work After AI",
    createdAt: new Date().toISOString(),
  };
  writeRecords([application, ...applications]);
  return application;
}

export function updateApplication(id, patch) {
  const applications = readRecords();
  const current = applications.find((application) => application.id === id);
  if (!current)
    throw new Error(
      "This request is no longer available. Refresh the workspace to continue.",
    );
  if (patch.status && !APPLICATION_STATUSES.includes(patch.status))
    throw new Error("Choose a valid application status.");
  if (patch.status === "Confirmed" && current.status !== "Confirmed") {
    if (current.status !== "Invited")
      throw new Error(
        "Mark the applicant invited before confirming their place.",
      );
    if (
      applications.filter((application) => application.status === "Confirmed")
        .length >= MAX_SEATS
    )
      throw new Error(
        "All 10 seats are confirmed. Free a seat before confirming another person.",
      );
  }
  const allowedPatch = {};
  if (typeof patch.notes === "string") allowedPatch.notes = patch.notes;
  if (patch.status) allowedPatch.status = patch.status;
  const updated = {
    ...current,
    ...allowedPatch,
    updatedAt: new Date().toISOString(),
  };
  writeRecords(
    applications.map((application) =>
      application.id === id ? updated : application,
    ),
  );
  return updated;
}

export function subscribeApplications(listener) {
  const handleStorage = (event) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(UPDATE_EVENT, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(UPDATE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
