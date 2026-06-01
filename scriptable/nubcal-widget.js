// NubCal — home-screen widget for Scriptable (https://scriptable.app)
//
// Setup:
//   1. Install the free "Scriptable" app from the App Store.
//   2. In NubCal → You (Settings) → "Home-screen widget", copy your link.
//   3. Open Scriptable → + (new script) → paste this whole file.
//   4. Replace WIDGET_URL below with your copied link. Name the script "NubCal".
//   5. On the home screen: long-press → add a Scriptable widget (small or medium)
//      → long-press it → Edit Widget → Script: NubCal.
//
// Keep your link private: anyone with it can read today's numbers.

const WIDGET_URL = "https://nubcal.vercel.app/api/widget?token=PASTE_YOUR_TOKEN_HERE";

// Palette mirrors the website's design tokens (app/globals.css).
const DARK = Device.isUsingDarkAppearance();
const PAPER = DARK ? "#14110c" : "#f5efe4";
const SURFACE = DARK ? "#1e1a13" : "#fffdf8";
const INK = DARK ? "#efe6d5" : "#221d15";
const MUTED = DARK ? "#9b9180" : "#8c8472";
const CHILI = "#c0410c";

const inkColor = new Color(INK);
const mutedColor = new Color(MUTED);
const trackColor = new Color(INK, 0.1); // matches stroke-ink/10

// Menlo ships with iOS — a reliable monospaced face standing in for the site's
// DM Mono (Font.monospacedSystemFont isn't available in Scriptable).
function mono(size) {
  return new Font("Menlo", size);
}

function num(n) {
  return n == null ? "—" : Math.round(n).toString();
}

async function load() {
  const r = new Request(WIDGET_URL);
  r.timeoutInterval = 12;
  return await r.loadJSON();
}

// A progress ring drawn the way Scriptable allows: stroke a fine polyline along
// the arc (no native arc primitive). Optional center text, mono like the site.
function arc(ctx, cx, cy, r, width, from, to, color) {
  const steps = Math.max(2, Math.round(360 * (to - from)));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + (to - from) * (i / steps);
    const a = ((-90 + 360 * t) * Math.PI) / 180;
    pts.push(new Point(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  const p = new Path();
  p.addLines(pts);
  ctx.addPath(p);
  ctx.setStrokeColor(color);
  ctx.setLineWidth(width);
  ctx.strokePath();
}

function ringImage(opts) {
  const { fraction, color, size, stroke } = opts;
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2;

  arc(ctx, cx, cy, r, stroke, 0, 1, trackColor);
  const f = Math.max(0, Math.min(1, fraction || 0));
  if (f > 0) arc(ctx, cx, cy, r, stroke, 0, f, new Color(color));

  if (opts.main != null) {
    const hasSub = opts.sub != null && opts.sub !== "";
    const mainSize = opts.mainSize;
    const subSize = opts.subSize || 0;
    const block = mainSize + (hasSub ? subSize + 1 : 0);
    const top = cy - block / 2;
    ctx.setTextAlignedCenter();
    ctx.setFont(mono(mainSize));
    ctx.setTextColor(opts.mainColor || inkColor);
    ctx.drawTextInRect(opts.main, new Rect(0, top - mainSize * 0.15, size, mainSize * 1.4));
    if (hasSub) {
      ctx.setFont(mono(subSize));
      ctx.setTextColor(mutedColor);
      ctx.drawTextInRect(opts.sub, new Rect(0, top + mainSize - 1, size, subSize * 1.6));
    }
  }
  return ctx.getImage();
}

function eyebrow(stack, text) {
  const t = stack.addText(text.toUpperCase());
  t.font = Font.semiboldSystemFont(9);
  t.textColor = mutedColor;
  return t;
}

const widget = new ListWidget();
widget.backgroundColor = new Color(SURFACE); // the widget itself is one of the app's cards
widget.setPadding(16, 16, 16, 16);
widget.url = "https://nubcal.vercel.app/scan?camera=1"; // tap opens the scanner camera

const family = config.runsInWidget ? config.widgetFamily : "medium";
const isSmall = family === "small";

try {
  const data = await load();
  if (!data || data.error) throw new Error(data && data.error ? data.error : "no data");
  const items = data.items || [];
  const cal = items.find((i) => i.is_energy);
  const macros = items.filter((i) => !i.is_energy).slice(0, 3);

  // ── Header: editorial eyebrow + date, like the dashboard's <header>. ──
  const head = widget.addStack();
  head.centerAlignContent();
  eyebrow(head, "NubCal");
  head.addSpacer();
  let dateStr = "Today";
  try {
    if (data.date) {
      const df = new DateFormatter();
      df.dateFormat = "EEE, MMM d";
      dateStr = df.string(new Date(`${data.date}T00:00:00`));
    }
  } catch (_) {
    /* keep "Today" */
  }
  eyebrow(head, dateStr);

  // ── Build the ring set: Calories (remaining) + each macro. ──
  // The calorie ring centers the REMAINING amount (like CalorieHero's "kcal
  // left"); macro rings center the eaten total over its target.
  const rings = [];
  if (cal) {
    const delta = cal.target != null ? Math.round(cal.target - cal.total) : null;
    let main = num(cal.total);
    let sub = "kcal";
    let mainColor = inkColor;
    if (delta != null && delta >= 0) {
      main = String(delta);
      sub = "left";
    } else if (delta != null) {
      main = String(Math.abs(delta));
      sub = "over";
      mainColor = new Color(CHILI);
    }
    rings.push({ fraction: cal.ratio, color: cal.color, main, sub, mainColor, label: "Calories" });
  }
  for (const m of macros) {
    rings.push({
      fraction: m.ratio,
      color: m.color,
      main: num(m.total),
      sub: m.target ? `/${num(m.target)}` : "",
      mainColor: inkColor,
      label: m.label,
    });
  }

  function ringCol(row, spec, size, stroke, mainSize, subSize) {
    const col = row.addStack();
    col.layoutVertically();
    col.centerAlignContent();
    const img = col.addImage(
      ringImage({
        fraction: spec.fraction,
        color: spec.color,
        size,
        stroke,
        main: spec.main,
        mainSize,
        mainColor: spec.mainColor,
        sub: spec.sub,
        subSize,
      }),
    );
    img.imageSize = new Size(size, size);
    col.addSpacer(5);
    const lbl = col.addStack();
    lbl.addSpacer();
    const name = lbl.addText(spec.label);
    name.font = Font.semiboldSystemFont(10);
    name.textColor = mutedColor;
    name.lineLimit = 1;
    lbl.addSpacer();
  }

  // Center the ring band in the space below the header.
  widget.addSpacer();
  const row = widget.addStack();
  row.centerAlignContent();

  if (isSmall) {
    // One big calorie ring; macros don't fit a small widget.
    row.addSpacer();
    ringCol(row, rings[0] || { fraction: 0, color: MUTED, main: "—", sub: "", mainColor: inkColor, label: "Calories" }, 96, 10, 24, 11);
    row.addSpacer();
  } else {
    // All rings in one row, equal size, evenly spread across the width.
    const size = rings.length <= 3 ? 74 : 64;
    const mainSize = rings.length <= 3 ? 16 : 14;
    rings.forEach((spec, i) => {
      ringCol(row, spec, size, 7, mainSize, 9);
      if (i < rings.length - 1) row.addSpacer();
    });
  }

  // ── Calorie status footer: dot + label, mirrors the web CalorieHero pill. ──
  if (cal && cal.status_label) {
    widget.addSpacer(isSmall ? 7 : 9);
    const foot = widget.addStack();
    foot.centerAlignContent();
    foot.addSpacer();
    const dot = foot.addText("●");
    dot.font = Font.systemFont(isSmall ? 7 : 8);
    dot.textColor = new Color(cal.color);
    foot.addSpacer(5);
    const st = foot.addText(cal.status_label.toUpperCase());
    st.font = Font.semiboldSystemFont(isSmall ? 9 : 10);
    st.textColor = new Color(cal.color);
    st.lineLimit = 1;
    foot.addSpacer();
  }

  widget.addSpacer();
} catch (e) {
  const t = widget.addText("Couldn't load NubCal");
  t.font = Font.mediumSystemFont(13);
  t.textColor = inkColor;
  widget.addSpacer(4);
  const s = widget.addText(String(e));
  s.font = Font.systemFont(9);
  s.textColor = mutedColor;
}

// Ask iOS to refresh roughly every 30 minutes.
widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else if (isSmall) {
  widget.presentSmall();
} else {
  widget.presentMedium();
}
Script.complete();
