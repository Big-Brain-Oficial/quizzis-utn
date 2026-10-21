// Dev helper: ranks PDF pages that could back each question, to help assign "source".
// It only suggests candidates; the final page and confidence are decided by a person.
// Requires pdftotext (poppler) on PATH. Usage:
//   node scripts/rank-sources.mjs <materia>/<parcial> [id,id,...] [--top N] [--json]   (ej.: redes/1er-parcial)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const bank = args[0]; // subjects/<materia>/<parcial>
if (!bank) { console.error("uso: node scripts/rank-sources.mjs <materia>/<parcial> [ids] [--top N] [--json]"); process.exit(1); }
const top = args.includes("--top") ? +args[args.indexOf("--top") + 1] : 3;
const asJson = args.includes("--json");
const onlyIds = args[1] && !args[1].startsWith("--") ? new Set(args[1].split(",")) : null;

const dir = path.join(root, "subjects", bank);
const data = JSON.parse(fs.readFileSync(path.join(dir, "questions.json"), "utf8"));
const srcDir = path.join(dir, "sources");

const STOP = new Set(("a al algo algun alguna algunas alguno algunos ante antes aun bajo cada casi como con contra cual cuales cuando " +
  "de del desde donde dos el ella ellas ellos en entre era es esa esas ese eso esos esta estan estas este esto estos " +
  "fue ha hay la las le les lo los mas me mi mucho muy ni no nos o otra otras otro otros para pero poco por porque " +
  "que se sea segun ser si sin sino sobre solo son su sus tambien tiene tienen todo todos tras un una uno unos y ya " +
  "siguiente siguientes opcion opciones correcta correctas correcto seleccione marque indique cual cuales puede pueden " +
  "utiliza utilizan valida validas verdadero falso respecto defina escogiendo").split(" "));

export const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d$/.test(t));

// ---------- pages ----------
const pages = [];
for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".pdf")).sort()) {
  const text = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", path.join(srcDir, file), "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
  text.split("\f").forEach((t, i) => {
    if (i === text.split("\f").length - 1 && !t.trim()) return; // trailing form feed
    pages.push({ file: `sources/${file}`, page: i + 1, text: t, toks: tokens(t) });
  });
}
const N = pages.length;
const avgLen = pages.reduce((s, p) => s + p.toks.length, 0) / N;
const df = new Map();
pages.forEach((p) => new Set(p.toks).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
const idf = (t) => Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
pages.forEach((p) => { p.tf = new Map(); p.toks.forEach((t) => p.tf.set(t, (p.tf.get(t) || 0) + 1)); });

// ---------- queries ----------
function correctText(q) {
  if (q.type === "match") return q.stems.map((s, i) => s + " " + q.choices[q.correct[i]]).join(" ");
  if (q.type === "info") return q.answer;
  return (q.correct || []).map((c) => { const o = q.opts[c]; return typeof o === "string" ? o : (o.alt || o.text || ""); }).join(" ");
}
function bm25(p, weights) {
  const k1 = 1.2, b = 0.5;
  let s = 0;
  const matched = [];
  for (const [t, w] of weights) {
    const f = p.tf.get(t);
    if (!f) continue;
    matched.push(t);
    s += w * idf(t) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * p.toks.length / avgLen));
  }
  return { s, matched };
}
function snippet(p, terms) {
  const lines = p.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const scored = lines.map((l, i) => ({ i, n: new Set(tokens(l).filter((t) => terms.includes(t))).size }));
  const best = scored.sort((a, b) => b.n - a.n)[0];
  if (!best) return "";
  return lines.slice(Math.max(0, best.i - 1), best.i + 3).join(" / ").replace(/\s+/g, " ").slice(0, 300);
}

const out = [];
for (const q of data.questions) {
  if (onlyIds && !onlyIds.has(q.id)) continue;
  const weights = new Map();
  tokens(q.text).forEach((t) => weights.set(t, 1));
  tokens(correctText(q)).forEach((t) => weights.set(t, 2)); // terms of the right answer weigh double
  const ranked = pages.map((p) => ({ p, ...bm25(p, weights) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, top);
  out.push({
    id: q.id, text: q.text, answer: correctText(q),
    candidates: ranked.map((r) => ({ file: r.p.file, page: r.p.page, score: +r.s.toFixed(2), matched: r.matched, snippet: snippet(r.p, r.matched) })),
  });
}
if (asJson) console.log(JSON.stringify(out, null, 2));
else for (const r of out) {
  console.log(`\n## ${r.id}: ${r.text.slice(0, 110)}\n   ✔ ${r.answer.slice(0, 160)}`);
  r.candidates.forEach((c) => console.log(`   - ${c.file} p.${c.page} (${c.score}) [${c.matched.join(", ")}]\n       “${c.snippet}”`));
}
