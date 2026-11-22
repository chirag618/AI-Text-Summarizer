# ToneShift – AI Text Summarizer & Content Transformation Tool

ToneShift is a web-based text summarization and content transformation application developed as a college mini-project. It helps users process lengthy text and generate concise, organized and readable outputs through a collection of text-processing features.

The application uses a frontend built with HTML, CSS and JavaScript, supported by a backend developed using Node.js and Express.

## 1. Project Overview

The application provides several text-processing capabilities:

- **Text Summarization:** Generates concise summaries using extractive sentence scoring.
- **Key Points Extraction:** Identifies important points from the input.
- **Keyword Extraction:** Finds frequently occurring and relevant words and phrases.
- **Tone Rewriting:** Applies rule-based transformations to produce formal, casual or simple wording.
- **Short-form Content Generation:** Produces shorter versions of input content.
- **Sentence Highlighting:** Highlights important sentences.
- **Text Analysis:** Displays text statistics and readability-related information.

## 2. Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js |
| Server Framework | Express.js |
| Communication | REST API |
| Data Format | JSON |
| Development Environment | Visual Studio Code |
| Version Control | Git and GitHub |
| Deployment | Vercel |

## 3. Project Structure

```text
AI-Text-Summarizer/
│
├── README.md
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
│
└── backend/
    ├── server.js
    ├── package.json
    ├── routes/
    │   └── api.js
    └── utils/
        └── summarizer.js
```

### Frontend

- `index.html`: Defines the application's user interface.
- `style.css`: Handles styling, layout, dark mode and responsive presentation.
- `script.js`: Manages user interactions, sends API requests and displays generated results.

### Backend

- `server.js`: Initializes the Express server, serves frontend files and mounts API routes.
- `package.json`: Contains project metadata, dependencies and execution scripts.
- `routes/api.js`: Defines the application's API endpoints.
- `utils/summarizer.js`: Contains the text-processing and NLP logic, including sentence scoring, keyword extraction and tone transformation.

## 4. Installation and Setup

### Prerequisites

- Node.js version 18 or newer.
- npm (Node Package Manager).
- Visual Studio Code or another code editor.

### Steps to Run Locally

**Step 1: Clone the repository**

```bash
git clone https://github.com/chirag618/AI-Text-Summarizer.git
```

**Step 2: Open the project directory**

```bash
cd AI-Text-Summarizer
```

**Step 3: Navigate to the backend folder**

```bash
cd backend
```

**Step 4: Install dependencies**

```bash
npm install
```

**Step 5: Start the application**

```bash
npm start
```

For development with automatic server restarts, use:

```bash
npm run dev
```

**Step 6: Open the application**

Visit the following address in your browser:

http://localhost:3000

The Express backend serves the frontend application. Therefore, access the application through the local server instead of opening `index.html` directly.

## 5. Application Architecture

ToneShift follows a frontend-backend architecture.

The frontend collects user input and sends it to the backend through HTTP requests. The backend processes the submitted text and returns the results in JSON format.

```text
          USER
            |
            v
     FRONTEND
  (HTML, CSS, JS)
            |
            v
       API REQUEST
   POST /api/summarize
            |
            v
     EXPRESS SERVER
            |
            v
       API ROUTES
       (api.js)
            |
            v
    SUMMARIZATION LOGIC
    (summarizer.js)
            |
            v
      JSON RESPONSE
            |
            v
     FRONTEND RESULTS
```

## 6. API Documentation

The application exposes the following endpoints:

### GET /api/health

Checks whether the backend server is running.

Example response:

```json
{
  "status": "ok"
}
```

### POST /api/summarize

Processes the submitted text and returns the generated results.

**Request parameters:**

| Parameter | Description |
|---|---|
| text | Input text (required, maximum 100,000 characters) |
| ratio | Desired summary ratio (0.1–0.7, default 0.3) |
| tone | Desired tone: formal, casual or simple |
| summaryOnly | Controls whether only the summary is requested |

**Example request:**

```json
{
  "text": "Enter your text here.",
  "ratio": 0.3,
  "tone": "formal",
  "summaryOnly": false
}
```

The response can contain statistics, summary text, key points, keywords, rewritten text, short-form content and sentence highlights.

Errors are returned in JSON format with appropriate HTTP status codes, including 400, 413 and 500.

## 7. Working Methodology

The summarization process is implemented in the backend using JavaScript-based text-processing techniques.

The main steps include:

1. **Text Segmentation:** The input is divided into paragraphs and individual sentences.
2. **Text Preprocessing:** Common stop words are removed, and word forms are normalized.
3. **Word Frequency Calculation:** Words are weighted according to their frequency in the input.
4. **Sentence Scoring:** Each sentence receives a score based on its word weights, sentence length and position.
5. **Sentence Selection:** Important sentences are selected according to the requested summary ratio.
6. **Output Organization:** Selected sentences are arranged in their original order to form the final summary.

Additional processing functions support keyword extraction, key-point identification and rule-based tone transformation.

## 8. Limitations

- The summarization method is extractive and selects sentences from the original input rather than generating entirely new summaries.
- Tone transformation uses predefined, rule-based word replacements.
- The stop-word list is designed for English-language text.
- The quality of the output depends on the structure and clarity of the submitted text.
- Rule-based transformations may not fully preserve context or subtle meanings.

## 9. Future Enhancements

Potential improvements include:

- Integration of a generative AI model for more context-aware summarization.
- Support for additional languages.
- Improved contextual understanding and tone transformation.
- Additional document upload formats.
- More advanced readability and text analysis features.
- Enhanced testing and performance optimization.

## 10. Project Information

**Project Name:** ToneShift

**Project Category:** Web Application / Text Processing

**Repository:** [AI-Text-Summarizer](https://github.com/chirag618/AI-Text-Summarizer)

**Live Prototype:** [Open ToneShift](https://ai-text-summarizer-ashy-two.vercel.app)

**Development Technologies:** HTML, CSS, JavaScript, Node.js and Express.js.

---

*Developed as a collaborative academic mini-project.*