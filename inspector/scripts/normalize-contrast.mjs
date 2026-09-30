// Mechanical palette normalization: retain hue while making text on light surfaces readable.
import { readFile, writeFile } from "node:fs/promises";
const file = new URL("../public/styles.css", import.meta.url);
const css = await readFile(file, "utf8");
let count = 0;
const luminance = (rgb) =>
  rgb
    .map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const result = css.replace(
  /(?<![\w-])color:\s*#([a-f\d]{6}|[a-f\d]{3})(?![a-f\d])/gi,
  (original, hex) => {
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    let rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    if (luminance(rgb) > 0.85 || 1.05 / (luminance(rgb) + 0.05) >= 6)
      return original;
    while (1.05 / (luminance(rgb) + 0.05) < 6)
      rgb = rgb.map((v) => Math.max(0, Math.floor(v * 0.97)));
    count++;
    return "color:#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
  },
);
await writeFile(file, result);
console.log(
  `Normalized ${count} text color declarations to a minimum 6:1 contrast against white (inverse text unchanged).`,
);
