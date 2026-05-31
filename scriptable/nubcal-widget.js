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

const PAPER = new Color("#f5efe4");
const SURFACE = new Color("#fffdf8");
const INK = new Color("#221d15");
const MUTED = new Color("#8c8472");

function num(n) {
  return n == null ? "—" : Math.round(n).toString();
}

async function load() {
  const r = new Request(WIDGET_URL);
  r.timeoutInterval = 12;
  return await r.loadJSON();
}

const widget = new ListWidget();
widget.backgroundColor = Device.isUsingDarkAppearance() ? new Color("#1e1a13") : PAPER;
widget.setPadding(14, 16, 14, 16);
widget.url = "https://nubcal.vercel.app/today"; // tap opens the app

try {
  const data = await load();
  if (!data || data.error) throw new Error(data && data.error ? data.error : "no data");
  const items = data.items || [];
  const cal = items.find((i) => i.is_energy);
  const macros = items.filter((i) => !i.is_energy).slice(0, 3);
  const ink = Device.isUsingDarkAppearance() ? new Color("#efe6d5") : INK;

  const head = widget.addStack();
  const title = head.addText("NubCal");
  title.font = Font.semiboldSystemFont(12);
  title.textColor = ink;
  head.addSpacer();
  const day = head.addText("Today");
  day.font = Font.mediumSystemFont(10);
  day.textColor = MUTED;

  widget.addSpacer(10);

  if (cal) {
    const row = widget.addStack();
    row.bottomAlignContent();
    const big = row.addText(num(cal.total));
    big.font = Font.boldSystemFont(36);
    big.textColor = new Color(cal.color);
    row.addSpacer(6);
    const sub = row.addText(cal.target ? `/ ${num(cal.target)} kcal` : "kcal");
    sub.font = Font.mediumSystemFont(12);
    sub.textColor = MUTED;
    sub.leftAlignText();
  }

  widget.addSpacer(10);

  for (const m of macros) {
    const row = widget.addStack();
    const name = row.addText(m.label);
    name.font = Font.systemFont(11);
    name.textColor = ink;
    row.addSpacer();
    const val = row.addText(
      `${num(m.total)}${m.target ? ` / ${num(m.target)}` : ""} ${m.unit}`,
    );
    val.font = Font.mediumSystemFont(11);
    val.textColor = new Color(m.color);
    widget.addSpacer(4);
  }
} catch (e) {
  const t = widget.addText("Couldn't load NubCal");
  t.font = Font.mediumSystemFont(12);
  t.textColor = INK;
  widget.addSpacer(4);
  const s = widget.addText(String(e));
  s.font = Font.systemFont(9);
  s.textColor = MUTED;
}

// Ask iOS to refresh roughly every 30 minutes.
widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
