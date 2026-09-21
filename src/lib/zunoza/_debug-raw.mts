import { looksLikeRawMarkup, inlineLocalAssets, ensureAppQuality } from "./builder-quality.ts";

const files = {
  "index.html": `<!DOCTYPE html><html><body><div class="app-shell"><img src="logo.png" alt="logo"><h1>Marka</h1></div></body></html>`,
  "styles.css": "body{margin:0;font-family:sans-serif;background:#000;color:#fff}.app-shell{display:grid;gap:12px;padding:16px}button{border:0}",
};
const next = inlineLocalAssets({ ...files });
const longCss = ("x{font-family:sans-serif}" + "padding:1px;".repeat(40) + "\n" + next["styles.css"]);
console.log("looks with long css", looksLikeRawMarkup(next["index.html"], longCss));
console.log("looks with original css", looksLikeRawMarkup(next["index.html"], next["styles.css"]));
const healed = ensureAppQuality(files, "marka sitesi");
console.log("healed starts", healed["index.html"].slice(0, 120));
console.log("still has data", /data:image/.test(healed["index.html"]));
