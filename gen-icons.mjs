import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import path from "path";

const root = process.cwd();
const svg = readFileSync(path.join(root, "public", "icon.svg"));
const dir = path.join(root, "public", "icons");
mkdirSync(dir, { recursive: true });

const jobs = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of jobs) {
  await sharp(svg).resize(size, size).png().toFile(path.join(dir, name));
  console.log("wrote", name, size);
}
