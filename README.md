# Conversations for the Greater Good

A working, browser-local prototype of the conversation collection. Built with React, Vite, Three.js / React Three Fiber, Vanta fog, GSAP ScrollTrigger, and custom generated sleeve artwork.

## Run

Requires Node 22.12+.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates the production bundle in `dist`.

## Experiences

- `#/`: a continuous experience with the 3D record collection, scroll-driven collection reveal, flipping alumni sleeves, and the intention behind the series.
- Selecting a record opens its story on the left and animates the same 3D scene into the right side. Closing restores the collection and scroll position without navigating away. On small screens, the record sits above the scrollable story.
- `#/edition/intro` and `#/edition/ai` remain supported as initial deep links into the same experience.
- `#/admin`: curator demo with applications, search, filters, private notes, email preview, status changes, CSV export, and a 10-seat confirmation limit.

Requests and curator changes persist in this browser's localStorage. Six fictional sample applications are explicitly identified. No server, authentication, email delivery, or cross-device persistence is configured. The curator demo is not a secure administrative backend. Before a public launch, replace the local store with an authenticated server, protect applicant data, and connect an email provider and an acceptance workflow.

## Editorial Content

Edit `src/data.js` to update edition copy. Upcoming themes are proposed editorial copy; date and venue remain unannounced. The inaugural edition's participant entry includes only Jordan, whose first name and role were supplied in the public recap. No additional identities, headshots, attendance counts, or event photographs have been invented.

Add approved photographs as `{ src, alt, caption }` entries in an edition's `photos` array. A responsive gallery and lightbox appear when photos exist. Set `linkedinPost` to the actual recap URL.

The alumni section uses the separate `alumni` array in `src/data.js`. It currently features the supplied portrait of Andrew Tai, Managing Director at Synapze, with the LinkedIn profile linked from Synapze's official team page. Each person supports `id`, `name`, `role`, `organisation`, `perspective`, `portrait` (an image URL), and `linkedin` (an HTTPS LinkedIn URL). Without a portrait, the sleeve displays typographic initials rather than an invented headshot. The back shows their details and a contained "Find out more" LinkedIn link. Publish participant details and photographs only with the appropriate permission.

Generated cover artwork is local to `public/assets`; prompts and provenance are in `ASSETS.md`. These images are abstract album artwork, not photographs of an actual gathering. All fonts are served locally through Fontsource packages.

The 3D scene has touch-friendly targets, visible HTML alternatives, and reduced-motion support. The public animation controls have been removed as requested. Operating-system reduced-motion settings replace the fog animation with a captured still, stop record rotation, and show the collection and monthly-series statement without scroll effects. Browsers without WebGL receive static artwork and a CSS background fallback.

## Verification

With the dev server running, `npm run test:browser` opens an isolated headless Chromium session and checks rendered canvas pixels, continuous record animation, scroll overlays, alumni portrait and flipping, keyboard navigation, invitation submission, curator notes and status updates, local persistence, mobile layouts, and reduced-motion behavior. Screenshots are written to `test-results/`. Install a Playwright Chromium browser first with `npx playwright install chromium` if needed. `TEST_URL` can point the checks at another local port.

## Before Production

- Confirm dates, venue, publication permissions, final copy, participant links, and event photographs.
- Add server-side validation, storage, authentication and authorisation, email delivery and RSVP handling.
- Add a privacy notice, retention policy, appropriate consent handling, and spam protection before collecting real applications.
- Deploy the production bundle and verify the invitation workflow against the real backend.
