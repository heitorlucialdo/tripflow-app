import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../public/favicon.svg", import.meta.url));
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

await sharp(svg).resize(192, 192).png().toFile(out("icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(out("icon-512.png"));

// maskable: fundo cheio + conteúdo dentro da zona segura de 80%
const inner = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#070d22" } })
  .composite([{ input: inner, top: 56, left: 56 }])
  .png()
  .toFile(out("maskable-512.png"));

await sharp({ create: { width: 180, height: 180, channels: 4, background: "#070d22" } })
  .composite([{ input: await sharp(svg).resize(180, 180).png().toBuffer() }])
  .png()
  .toFile(out("apple-touch-icon.png"));

console.log("icons ok");
