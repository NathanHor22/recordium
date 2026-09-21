# Conversations for the Greater Good

A working, browser-local prototype of the conversation collection. Built with React, Vite, Three.js / React Three Fiber, and custom generated sleeve artwork.

## Run

Requires Node 22.12+.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates the production bundle in `dist`.

## Experiences

- `#/`: interactive 3D record collection and accessible edition links.
- `#/edition/intro`: the inaugural Synapze conversation, based on the supplied public recap.
- `#/edition/ai`: upcoming The Work After AI conversation and invitation request.
- `#/about`: the intention behind the series.
- `#/admin`: curator demo with applications, search, filters, private notes, email preview, status changes, CSV export, and a 10-seat confirmation limit.

Requests and curator changes persist in this browser's localStorage. Six fictional sample applications are explicitly identified. No server, authentication, email delivery, or cross-device persistence is configured. The curator demo is not a secure administrative backend. Before a public launch, replace the local store with an authenticated server, protect applicant data, and connect an email provider and an acceptance workflow.

## Editorial Content

Edit `src/data.js` to update edition copy. Upcoming themes are proposed editorial copy; date and venue remain unannounced. The inaugural edition's participant entry includes only Jordan, whose first name and role were supplied in the public recap. No additional identities, headshots, attendance counts, or event photographs have been invented.

Add approved photographs as `{ src, alt, caption }` entries in an edition's `photos` array. A responsive gallery and lightbox appear when photos exist. Set `linkedinPost` to the actual recap URL and each approved participant's `linkedin` to their public profile URL to reveal those links. Publish participant details and photographs only with the appropriate permission.

Generated cover artwork is local to `public/assets`; prompts and provenance are in `ASSETS.md`. These images are abstract album artwork, not photographs of an actual gathering. All fonts are served locally through Fontsource packages.

The 3D scene has touch-friendly targets, visible HTML alternatives, pause controls, and reduced-motion support. Browsers without WebGL receive a static artwork collection.

## Verification

With the dev server running, `npm run test:browser` opens an isolated headless Chromium session and checks rendered canvas pixels, record animation and pause, keyboard navigation, participant details, invitation submission, curator notes and status updates, local persistence, mobile layouts, and reduced-motion behavior. Screenshots are written to `test-results/`. Install a Playwright Chromium browser first with `npx playwright install chromium` if needed. `TEST_URL` can point the checks at another local port.

## Before Production

- Confirm dates, venue, publication permissions, final copy, participant links, and event photographs.
- Add server-side validation, storage, authentication and authorisation, email delivery and RSVP handling.
- Add a privacy notice, retention policy, appropriate consent handling, and spam protection before collecting real applications.
- Deploy the production bundle and verify the invitation workflow against the real backend.
