# Conversations for the Greater Good

An interactive prototype of the conversation collection. Built with React, Vite, Three.js / React Three Fiber, Vanta fog, GSAP ScrollTrigger, and custom generated sleeve artwork.

## Run

Requires Node 22.12+.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates the production bundle in `dist`.

## Experiences

- `#/`: an interactive 3D opening scene, the monthly-series introduction, a scroll-overlay collection reveal, flipping alumni sleeves, the closing statement, and an invitation section. The header contains only The collection and The alumni, visible at all screen sizes.
- Selecting a record opens its story on the left and animates the same 3D scene into the right side. Switching returns the current record to its sleeve before the next edition is presented. Closing returns the vinyl before restoring the collection, scroll position, and keyboard focus. On small screens, a compact record sits above the scrollable story.
- The contained share control copies `#/edition/intro` or `#/edition/ai`. Both initial visits and changes between these links open the corresponding edition without remounting the Canvas. Standard record selection does not navigate away.
- `#/admin`: retained browser-local curator demo with fictional sample applications. It is no longer linked from the public site and is not the production registration system.

The first public entry shows a spinning vinyl intro. Its orange spiral follows readiness of the cover artwork, logo, fonts, and first rendered 3D frame. It plays once per page load, not again when returning from the curator workspace. Slow loads offer an entry button after six seconds and automatically release the page after twelve seconds. Reduced motion disables rotation and fades.

On entry, the loading record moves to the live projected platter position while the page appears. The 3D renderer remains mounted through edition transitions. Scrolling grows and fades the "Explore the collection" title over a sticky stage before revealing the record sleeves. Selecting a sleeve carries it into the reading view while the same 3D scene fades into place. Orange identifies the series and primary actions, while lime is reserved for the upcoming AI edition. The scene uses procedural paper and brushed-metal maps with soft contact shadows.

Invitation actions are available inside the upcoming record, in the closing invitation section, and in the footer. Their registration dialog currently shows "Invitations opening soon". It collects no personal details and does not save or send requests. The old curator demo remains browser-local with six clearly identified fictional sample applications; it has no server, authentication, email delivery, or cross-device persistence. Existing local demo data is left intact.

## Luma Registration

The event link has not been supplied yet. Leave `VITE_LUMA_EVENT_URL` empty to retain the opening-soon placeholder. Once the actual event is ready, set this build-time environment variable to its HTTPS `luma.com` or `lu.ma` event URL and restart Vite or redeploy on Vercel. The dialog will show a real "Continue to Luma" link in a new tab. No placeholder URL or fake submission is used.

An in-page Luma registration overlay can replace that external fallback once the event's official embed snippet is supplied. Configure approval, capacity, registration questions, and communications in Luma; these settings are not controlled by this website. Keep Luma as the guest-management source of truth, separate from the retained demo workspace.

## Editorial Content

Edit `src/data.js` to update edition copy. The first edition is titled "Navigating Work in 2026" across its sleeve, record label, controls and detail view. Its four discussion threads distil the supplied roundtable recap without publishing unverified statistics, policy claims, inferred identities or private action items. The upcoming "The Work After AI" record contains a short premise and unannounced date/venue status, not questions, tracks or a retrospective. The inaugural edition's participant entry includes only Jordan, whose first name and role were supplied in the public recap.

`SeriesPrelude` explains the monthly C-suite format with a scroll-led reveal. This describes the series rather than redefining the historical first edition's mixed audience. `StoryStatement` retains "Nobody had the questions beforehand. Nobody had polished answers ready." without a conversation button, followed by the separate invitation section.

Four supplied photographs are copied unchanged into `public/assets/roundtable-01.jpeg` through `roundtable-04.jpeg`; the group photograph leads the first edition. Photo entries in `src/data.js` use `{ src, alt, caption, width, height }`. `EventGallery` preserves natural image proportions and provides a native lightbox with thumbnails, keyboard navigation, zoom, Escape, and focus restoration. The upcoming AI edition has no photographs of a gathering that has not happened. Set `linkedinPost` to the actual recap URL when supplied.

The photographs and detailed recap appear only inside the first record. The standalone homepage photo carousel has been removed.

The alumni section uses the separate `alumni` array in `src/data.js`. It currently features the supplied portrait of Andrew Tai, Managing Director at Synapze, with the LinkedIn profile linked from Synapze's official team page. Each person supports `id`, `name`, `role`, `organisation`, `perspective`, `portrait` (an image URL), and `linkedin` (an HTTPS LinkedIn URL). Without a portrait, the sleeve displays typographic initials rather than an invented headshot. The back shows their details and a contained "Find out more" LinkedIn link. Publish participant details and photographs only with the appropriate permission.

Generated cover artwork is local to `public/assets`; prompts and provenance are in `ASSETS.md`. These images are abstract album artwork, not photographs of an actual gathering. All fonts are served locally through Fontsource packages.

`BrandLogo` displays the bottom-left design from the supplied logo sheet using an SVG viewport over the original bitmap, preserving the supplied mark and wordmark. The font reference identifies Perpetua Titling MT Light, but no distributable font file has been supplied yet. Brand text can use an installed local copy, with a serif fallback; the exact wordmark remains present in the supplied artwork. A licensed webfont can be embedded in `src/brand.css` when provided.

The 3D scene has touch-friendly targets, visible HTML alternatives, and reduced-motion support. The public animation controls have been removed as requested. Operating-system reduced-motion settings replace the fog animation with a captured still, stop record rotation, and reveal the closing statement without motion. Browsers without WebGL receive static artwork and a CSS background fallback.

## Verification

With the dev server running, `npm run test:browser` opens an isolated headless Chromium session and checks rendered canvas pixels, continuous record animation, alumni portrait and flipping, keyboard navigation, the registration placeholder, and retained curator demo behavior. Screenshots are written to `test-results/`. Install a Playwright Chromium browser first with `npx playwright install chromium` if needed. `TEST_URL` can point the checks at another local port.

`npm run test:loader` checks the intro separately, including visible colour progression, spinning, branding, slow and failed resources, entry without a ready renderer, reduced motion, and restoration of page interaction.

`npm run test:refinement` checks the restored page sequence and scroll-overlay collection reveal, the two navigation controls, readable copy, continuous nonblank scene transitions, keyboard focus, text containment, and reduced motion at phone, tablet, and desktop widths. Screenshots are written to `test-results/refinement/`.

`npm run test:event-flow` checks rapid record switching, repeated selection, closing mid-animation, canvas continuity, original photographs, lightbox navigation and zoom, nested Escape behavior, share links, deep links, and the registration placeholder. Screenshots are written to `test-results/event-flow/`.

## Before Production

- Confirm dates, venue, publication permissions, final copy, participant links, and event photographs.
- Create the real Luma event, configure approval/capacity/questions, and supply its official link and embed snippet.
- Review publication permissions and the privacy information shown before collecting real applications through Luma.
- Deploy the production bundle and verify the real Luma registration, confirmation, and cancellation workflow.
