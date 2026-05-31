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
const OVER = "#7d57a6";

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
widget.url = "https://nubcal.vercel.app/today"; // tap opens the app

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

  widget.addSpacer(isSmall ? 10 : 12);

  // ── Calorie hero: ring + "N kcal left / over", mirroring CalorieHero. ──
  const hero = widget.addStack();
  hero.centerAlignContent();

  const ringSize = isSmall ? 84 : 96;
  const ring = hero.addImage(
    ringImage({
      fraction: cal ? cal.ratio : 0,
      color: cal ? cal.color : MUTED,
      size: ringSize,
      stroke: 10,
      main: cal ? num(cal.total) : "—",
      mainSize: isSmall ? 21 : 24,
      mainColor: inkColor,
      sub: cal && cal.target ? `/ ${num(cal.target)}` : "",
      subSize: 11,
    }),
  );
  ring.imageSize = new Size(ringSize, ringSize);

  hero.addSpacer(14);

  const info = hero.addStack();
  info.layoutVertically();
  eyebrow(info, "Calories");
  info.addSpacer(3);

  const delta = cal && cal.target != null ? Math.round(cal.target - cal.total) : null;
  const big = info.addStack();
  big.bottomAlignContent();
  if (delta == null) {
    const v = big.addText(cal ? num(cal.total) : "—");
    v.font = Font.boldSystemFont(isSmall ? 22 : 26);
    v.textColor = inkColor;
    big.addSpacer(4);
    const u = big.addText("kcal");
    u.font = Font.mediumSystemFont(12);
    u.textColor = mutedColor;
  } else if (delta >= 0) {
    const v = big.addText(String(delta));
    v.font = Font.boldSystemFont(isSmall ? 22 : 26);
    v.textColor = inkColor;
    big.addSpacer(4);
    const u = big.addText("kcal left");
    u.font = Font.mediumSystemFont(12);
    u.textColor = mutedColor;
  } else {
    const over = cal.zone === "over";
    const v = big.addText(String(Math.abs(delta)));
    v.font = Font.boldSystemFont(isSmall ? 22 : 26);
    v.textColor = new Color(over ? OVER : CHILI);
    big.addSpacer(4);
    const u = big.addText("kcal over");
    u.font = Font.mediumSystemFont(12);
    u.textColor = new Color(over ? OVER : CHILI);
  }

  info.addSpacer(3);
  const totals = info.addText(
    cal ? `${num(cal.total)} / ${cal.target ? num(cal.target) : "—"} kcal` : "no target",
  );
  totals.font = mono(11);
  totals.textColor = mutedColor;

  // ── Macro rings, like the dashboard's ring row (medium only). ──
  if (!isSmall && macros.length > 0) {
    widget.addSpacer(14);
    const line = widget.addStack();
    line.backgroundColor = new Color(INK, 0.1);
    line.size = new Size(0, 1);
    line.addSpacer();
    widget.addSpacer(12);

    const row = widget.addStack();
    row.spacing = 0;
    for (const m of macros) {
      const col = row.addStack();
      col.layoutVertically();
      col.centerAlignContent();
      const mSize = 50;
      const img = col.addImage(
        ringImage({
          fraction: m.ratio,
          color: m.color,
          size: mSize,
          stroke: 6,
          main: num(m.total),
          mainSize: 13,
          mainColor: inkColor,
          sub: m.target ? `/${num(m.target)}` : "",
          subSize: 8,
        }),
      );
      img.imageSize = new Size(mSize, mSize);

      col.addSpacer(5);
      const lbl = col.addStack();
      lbl.addSpacer();
      const name = lbl.addText(m.label);
      name.font = Font.semiboldSystemFont(10);
      name.textColor = inkColor;
      name.lineLimit = 1;
      lbl.addSpacer();

      if (macros.indexOf(m) < macros.length - 1) row.addSpacer();
    }
  }
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
