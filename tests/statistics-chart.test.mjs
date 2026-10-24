import assert from "node:assert/strict";
import test from "node:test";
import { alignedScales, monthWeekAxis, niceScale, percentOf, pieSegments, sharePercents } from "../src/lib/platform/statistics-chart.ts";

test("chart axes use whole-number ticks that always include the largest value", () => {
  assert.deepEqual(niceScale(0).ticks, [0, 1]);
  assert.deepEqual(niceScale(1).ticks, [0, 1]);
  assert.deepEqual(niceScale(4).ticks, [0, 1, 2, 3, 4]);
  assert.deepEqual(niceScale(7).ticks, [0, 2, 4, 6, 8]);
  assert.deepEqual(niceScale(11).ticks, [0, 5, 10, 15]);
  assert.deepEqual(niceScale(100).ticks, [0, 50, 100]);
  for (const max of [0, 1, 2, 3, 9, 13, 48, 99, 101, 1234]) {
    const scale = niceScale(max);
    assert.ok(scale.top >= max, `${max} fits`);
    assert.ok(scale.ticks.every(tick => Number.isInteger(tick)));
    assert.ok(scale.ticks.length <= 6);
  }
});

test("pie segments cover the whole circle in order and tolerate empty data", () => {
  const segments = pieSegments([2, 1, 1]);
  assert.deepEqual(segments.map(segment => segment.fraction), [0.5, 0.25, 0.25]);
  assert.deepEqual(segments.map(segment => segment.offset), [0, 0.5, 0.75]);
  assert.deepEqual(pieSegments([0, 0]), [{ fraction: 0, offset: 0 }, { fraction: 0, offset: 0 }]);
  assert.equal(pieSegments([5])[0].fraction, 1);
  assert.equal(pieSegments([-3, 3])[0].fraction, 0);
});

test("two-axis scales share grid lines while each axis fits its own maximum", () => {
  const { intervals, scales } = alignedScales([9, 2]);
  assert.equal(scales[0].ticks.length, intervals + 1);
  assert.equal(scales[1].ticks.length, intervals + 1);
  assert.ok(scales[0].top >= 9 && scales[1].top >= 2);
  assert.deepEqual(alignedScales([0, 0]).scales.map(scale => scale.ticks[0]), [0, 0]);
  for (const maxima of [[1, 1], [7, 3], [48, 5], [120, 14], [1234, 9], [0, 3]]) {
    const result = alignedScales(maxima);
    result.scales.forEach((scale, index) => {
      assert.ok(scale.top >= maxima[index], `${maxima} axis ${index} fits`);
      assert.ok(scale.ticks.every(Number.isInteger));
      assert.equal(scale.ticks.length, result.intervals + 1);
    });
  }
});

test("share percentages are whole numbers that add up to exactly 100", () => {
  assert.deepEqual(sharePercents([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(sharePercents([2, 2, 3, 0, 0, 2]), [22, 22, 34, 0, 0, 22]);
  assert.deepEqual(sharePercents([0, 0]), [0, 0]);
  assert.deepEqual(sharePercents([7]), [100]);
  for (const values of [[1, 2, 3, 4, 5, 6], [333, 333, 334], [1, 1, 1, 1, 1, 1, 1], [5, 0, 1], [99, 1]]) {
    assert.equal(sharePercents(values).reduce((sum, value) => sum + value, 0), 100);
  }
  assert.equal(percentOf(1, 3), 33);
  assert.equal(percentOf(5, 0), 0);
});

test("month charts label each whole ISO week with its week number and date range", () => {
  assert.deepEqual(monthWeekAxis("2026-10-01", "2026-11-01"), [
    { label: "Week 40", sublabel: "(Sep 28 - Oct 4)" },
    { label: "Week 41", sublabel: "(Oct, 5-11)" },
    { label: "Week 42", sublabel: "(Oct, 12-18)" },
    { label: "Week 43", sublabel: "(Oct, 19-25)" },
    { label: "Week 44", sublabel: "(Oct 26 - Nov 1)" },
  ]);
  assert.deepEqual(monthWeekAxis("2021-01-01", "2021-02-01")[0], { label: "Week 53", sublabel: "(Dec 28 - Jan 3)" });
  assert.deepEqual(monthWeekAxis("2026-03-01", "2026-04-01").map(point => point.label), ["Week 9", "Week 10", "Week 11", "Week 12", "Week 13", "Week 14"]);
  assert.deepEqual(monthWeekAxis("2026-03-01", "2026-04-01")[0].sublabel, "(Feb 23 - Mar 1)");
  assert.deepEqual(monthWeekAxis("2026-02-01", "2026-03-01").map(point => point.sublabel), ["(Jan 26 - Feb 1)", "(Feb, 2-8)", "(Feb, 9-15)", "(Feb, 16-22)", "(Feb 23 - Mar 1)"]);
});
