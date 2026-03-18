// Set env vars before any module is loaded
process.env.MEILISEARCH_HOST = 'http://localhost:7700';
process.env.MEILISEARCH_API_KEY = 'test-api-key';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('@google-cloud/firestore', () => ({
  Firestore: jest.fn(() => ({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn(),
        set: jest.fn(),
      }),
    }),
  })),
}));
jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const { cleanForSearch, searchMeilisearch, searchFirestore, handlePlayerSearch } = require('./playerSearch');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// cleanForSearch
// ---------------------------------------------------------------------------
describe('cleanForSearch', () => {
  it('strips non-alphanumeric chars and lowercases', () => {
    expect(cleanForSearch('<NT>.Tornasol')).toBe('nttornasol');
  });

  it('returns empty string for null', () => {
    expect(cleanForSearch(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(cleanForSearch(undefined)).toBe('');
  });

  it('returns empty string for non-string (number)', () => {
    expect(cleanForSearch(42)).toBe('');
  });

  it('lowercases and keeps underscores (\\w keeps underscore)', () => {
    expect(cleanForSearch('Hello_World')).toBe('hello_world');
  });

  it('returns empty string for empty string', () => {
    expect(cleanForSearch('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// searchMeilisearch
// ---------------------------------------------------------------------------
describe('searchMeilisearch', () => {
  it('posts to Meilisearch with auth header and sort, transforms hits to PlayerSearchResult', async () => {
    const hit = {
      profile_id: 123,
      alias: 'TornasolAlias',
      name: 'Tornasol',
      country: 'ES',
      total_matches: 500,
      last_match_date: '2024-01-01',
      clanlist_name: 'NT',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hits: [hit] }),
    });

    const results = await searchMeilisearch('tornasol');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:7700/indexes/players/search');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer test-api-key');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.q).toBe('tornasol');
    expect(body.sort).toEqual(['total_matches:desc', 'last_match_date:desc']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: '123',
      name: 'TornasolAlias',
      country: 'ES',
      matches: 500,
      lastMatchDate: '2024-01-01',
      profile_id: 123,
      clanlist_name: 'NT',
    });
  });

  it('returns [] for empty clean query', async () => {
    const results = await searchMeilisearch('!!!');
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns [] on fetch error (does not throw)', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    const results = await searchMeilisearch('tornasol');
    expect(results).toEqual([]);
  });

  it('returns [] on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    const results = await searchMeilisearch('tornasol');
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// searchFirestore — helper to build a chainable query mock
// ---------------------------------------------------------------------------
function buildChainableMock(getDocs) {
  const chain = {};
  const methods = ['where', 'orderBy', 'limit'];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.get = jest.fn().mockResolvedValue(getDocs);
  return chain;
}

function makeDb(prefixDocs, tokenDocs) {
  const prefixChain = buildChainableMock(prefixDocs);
  const tokenChain = buildChainableMock(tokenDocs || { forEach: jest.fn() });

  // collection() is called once; where() decides which chain we're on.
  // Easiest: make collection return an object whose first where() call
  // returns prefixChain, and second call returns tokenChain.
  let callCount = 0;
  const collectionMock = {
    where: jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // first where -> we're in prefix chain; hook remaining methods
        return prefixChain;
      }
      // second where -> token chain
      return tokenChain;
    }),
  };

  return { collection: jest.fn().mockReturnValue(collectionMock) };
}

function makeDoc(profileId, name, country, totalMatches, lastMatchDate) {
  return {
    data: () => ({ profile_id: profileId, name, country, total_matches: totalMatches, last_match_date: lastMatchDate }),
  };
}

describe('searchFirestore', () => {
  it('prefix search returns sorted results', async () => {
    const docs = [
      makeDoc(1, 'Alice', 'US', 100, '2024-01-01'),
      makeDoc(2, 'Alicia', 'MX', 50, '2024-01-02'),
    ];
    const prefixSnapshot = { forEach: (cb) => docs.forEach(cb) };
    const db = makeDb(prefixSnapshot, { forEach: jest.fn() });

    const results = await searchFirestore(db, 'ali');

    expect(results).toHaveLength(2);
    // sorted by matches desc
    expect(results[0].profile_id).toBe(1);
    expect(results[1].profile_id).toBe(2);
    expect(results[0]).toMatchObject({ id: '1', name: 'Alice', country: 'US', matches: 100 });
  });

  it('token search deduplicates results for queries >= 3 chars', async () => {
    const doc1 = makeDoc(1, 'Alice', 'US', 100, '2024-01-01');
    const doc2 = makeDoc(2, 'Aliice', 'MX', 200, '2024-01-02');

    // prefix returns doc1; token returns both (doc1 already seen, doc2 new)
    const prefixSnapshot = { forEach: (cb) => [doc1].forEach(cb) };
    const tokenSnapshot = { forEach: (cb) => [doc1, doc2].forEach(cb) };
    const db = makeDb(prefixSnapshot, tokenSnapshot);

    const results = await searchFirestore(db, 'alice');

    expect(results).toHaveLength(2);
    // doc2 has more matches, should be first
    expect(results[0].profile_id).toBe(2);
    expect(results[1].profile_id).toBe(1);
  });

  it('skips token search for queries shorter than 3 chars', async () => {
    const doc1 = makeDoc(1, 'Al', 'US', 10, '2024-01-01');
    const prefixSnapshot = { forEach: (cb) => [doc1].forEach(cb) };

    let tokenCalled = false;
    const db = makeDb(prefixSnapshot, {
      forEach: () => { tokenCalled = true; },
    });

    const results = await searchFirestore(db, 'al');

    expect(results).toHaveLength(1);
    expect(tokenCalled).toBe(false);
  });

  it('returns [] on error', async () => {
    const db = {
      collection: jest.fn().mockReturnValue({
        where: jest.fn().mockImplementation(() => { throw new Error('firestore error'); }),
      }),
    };
    const results = await searchFirestore(db, 'alice');
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// handlePlayerSearch
// ---------------------------------------------------------------------------
describe('handlePlayerSearch', () => {
  it('returns [] with 300s cache for empty query', async () => {
    const result = await handlePlayerSearch('');
    expect(result.data).toEqual([]);
    expect(result.headers['Cache-Control']).toBe('public, max-age=300');
  });

  it('returns [] with 300s cache for single-char query (after clean)', async () => {
    const result = await handlePlayerSearch('a');
    expect(result.data).toEqual([]);
    expect(result.headers['Cache-Control']).toBe('public, max-age=300');
  });

  it('calls searchMeilisearch with limit 100 and returns results with 1800s cache', async () => {
    const hit = {
      profile_id: 42,
      alias: 'Pro',
      name: 'ProPlayer',
      country: 'DE',
      total_matches: 1000,
      last_match_date: '2024-06-01',
      clanlist_name: '',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hits: [hit] }),
    });

    const result = await handlePlayerSearch('ProPlayer');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.limit).toBe(100);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].profile_id).toBe(42);
    expect(result.headers['Cache-Control']).toBe('public, max-age=1800');
  });
});
