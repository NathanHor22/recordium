# Artwork Assets

Two original bitmap artworks were generated with the built-in `image_gen` tool for the For the Greater Good prototype. The CLI/API fallback was not used. They are abstract editorial sleeve artwork, not images of actual participants or event photography.

## Upcoming Edition

- File: `public/assets/art-ai.png`
- Dimensions: 1254 x 1254 pixels, PNG with alpha
- Usage: layer over acid lime paper; add live or canvas typography separately. The artwork is concentrated toward the lower right, with room for a title at the upper left.
- Prompt:

> Use case: stylized-concept. Asset type: square album artwork background bitmap texture for a contemporary curated conversation record sleeve. Primary request: an abstract black halftone sculpture formed from layered human-profile-like paper silhouettes and a rippling bent metallic ribbon, arranged as one bold shape toward the lower right of a vivid acid chartreuse / electric yellow-green paper field. Suggest the changing nature of work and intelligence without literal technology icons. Medium: high-end experimental 1990s photocopy punk editorial collage, tactile riso print and scanned rough paper with crisp black ink, subtle distressed edges, visible coarse halftone dots. Composition: flat square artwork, edge to edge, upper left half mostly empty chartreuse paper suitable for large black title overlay added later in code; dark sculptural subject concentrated in lower right half and bottom edge. Palette: acid chartreuse (#c7ef36), deep black, sparse silver-white in the sculpture. No physical sleeve mockup, no table, no frames, no scene. Absolutely no text, no letters, no numbers, no logo, no watermark, no gradient, no real photographed people, no portrait of an identifiable person.

## First Conversation

- File: `public/assets/art-intro.png`
- Dimensions: 1254 x 1254 pixels, PNG
- Usage: white paper with black photocopied ring artwork toward the lower half. Add live or canvas typography separately.
- Prompt:

> Use case: stylized-concept. Asset type: square album cover background art for a contemporary curated conversation record sleeve. Primary request: a black-and-white photocopied abstraction of several rough concentric circles and overlapping voice wave contours, like bold ripples cut from inked paper, coming together in a single round abstract form. Symbolize many voices, generations and perspectives sharing one room. Style: high-end experimental 1990s punk editorial art, tactile photocopy zine print, coarse halftone dots and distressed rough paper. Composition: flat square artwork edge to edge, artwork concentrated in lower half with a strong rough circular shape near lower center. Upper 45 percent mostly blank white paper to allow large typography overlay later in code. White paper background, deep black ink, limited gray halftone. It must feel like an art print, not a technical illustration or UI. Absolutely no text, letters, numbers, logos, watermark, photographs of people, identifiable objects, physical sleeve mockup, table or frame. No beige, no gradients, no light rays. Sharp contrast, intentional white negative space, premium tactile print.

Generated files were copied from the tool's default generated-images directory into the project. The originals remain in place.

## Supplied Alumni Portrait

- File: `public/assets/andrew-tai.png`
- Source: user-supplied `final-team-1.png`, copied without image manipulation.
- Identity and role supplied by the user: Andrew Tai, Managing Director at Synapze.
- Usage: portrait face of the interactive alumni record sleeve. CSS fits the original portrait into the square sleeve.
- Profile link: `https://www.linkedin.com/in/andrewtaiwc/`, verified against the link on [Synapze's team page](https://www.synapzemy.com/about).

## Supplied Brand Artwork

- File: `public/assets/brand-board.jpeg`, copied unchanged from the supplied `WhatsApp Image 2026-09-29 at 14.19.19.jpeg`.
- Selected design: bottom-left orange crescent and charcoal speech mark, with its original wordmark.
- Display: `BrandLogo.jsx` uses SVG viewports `24 218 176 151` (complete lockup) and `56 218 102 102` (mark only) over the original 662 x 427 bitmap. An SVG display filter keys out the white background so the mark sits over the fog. The source bitmap is unchanged; no generated replacement is used.
- `public/favicon.svg` is a small code-native vector interpretation of the selected mark for the browser tab.
- Font reference: the second supplied screenshot identifies Perpetua Titling MT, Light. The actual font file is pending; no commercial font has been downloaded or redistributed.
- The loading record is original code-native SVG geometry using the logo's orange and charcoal palette.

## Procedural Materials

- Paper micrograin, brushed-metal roughness, record grooves, and printed centre labels are generated locally with canvas in `RecordScene.jsx`.
- The 3D turntable, sleeves, lighting, and contact shadows use code-native Three.js geometry and materials; no remote models or texture services are required.
- The loading disc uses the live projected platter bounds for its exit transition. The original supplied logo and portrait files remain unchanged.

## Supplied First-Roundtable Photographs

- `public/assets/roundtable-01.jpeg`: user-supplied `Work 1.jpeg`, opening conversation around the table.
- `public/assets/roundtable-02.jpeg`: user-supplied `work 2.jpeg`, a participant speaking while others listen.
- `public/assets/roundtable-03.jpeg`: user-supplied `work 3.jpeg`, a wider view of the discussion.
- `public/assets/roundtable-04.jpeg`: user-supplied `work 4.jpeg`, group photograph outside the Synapze office.
- All files are copied unchanged from the user's Desktop. Display order begins with the group photograph. CSS preserves the full natural aspect ratios; the lightbox offers zoom for closer inspection.
- Captions do not identify individual participants or infer their roles. These photographs belong to the first conversation, not the upcoming AI edition.
