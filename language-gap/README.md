# THE LANGUAGE GAP

Interactive language interpretation prototype, arranged to match the user's Moka FigJam layout and notes.

## Local preview

Open `http://127.0.0.1:4174/`. If the server is not already running, double-click `Open Language Gap.command` or run `python3 start-preview.py` from this directory. The launcher starts a detached server; closing the launcher terminal does not stop it. Server logs are written to `preview.log`.

The local server needs `OPENAI_API_KEY` for sentence analysis. Optional `OPENAI_MODEL` (default `gpt-4.1-mini`) and `OPENAI_BASE_URL` select a compatible provider. Keys stay on the server. Sentences are sent for analysis only when Analysis is clicked.

## Moka journey

1. Enter 7–10 English words on the right; Analysis highlights the interpreted words in the same sentence.
2. Scroll down through each word's frequency distribution, ambiguity, match count, clusters and spread. The left column stays fixed; one pinned chart transitions between words.
3. Scroll into the 3D semantic model. Click nodes to expose the left-hand weight controls; choose 2–3 meanings and save. Each save opens the next word's model. Calculate appears after all words are saved.
4. Calculate shows the selected interpretation on the left and the personal model on the right. Drag to rotate, double-click/pinch or use +/- to zoom. Normal scrolling over this model continues into the results.
5. Results follow the mockup: interpretation terrain, frequency profile, distance by word, anchor inspection and total language gap. Charts and values animate when they enter the viewport.

In the selection model, scrolling zooms; shift-drag pans. Keyboard users can focus the canvas for arrow-key rotation or Tab to meaning buttons. Reduced-motion preferences disable transitions and automatic rotation. Report numbers are calculated from the analysis and choices, not copied from the mockup.

## Source

- `dist/app.js`: page flow, sticky scroll sequence, selections, weights and 3D renderer.
- `dist/style.css`: Moka layout, typography, palette and responsive rules.
- `dist/analysis.js`: result diagrams, statistics and viewport-triggered motion.
- `dist/data.js`: semantic model, frequency ranks, centroids and distance calculations.
- `serve.py`: local static server and sentence-analysis endpoint.

`report-preview.html` uses authored example data through the same current report UI. `header-preview.html` opens that example at its data section. These are development previews, not a substitute for live API validation.

Existing checks: `node check-data.mjs`, `node check-analysis.mjs`, `node check-scene.mjs`.

## Measurement

Meanings and frequencies are model estimates. Coordinates are illustrative, not semantic embeddings. Each selected center is a weighted centroid. Word gap is its distance from the default center divided by the maximum distance between meanings. The total is weighted by ambiguity and importance. The scan histogram is a smoothed distribution of the actual returned frequency estimates.
