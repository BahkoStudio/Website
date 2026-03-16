#!/usr/bin/env node
/**
 * remove_bg.js — Ta bort bakgrund från logotyp
 *
 * Använder remove.bg API (gratis 50 bilder/mån på remove.bg/api)
 *
 * Krav:
 *   1. Skapa gratis konto på https://www.remove.bg/api
 *   2. Kopiera API-nyckeln och lägg till i .env:
 *      REMOVE_BG_KEY=din-nyckel-här
 *   3. Spara originalloggan som: brand/logo_original.png
 *
 * Kör: node tools/remove_bg.js
 * Output: brand/logo_nobg.png  (transparent bakgrund)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── LOAD .env ──────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#') && v.length) process.env[k.trim()] ??= v.join('=').trim();
  });
}
loadEnv();

const REMOVE_BG_KEY = process.env.REMOVE_BG_KEY;
const INPUT_PATH    = join(ROOT, 'brand', 'logo_original.png');
const OUTPUT_PATH   = join(ROOT, 'brand', 'logo_nobg.png');

async function main() {
  console.log('\n🎨 Bahko Byrå — Bakgrundsborttagning\n');

  // Check API key
  if (!REMOVE_BG_KEY) {
    console.error('✗ REMOVE_BG_KEY saknas i .env');
    console.log('\nSå här gör du:');
    console.log('  1. Gå till https://www.remove.bg/api och skapa gratis konto');
    console.log('  2. Kopiera din API-nyckel');
    console.log('  3. Lägg till i .env: REMOVE_BG_KEY=din-nyckel');
    console.log('  4. Kör igen: node tools/remove_bg.js\n');
    process.exit(1);
  }

  // Check input file
  if (!existsSync(INPUT_PATH)) {
    console.error(`✗ Hittade inte: brand/logo_original.png`);
    console.log('\nSpara din logga-bild som: brand/logo_original.png');
    console.log('Stöder: PNG, JPG, WebP\n');
    process.exit(1);
  }

  console.log(`📂 Läser: brand/logo_original.png`);

  // Read file
  const imageBuffer = readFileSync(INPUT_PATH);
  const blob = new Blob([imageBuffer], { type: 'image/png' });

  // Build form data
  const formData = new FormData();
  formData.append('image_file', blob, 'logo.png');
  formData.append('size', 'auto');        // auto = highest quality free tier
  formData.append('type', 'auto');        // auto-detect subject
  formData.append('format', 'png');       // always output PNG for transparency
  formData.append('crop', 'false');       // keep original dimensions

  console.log('⏳ Skickar till remove.bg...');

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': REMOVE_BG_KEY },
    body: formData
  });

  // Check for errors
  if (!res.ok) {
    let errText = '';
    try { const d = await res.json(); errText = d.errors?.[0]?.title || JSON.stringify(d); }
    catch { errText = await res.text(); }

    if (res.status === 402) {
      console.error('✗ Gratis API-krediter slut. Uppgradera på remove.bg/pricing eller vänta till nästa månad.');
    } else if (res.status === 403) {
      console.error('✗ Ogiltig API-nyckel. Kontrollera REMOVE_BG_KEY i .env');
    } else {
      console.error(`✗ API-fel (${res.status}): ${errText}`);
    }
    process.exit(1);
  }

  // Check credits header
  const creditsCharged = res.headers.get('X-Credits-Charged');
  const creditsTotal   = res.headers.get('X-Credits-Remaining');

  // Save output
  const arrayBuffer = await res.arrayBuffer();
  writeFileSync(OUTPUT_PATH, Buffer.from(arrayBuffer));

  console.log(`\n✓ Sparad: brand/logo_nobg.png`);
  if (creditsCharged)  console.log(`  Krediter använt: ${creditsCharged}`);
  if (creditsTotal)    console.log(`  Krediter kvar:   ${creditsTotal}`);
  console.log('\nLoggan används automatiskt i index.html och rapporter.\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
