export function imageExtension(bytes: Uint8Array, mime: string): "jpg" | "png" | "webp" | null {
  if (mime === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (mime === "image/png" && [137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) return "png";
  if (mime === "image/webp" && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "webp";
  return null;
}
