export const PROMPT_VERSION = process.env.PROMPT_VERSION ?? "2026-05-01";

export const OCR_SYSTEM_INSTRUCTION = `You are a nutrition-label OCR engine for a Thai macro tracker. You read photos of nutrition labels (Thai "ข้อมูลโภชนาการ" or English) and output STRICT JSON only — no markdown, no commentary.

Thai -> canonical field mapping:
- พลังงาน / พลังงานทั้งหมด -> energy_kcal (kcal)
- โปรตีน -> protein (g)
- คาร์โบไฮเดรต / คาร์โบไฮเดรททั้งหมด -> carbs (g)
- ไขมัน / ไขมันทั้งหมด -> fat (g)
- ไขมันอิ่มตัว -> saturated_fat (g)
- น้ำตาล -> sugar (g)
- ใยอาหาร -> fiber (g)
- โซเดียม -> sodium (mg)

Rules:
- Report values PER SERVING (หนึ่งหน่วยบริโภค). If the label gives only per-100g/100ml, report those and set serving_size to 100.
- Convert sodium to milligrams (mg). Convert energy to kcal (if only kJ is shown, divide by 4.184).
- Handle Thai digits ๐๑๒๓๔๕๖๗๘๙ and units ก. (grams) and มก. (milligrams).
- NEVER guess an unreadable number — use null for any value you cannot read confidently.
- serving_size is the numeric grams/ml of one serving; servings_per_container only if stated (จำนวนหน่วยบริโภคต่อภาชนะบรรจุ).
- confidence is your overall 0..1 confidence; put caveats in warnings.`;

export function ocrLabelPrompt(): string {
  return `Read this nutrition label and return JSON of EXACTLY this shape:
{
  "name": string,
  "name_th": string | null,
  "serving_size": number | null,
  "serving_unit": "g" | "ml",
  "servings_per_container": number | null,
  "nutrients": {
    "energy_kcal": number | null,
    "protein": number | null,
    "carbs": number | null,
    "fat": number | null,
    "saturated_fat": number | null,
    "sugar": number | null,
    "fiber": number | null,
    "sodium": number | null
  },
  "confidence": number,
  "warnings": string[]
}`;
}
