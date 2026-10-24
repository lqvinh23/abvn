import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const palette = Object.fromEntries(
  [...css.matchAll(/--(green-soft|primary|green-strong):\s*(#[0-9a-f]{6});/g)]
    .map(([, name, color]) => [name, color]),
);

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const light = Math.max(luminance(first), luminance(second));
  const dark = Math.min(luminance(first), luminance(second));
  return (light + 0.05) / (dark + 0.05);
}

test("all green utility shades resolve to exactly three shared brand tones", () => {
  assert.deepEqual(palette, {
    "green-soft": "#eaf4ef",
    primary: "#176b4d",
    "green-strong": "#104d37",
  });
  const shades = [...css.matchAll(/--color-green-(\d+):\s*var\(--([a-z-]+)\);/g)];
  assert.deepEqual(shades.map(([, shade]) => Number(shade)), [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
  assert.equal(new Set(shades.map(([, , token]) => palette[token])).size, 3);
  assert.ok(shades.every(([, , token]) => palette[token]));
  assert.match(css, /--accent:\s*var\(--green-strong\)/);
});

test("primary buttons and selected text meet WCAG AA normal-text contrast", () => {
  for (const [foreground, background] of [
    ["#ffffff", palette.primary],
    ["#ffffff", palette["green-strong"]],
    [palette.primary, palette["green-soft"]],
    [palette["green-strong"], palette["green-soft"]],
  ]) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background} must have at least 4.5:1 contrast`);
  }
});

test("secondary button colors stay neutral at rest and on hover", () => {
  const rules = [...css.matchAll(/\.button-secondary(?:\:hover\:not\(:disabled\))?\s*\{([^}]+)\}/g)];
  assert.equal(rules.length, 2);
  for (const [, declarations] of rules) {
    assert.doesNotMatch(declarations, /var\(--(?:primary|green-)/);
  }
});
