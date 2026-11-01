// Vector Generator — app logic (p5.js global mode)
// ---------- Settings (defaults match the original tool) ----------
const DEFAULTS = {
  canvasSize: { width: 1080, height: 1080 },
  usefilmGrain: false, numCircles: 10, minCircleRadiusPx: 27, maxCircleRadiusPx: 54,
  rayOriginType: "center", numRayOrigins: 1, numRays: 60, viewZoom: 1, viewX: .5, viewY: .5,
  rayAngleEccentricityPct: 0, rayOriginEccentricityPct: 5, useCollisionDetectionOnElements: false, intSlippagePct: 0,
  bgColor: "#000000", rayMaxColor: "#FFFFFF", rayMinOpacity: 25, circleStroke: "#555555",
  circleFillOn: false, circleFill: "#000000", intColor: "#FFFFFF", intColor2: "#FFFFFF",
  intersectionBounceRenderingMode: "point", intersectionSlipThroughRenderingMode: "point",
  intersectionSplatterSpread: 30, intersectionSplatterAmount: 2000, rayDrawingStyle: "solid",
  rayStrokeWeight: 1, circleStrokeWeight: 1,
  grainSize: 1, grainRoughness: 100, grainOpacity: 15,
};
window._VALUES = JSON.parse(JSON.stringify(DEFAULTS));
const setVal = (id, v) => { window._VALUES[id] = v; refresh._seed && refresh._seed(); refresh._cond && refresh._cond(); window._FORCEQUICKDRAW && window._FORCEQUICKDRAW(); };

// Vectors: hard cap, plus a fresh random count (20–100) on every load and Regenerate.
const MAX_VECTORS = 1000;
const randomVectorCount = () => 20 + Math.floor(Math.random() * 81);
window._VALUES.numRays = randomVectorCount();
const MODES = [["splatter-in", "Splatter In"], ["splatter-out", "Splatter Out"], ["point", "Points"], ["none", "None"]];
const SECTIONS = [
  { title: "Setup", items: [{ type: "seed", label: "Preset Code" }, { type: "dims", label: "Canvas Dimensions" }] },
  { title: "Color", items: [
    { type: "colors", items: [
      { id: "rayMaxColor", label: "Vector Color" }, { type: "number", id: "rayMinOpacity", label: "Min Opacity (%)", min: 0, max: 100, step: 1 },
      { id: "bgColor", label: "Background Color", alpha: false }, { id: "circleStroke", label: "Circle Stroke" },
      { id: "intColor", label: "Particle Color 1" }, { id: "intColor2", label: "Particle Color 2" } ] },
    { type: "toggle", id: "circleFillOn", label: "Fill Circles" },
    { type: "color", id: "circleFill", label: "Circle Fill", showIf: "circleFillOn" },
    { type: "action", label: "Randomize Colors", icon: "shuffle", run: "randomizeColors" },
  ] },
  { title: "Rays", items: [
    { type: "select", id: "rayOriginType", label: "Ray Origin", options: [["random", "Random"], ["center", "Center"]] },
    { type: "pair", items: [
      { type: "number", id: "numRayOrigins", label: "Number of Origins", min: 1, max: 5, step: 1 },
      { type: "number", id: "numRays", label: "Number of Vectors", min: 1, max: MAX_VECTORS, step: 1 } ] },
    { type: "number", id: "rayOriginEccentricityPct", label: "Origin Eccentricity (%)", min: 0, max: 100, step: 1 },
    { type: "number", id: "rayAngleEccentricityPct", label: "Angle Eccentricity (%)", min: 0, max: 100, step: 1 },
    { type: "pair", items: [
      { type: "select", id: "rayDrawingStyle", label: "Vector Style", options: [["solid", "Solid"], ["dash", "Dashed"], ["dot", "Dotted"], ["ori", "Dash / Dot"], ["none", "Hidden"]] },
      { type: "number", id: "rayStrokeWeight", label: "Vector Weight (px)", min: .1, max: 20, step: .1 } ] },
  ] },
  { title: "Circles", items: [
    { type: "pair", items: [
      { type: "number", id: "numCircles", label: "Number of Circles", min: 1, max: 60, step: 1 },
      { type: "number", id: "circleStrokeWeight", label: "Stroke Weight (px)", min: .1, max: 20, step: .1 } ] },
    { type: "pair", items: [
      { type: "number", id: "minCircleRadiusPx", label: "Min Radius (px)", min: 1, max: 3000, step: 1 },
      { type: "number", id: "maxCircleRadiusPx", label: "Max Radius (px)", min: 1, max: 3000, step: 1 } ] },
    { type: "toggle", id: "useCollisionDetectionOnElements", label: "Prevent Overlaps" },
  ] },
  { title: "Collisions", items: [
    { type: "select", id: "intersectionBounceRenderingMode", label: "Collision Mode", options: MODES },
    { type: "number", id: "intSlippagePct", label: "Slip-through Chance (%)", min: 0, max: 100, step: 1 },
    { type: "select", id: "intersectionSlipThroughRenderingMode", label: "Slip-through Mode", options: MODES },
    { type: "pair", items: [
      { type: "number", id: "intersectionSplatterSpread", label: "Particle Spread", min: 1, max: 50, step: 1 },
      { type: "number", id: "intersectionSplatterAmount", label: "Particle Amount", min: 0, max: 3000, step: 10 } ] },
  ] },
  { title: "Film Grain", items: [
    { type: "toggle", id: "usefilmGrain", label: "Enable Film Grain" },
    { type: "number", id: "grainSize", label: "Grain Size (px)", min: 1, max: 20, step: .5 },
    { type: "pair", items: [
      { type: "number", id: "grainRoughness", label: "Roughness (%)", min: 0, max: 100, step: 1 },
      { type: "number", id: "grainOpacity", label: "Opacity (%)", min: 0, max: 100, step: 1 } ] },
  ] },
];

const el = (t, props = {}, kids = []) => { const n = Object.assign(document.createElement(t), props); kids.forEach(k => n.append(k)); return n; };
const refresh = {}; // id -> fn that pushes current value into the UI

// Number fields get a custom stepper: full-height up/down buttons on the right, always visible.
// Native spinners are hidden in CSS (they look and size differently in Chrome, Safari and Firefox).
const CHEV_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
const CHEV_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
function withStepper(inp, step) {
  const dec = (String(step).split(".")[1] || "").length;
  const nudge = dir => {
    const min = parseFloat(inp.min), max = parseFloat(inp.max);
    let v = parseFloat(inp.value); if (isNaN(v)) v = isNaN(min) ? 0 : min;
    v = +(v + dir * step).toFixed(dec);
    if (!isNaN(min)) v = Math.max(min, v); if (!isNaN(max)) v = Math.min(max, v);
    inp.value = v;
    inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const mk = (dir, label, svg) => {
    const b = el("button", { type: "button", className: "step-btn", tabIndex: -1, innerHTML: svg }); b.setAttribute("aria-label", label);
    let t1 = null, t2 = null; const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
    // Press once to step; hold to keep stepping.
    b.addEventListener("pointerdown", e => { if (e.button !== 0) return; e.preventDefault(); nudge(dir); stop(); t1 = setTimeout(() => { t2 = setInterval(() => nudge(dir), 60); }, 400); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, stop));
    b.addEventListener("contextmenu", e => e.preventDefault());
    return b;
  };
  const label = inp.getAttribute("aria-label") || "";
  return el("div", { className: "num-wrap" }, [inp, el("div", { className: "stepper" }, [mk(1, ("Increase " + label).trim(), CHEV_UP), mk(-1, ("Decrease " + label).trim(), CHEV_DOWN)])]);
}
function numberField(c) {
  const id = "f-" + c.id;
  const inp = el("input", { className: "input num", type: "number", id, min: c.min, max: c.max, step: c.step, inputMode: "decimal" });
  const clamp = v => Math.min(c.max, Math.max(c.min, v));
  inp.addEventListener("input", () => { const v = parseFloat(inp.value); if (!isNaN(v)) setVal(c.id, clamp(v)); });
  inp.addEventListener("change", () => { const v = parseFloat(inp.value); inp.value = isNaN(v) ? window._VALUES[c.id] : clamp(v); setVal(c.id, +inp.value); });
  refresh[c.id] = () => inp.value = window._VALUES[c.id];
  inp.setAttribute("aria-label", c.label);
  return el("div", { className: "field" }, [el("label", { htmlFor: id, textContent: c.label }), withStepper(inp, c.step || 1)]);
}
function selectField(c) {
  const id = "f-" + c.id;
  const s = el("select", { className: "select", id }, c.options.map(([v, t]) => el("option", { value: v, textContent: t })));
  s.addEventListener("change", () => setVal(c.id, s.value));
  refresh[c.id] = () => s.value = window._VALUES[c.id];
  return el("div", { className: "field" }, [el("label", { htmlFor: id, textContent: c.label }), s]);
}
function toggleField(c) {
  const id = "f-" + c.id;
  const cb = el("input", { type: "checkbox", id, role: "switch" });
  cb.addEventListener("change", () => setVal(c.id, cb.checked));
  refresh[c.id] = () => cb.checked = !!window._VALUES[c.id];
  return el("label", { className: "toggle", htmlFor: id }, [el("span", { textContent: c.label }), cb]);
}
// Accepts #RGB, #RGBA, #RRGGBB or #RRGGBBAA; returns "#RRGGBB" or "#RRGGBBAA" (alpha dropped when fully opaque).
const normHex = s => { s = String(s).trim().replace(/^#+/, ""); if (/^[0-9a-f]{3,4}$/i.test(s)) s = s.split("").map(x => x + x).join(""); if (/^[0-9a-f]{8}$/i.test(s) && /ff$/i.test(s)) s = s.slice(0, 6); return /^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) ? "#" + s.toUpperCase() : null; };
// ---------- Figma-style color picker ----------
// Saturation/brightness square, hue and alpha sliders, eyedropper (where the browser supports it),
// and Hex / RGB / HSL / HSB inputs with an opacity %. Values are "#RRGGBB" or "#RRGGBBAA".
const CP = (() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hsv2rgb = (h, s, v) => { const f = n => { const k = (n + h / 60) % 6; return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255; }; return [f(5), f(3), f(1)]; };
  const rgb2hsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); let h = 0;
    if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx];
  };
  const hsv2hsl = (h, s, v) => { const l = v * (1 - s / 2); return [h, l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l), l]; };
  const hsl2hsv = (h, s, l) => { const v = l + s * Math.min(l, 1 - l); return [h, v ? 2 * (1 - l / v) : 0, v]; };
  const hx = n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0").toUpperCase();
  const parse = str => { const h = normHex(str) || "#000000"; return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16), a: h.length > 7 ? parseInt(h.slice(7, 9), 16) / 255 : 1 }; };
  const format = (r, g, b, a) => "#" + hx(r) + hx(g) + hx(b) + (a < .998 ? hx(a * 255) : "");
  const MODES = ["Hex", "RGB", "HSL", "HSB"];
  let mode = "Hex"; try { mode = localStorage.getItem("vg-color-mode") || "Hex"; } catch (e) {}
  if (!MODES.includes(mode)) mode = "Hex";
  const st = { h: 0, s: 0, v: 0, a: 1 }; let allowAlpha = true, onChange = null, anchor = null;

  const mk = (t, cls, props = {}) => Object.assign(document.createElement(t), { className: cls }, props);
  const pop = mk("div", "cp", { hidden: true }); pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Color picker");
  const sv = mk("div", "cp-sv"), svKnob = mk("span", "cp-knob"); sv.append(svKnob);
  const eye = mk("button", "cp-eye", { type: "button", title: "Pick a color from the screen", innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.5 6.5 3 3"/><path d="M16.8 3.2a2.1 2.1 0 0 1 3 3l-2.3 2.3-3-3z"/><path d="M14.5 6.5 5 16l-1 4 4-1 9.5-9.5"/></svg>' });
  eye.setAttribute("aria-label", "Eyedropper");
  const hue = mk("div", "cp-track cp-hue"), hueKnob = mk("span", "cp-knob"); hue.append(hueKnob);
  const alp = mk("div", "cp-track cp-alpha"), alpKnob = mk("span", "cp-knob"); alp.append(alpKnob);
  const sliders = mk("div", "cp-sliders"); sliders.append(hue, alp);
  const row = mk("div", "cp-row"); row.append(eye, sliders);
  const modeSel = mk("select", "cp-mode"); MODES.forEach(m => modeSel.append(new Option(m, m))); modeSel.setAttribute("aria-label", "Color format");
  const inputs = mk("div", "cp-inputs");
  const fields = mk("div", "cp-fields"); fields.append(modeSel, inputs);
  pop.append(sv, row, fields);
  if (!("EyeDropper" in window)) eye.hidden = true;
  document.body.append(pop);

  const rgb = () => hsv2rgb(st.h, st.s, st.v);
  const emit = () => { const [r, g, b] = rgb(); onChange && onChange(format(r, g, b, allowAlpha ? st.a : 1)); };
  let boxes = [];
  function buildInputs() {
    inputs.replaceChildren(); boxes = [];
    const add = (cls, label, onIn) => { const i = mk("input", cls, { spellcheck: false, autocomplete: "off" }); i.setAttribute("aria-label", label); i.addEventListener("input", onIn); i.addEventListener("keydown", e => { if (e.key === "Enter") i.blur(); }); i.addEventListener("blur", () => paintInputs(true)); inputs.append(i); boxes.push(i); return i; };
    const num = (i, max) => clamp(parseFloat(i.value) || 0, 0, max);
    if (mode === "Hex") {
      add("hex", "Hex", e => { const h = normHex(e.target.value); if (h && h.length === 7) { const c = parse(h); [st.h, st.s, st.v] = keepHue(rgb2hsv(c.r, c.g, c.b)); paint(false); emit(); } });
    } else {
      const names = mode === "RGB" ? ["R", "G", "B"] : ["H", "S", mode === "HSL" ? "L" : "B"];
      const read = () => {
        const v = boxes.slice(0, 3);
        if (mode === "RGB") [st.h, st.s, st.v] = keepHue(rgb2hsv(num(v[0], 255), num(v[1], 255), num(v[2], 255)));
        else if (mode === "HSB") [st.h, st.s, st.v] = [num(v[0], 360), num(v[1], 100) / 100, num(v[2], 100) / 100];
        else [st.h, st.s, st.v] = hsl2hsv(num(v[0], 360), num(v[1], 100) / 100, num(v[2], 100) / 100);
        paint(false); emit();
      };
      names.forEach(n => add("", n, read));
    }
    if (allowAlpha) {
      add("", "Opacity", e => { st.a = clamp(parseFloat(e.target.value) || 0, 0, 100) / 100; paint(false); emit(); });
      inputs.append(mk("span", "pct", { textContent: "%" }));
    }
  }
  const keepHue = ([h, s, v]) => [s === 0 || v === 0 ? st.h : h, s, v];
  function paintInputs(force) {
    const [r, g, b] = rgb(); let vals;
    if (mode === "Hex") vals = [hx(r) + hx(g) + hx(b)];
    else if (mode === "RGB") vals = [r, g, b].map(Math.round);
    else if (mode === "HSB") vals = [Math.round(st.h), Math.round(st.s * 100), Math.round(st.v * 100)];
    else { const [h, s, l] = hsv2hsl(st.h, st.s, st.v); vals = [Math.round(h), Math.round(s * 100), Math.round(l * 100)]; }
    if (allowAlpha) vals.push(Math.round(st.a * 100));
    boxes.forEach((i, k) => { if (force || document.activeElement !== i) i.value = vals[k]; });
  }
  function paint(force = true) {
    const [r, g, b] = rgb(), css = `rgb(${r | 0},${g | 0},${b | 0})`;
    sv.style.setProperty("--h", st.h);
    svKnob.style.left = st.s * 100 + "%"; svKnob.style.top = (1 - st.v) * 100 + "%"; svKnob.style.background = css;
    hueKnob.style.left = st.h / 360 * 100 + "%"; hueKnob.style.background = `hsl(${st.h},100%,50%)`;
    alp.style.setProperty("--c", css); alpKnob.style.left = st.a * 100 + "%"; alpKnob.style.background = `rgba(${r | 0},${g | 0},${b | 0},${st.a})`;
    alp.hidden = !allowAlpha;
    paintInputs(force);
  }
  function drag(elm, fn) {
    elm.addEventListener("pointerdown", e => {
      e.preventDefault(); elm.setPointerCapture(e.pointerId);
      const move = ev => { const r = elm.getBoundingClientRect(); fn(clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)); paint(); emit(); };
      move(e); elm.onpointermove = move; elm.onpointerup = elm.onpointercancel = () => { elm.onpointermove = null; };
    });
  }
  drag(sv, (x, y) => { st.s = x; st.v = 1 - y; });
  drag(hue, x => { st.h = x * 360; });
  drag(alp, x => { st.a = x; });
  modeSel.addEventListener("change", () => { mode = modeSel.value; try { localStorage.setItem("vg-color-mode", mode); } catch (e) {} buildInputs(); paint(); });
  eye.addEventListener("click", async () => {
    try { const res = await new window.EyeDropper().open(); const c = parse(res.sRGBHex); [st.h, st.s, st.v] = keepHue(rgb2hsv(c.r, c.g, c.b)); paint(); emit(); } catch (e) {}
  });
  function close() { pop.hidden = true; anchor = null; onChange = null; }
  function open(el, value, opts, cb) {
    if (anchor === el && !pop.hidden) { close(); return; }
    anchor = el; onChange = cb; allowAlpha = !opts || opts.alpha !== false;
    const c = parse(value); [st.h, st.s, st.v] = rgb2hsv(c.r, c.g, c.b); st.a = allowAlpha ? c.a : 1;
    modeSel.value = mode; buildInputs(); paint(); pop.hidden = false;
    // Place beside the sidebar, lined up with the field, kept inside the window.
    const r = el.getBoundingClientRect(), side = el.closest(".side"), pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = side && window.innerWidth > 820 ? side.getBoundingClientRect().right + 8 : r.left;
    let top = r.top - 12;
    left = clamp(left, 8, window.innerWidth - pw - 8); top = clamp(top, 8, window.innerHeight - ph - 8);
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  document.addEventListener("pointerdown", e => { if (!pop.hidden && !pop.contains(e.target) && !(anchor && anchor.contains(e.target))) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden) { close(); } });
  return { open, close, isOpen: () => !pop.hidden };
})();


function colorField(c) {
  const id = "f-" + c.id, alpha = c.alpha !== false;
  const chip = el("span"), sw = el("button", { type: "button", className: "swatch", ariaLabel: c.label + " picker" }, [chip]);
  const tx = el("input", { className: "input hex", id, spellcheck: false, maxLength: alpha ? 9 : 7 });
  const clean = h => alpha ? h : h.slice(0, 7);
  const paint = (text = true) => { const h = normHex(window._VALUES[c.id]) || "#000000"; chip.style.background = h; if (text && document.activeElement !== tx) tx.value = h; };
  sw.addEventListener("click", () => CP.open(sw, window._VALUES[c.id], { alpha }, h => { setVal(c.id, clean(h)); paint(); }));
  tx.addEventListener("input", () => { const h = normHex(tx.value); if (h && (tx.value.replace("#", "").length === 6 || tx.value.replace("#", "").length === 8)) { setVal(c.id, clean(h)); paint(false); } });
  tx.addEventListener("change", () => { tx.value = normHex(window._VALUES[c.id]) || "#000000"; });
  refresh[c.id] = () => paint();
  return el("div", { className: "field" }, [el("label", { htmlFor: id, textContent: c.label }), el("div", { className: "color-wrap" }, [sw, tx])]);
}
function dimsField(c) {
  const wI = el("input", { className: "input num", type: "number", min: 1, max: 6000, id: "f-w", ariaLabel: "Width" });
  const hI = el("input", { className: "input num", type: "number", min: 1, max: 6000, id: "f-h", ariaLabel: "Height" });
  const apply = () => setVal("canvasSize", { width: Math.max(1, Math.min(6000, +wI.value || 1)), height: Math.max(1, Math.min(6000, +hI.value || 1)) });
  [wI, hI].forEach(i => { i.addEventListener("change", apply); i.addEventListener("keydown", e => e.key === "Enter" && apply()); });
  refresh.canvasSize = () => { wI.value = window._VALUES.canvasSize.width; hI.value = window._VALUES.canvasSize.height; };
  return el("div", { className: "field" }, [el("div", { className: "lab", textContent: c.label }),
    el("div", { className: "dims" }, [el("span", { textContent: "W" }), withStepper(wI, 1), el("span", { textContent: "H" }), withStepper(hI, 1)])]);
}
// ---------- Preset code: one string holding the seed and every setting (colors included) ----------
// Format: "1_" + seed + "_" + each setting in CODE_KEYS order, joined by "_".
// Numbers as-is, on/off as 1/0, colors as 6 hex digits, dropdowns as option index, canvas as WxH.
const OPTIONS = {};
(function collect(items) { items.forEach(i => { if (i.items) collect(i.items); if (i.type === "select") OPTIONS[i.id] = i.options.map(o => o[0]); }); })(SECTIONS);
// Codes store dropdowns by index, so vector styles keep their original numbering (rough styles were removed);
// older codes that used a rough style load as Solid.
const CODE_OPTIONS = { ...OPTIONS, rayDrawingStyle: ["solid", "rough", "super rough", "dash", "dot", "ori", "none"] };
const RETIRED = { rayDrawingStyle: { "rough": "solid", "super rough": "solid" } };
const CODE_KEYS = Object.keys(DEFAULTS).filter(k => !["viewZoom", "viewX", "viewY"].includes(k));
const numStr = v => String(+(+v).toFixed(4)).replace(/^0\./, ".");
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, ".").replace(/=+$/, "");
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/\./g, "/"))));
function encodeCode() {
  const sd = window._SEED;
  const seedPart = Number.isSafeInteger(sd) && sd >= 0 ? sd.toString(36) : "s" + b64u(String(sd));
  const parts = CODE_KEYS.map(k => {
    const v = window._VALUES[k], d = DEFAULTS[k];
    if (k === "canvasSize") return v.width + "x" + v.height;
    if (typeof d === "boolean") return v ? "1" : "0";
    if (CODE_OPTIONS[k]) return String(Math.max(0, CODE_OPTIONS[k].indexOf(v)));
    if (typeof d === "string" && d[0] === "#") return (normHex(v) || d).slice(1).toLowerCase();
    return numStr(v);
  });
  return ["1", seedPart, ...parts].join("_");
}
function decodeCode(str) {
  const p = String(str).trim().split("_");
  if (p[0] !== "1" || p.length !== CODE_KEYS.length + 2) return null;
  const seed = p[1][0] === "s" ? unb64u(p[1].slice(1)) : parseInt(p[1], 36);
  if (seed === "" || (typeof seed === "number" && isNaN(seed))) return null;
  const vals = {};
  for (let i = 0; i < CODE_KEYS.length; i++) {
    const k = CODE_KEYS[i], d = DEFAULTS[k], t = p[i + 2];
    if (k === "canvasSize") { const m = /^(\d+)x(\d+)$/.exec(t); if (!m) return null; vals[k] = { width: Math.min(6000, Math.max(1, +m[1])), height: Math.min(6000, Math.max(1, +m[2])) }; }
    else if (typeof d === "boolean") { if (t !== "0" && t !== "1") return null; vals[k] = t === "1"; }
    else if (CODE_OPTIONS[k]) { const o = CODE_OPTIONS[k][+t]; if (o === undefined) return null; vals[k] = (RETIRED[k] && RETIRED[k][o]) || o; }
    else if (typeof d === "string" && d[0] === "#") { const h = normHex(t); if (!h) return null; vals[k] = h; }
    else { const n = parseFloat(t); if (isNaN(n)) return null; vals[k] = n; }
  }
  vals.numRays = Math.min(MAX_VECTORS, Math.max(1, Math.round(vals.numRays)));
  return { seed, vals };
}
function seedField(c) {
  const s = el("input", { className: "input code", id: "f-code", spellcheck: false, autocomplete: "off", ariaLabel: c.label });
  const copy = el("button", { className: "btn mini", type: "button", textContent: "Copy" });
  s.addEventListener("focus", () => s.select());
  s.addEventListener("input", () => s.classList.toggle("bad", !decodeCode(s.value)));
  s.addEventListener("change", () => {
    if (!applyCode(s.value)) { s.classList.remove("bad"); s.value = encodeCode(); }
  });
  s.addEventListener("keydown", e => { if (e.key === "Enter") s.blur(); if (e.key === "Escape") { s.value = encodeCode(); s.classList.remove("bad"); s.blur(); } });
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(encodeCode()); copy.textContent = "Copied"; } catch (e) { s.focus(); s.select(); copy.textContent = "⌘C"; }
    setTimeout(() => copy.textContent = "Copy", 1500);
  };
  refresh._seed = () => { if (document.activeElement !== s) { s.value = encodeCode(); s.classList.remove("bad"); } };
  return el("div", { className: "field" }, [el("label", { htmlFor: "f-code", textContent: c.label }), el("div", { className: "dims" }, [s, copy])]);
}
// Fields with showIf appear only while that on/off setting is on.
const conditional = [];
const updateConditional = () => conditional.forEach(({ node, key }) => { node.hidden = !window._VALUES[key]; });
refresh._cond = updateConditional;
function build(item) {
  const node = buildNode(item);
  if (item.showIf) { conditional.push({ node, key: item.showIf }); node.hidden = !window._VALUES[item.showIf]; }
  return node;
}
const ACTION_ICONS = { shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.46-7.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45"/>' };
const ACTIONS = { randomizeColors: () => randomizeColors() };
function buildNode(item) {
  switch (item.type) {
    case "action": {
      const b = el("button", { type: "button", className: "btn icon", innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ACTION_ICONS[item.icon] || ""}</svg><span>${item.label}</span>` });
      b.addEventListener("click", ACTIONS[item.run]);
      return b;
    }
    case "color": return colorField(item);
    case "number": return numberField(item);
    case "select": return selectField(item);
    case "toggle": return toggleField(item);
    case "dims": return dimsField(item);
    case "seed": return seedField(item);
    case "pair": return el("div", { className: "grid2" }, item.items.map(build));
    case "colors": return el("div", { className: "grid2" }, item.items.map(i => i.type === "number" ? numberField(i) : colorField(i)));
  }
}
(function buildSidebar() {
  const side = document.getElementById("side");
  SECTIONS.forEach(sec => {
    const s = el("section", { className: "sec" });
    if (sec.title) s.append(el("div", { className: "sec-title", textContent: sec.title }));
    sec.items.forEach(i => s.append(build(i)));
    side.append(s);
  });
  const ICONS = {
    regen: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.46-7.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45"/>',
    save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3"/><rect x="7" y="13" width="10" height="8" rx="1"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
  };
  const iconBtn = (id, cls, label, icon) => {
    return el("button", { className: "btn icon " + cls, id, type: "button", innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg><span>${label}</span>` });
  };
  const regen = iconBtn("regen", "primary", "Regenerate", ICONS.regen);
  const save = iconBtn("save", "", "Save Image", ICONS.save);
  const svgBtn = iconBtn("copySvg", "", "Copy SVG", ICONS.copy);
  const shareBtn = iconBtn("share", "", "Share", ICONS.share);
  side.prepend(el("section", { className: "sec side-actions" }, [el("div", { className: "actions two" }, [regen, shareBtn, svgBtn, save])]));
  regen.onclick = () => { randomizeLook(); applySeed(Math.floor(Math.random() * 2 ** 52)); clearURL(); };
  save.onclick = openSave; svgBtn.onclick = copySVG; shareBtn.onclick = () => shareLink(shareBtn);
})();
const refreshAll = () => Object.values(refresh).forEach(f => f());

// ---------- Seed ----------
// Randomized on every page load and every Regenerate: vector count (20–100), circle count (10–25),
// vector style and collision mode ("Hidden"/"None" are never picked).
function randomizeLook() {
  const pickVisible = id => { const opts = OPTIONS[id].filter(o => o !== "none"); return opts[Math.floor(Math.random() * opts.length)]; };
  window._VALUES.numRays = randomVectorCount();
  window._VALUES.numCircles = 10 + Math.floor(Math.random() * 16);
  window._VALUES.rayDrawingStyle = pickVisible("rayDrawingStyle");
  window._VALUES.intersectionBounceRenderingMode = pickVisible("intersectionBounceRenderingMode");
  ["numRays", "numCircles", "rayDrawingStyle", "intersectionBounceRenderingMode"].forEach(k => refresh[k] && refresh[k]());
}
// ---------- Random color palette ----------
// Builds a coordinated palette around one random hue: mostly dark backgrounds (70%), sometimes light,
// with a contrasting vector color, a quieter circle stroke, and accent particles from an offset hue.
// Circle Fill is set too (used when Fill Circles is on). Min Opacity and the on/off settings are left alone.
function hslHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return "#" + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}
function randomizeColors() {
  const R = (a, b) => a + Math.random() * (b - a), pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const h = Math.random() * 360, dark = Math.random() < 0.7, accent = h + pick([180, 150, 210, 120, 240, 30]);
  const vec = dark ? hslHex(h + R(-30, 30), R(20, 90), R(75, 95)) : hslHex(h + R(-30, 30), R(40, 90), R(12, 30));
  Object.assign(window._VALUES, {
    bgColor: dark ? hslHex(h, R(10, 40), R(3, 10)) : hslHex(h, R(10, 35), R(92, 97)),
    rayMaxColor: vec,
    circleStroke: dark ? hslHex(h + R(-20, 20), R(10, 40), R(28, 45)) : hslHex(h + R(-20, 20), R(10, 40), R(55, 72)),
    intColor: hslHex(accent, R(70, 100), dark ? R(55, 75) : R(35, 55)),
    intColor2: Math.random() < 0.5 ? hslHex(accent + R(20, 60), R(70, 100), dark ? R(60, 85) : R(30, 50)) : vec,
    circleFill: dark ? hslHex(h, R(15, 45), R(6, 16)) : hslHex(h, R(15, 40), R(85, 93)),
  });
  refreshAll(); window._FORCEQUICKDRAW && window._FORCEQUICKDRAW();
}

// ---------- Preset code in the URL (?p=CODE) ----------
// Every Regenerate adds a history entry, so Back/Forward step through earlier images.
// The address bar stays clean while you work. Share builds a link with ?p=CODE;
// opening such a link restores that exact image, and Regenerate clears ?p= from the address bar again.
function applyCode(str) {
  const r = decodeCode(str); if (!r) return false;
  Object.assign(window._VALUES, r.vals); window._SEED = r.seed;
  refreshAll(); if (window._p5ready) window.draw();
  return true;
}
function codeFromURL() { try { return new URLSearchParams(location.search).get("p"); } catch (e) { return null; } }
function shareURL() { const u = new URL(location.href); u.hash = ""; u.search = ""; u.searchParams.set("p", encodeCode()); return u.href; }
function clearURL() {
  try { if (location.search) { const u = new URL(location.href); u.searchParams.delete("p"); history.replaceState(null, "", u); } }
  catch (e) { /* some embedded previews don't allow changing the URL */ }
}
async function shareLink(btn) {
  const url = shareURL();
  // Use the system share sheet where there is one (phones, Safari, some desktop browsers); otherwise copy the link.
  if (navigator.share) {
    try { await navigator.share({ title: document.title, url }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); showTip(btn, "Link copied to clipboard"); }
  catch (e) {
    const ta = el("textarea", { value: url, readOnly: true, ariaLabel: "Share link" });
    card.replaceChildren(el("h2", { textContent: "Share link" }),
      el("p", { textContent: "Copy this link to share this exact image. It is selected below — press Ctrl/Cmd+C." }),
      ta, el("div", { className: "modal-row" }, [closeBtn("Done")]));
    ta.style.minHeight = "90px"; modal.hidden = false; ta.focus(); ta.select();
  }
}

randomizeLook();
window._SEED = Math.floor(Math.random() * 2 ** 52);
function applySeed(s) { window._SEED = s; refresh._seed && refresh._seed(); if (window._p5ready) window.draw(); }
refreshAll();
{ const c = codeFromURL(); if (c) applyCode(c); }

// ---------- Modal (used when the clipboard is blocked) ----------
const modal = document.getElementById("modal"), card = document.getElementById("modalCard");
const closeModal = () => { modal.hidden = true; card.innerHTML = ""; };
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
const closeBtn = (label = "Close") => { const b = el("button", { className: "btn", textContent: label }); b.onclick = closeModal; return b; };
// In a standalone page the browser can download files directly.
function openSave() {
  const cv = document.getElementById("defaultCanvas0"); if (!cv) return;
  cv.toBlob(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `image--${encodeCode()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");
}
// ---------- SVG export ----------
// Replays the full-quality render with the same seed, swapping p5's drawing calls for ones that write SVG elements.
// Film grain is a pixel effect, so it is not part of the SVG.
function buildSVG() {
  const R = n => Math.round(n * 100) / 100;
  const col = c => { const k = color(c).levels; return { hex: "#" + k.slice(0, 3).map(v => v.toString(16).padStart(2, "0")).join(""), a: R(k[3] / 255) }; };
  let st = null, fl = null, sw = 1, pts = null; const out = [];
  const sAttr = () => st ? ` stroke="${st.hex}"${st.a < 1 ? ` stroke-opacity="${st.a}"` : ""} stroke-width="${R(sw)}"` : "";
  const fAttr = () => fl ? ` fill="${fl.hex}"${fl.a < 1 ? ` fill-opacity="${fl.a}"` : ""}` : ` fill="none"`;
  const pick = a => a.length > 1 ? color(...a) : a[0];
  // Clip a segment to the canvas rectangle (Liang–Barsky); returns [x1,y1,x2,y2] or null if it lies fully outside.
  const clip = (x1, y1, x2, y2) => {
    let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy], q = [x1, width - x1, y1, height - y1];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return null; continue; }
      const r = q[i] / p[i];
      if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
  };
  const inside = (x, y, r = 0) => x + r >= 0 && y + r >= 0 && x - r <= width && y - r <= height;
  const emitLine = run => { if (run.length > 1) out.push(`<polyline points="${run.map(([x, y]) => R(x) + "," + R(y)).join(" ")}" fill="none"${sAttr()} stroke-linejoin="round" stroke-linecap="round"/>`); };
  const shim = {
    stroke: (...a) => { st = col(pick(a)); }, noStroke: () => { st = null; },
    fill: (...a) => { fl = col(pick(a)); }, noFill: () => { fl = null; },
    strokeWeight: v => { sw = v; },
    background: (...a) => { const k = col(pick(a)); out.push(`<rect width="${width}" height="${height}" fill="${k.hex}"/>`); },
    circle: (x, y, d) => { if ((fl || st) && inside(x, y, d / 2)) out.push(`<circle cx="${R(x)}" cy="${R(y)}" r="${R(d / 2)}"${fAttr()}${sAttr()}/>`); },
    line: (x1, y1, x2, y2) => { const c = st && clip(x1, y1, x2, y2); if (c) out.push(`<line x1="${R(c[0])}" y1="${R(c[1])}" x2="${R(c[2])}" y2="${R(c[3])}"${sAttr()} stroke-linecap="round"/>`); },
    beginShape: () => { pts = []; }, vertex: (x, y) => { pts && pts.push([x, y]); },
    // Vectors are open polylines: cut each one at the canvas edge, splitting it where it leaves and re-enters.
    endShape: () => {
      if (pts && pts.length > 1 && st) {
        let run = null;
        for (let i = 0; i < pts.length - 1; i++) {
          const c = clip(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
          if (!c) { if (run) emitLine(run); run = null; continue; }
          const last = run && run[run.length - 1];
          if (last && Math.abs(last[0] - c[0]) < 1e-6 && Math.abs(last[1] - c[1]) < 1e-6) run.push([c[2], c[3]]);
          else { if (run) emitLine(run); run = [[c[0], c[1]], [c[2], c[3]]]; }
        }
        if (run) emitLine(run);
      }
      pts = null;
    },
  };
  const saved = {};
  Object.keys(shim).forEach(k => { saved[k] = window[k]; window[k] = shim[k]; });
  window._SVGDOT = (x, y, d) => { if (fl && inside(x, y, d / 2)) out.push(`<circle cx="${R(x)}" cy="${R(y)}" r="${R(d / 2)}"${fAttr()}/>`); };
  try {
    const { width: cw, height: ch } = w("canvasSize");
    if (cw !== width || ch !== height) { Object.keys(saved).forEach(k => window[k] = saved[k]); resizeCanvas(cw, ch); Object.keys(shim).forEach(k => window[k] = shim[k]); }
    reseed(); noFill(); strokeWeight(1); background(w("bgColor"));
    render(buildScene(), false);
  } finally {
    Object.keys(saved).forEach(k => { window[k] = saved[k]; });
    window._SVGDOT = null;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${out.join("\n")}\n</svg>`;
}
// Small tooltip shown under a button for a moment.
let tipEl = null, tipTimer = null;
function showTip(btn, text) {
  if (!tipEl) { tipEl = el("div", { className: "tip", role: "status" }); document.body.append(tipEl); }
  tipEl.textContent = text; tipEl.hidden = false;
  const r = btn.getBoundingClientRect(), tw = tipEl.offsetWidth;
  tipEl.style.left = Math.min(window.innerWidth - tw / 2 - 8, Math.max(tw / 2 + 8, r.left + r.width / 2)) + "px";
  tipEl.style.top = r.bottom + 8 + "px";
  clearTimeout(tipTimer); tipTimer = setTimeout(() => tipEl.hidden = true, 1800);
}
async function copySVG() {
  const btn = document.getElementById("copySvg");
  if (!window._p5ready) return;
  let svg;
  try { svg = buildSVG(); } catch (e) { console.error(e); showTip(btn, "Couldn't build the SVG"); return; }
  try {
    await navigator.clipboard.writeText(svg);
    showTip(btn, "SVG copied to clipboard");
  } catch (e) {
    // Clipboard blocked: show the SVG so it can be copied by hand.
    const ta = el("textarea", { value: svg, readOnly: true, ariaLabel: "SVG markup" });
    card.replaceChildren(el("h2", { textContent: "Copy SVG" }),
      el("p", { textContent: "Your browser blocked automatic copying. The SVG is selected below — press Ctrl/Cmd+C to copy it." }),
      ta, el("div", { className: "modal-row" }, [closeBtn("Done")]));
    modal.hidden = false; ta.focus(); ta.select();
  }
}

// ---------- Sketch (ported from the original) ----------
const w = k => (window._VALUES[k]) || 0;
const fastDot = (x, y, d) => { if (window._SVGDOT) return window._SVGDOT(x, y, d); drawingContext.beginPath(); drawingContext.arc(x, y, d / 2, 0, 2 * PI, false); drawingContext.fill(); drawingContext.closePath(); };
const gradCache = {};
function gradient(cols, t) {
  const key = cols.join("");
  if (!gradCache[key]) {
    const arr = [];
    for (let i = 0; i < 100; i++) {
      const a = i / 99 * (cols.length - 1), lo = floor(a), hi = ceil(a);
      arr.push(lerpColor(color(cols[lo]), color(cols[hi]), a - lo));
    }
    gradCache[key] = arr;
  }
  return gradCache[key][round(t * 99)];
}
const toScreen = (x, y, z = null, vx = null, vy = null) => {
  if (z === null && vx === null && vy === null) { z = w("viewZoom"); vx = w("viewX"); vy = w("viewY"); }
  const s = max(width, height) * z, ox = (vx - .5) * s, oy = (vy - .5) * s;
  return { x: width / 2 - s / 2 + x * s - ox, y: height / 2 - s / 2 + y * s - oy };
};

function render({ circles, rays, rayOrigins, intersections }, quick = false) {
  const z = w("viewZoom"), vx = w("viewX"), vy = w("viewY"), style = w("rayDrawingStyle");
  const mode = w("intersectionBounceRenderingMode");
  const m = max(width, height);
  const sc = circles.map(c => ({ ...toScreen(c.x, c.y, z, vx, vy), r: c.r * m * z, ID: c.ID }));
  const ints = intersections.map(i => ({ ...toScreen(i.x, i.y, z, vx, vy), originCircle: circles.find(c => c.ID === i.originID) }));
  const cStroke = w("circleStroke"), cFill = w("circleFill"), rMax = w("rayMaxColor"), rMaxA = alpha(color(rMax)) / 255;
  const minA = constrain(window._VALUES.rayMinOpacity ?? 25, 0, 100) / 100 * 255;
  const i1 = w("intColor"), i2 = w("intColor2"), spread = w("intersectionSplatterSpread"), amount = w("intersectionSplatterAmount");
  const intCols = [i1, i2];
  const fillC = color(cFill); fillC.setAlpha(alpha(fillC) * 200 / 255); // fill stays slightly see-through, scaled by the color's own opacity
  sc.forEach(c => {
    stroke(cStroke); strokeWeight(w("circleStrokeWeight") || 1); if (w("circleFillOn")) fill(fillC); else noFill(); circle(c.x, c.y, c.r / 2); stroke(i1); fill(i1);
    const mine = ints.filter(i => i.originCircle.ID === c.ID);
    if (mode === "point" || quick === true) { noStroke(); mine.forEach(i => { fill(gradient(intCols, random())); circle(i.x, i.y, random(2, 5)); }); }
    else if (mode === "splatter-in") mine.forEach(i => splatter(i, i.originCircle, spread, amount, "in", intCols));
    else if (mode === "splatter-out") mine.forEach(i => splatter(i, i.originCircle, spread, amount, "out", intCols));
  });
  noFill();
  strokeWeight(w("rayStrokeWeight") || 1);
  rays.forEach(ray => {
    // Each vector gets a random starting opacity between solid and Min Opacity (one random() call, same as before, so seeds stay stable)...
    const startA = lerp(minA, 255, random());
    ray.forEach((seg, idx) => {
      // ...then fades from that start down to Min Opacity on its last bounce.
      const t = ray.length > 1 ? idx / (ray.length - 1) : 0;
      const col = color(rMax); col.setAlpha(lerp(startA, minA, t) * rMaxA); stroke(col);
      const pts = seg.map(p => toScreen(p.x, p.y, z, vx, vy));
      if (quick || style === "solid") solidLine(pts);
      else if (style === "dash") dashLine(pts);
      else if (style === "dot") { noStroke(); fill(col); dotLine(pts); }
      else if (style === "ori") random([dashLine, dotLine])(pts);
    });
  });
}
const splatter = (p, c, spread, amount, dir, cols) => {
  const n = c.r * amount, z = w("viewZoom"), sp = spread * random(.9, 1.1), jitter = .15;
  const cc = toScreen(c.x, c.y); cc.r = c.r * width * z;
  for (let i = 0; i < n; i++) {
    const ang = random(TWO_PI), base = cc.r * (sp / 100), g = randomGaussian(0, 1), d = base * g;
    const x = p.x + cos(ang) * d, y = p.y + sin(ang) * d;
    fill(gradient(cols, constrain(abs(g + random(-jitter, jitter)), 0, 1)));
    const dd = dist(x, y, cc.x, cc.y);
    if ((dir === "in" && dd < cc.r / 4) || (dir === "out" && dd > cc.r / 4)) fastDot(x, y, abs(randomGaussian(0, 1.25) * z));
  }
};
const solidLine = pts => { beginShape(); pts.forEach(p => vertex(p.x, p.y)); endShape(); };
const dashLine = pts => {
  const gap = random(5, 25), len = random(gap / 4, gap / 1.25);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], d = dist(a.x, a.y, b.x, b.y); let t = 0;
    while (t < d) { const x1 = lerp(a.x, b.x, t / d), y1 = lerp(a.y, b.y, t / d); let e = (t + len) / d; if (e > 1) e = 1; line(x1, y1, lerp(a.x, b.x, e), lerp(a.y, b.y, e)); t += gap; }
  }
};
const dotLine = pts => {
  const gap = random(2, 25), sz = random(.5, 2);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], d = dist(a.x, a.y, b.x, b.y); let t = 0;
    while (t < d) { circle(lerp(a.x, b.x, t / d), lerp(a.y, b.y, t / d), sz); t += gap; }
  }
};

// Film grain via a small WebGL pass
function compile(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); throw new Error("shader"); } return s; }
// Grain: true random noise from a seeded PRNG (uploaded as textures), so nothing ever repeats or forms a lattice.
// Size = clump size in image pixels; Roughness sharpens clumps and mixes in per-pixel detail; Opacity = grain strength.
const LATT = 1024; // tile for the clump lattice; three rotated, rescaled octaves hide any tiling
const noiseCache = {};
function seededBytes(n, seedNum) {
  let a = seedNum >>> 0; const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 4) {
    a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); t = (t ^ (t >>> 14)) >>> 0;
    out[i] = t & 255; out[i + 1] = (t >>> 8) & 255; out[i + 2] = (t >>> 16) & 255; out[i + 3] = t >>> 24;
  }
  return out;
}
function noiseData(key, n, seedNum) { if (!noiseCache[key]) { for (const k in noiseCache) if (k.split(":")[0] === key.split(":")[0]) delete noiseCache[k]; noiseCache[key] = seededBytes(n, seedNum); } return noiseCache[key]; }
function grainPass(src, opts) {
  const cv = document.createElement("canvas"); cv.width = src.width; cv.height = src.height;
  const gl = cv.getContext("webgl", { preserveDrawingBuffer: true });
  const vs = compile(gl, gl.VERTEX_SHADER, "attribute vec2 a_position;attribute vec2 a_texCoord;varying vec2 v_texCoord;void main(){gl_Position=vec4(a_position,0.0,1.0);v_texCoord=a_texCoord;}");
  const fs = compile(gl, gl.FRAGMENT_SHADER, `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 v_texCoord;
    uniform sampler2D u_image; uniform sampler2D u_fine; uniform sampler2D u_latt;
    uniform vec2 u_res; uniform float u_cell; uniform float u_rough; uniform float u_opacity;
    float lat(vec2 i) { return texture2D(u_latt, (i + 0.5) / ${LATT}.0).r; }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
      return mix(mix(lat(i), lat(i + vec2(1.0, 0.0)), u.x), mix(lat(i + vec2(0.0, 1.0)), lat(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    void main() {
      vec4 c = texture2D(u_image, v_texCoord);
      c.rgb /= max(c.a, 0.0001);
      mat2 rot = mat2(0.82534, -0.56464, 0.56464, 0.82534); // irrational angle (~34.4deg): a 3-4-5 angle would make sampling repeat every 5px
      vec2 p = rot * (v_texCoord * u_res) / u_cell;
      // Organic clumps: three octaves of smooth noise at unrelated angles and larger scales.
      float soft = vnoise(p) * 0.5 + vnoise(rot * p * 0.57 + vec2(41.3, 17.9)) * 0.3 + vnoise(rot * rot * p * 0.31 + vec2(7.7, 93.1)) * 0.2; // octaves only get larger, never finer than a pixel (finer ones alias into a visible lattice)
      soft = clamp((soft - 0.5) * 2.2 + 0.5, 0.0, 1.0);
      // Per-pixel detail: average of three random channels -> bell-shaped values, like real grain.
      vec4 f4 = texture2D(u_fine, v_texCoord);
      float fine = clamp(((f4.r + f4.g + f4.b) / 3.0 - 0.5) * 1.7 + 0.5, 0.0, 1.0);
      float sharp = smoothstep(0.25, 0.75, soft);
      float n = clamp(mix(soft, sharp * 0.55 + fine * 0.45, u_rough), 0.0, 1.0);
      c.rgb += vec3(n * u_opacity);
      gl_FragColor = c;
    }`);
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  const pos = gl.getAttribLocation(prog, "a_position"), tc = gl.getAttribLocation(prog, "a_texCoord");
  const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const tb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]), gl.STATIC_DRAW);
  const mkTex = (unit, w, h, data, filter, wrap) => {
    gl.activeTexture(gl.TEXTURE0 + unit); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, wrap));
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, filter));
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  };
  // Seed the noise from the image seed so each seed gets its own grain.
  let hs = 2166136261; for (const ch of String(window._SEED)) { hs ^= ch.charCodeAt(0); hs = Math.imul(hs, 16777619) >>> 0; }
  const img = src.getContext("2d").getImageData(0, 0, src.width, src.height);
  mkTex(0, src.width, src.height, img.data, gl.LINEAR, gl.CLAMP_TO_EDGE);
  mkTex(1, src.width, src.height, noiseData("fine:" + hs + ":" + src.width + "x" + src.height, src.width * src.height * 4, hs ^ 0x9E3779B9), gl.NEAREST, gl.CLAMP_TO_EDGE);
  mkTex(2, LATT, LATT, noiseData("latt:" + hs, LATT * LATT * 4, hs), gl.NEAREST, gl.REPEAT);
  gl.viewport(0, 0, cv.width, cv.height); gl.useProgram(prog);
  gl.uniform1i(gl.getUniformLocation(prog, "u_image"), 0);
  gl.uniform1i(gl.getUniformLocation(prog, "u_fine"), 1);
  gl.uniform1i(gl.getUniformLocation(prog, "u_latt"), 2);
  gl.uniform2f(gl.getUniformLocation(prog, "u_res"), cv.width, cv.height);
  gl.uniform1f(gl.getUniformLocation(prog, "u_cell"), Math.max(1, opts.size));
  gl.uniform1f(gl.getUniformLocation(prog, "u_rough"), Math.min(1, Math.max(0, opts.roughness / 100)));
  gl.uniform1f(gl.getUniformLocation(prog, "u_opacity"), Math.min(1, Math.max(0, opts.opacity / 100)));
  gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, tb); gl.enableVertexAttribArray(tc); gl.vertexAttribPointer(tc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  const px = new Uint8Array(cv.width * cv.height * 4);
  gl.readPixels(0, 0, cv.width, cv.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return new ImageData(new Uint8ClampedArray(px), cv.width, cv.height);
}
let grainToken = 0;
function applyGrain() {
  const my = ++grainToken;
  requestAnimationFrame(() => {
    if (my !== grainToken) return;
    try { drawingContext.putImageData(grainPass(document.getElementById("defaultCanvas0"), { size: w("grainSize") || 1, roughness: window._VALUES.grainRoughness ?? 100, opacity: window._VALUES.grainOpacity ?? 15 }), 0, 0); } catch (e) { console.warn(e); }
  });
}

// Ray/circle reflection
const hit = (o, ang, c) => {
  const x1 = o.x, y1 = o.y, x2 = o.x + cos(ang), y2 = o.y + sin(ang), cx = c.x, cy = c.y, r = c.r / 4;
  const dx = x2 - x1, dy = y2 - y1, fx = x1 - cx, fy = y1 - cy;
  const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - r * r;
  let disc = B * B - 4 * A * C;
  if (disc >= 0) {
    disc = sqrt(disc);
    const t1 = (-B - disc) / (2 * A), t2 = (-B + disc) / (2 * A);
    if (t1 >= 0 && t2 <= 1) {
      const p = { x: x1 + t1 * dx, y: y1 + t1 * dy }, n = { x: (p.x - cx) / r, y: (p.y - cy) / r };
      const inc = atan2(dy, dx);
      return { x: p.x, y: p.y, angle: 2 * atan2(n.y, n.x) - inc + PI, dist: dist(o.x, o.y, p.x, p.y) };
    } else if (t1 <= 0 && t2 >= 1) {
      const p = { x: x1 + t2 * dx, y: y1 + t2 * dy }, n = { x: (p.x - cx) / r, y: (p.y - cy) / r };
      const inc = atan2(dy, dx);
      return { x: p.x, y: p.y, angle: 2 * atan2(n.y, n.x) - inc, dist: dist(o.x, o.y, p.x, p.y) };
    }
  }
  return null;
};
const traceRay = (origin, ang, circles) => {
  const segs = [], ints = [], slip = w("intSlippagePct") / 100, ecc = w("rayOriginEccentricityPct") / 100;
  let done = false, n = 0;
  const off = abs(randomGaussian(0, ecc));
  let p = { x: origin.x + cos(ang) * off, y: origin.y + sin(ang) * off };
  let end = { x: p.x + cos(ang) * 2, y: p.y + sin(ang) * 2 };
  while (!done && n++ < 10) {
    let hits = [];
    circles.forEach(c => { if (slip > 0 && random() < slip) return; const h = hit(p, ang, c); if (h) hits.push({ intersection: h, c, originID: c.ID }); });
    if (!hits.length) { done = true; segs.push([p, end]); }
    else {
      hits.sort((a, b) => a.intersection.dist - b.intersection.dist);
      const { intersection: h, originID } = hits[0];
      h.originID = originID; segs.push([p, h]); ints.push(h);
      p = h; ang = h.angle; end = { x: p.x + cos(h.angle) * 2, y: p.y + sin(h.angle) * 2 };
    }
  }
  return { segments: segs, intersections: ints };
};
const reseed = () => { randomSeed(window._SEED); noiseSeed(window._SEED); };
const buildScene = () => {
  const circles = [], n = w("numCircles"), coll = w("useCollisionDetectionOnElements"), nOrig = w("numRayOrigins");
  // Radii are entered in pixels (at Zoom 1); the scene works in canvas fractions where drawn radius = r * max(w,h) / 4.
  const md = max(width, height);
  let lo = w("minCircleRadiusPx") * 4 / md * 100, hi = w("maxCircleRadiusPx") * 4 / md * 100, tries = 0, origins = [];
  if (lo > hi) [lo, hi] = [hi, lo];
  while (circles.length < n && tries++ < 1000) {
    const c = { x: random(1), y: random(1), r: random(lo, hi) / 100, ID: Symbol() };
    let bad = false;
    for (const o of circles) { if (coll && dist(c.x, c.y, o.x, o.y) < c.r / 2 + o.r / 2) { bad = true; break; } }
    if (!bad) circles.push(c);
  }
  reseed(); random(); tries = 0;
  const type = w("rayOriginType");
  while (type === "random" && origins.length < nOrig && tries++ < 1000) {
    const x = random(1), y = random(1); let ok = true;
    for (const c of circles) { if (coll && dist(x, y, c.x, c.y) < c.r) { ok = false; break; } }
    if (ok) origins.push({ x, y });
  }
  if (type === "center") origins = [{ x: .5, y: .5 }];
  let rays = [], ints = [];
  const ecc = w("rayAngleEccentricityPct") / 100 * 2; // 100% = ±2 radians of jitter, the original maximum
  origins.forEach(o => {
    const step = TWO_PI / constrain(round(w("numRays")) || 1, 1, MAX_VECTORS);
    for (let a = 0; a < TWO_PI; a += step) { const r = traceRay(o, a + random(-ecc, ecc), circles); rays.push(r.segments); ints = ints.concat(r.intersections); }
  });
  return { circles, rays, rayOrigins: origins, intersections: ints };
};

// ---------- Preview zoom (display only; saved image stays full size) ----------
const ZOOMS = [.1, .15, .25, .33, .5, .67, .75, 1, 1.25, 1.5, 2, 3, 4];
let viewMode = "fit", viewScale = 1;
const fitScale = () => {
  const st = document.getElementById("stage");
  const pad = 64; // room around the canvas so its shadow is not clipped
  return Math.max(.05, Math.min(1, (st.clientWidth - pad) / width, (st.clientHeight - pad) / height));
};
function applyView() {
  const cv = document.getElementById("defaultCanvas0");
  if (!cv) return;
  if (viewMode === "fit") viewScale = fitScale();
  cv.style.width = Math.round(width * viewScale) + "px";
  cv.style.height = Math.round(height * viewScale) + "px";
  document.getElementById("zoomPct").textContent = Math.round(viewScale * 100) + "%";
  document.getElementById("zoomFit").setAttribute("aria-pressed", viewMode === "fit");
}
const stepZoom = dir => {
  const cur = viewScale;
  const next = dir > 0 ? ZOOMS.find(z => z > cur + 1e-3) : [...ZOOMS].reverse().find(z => z < cur - 1e-3);
  if (next) { viewMode = "manual"; viewScale = next; applyView(); }
};
document.getElementById("zoomIn").onclick = () => stepZoom(1);
document.getElementById("zoomOut").onclick = () => stepZoom(-1);
document.getElementById("zoomFit").onclick = () => { viewMode = "fit"; applyView(); };
document.getElementById("zoom100").onclick = () => { viewMode = "manual"; viewScale = 1; applyView(); };
window.addEventListener("resize", () => { if (viewMode === "fit") applyView(); });
document.addEventListener("keydown", e => {
  if (!modal.hidden || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey) return;
  if (e.key === "+" || e.key === "=") stepZoom(1);
  else if (e.key === "-") stepZoom(-1);
  else if (e.key === "0") { viewMode = "fit"; applyView(); }
});

let mouseHeld = false, pending = null;
const scheduleFull = () => { clearTimeout(pending); pending = setTimeout(() => window.draw(), 350); };
window.setup = () => {
  const { width: cw, height: ch } = w("canvasSize");
  createCanvas(cw, ch).parent("stage");
  blendMode(BLEND);
  window._p5ready = true;
  applyView();
  document.querySelector(".stage-wrap").addEventListener("pointerdown", () => mouseHeld = true);
  document.addEventListener("pointerup", () => mouseHeld = false);
};
window.draw = () => {
  if (mouseHeld) { scheduleFull(); return; }
  const { width: cw, height: ch } = w("canvasSize");
  if (cw !== width || ch !== height) resizeCanvas(cw, ch);
  reseed(); noFill(); strokeWeight(1); background(w("bgColor"));
  render(buildScene(), false);
  if (w("usefilmGrain")) applyGrain();
  noLoop(); clearTimeout(pending);
  applyView();
};
window._FORCEQUICKDRAW = () => requestAnimationFrame(() => {
  if (!window._p5ready) return;
  const { width: cw, height: ch } = w("canvasSize");
  if (cw !== width || ch !== height) resizeCanvas(cw, ch);
  applyView();
  reseed(); background(w("bgColor")); render(buildScene(), true); scheduleFull();
});
