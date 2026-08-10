// Cheap, deterministic heuristics for whether a message is worth an LLM call
// at all. I'd rather be permissive here: a false positive just costs one LLM
// call, which the LLM's own is_job_related check catches for free. A false
// negative means I never even try -- so I lean on a broad keyword list plus
// known ATS/recruiting-platform sender domains, either being enough to
// shortlist.

const KEYWORDS = [
  'application',
  'applied',
  'application received',
  'interview',
  'assessment',
  'unfortunately',
  'offer',
  'thank you for applying',
  'thank you for your interest',
];

// Not exhaustive -- just another cheap signal, combined with keywords rather
// than relied on alone (a personal email from a recruiter won't match this).
const KNOWN_SENDER_DOMAINS = [
  'greenhouse.io',
  'lever.co',
  'workday.com',
  'myworkday.com',
  'icims.com',
  'smartrecruiters.com',
  'ashbyhq.com',
  'linkedin.com',
];

function isLikelyJobRelated({ from = '', subject = '', snippet = '' }) {
  const haystack = `${subject} ${snippet}`.toLowerCase();
  const matchesKeyword = KEYWORDS.some((kw) => haystack.includes(kw));
  const matchesSenderDomain = KNOWN_SENDER_DOMAINS.some((domain) =>
    from.toLowerCase().includes(domain)
  );
  return matchesKeyword || matchesSenderDomain;
}

module.exports = { isLikelyJobRelated, KEYWORDS, KNOWN_SENDER_DOMAINS };
