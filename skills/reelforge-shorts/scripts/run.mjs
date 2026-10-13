#!/usr/bin/env node
// OMO adapter for ReelForge — brief, or interview video + subtitles + B-roll → 9:16 shorts MP4.
// brief: writes scene_specs.json and drives the unchanged upstream CLI (vf pipeline → vf compile --format 9:16 → hyperframes render).
// interview: ReelForge renders the hook/CTA cards; the interview body is a HyperFrames composition
//   (cropped A-roll + timed B-roll cutaways + subtitle captions) rendered by the same pinned hyperframes,
//   then ffmpeg concatenates intro + body + outro. Schema: ../references/io.md
//
// usage: node skills/reelforge-shorts/scripts/run.mjs --input <input.json> --out <dir> [--quality draft|high] [--tts mock|real]
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

const inputPath = opt("input");
if (!inputPath) die("--input <input.json> 필요 (스키마: skills/reelforge-shorts/references/io.md)");
const input = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
const inputDir = dirname(resolve(inputPath));
const OUT = resolve(opt("out", join(inputDir, "out")));
const quality = opt("quality", input.quality || "draft");
const profile = opt("tts", input.tts || "mock") === "real" ? "real" : "mock";
const preset = input.preset || "k-broadcast";
const presetPath = join(ROOT, "fixtures/presets", `${preset}.json`);
if (!existsSync(presetPath)) die(`preset 없음: ${preset} (fixtures/presets/*.json)`);
const HF = join(ROOT, "node_modules/.bin/hyperframes");
if (!existsSync(HF)) die("hyperframes 없음 — 레포 루트에서 `npm ci` 먼저 실행");
const W = 1080, H = 1920, FPS = 30;
mkdirSync(OUT, { recursive: true });

function run(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { stdio: ["ignore", "inherit", "inherit"], ...opts });
  if (r.status !== 0) die(`${cmd} ${argv.slice(0, 3).join(" ")} 실패 (exit ${r.status})`);
  return r;
}
const ffprobeDur = (f) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout.trim());
const len = (s) => [...String(s)].length;
const cut = (s, n) => (len(s) <= n ? s : [...s].slice(0, n - 1).join("").replace(/\s+\S*$/, "") + "…");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── ReelForge 씬 → scene_specs.json → 9:16 렌더 (업스트림 CLI 그대로) ──
function toScene(s, i) {
  const items = s.items || [];
  const layout = s.quote ? "quote" : items.length >= 2 ? "list" : "headline_only";
  const narration = s.narration || s.headline;
  return {
    sceneId: `s${String(i + 1).padStart(2, "0")}`, sceneNumber: i + 1,
    narration, narration_tts: s.narration_tts || narration,
    altText: s.altText || `${s.headline} — ${layout === "list" ? items.join(", ") : narration}`.slice(0, 480),
    layout, mood: s.mood || "informative",
    reveal: layout === "list" ? "stagger" : layout === "quote" ? "typewriter" : "zoom_in",
    emphasis: layout === "list" ? "sequence" : layout === "quote" ? "quote" : "keyword",
    headline: s.headline,
    items: layout === "quote" ? [s.attribution || "인터뷰", s.quote] : items,
    values: layout === "quote" ? ["", ""] : [], unit: "", source: s.source || "omo-reelforge-shorts",
    visual_kind: "none", kenBurns: { enabled: false, zoomFactor: 1, zoomDirection: "in", panDirection: "none" },
    subtitleMode: s.subtitleMode || "keyword",
  };
}
function renderReelforge(name, scenes) {
  const proj = join(OUT, name);
  rmSync(proj, { recursive: true, force: true });
  mkdirSync(proj, { recursive: true });
  const specs = scenes.map(toScene);
  const transitions = specs.slice(1).map((s, i) => ({ from: specs[i].sceneId, to: s.sceneId, type: "fade", duration: 0.25 }));
  const json = JSON.stringify({ version: "1.0.0", projectId: `omo-${name}`, scenes: specs, transitions }, null, 2);
  run(process.execPath, [join(ROOT, "bin/vf"), "write", join(proj, "scene_specs.json"), "--project-root", proj, "--schema", "scene-specs"], { input: json, stdio: ["pipe", "inherit", "inherit"] });
  run(process.execPath, [join(ROOT, "bin/vf"), "pipeline", "run", proj, "--until", "images", "--profile", profile], { cwd: ROOT });
  run(process.execPath, [join(ROOT, "bin/vf"), "compile", proj, "--format", "9:16", "--preset", presetPath], { cwd: ROOT });
  const mp4 = join(proj, "renders", `${name}.mp4`);
  mkdirSync(dirname(mp4), { recursive: true });
  hfRender(join(proj, "build"), mp4);
  return mp4;
}
function hfRender(dir, mp4) {
  const env = { ...process.env, PRODUCER_LOW_MEMORY_MODE: "false", PRODUCER_MAX_WORKERS: "3" };
  run(HF, ["render", ".", "--workers", "3", "--quality", quality, "--fps", String(FPS), "-o", mp4], { cwd: dir, env });
}

// ── 프레임 스트립(QC용) ──
function strip(mp4, dir) {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) rmSync(join(dir, f));
  run("ffmpeg", ["-v", "error", "-y", "-i", mp4, "-vf", "fps=1/2,scale=360:-1", join(dir, "f%02d.png")]);
  run("ffmpeg", ["-v", "error", "-y", "-i", mp4, "-vf", "fps=1/2,scale=270:-1,tile=6x2", "-frames:v", "1", join(dirname(dir), "contact.png")]);
}

function finish(mp4) {
  const final = join(OUT, "shorts.mp4");
  copyFileSync(mp4, final);
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,avg_frame_rate:format=duration", "-of", "json", final], { encoding: "utf8" }).stdout;
  strip(final, join(OUT, "frames"));
  const result = { ok: true, mode: input.mode, shorts: final, contact_sheet: join(OUT, "contact.png"), frames_dir: join(OUT, "frames"), probe: JSON.parse(probe) };
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

// ── brief 모드 ──
if (input.mode === "brief") {
  const b = input.brief || {};
  let scenes = b.scenes;
  if (!scenes && b.script) {
    scenes = b.script.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean).map((p) => ({ headline: cut(p.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, ""), 18), narration: p }));
  }
  if (!scenes?.length) die("brief.scenes[] 또는 brief.script 필요");
  if (b.cta) scenes = [...scenes, { headline: cut(b.cta, 18), narration: b.cta_narration || b.cta, mood: "triumphant" }];
  finish(renderReelforge("brief", scenes));
  process.exit(0);
}
if (input.mode !== "interview") die("mode 는 brief|interview");

// ── interview 모드 ──
const iv = input.interview || {};
const src = (p) => { const f = resolve(inputDir, p); if (!existsSync(f)) die(`파일 없음: ${p}`); return f; };
const videoIn = src(iv.video), subsIn = src(iv.subtitles);
const t0 = iv.trim?.start ?? 0;
const t1 = iv.trim?.end ?? ffprobeDur(videoIn);
const D = +(t1 - t0).toFixed(3);
if (!(D > 0)) die("interview 길이가 0 이하");

function parseCues(raw) {
  const ts = (s) => { const m = s.trim().replace(",", ".").match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/); return (+(m[1] || 0)) * 3600 + +m[2] * 60 + +m[3]; };
  const cues = [];
  for (const block of raw.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim() && !/^WEBVTT/.test(l));
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = lines[i].split("-->");
    const text = lines.slice(i + 1).join(" ").replace(/<[^>]+>/g, "").replace(/^[^:：\s]{1,10}\s*[:：]\s*/, "").trim();
    if (text) cues.push({ start: ts(a), end: ts(b.trim().split(/\s+/)[0]), text });
  }
  return cues;
}
const cues = parseCues(readFileSync(subsIn, "utf8"))
  .map((c) => ({ ...c, start: Math.max(0, c.start - t0), end: Math.min(D, c.end - t0) }))
  .filter((c) => c.end - c.start > 0.2);
if (!cues.length) die("자막 큐 0개 (SRT/VTT 확인)");

const body = join(OUT, "body");
rmSync(body, { recursive: true, force: true });
mkdirSync(join(body, "assets"), { recursive: true });
const cover = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},format=yuv420p`;
run("ffmpeg", ["-v", "error", "-y", "-ss", String(t0), "-t", String(D), "-i", videoIn, "-an", "-vf", cover, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", join(body, "assets/aroll.mp4")]);
run("ffmpeg", ["-v", "error", "-y", "-ss", String(t0), "-t", String(D), "-i", videoIn, "-vn", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", join(body, "assets/aroll.m4a")]);
const brolls = (iv.broll || []).map((b, i) => {
  const at = Math.max(0, (b.at ?? 0) - t0), dur = Math.min(b.duration ?? 2.5, D - at);
  if (dur <= 0.2) return null;
  const f = `assets/broll-${i + 1}.mp4`;
  run("ffmpeg", ["-v", "error", "-y", "-ss", String(b.src_start ?? 0), "-t", String(dur), "-i", src(b.file), "-an", "-vf", cover, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", join(body, f)]);
  return { id: `broll-${i + 1}`, f, at, dur };
}).filter(Boolean);
copyFileSync(join(ROOT, "assets/fonts/PretendardVariable.woff2"), join(body, "assets/Pretendard.woff2"));
const gsapDir = readdirSync(join(ROOT, "vendor/gsap")).sort().pop();
copyFileSync(join(ROOT, "vendor/gsap", gsapDir, "gsap.min.js"), join(body, "assets/gsap.min.js"));

const tok = JSON.parse(readFileSync(presetPath, "utf8"));
const accent = input.brand?.color || tok.colors?.accent || "#2563EB";
const title = input.title ? cut(input.title, 22) : "";
const r3 = (n) => +n.toFixed(3);
const html = `<!doctype html>
<html lang="ko"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="assets/gsap.min.js"></script>
<style>
@font-face{font-family:"Pretendard";src:url("assets/Pretendard.woff2") format("woff2");font-weight:100 900}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000}
#root{position:relative;width:${W}px;height:${H}px;overflow:hidden;font-family:"Pretendard",sans-serif}
.media{position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover}
.shade{position:absolute;left:0;right:0;bottom:0;height:900px;background:linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,0));z-index:5}
.title{position:absolute;left:90px;right:130px;top:240px;z-index:6;display:inline-block}
.title span{display:inline-block;background:${accent};color:#fff;font-weight:800;font-size:46px;line-height:1.25;padding:14px 26px;border-radius:14px;letter-spacing:-.02em}
.cap{position:absolute;left:90px;right:130px;top:1150px;z-index:10;display:flex;justify-content:center;text-align:center}
.cap span{display:inline-block;max-width:860px;background:rgba(10,10,10,.78);color:#fff;font-weight:800;font-size:64px;line-height:1.32;padding:18px 30px;border-radius:18px;letter-spacing:-.02em;word-break:keep-all}
</style></head><body>
<div id="root" data-composition-id="main" data-width="${W}" data-height="${H}" data-start="0" data-duration="${D}">
  <video id="aroll" class="clip media" src="assets/aroll.mp4" data-start="0" data-duration="${D}" data-track-index="0" muted playsinline></video>
${brolls.map((b, i) => `  <video id="${b.id}" class="clip media" src="${b.f}" data-start="${r3(b.at)}" data-duration="${r3(b.dur)}" data-track-index="${1 + i}" muted playsinline style="z-index:2"></video>`).join("\n")}
  <div class="shade"></div>
${title ? `  <div id="title" class="title"><span>${esc(title)}</span></div>` : ""}
${cues.map((c, i) => `  <div id="cap-${i + 1}" class="clip cap" data-start="${r3(c.start)}" data-duration="${r3(c.end - c.start)}" data-track-index="${20 + (i % 2)}"><span>${esc(c.text)}</span></div>`).join("\n")}
  <audio id="aroll-audio" src="assets/aroll.m4a" data-start="0" data-duration="${D}" data-track-index="100" data-volume="1"></audio>
</div>
<script>
window.__timelines = window.__timelines || {};
(function () {
  const tl = gsap.timeline({ paused: true });
${cues.map((c, i) => `  tl.fromTo("#cap-${i + 1} span", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, ease: "power2.out" }, ${r3(c.start)});`).join("\n")}
${title ? `  tl.fromTo("#title span", { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, 0);` : ""}
  tl.set({}, {}, ${D});
  window.__timelines["main"] = tl;
})();
</script>
</body></html>
`;
writeFileSync(join(body, "index.html"), html);
for (const f of ["hyperframes.json", "meta.json"]) writeFileSync(join(body, f), f === "meta.json" ? JSON.stringify({ id: "omo-interview-body", name: "interview-body" }) : JSON.stringify({ paths: { assets: "assets" } }));
run(HF, ["lint"], { cwd: body });
const bodyMp4 = join(body, "body.mp4");
hfRender(body, bodyMp4);

const parts = [];
if (input.hook) parts.push(renderReelforge("intro", [{ headline: cut(input.hook, 18), narration: input.hook_narration || input.hook, mood: "urgent" }]));
parts.push(bodyMp4);
if (input.cta) parts.push(renderReelforge("outro", [{ headline: cut(input.cta, 18), narration: input.cta_narration || input.cta, mood: "triumphant" }]));

// 정규화 후 concat(해상도·fps·오디오 통일; 오디오 없는 클립은 무음 채움)
const hasAudio = (f) => spawnSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout.trim().length > 0;
const inArgs = [], filters = [];
const MIN_CARD = input.min_card_seconds ?? 2.5; // 훅·CTA 카드는 mock TTS면 1초대로 짧아지므로 마지막 프레임 홀드로 최소 길이 보장
parts.forEach((p, i) => {
  inArgs.push("-i", p);
  const d = ffprobeDur(p);
  const pad = p === bodyMp4 ? 0 : Math.max(0, MIN_CARD - d);
  const total = (d + pad).toFixed(3);
  filters.push(`[${i}:v]scale=${W}:${H},fps=${FPS},format=yuv420p,setsar=1${pad ? `,tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}` : ""}[v${i}]`);
  filters.push(hasAudio(p) ? `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${total}[a${i}]` : `anullsrc=r=48000:cl=stereo,atrim=duration=${total}[a${i}]`);
});
filters.push(`${parts.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${parts.length}:v=1:a=1[v][a]`);
const joined = join(OUT, "joined.mp4");
run("ffmpeg", ["-v", "error", "-y", ...inArgs, "-filter_complex", filters.join(";"), "-map", "[v]", "-map", "[a]", "-r", String(FPS), "-fps_mode", "cfr", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", joined]);
finish(joined);
console.log(`parts: ${parts.map((p) => basename(p)).join(" + ")}`);
