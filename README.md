# AI Text Summarizer & Content Transformation Tool

College project with a **frontend** (HTML, CSS, JavaScript) and a **backend** (Node.js + Express).
It summarizes text and transforms it: key points, keywords, tone rewrite, short-form copy, highlights.

## Folder structure

    AI-Text-Summarizer/
    |-- README.md
    |-- frontend/                 What the user sees in the browser
    |   |-- index.html            Page structure
    |   |-- css/style.css         Styling, dark mode, mobile layout
    |   `-- js/script.js          UI code: sends text to the API and shows the results
    `-- backend/                  Server and logic
        |-- server.js             Starts Express, serves the frontend folder, mounts the API
        |-- package.json          Project info, dependencies, npm scripts
        |-- routes/api.js         API routes: GET /api/health, POST /api/summarize
        `-- utils/summarizer.js   All the NLP logic: sentence split, scoring, keywords, tone rewrite

## How to run

1. Install Node.js (version 18 or newer) from https://nodejs.org
2. Open the AI-Text-Summarizer folder in VS Code (File > Open Folder), then open the terminal (Ctrl + `)
3. Go into the backend folder and install the dependencies (only once):

       cd backend
       npm install

4. Start the server:

       npm start

5. Open http://localhost:3000 in your browser.

Use `npm run dev` instead of `npm start` to restart the server automatically when you edit a file.
The backend serves the frontend folder, so do not open index.html by double-clicking it.

## How the frontend and backend talk

    Browser (frontend/js/script.js)
        |  POST /api/summarize  { text, ratio, tone, summaryOnly }
        v
    Express server (backend/server.js -> routes/api.js -> utils/summarizer.js)
        |  JSON: stats, summary, bullets, keywords, rewrite, short, highlights
        v
    Browser shows the result in the tabs

### API

`GET /api/health` returns `{ "status": "ok" }`.

`POST /api/summarize`

- Request body: `text` (string, required, max 100,000 characters), `ratio` (0.1 to 0.7, default 0.3),
  `tone` (`formal`, `casual` or `simple`), `summaryOnly` (true or false)
- Errors come back as `{ "error": "..." }` with status 400, 413 or 500.

Quick test from the terminal:

    curl -X POST http://localhost:3000/api/summarize -H "Content-Type: application/json" -d "{\"text\":\"Your long text here.\"}"

## How the summary works (backend/utils/summarizer.js)

1. Split the text into paragraphs and sentences.
2. Remove stop words (the, and, of) and reduce plurals to a stem.
3. Weigh each word by how often it appears.
4. Score each sentence: sum of word weights / n^0.6 x position boost.
5. Keep the top sentences (set by the length slider) in their original order.

## Limits

- Extractive only: it picks existing sentences and cannot rephrase.
- Tone rewrite is rule-based word replacement.
- The stop-word list is English.
