const config = require('../src/config');
const { extractApplication } = require('../src/llm/extractApplication');

// No database needed here -- this only exercises the LLM boundary itself
// (fetch), which I mock directly rather than hitting a real Ollama/Gemini.

function mockFetchOnce({ ok = true, status = 200, body }) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
}

afterEach(() => {
  jest.restoreAllMocks();
  config.llm.provider = 'ollama';
});

describe('extractApplication (ollama provider, the default)', () => {
  test('calls the configured Ollama URL/model and returns a parsed job-related extraction', async () => {
    mockFetchOnce({
      body: {
        response: JSON.stringify({
          is_job_related: true,
          company: 'Monzo',
          role: 'Graduate Software Engineer',
          status: 'interviewing',
          confidence: 0.92,
        }),
      },
    });

    const result = await extractApplication('Your interview with Monzo is confirmed for...');

    expect(global.fetch).toHaveBeenCalledWith(
      `${config.llm.ollamaUrl}/api/generate`,
      expect.objectContaining({ method: 'POST' })
    );
    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.model).toBe(config.llm.ollamaModel);
    expect(requestBody.format).toBe('json');
    // Extraction should be deterministic, not sampled -- see the comment in
    // extractApplication.js for the real-model test that motivated this.
    expect(requestBody.options).toEqual({ temperature: 0 });

    expect(result).toEqual({
      is_job_related: true,
      company: 'Monzo',
      role: 'Graduate Software Engineer',
      status: 'interviewing',
      confidence: 0.92,
    });
  });

  test('a not-job-related response nulls out every other field', async () => {
    mockFetchOnce({
      body: { response: JSON.stringify({ is_job_related: false, confidence: 0.4 }) },
    });

    const result = await extractApplication('Weekly newsletter: 10 tips for...');

    expect(result).toEqual({
      is_job_related: false,
      company: null,
      role: null,
      status: null,
      confidence: 0.4,
    });
  });

  test('malformed JSON from the model degrades to not-job-related instead of throwing', async () => {
    mockFetchOnce({ body: { response: 'not actually json' } });

    const result = await extractApplication('...');

    expect(result.is_job_related).toBe(false);
  });

  test('an out-of-range confidence is treated as 0 rather than trusted verbatim', async () => {
    mockFetchOnce({
      body: {
        response: JSON.stringify({
          is_job_related: true,
          company: 'Wayve',
          role: 'AI Engineer',
          status: 'applied',
          confidence: 5, // out of range -- must not pass through
        }),
      },
    });

    const result = await extractApplication('...');
    expect(result.confidence).toBe(0);
  });

  test('a status outside the enum is nulled rather than trusted verbatim', async () => {
    mockFetchOnce({
      body: {
        response: JSON.stringify({
          is_job_related: true,
          company: 'Synthesia',
          role: 'AI Engineer',
          status: 'ghosted', // not a real status
          confidence: 0.7,
        }),
      },
    });

    const result = await extractApplication('...');
    expect(result.status).toBeNull();
  });

  test('throws (does not silently swallow) when Ollama returns a non-2xx status', async () => {
    mockFetchOnce({ ok: false, status: 500, body: {} });
    await expect(extractApplication('...')).rejects.toThrow(/Ollama request failed/);
  });

  test('throws when the network call itself fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(extractApplication('...')).rejects.toThrow('ECONNREFUSED');
  });
});

describe('extractApplication (gemini provider)', () => {
  test('calls the Gemini endpoint instead when LLM_PROVIDER=gemini', async () => {
    config.llm.provider = 'gemini';
    config.llm.geminiApiKey = 'test-key';
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    is_job_related: true,
                    company: 'Palantir',
                    role: 'Forward Deployed Engineer',
                    status: 'applied',
                    confidence: 0.8,
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const result = await extractApplication('...');

    expect(global.fetch.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
    expect(result.company).toBe('Palantir');
    config.llm.geminiApiKey = '';
  });

  test('throws if GEMINI_API_KEY is not set', async () => {
    config.llm.provider = 'gemini';
    config.llm.geminiApiKey = '';
    await expect(extractApplication('...')).rejects.toThrow(/GEMINI_API_KEY/);
  });

  test('a 429 is retried once after honoring Retry-After, rather than failing immediately', async () => {
    // Real cause of the "sync does nothing" bug in prod: the free Gemini tier
    // rate-limits around 10 req/min and the sync loop used to hammer it with
    // no pacing, so every call 429'd. This is the one-retry safety net for
    // whatever gets through the pacing in extractApplication.js/callGemini
    // and still gets rate-limited.
    jest.useFakeTimers();
    config.llm.provider = 'gemini';
    config.llm.geminiApiKey = 'test-key';

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => '1' } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      is_job_related: true,
                      company: 'Ramp',
                      role: 'Software Engineer',
                      status: 'applied',
                      confidence: 0.7,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

    const promise = extractApplication('...');
    await jest.advanceTimersByTimeAsync(20000); // flush the Retry-After wait
    const result = await promise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.company).toBe('Ramp');

    config.llm.geminiApiKey = '';
    jest.useRealTimers();
  });

  test('throws (does not silently swallow) a second consecutive 429', async () => {
    jest.useFakeTimers();
    config.llm.provider = 'gemini';
    config.llm.geminiApiKey = 'test-key';

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 429, headers: { get: () => null } });

    const promise = extractApplication('...');
    const assertion = expect(promise).rejects.toThrow(/Gemini request failed: 429/);
    await jest.advanceTimersByTimeAsync(20000);
    await assertion;

    config.llm.geminiApiKey = '';
    jest.useRealTimers();
  });
});
