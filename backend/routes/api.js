'use strict';

const express = require('express');
const { summarizeText } = require('../utils/summarizer');

const router = express.Router();

const TONES = ['formal', 'casual', 'simple'];
const MAX_CHARS = 100000;

/* GET /api/health  ->  quick check that the server is running */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/*
 * POST /api/summarize
 * body: { text: string, ratio?: 0.1-0.7, tone?: "formal"|"casual"|"simple", summaryOnly?: boolean }
 * returns: stats, summary, bullets, keywords, phrases, rewrite, short, highlights
 */
router.post('/summarize', (req, res) => {
  const body = req.body || {};

  if (typeof body.text !== 'string' || !body.text.trim()) {
    return res.status(400).json({ error: 'Please send some text in the "text" field.' });
  }
  if (body.text.length > MAX_CHARS) {
    return res.status(413).json({ error: 'Text is too long. The limit is ' + MAX_CHARS.toLocaleString() + ' characters.' });
  }

  let ratio = Number(body.ratio);
  if (!Number.isFinite(ratio)) ratio = 0.3;
  ratio = Math.min(0.7, Math.max(0.1, ratio));

  const tone = TONES.includes(body.tone) ? body.tone : 'formal';

  try {
    const result = summarizeText({ text: body.text, ratio, tone, summaryOnly: !!body.summaryOnly });
    res.json(result);
  } catch (err) {
    console.error('Summarize failed:', err);
    res.status(500).json({ error: 'Something went wrong while processing the text.' });
  }
});

module.exports = router;
