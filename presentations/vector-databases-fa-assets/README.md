# Persian vector database presentation

Open `../vector-databases-fa.html` directly in a modern browser. It is a single self-contained HTML file with an embedded Persian font and illustrations; no server, installation, or internet connection is required. Links to further reading open external sources.

16 slides cover embeddings, vector records, similarity search, applications, ingestion, RAG, agent tool calls, memory, hybrid retrieval, and reliability. The audience is introductory; the suggested duration is 15–20 minutes. All slides include Persian presenter notes.

Controls: Left arrow / Page Down / Space for the next slide; Right arrow / Page Up for the previous slide; Home / End; O for overview; N for notes; F for full screen. Mobile slides scroll vertically; swipe right for next and left for previous. Use the print button for a landscape PDF with one slide per page.

The interactive example uses hand-authored four-dimensional vectors and calculates actual cosine similarity locally. It does not call an embedding model, database, or AI service. Its access checkbox is an instructional simulation.

To edit, change `presentation.template.html`, then run `node presentations/vector-databases-fa-assets/build.mjs` from the repository root. The generated HTML embeds the font, full font license, and image sheet. No runtime dependencies are added to the existing application.

Artwork was generated with the built-in image generation tool. The exact prompt is saved in `illustration-generation.json`. The six illustrations are displayed using distinct CSS background positions. Font: Vazirmatn, SIL Open Font License 1.1; see `FONT-LICENSE.txt`.

Browser verification is recorded in `qa/report.json`, with desktop screenshots for every slide, mobile samples, and a 16-page print check. The local `verify.mjs` uses an existing Playwright installation and Microsoft Edge; adjust its import/browser paths if running on another machine.
