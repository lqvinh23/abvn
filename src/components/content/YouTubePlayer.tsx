"use client";

import { useEffect, useRef, useState } from "react";

export default function YouTubePlayer({ src, title }: { src: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [playerUrl, setPlayerUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [embeddedBrowser, setEmbeddedBrowser] = useState(false);
  useEffect(() => {
    if (!playerUrl) return;
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.origin !== "https://www.youtube-nocookie.com") return;
      let data: unknown = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (data && typeof data === "object" && "event" in data) {
        if (data.event === "onReady" || data.event === "initialDelivery" || (data.event === "infoDelivery" && "info" in data && data.info && typeof data.info === "object" && "playerState" in data.info)) {
          setReady(true);
          setError("");
        }
        if (data.event === "onError") {
          setReady(true);
          setError("YouTube could not play this video here. The owner may have disabled embedding, or the video may be restricted.");
        }
      }
    }
    addEventListener("message", receive);
    return () => removeEventListener("message", receive);
  }, [playerUrl]);
  useEffect(() => {
    if (!playerUrl || ready) return;
    const timer = setTimeout(() => setError("YouTube did not respond. Your browser or network may be blocking the embedded player. Try the YouTube link below."), 12000);
    return () => clearTimeout(timer);
  }, [playerUrl, ready]);
  function connect() {
    // Subscribe directly to the embedded player without loading a global third-party script.
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "abvn-player" }), "https://www.youtube-nocookie.com");
    for (const event of ["onReady", "onError"]) frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: [event] }), "https://www.youtube-nocookie.com");
  }
  const watchUrl = `https://www.youtube.com/watch?v=${src.split("/").at(-1)}`;
  return <figure className="space-y-2">
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950">
      {playerUrl ? <><iframe ref={frame} src={playerUrl} title={`${title} - YouTube video`} width="768" height="432" onLoad={connect} onError={() => setError("The YouTube player could not load. Check your connection or open the video on YouTube.")} className="absolute inset-0 h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />{!ready && !error ? <p role="status" className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-white">Loading YouTube player...</p> : null}</>
        : <button type="button" aria-label={`Play YouTube video: ${title}`} onClick={() => { setReady(false); setError(""); setEmbeddedBrowser(navigator.userAgent.includes("Electron/")); setPlayerUrl(`${src}?enablejsapi=1&playsinline=1&autoplay=1&origin=${encodeURIComponent(location.origin)}`); }} className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3 bg-linear-to-br from-slate-800 to-slate-950 p-4 text-white hover:from-slate-700 focus-visible:outline-4 focus-visible:outline-offset-[-6px] focus-visible:outline-green-400">
          <span className="flex h-16 w-20 items-center justify-center rounded-2xl bg-red-600"><svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="m8 4 12 8-12 8V4Z" /></svg></span>
          <span className="text-base font-semibold">Play YouTube video</span>
          <span className="max-w-full truncate text-sm text-slate-300">{title}</span>
        </button>}
    </div>
    {error ? <p role="alert" className="text-sm text-amber-900">{error}</p> : null}
    {embeddedBrowser ? <p className="text-sm text-amber-900">An integrated editor browser can block YouTube frames. Open this page in Chrome, Edge or Safari to play the video here.</p> : null}
    <figcaption className="text-sm text-slate-500">Video not playing? <a href={watchUrl} target="_blank" rel="noreferrer" className="font-medium text-green-900 underline">Watch on YouTube</a></figcaption>
  </figure>;
}
