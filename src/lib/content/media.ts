export function validImage(value: string) {
  return /^\/images\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp|svg)$/.test(value)
    || /^\/api\/content-media\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/.test(value);
}

export function youtubeEmbedUrl(input: string): string | null {
  let url: URL;
  try { url = new URL(input); }
  catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  let id: string | null = null;
  if (url.hostname === "youtu.be") id = url.pathname.slice(1);
  else if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = /^\/(?:embed|shorts|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null;
  }
  return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
