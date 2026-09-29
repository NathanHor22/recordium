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

- `#/`: a continuous experience with the 3D record collection, scroll-driven collection reveal, flipping alumni sleeves, and the intention behind the series.
- Selecting a record opens its story on the left and animates the same 3D scene into the right side. Switching returns the current record to its sleeve before the next edition is presented. Closing returns the vinyl before restoring the collection, scroll position, and keyboard focus. On small screens, a compact record sits above the scrollable story.
- The contained share control copies `#/edition/intro` or `#/edition/ai`. Both initial visits and changes between these links open the corresponding edition without remounting the Canvas. Standard record selection does not navigate away.
- `#/admin`: retained browser-local curator demo with fictional sample applications. It is no longer linked from the public site and is not the production registration system.

The first public entry shows a spinning vinyl intro. Its orange spiral follows readiness of the cover artwork, logo, fonts, and first rendered 3D frame. It plays once per page load, not again when returning from the curator workspace. Slow loads offer an entry button after six seconds and automatically release the page after twelve seconds. Reduced motion disables rotation and fades.

On entry, the loading record moves to the live projected platter position while the page appears. The 3D renderer remains mounted through edition transitions; selecting a collection sleeve adds a short visual handoff into the reading view. Orange identifies the series and primary actions, while lime is reserved for the upcoming AI edition. The scene uses procedural paper and brushed-metal maps with soft contact shadows.

The public registration dialog currently shows "Invitations opening soon". It collects no personal details and does not save or send requests. The old curator demo remains browser-local with six clearly identified fictional sample applications; it has no server, authentication, email delivery, or cross-device persistence. Existing local demo data is left intact.

## Luma Registration

The event link has not been supplied yet. Leave `VITE_LUMA_EVENT_URL` empty to retain the opening-soon placeholder. Once the actual event is ready, set this build-time environment variable to its HTTPS `luma.com` or `lu.ma` event URL and restart Vite or redeploy on Vercel. The dialog will show a real "Continue to Luma" link in a new tab. No placeholder URL or fake submission is used.

An in-page Luma registration overlay can replace that external fallback once the event's official embed snippet is supplied. Configure approval, capacity, registration questions, and communications in Luma; these settings are not controlled by this website. Keep Luma as the guest-management source of truth, separate from the retained demo workspace.

## Editorial Content

Edit `src/data.js` to update edition copy. Upcoming themes are proposed editorial copy; date and venue remain unannounced. The inaugural edition's participant entry includes only Jordan, whose first name and role were supplied in the public recap. No additional identities, headshots, attendance counts, or event photographs have been invented.

`SeriesPrelude` introduces the monthly C-suite format before the collection. `ConversationStory` pairs a left-hand photo carousel with four recap-based takeaways on the right, before the alumni section. The text follows the selected image without moving the heading or call to action; mobile stacks the photograph above the text. `StoryStatement` follows with the supplied recap quote and invitation. These are distinct from the historical first edition's mixed audience; no host or participant credits have been inferred from a person's job title or photograph.

Four supplied photographs are copied unchanged into `public/assets/roundtable-01.jpeg` through `roundtable-04.jpeg`; the group photograph leads the first edition. Photo entries in `src/data.js` use `{ src, alt, caption, width, height }`. `EventGallery` preserves natural image proportions and provides a native lightbox with thumbnails, keyboard navigation, zoom, Escape, and focus restoration. The upcoming AI edition has no photographs of a gathering that has not happened. Set `linkedinPost` to the actual recap URL when supplied.

The homepage uses `EventGallery` in controlled `carousel` mode with `selectedIndex` and `onSelectPhoto`; the edition retains its grid. The carousel has an uncropped, fixed 4:3 frame, thumbnail navigation, keyboard navigation, touch swiping, and reduced-motion support. There is no autoplay. The four takeaways in `StoryStatement.jsx` describe the conversation as a whole, not statements attributed to people in a particular photograph.

The alumni section uses the separate `alumni` array in `src/data.js`. It currently features the supplied portrait of Andrew Tai, Managing Director at Synapze, with the LinkedIn profile linked from Synapze's official team page. Each person supports `id`, `name`, `role`, `organisation`, `perspective`, `portrait` (an image URL), and `linkedin` (an HTTPS LinkedIn URL). Without a portrait, the sleeve displays typographic initials rather than an invented headshot. The back shows their details and a contained "Find out more" LinkedIn link. Publish participant details and photographs only with the appropriate permission.

Generated cover artwork is local to `public/assets`; prompts and provenance are in `ASSETS.md`. These images are abstract album artwork, not photographs of an actual gathering. All fonts are served locally through Fontsource packages.

`BrandLogo` displays the bottom-left design from the supplied logo sheet using an SVG viewport over the original bitmap, preserving the supplied mark and wordmark. The font reference identifies Perpetua Titling MT Light, but no distributable font file has been supplied yet. Brand text can use an installed local copy, with a serif fallback; the exact wordmark remains present in the supplied artwork. A licensed webfont can be embedded in `src/brand.css` when provided.

The 3D scene has touch-friendly targets, visible HTML alternatives, and reduced-motion support. The public animation controls have been removed as requested. Operating-system reduced-motion settings replace the fog animation with a captured still, stop record rotation, and show the collection and monthly-series statement without scroll effects. Browsers without WebGL receive static artwork and a CSS background fallback.

## Verification

With the dev server running, `npm run test:browser` opens an isolated headless Chromium session and checks rendered canvas pixels, continuous record animation, scroll overlays, alumni portrait and flipping, keyboard navigation, the registration placeholder, retained curator demo behavior, mobile layouts, and reduced-motion behavior. Screenshots are written to `test-results/`. Install a Playwright Chromium browser first with `npx playwright install chromium` if needed. `TEST_URL` can point the checks at another local port.

`npm run test:loader` checks the intro separately, including visible colour progression, spinning, branding, slow and failed resources, entry without a ready renderer, reduced motion, and restoration of page interaction.

`npm run test:refinement` checks brand colour roles, the early series explanation, unframed sleeves, scroll-driven reveals, continuous nonblank scene transitions, keyboard focus, text containment, and reduced motion at phone, tablet, and desktop widths. Screenshots and transition samples are written to `test-results/refinement/`.

`npm run test:event-flow` checks rapid record switching, repeated selection, closing mid-animation, canvas continuity, original photographs, lightbox navigation and zoom, nested Escape behavior, share links, deep links, and the registration placeholder. Screenshots are written to `test-results/event-flow/`.

`npm run test:carousel` checks the split composition, stacked mobile layout, synchronized takeaways, stable slide dimensions, thumbnails, keyboard navigation, swiping, lightbox focus return, and reduced motion. Screenshots are written to `test-results/carousel/`.

## Before Production

- Confirm dates, venue, publication permissions, final copy, participant links, and event photographs.
- Create the real Luma event, configure approval/capacity/questions, and supply its official link and embed snippet.
- Review publication permissions and the privacy information shown before collecting real applications through Luma.
- Deploy the production bundle and verify the real Luma registration, confirmation, and cancellation workflow.
