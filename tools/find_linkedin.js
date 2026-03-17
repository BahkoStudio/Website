#!/usr/bin/env node
/**
 * find_linkedin.js — Hitta LinkedIn-profiler för klinikbeslutsfattare
 *
 * Söker via SerpAPI: site:linkedin.com/in "[kliniknamn]" ägare OR VD OR grundare
 * Sparar till .tmp/linkedin_data.json
 *
 * Användning:
 *   node tools/find_linkedin.js             # Sök alla leads
 *   node tools/find_linkedin.js --dry-run   # Simulera utan API-anrop
 *   node tools/find_linkedin.js --from-id=10 # Fortsätt från lead 10
 *   node tools/find_linkedin.js --status    # Visa nuläge
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnv() {
  const p = join(ROOT, '.env');
  if (!existsSync(p)) return;
  readFileSync(p, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#') && v.length) process.env[k.trim()] ??= v.join('=').trim();
  });
}
loadEnv();

const LEADS_PATH   = join(ROOT, 'data', 'leads.json');
const OUTPUT_PATH  = join(ROOT, '.tmp', 'linkedin_data.json');
const SERPAPI_KEY  = process.env.SERPAPI_KEY;
const DELAY_MS     = 2200; // ~27 req/min, well within SerpAPI limits

const args        = process.argv.slice(2);
const DRY_RUN     = args.includes('--dry-run');
const SHOW_STATUS = args.includes('--status');
const FROM_ID     = (() => { const a = args.find(a => a.startsWith('--from-id=')); return a ? parseInt(a.split('=')[1]) : 0; })();

const LEADS = JSON.parse(readFileSync(LEADS_PATH, 'utf8'));

function loadData() {
  if (!existsSync(OUTPUT_PATH)) return {};
  try { return JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')); } catch { return {}; }
}

function saveData(data) {
  const dir = join(ROOT, '.tmp');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8');
}

async function serpSearch(query) {
  const params = new URLSearchParams({
    q: query,
    api_key: SERPAPI_KEY,
    hl: 'sv',
    gl: 'se',
    num: '5',
  });
  const res = await fetch(`https://serpapi.com/search?${params}`);
  if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);
  const data = await res.json();
  return (data.organic_results || []);
}

function extractLinkedInProfile(results) {
  for (const r of results) {
    const url = r.link || '';
    // Must be a profile URL (not company page, not /pub/)
    if (/linkedin\.com\/in\/[^/]+\/?$/.test(url)) {
      return {
        url,
        name: extractNameFromTitle(r.title),
        title: extractTitleFromSnippet(r.snippet || r.title || ''),
      };
    }
  }
  return null;
}

function extractNameFromTitle(title) {
  // "Förnamn Efternamn - Ägare - Kliniknamn | LinkedIn" → "Förnamn Efternamn"
  return (title || '').split(/[-|]/)[0].replace(/\s+/g, ' ').trim() || null;
}

function extractTitleFromSnippet(text) {
  const roles = ['ägare', 'vd', 'grundare', 'klinikchef', 'verksamhetschef', 'owner', 'ceo', 'founder'];
  const lower = text.toLowerCase();
  for (const role of roles) {
    if (lower.includes(role)) return role.charAt(0).toUpperCase() + role.slice(1);
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── STATUS ──────────────────────────────────────────────────────────────────
if (SHOW_STATUS) {
  const data = loadData();
  const found    = Object.values(data).filter(v => v?.url).length;
  const notFound = Object.values(data).filter(v => v === null).length;
  const pending  = LEADS.length - found - notFound;
  console.log('\n═══════════════════════════════════════');
  console.log('  LinkedIn-profiler — Status');
  console.log('═══════════════════════════════════════');
  console.log(`  Totalt leads:   ${LEADS.length}`);
  console.log(`  ✅ Hittade:     ${found}`);
  console.log(`  ✗  Ej hittade:  ${notFound}`);
  console.log(`  ⏳ Ej sökt:     ${pending}`);
  console.log('───────────────────────────────────────');
  if (found > 0) {
    console.log('\n  Hittade profiler:');
    LEADS.forEach(l => {
      const d = data[l.id];
      if (d?.url) console.log(`  #${String(l.id).padEnd(2)} ${l.namn.padEnd(35)} ${d.name || '?'} — ${d.url}`);
    });
  }
  console.log('');
  process.exit(0);
}

// ── MAIN ────────────────────────────────────────────────────────────────────
if (!SERPAPI_KEY && !DRY_RUN) {
  console.error('✗ SERPAPI_KEY saknas i .env');
  process.exit(1);
}

const data = loadData();
const leads = LEADS.filter(l => l.id >= FROM_ID && data[l.id] === undefined);

console.log('\n🔍 Bahko Byrå — LinkedIn Profil-sökning');
console.log(`   SerpAPI: ${DRY_RUN ? 'DRY-RUN' : '✓'}`);
console.log(`   Att söka: ${leads.length} leads (av ${LEADS.length} totalt)`);
if (FROM_ID) console.log(`   Startad från lead #${FROM_ID}`);
console.log('─────────────────────────────────────────\n');

let found = 0, notFound = 0;

for (const lead of leads) {
  const query = `site:linkedin.com/in "${lead.namn}" ägare OR VD OR grundare OR klinikchef Sverige`;
  process.stdout.write(`  #${String(lead.id).padEnd(2)} ${lead.namn.padEnd(38)}`);

  if (DRY_RUN) {
    console.log(`[dry-run] "${query}"`);
    continue;
  }

  try {
    const results = await serpSearch(query);
    const profile = extractLinkedInProfile(results);

    if (profile) {
      data[lead.id] = { ...profile, searchDate: new Date().toISOString().slice(0, 10) };
      console.log(`✓ ${profile.name || '?'} — ${profile.url}`);
      found++;
    } else {
      data[lead.id] = null;
      console.log('✗ Ej hittad');
      notFound++;
    }

    saveData(data);
    await sleep(DELAY_MS);

  } catch (err) {
    console.log(`✗ Fel: ${err.message}`);
    data[lead.id] = null;
    saveData(data);
    await sleep(DELAY_MS);
  }
}

if (!DRY_RUN) {
  const totalFound = Object.values(data).filter(v => v?.url).length;
  console.log('\n─────────────────────────────────────────');
  console.log(`  ✅ Hittade denna körning: ${found}`);
  console.log(`  ✗  Ej hittade:            ${notFound}`);
  console.log(`  Totalt hittade:            ${totalFound} av ${LEADS.length}`);
  console.log(`\n  Sparat → .tmp/linkedin_data.json\n`);
}
