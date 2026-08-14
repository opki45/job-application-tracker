const config = require('../config');

// Single entrypoint for LLM extraction. Everything above this file (the sync
// pipeline) calls only extractApplication() and never needs to know or care
// which provider is behind it -- that's the whole point of having one
// adapter instead of an LLM_PROVIDER check scattered through the pipeline.
// Provider is read from config at call time, not module load time, so tests
// can flip it per test without re-requiring this module.

const SYSTEM_PROMPT = `You extract structured job-application data from a single email. Reply with ONLY a JSON object, no other text, matching this exact shape:
{
  "is_job_related": boolean,
  "company": string or null,
  "role": string or null,
  "status": one of "applied", "interviewing", "offer", "rejected", "accepted", or null,
  "confidence": number between 0 and 1
}

Rules:
- is_job_related is false for anything that isn't about a specific job application (newsletters, unrelated personal email, spam, etc). When false, every other field must be null.
- "applied": an application-received / submission-confirmation email.
- "interviewing": an interview is being scheduled, confirmed, or has happened.
- "offer": an offer is being extended.
- "rejected": the application was declined / the company is not moving forward.
- "accepted": the candidate is confirming they accepted an offer (rare in an inbound email -- only use this if the email explicitly says so).
- If the email is job-related but you can't confidently tell the company, role, or status, use null for that field rather than guessing, and lower confidence accordingly.
- confidence reflects how sure you are of the extraction as a whole, not just is_job_related.`;

function buildPrompt(emailText) {
  return `${SYSTEM_PROMPT}\n\nEmail:\n"""\n${emailText}\n"""`;
}

// Returns the model's raw text response. Network/HTTP failures are left to
// throw -- the caller decides what "the LLM was unreachable" should mean for
// the pipeline (see the note on extractApplication below), which is a
// different situation from the model responding with garbage.
async function callOllama(emailText) {
  const res = await fetch(`${config.llm.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.llm.ollamaModel,
      prompt: buildPrompt(emailText),
      stream: false,
      format: 'json',
      // This is extraction, not creative writing -- I want the same email to
      // produce the same result every time, not sampling variance. Testing
      // against the real model surfaced exactly this: an unmistakably
      // job-related rejection email flipped is_job_related on ~1 run in 4 at
      // the default temperature.
      options: { temperature: 0 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status}`);
  }
  const data = await res.json();
  return data.response;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The free Gemini tier is rate-limited to around 10 requests/minute. The sync
// pipeline calls this once per shortlisted email in a tight loop, so without
// pacing it blows through that limit almost immediately and every call after
// the first few 429s. I track the last call time across invocations (this
// module stays loaded for the life of the process) and wait out whatever's
// left of the minimum gap before firing the next one.
const GEMINI_MIN_INTERVAL_MS = 6500;
let lastGeminiCallAt = 0;

async function throttleGemini() {
  const wait = lastGeminiCallAt + GEMINI_MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastGeminiCallAt = Date.now();
}

async function requestGemini(emailText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.llm.geminiModel}:generateContent?key=${config.llm.geminiApiKey}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(emailText) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  });
}

async function callGemini(emailText) {
  if (!config.llm.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  await throttleGemini();
  let res = await requestGemini(emailText);

  // A 429 can still happen even with pacing (e.g. a burst of activity from
  // another sync). Google returns a Retry-After header on rate-limit
  // responses -- honor it (capped, so one bad header can't stall a sync for
  // minutes) and try exactly once more before giving up to the caller, which
  // leaves the message unprocessed for the next sync to retry.
  if (res.status === 429) {
    const retryAfterSec = Number(res.headers.get('retry-after'));
    const wait = Number.isFinite(retryAfterSec) ? Math.min(retryAfterSec * 1000, 15000) : 10000;
    await sleep(wait);
    lastGeminiCallAt = Date.now();
    res = await requestGemini(emailText);
  }

  if (!res.ok) {
    throw new Error(`Gemini request failed: ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

const VALID_STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];

// The "nothing extracted" shape. Used whenever the model's output can't be
// trusted, so a bad extraction degrades to "not job related" instead of ever
// guessing or propagating garbage into a candidate row.
const NOT_JOB_RELATED = { is_job_related: false, company: null, role: null, status: null, confidence: 0 };

// Parses and validates the model's raw text against the required shape.
// Never throws: any structural problem (bad JSON, wrong types, an
// out-of-range confidence, a status outside the enum) degrades to
// NOT_JOB_RELATED rather than letting an untrusted value reach the database.
function parseAndValidate(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NOT_JOB_RELATED;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return NOT_JOB_RELATED;
  }

  const confidence =
    typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
      ? parsed.confidence
      : 0;

  if (parsed.is_job_related !== true) {
    return { ...NOT_JOB_RELATED, confidence };
  }

  const status = VALID_STATUSES.includes(parsed.status) ? parsed.status : null;
  return {
    is_job_related: true,
    company: typeof parsed.company === 'string' && parsed.company.trim() ? parsed.company.trim() : null,
    role: typeof parsed.role === 'string' && parsed.role.trim() ? parsed.role.trim() : null,
    status,
    confidence,
  };
}

// Extracts structured job-application fields from one email's text.
//
// IMPORTANT distinction for callers: this function throws on infrastructure
// failure (Ollama/Gemini unreachable, non-2xx response) but NEVER throws on a
// bad/unparseable model response -- that returns NOT_JOB_RELATED instead, per
// docs/PHASE2.md ("on parse failure, treat as is_job_related: false"). The
// two need different handling upstream: "the model said not job-related" is
// a real decision worth recording (mark the message processed, move on);
// "the LLM was unreachable" is not a decision at all and shouldn't cause a
// message to be silently marked processed and dropped forever -- the caller
// should leave it unprocessed and let the next sync retry.
async function extractApplication(emailText) {
  const raw = config.llm.provider === 'gemini' ? await callGemini(emailText) : await callOllama(emailText);
  return parseAndValidate(raw);
}

module.exports = { extractApplication };
