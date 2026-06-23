export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Delete stale cache entry and fetch fresh from origin
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    if (url.searchParams.has("purge")) {
      await cache.delete(cacheKey);
      return new Response("purged");
    }

    const response = await fetch(request, { cf: { cacheEverything: false } });
    if (response.status === 404 && !url.pathname.match(/\.\w+$/)) {
      const index = await fetch(new URL("/", request.url), {
        cf: { cacheEverything: false },
      });
      return new Response(index.body, {
        status: 200,
        headers: index.headers,
      });
    }
    return response;
  },
};
