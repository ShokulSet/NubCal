# NubCal

A macro & nutrient tracking web app. Set your own nutrient targets, log meals, and
capture nutrition data three ways: barcode scan, OCR of a nutrition label, or AI
analysis of a meal photo.

## Core features

- **Custom nutrient targets** — user-defined goals (calories, protein, carbs, fat, and
  any additional micronutrients the user wants to track).
- **Meal logging** — add your own meals/foods to a personal database.
- **Barcode scan** — look up a product by barcode.
- **OCR fallback** — if no barcode (or no match), OCR the product's nutrition label.
- **AI meal analysis** — take a photo of a meal and have AI estimate its nutrients,
  then save the result to the database.

## Tech stack

- **Frontend:** Next.js (App Router), Claude-assisted frontend design
- **Database / Auth:** Supabase (Postgres + Auth + Storage as needed)
- **Hosting:** Vercel
- **Cloud / AI:** Google Cloud Platform (GCP)
  - **GCS** — image storage (meal photos, label scans)
  - **Vertex AI** — meal photo analysis, OCR / nutrient extraction

## Status

Greenfield. Project brief captured; implementation plan to follow.
