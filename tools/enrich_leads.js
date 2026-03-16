#!/usr/bin/env node
/**
 * enrich_leads.js — Bahko Byrå Lead Enrichment
 *
 * Finds decision-maker emails for leads with generic addresses (info@, kontakt@, etc.)
 * Sources:
 *   1. Apollo.io People Search (primary)
 *   2. Firecrawl website scraping (fallback)
 *
 * Output: data/leads_enriched.json (never overwrites data/leads.json)
 *         .tmp/enrichment_report.json
 *
 * Usage:
 *   node tools/enrich_leads.js            # Enrich all generic-email leads
 *   node tools/enrich_leads.js --dry-run  # Show which leads would be processed
 *   node tools/enrich_leads.js --status   # Show enrichment stats
 *   node tools/enrich_leads.js --from-id=20  # Resume from lead ID 20
 *   node tools/enrich_leads.js --id=5     # Enrich a single lead
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
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

const APOLLO_API_KEY    = process.env.APOLLO_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// ── PATHS ──────────────────────────────────────────────────────────────────
const LEADS_PATH    = join(ROOT, 'data', 'leads.json');
const ENRICHED_PATH = join(ROOT, 'data', 'leads_enriched.json');
const REPORT_PATH   = join(ROOT, '.tmp', 'enrichment_report.json');

// ── GENERIC EMAIL DETECTION ────────────────────────────────────────────────
const GENERIC_PREFIXES = [
  'info', 'kontakt', 'contact', 'hello', 'hej', 'hi', 'post', 'reception',
  'booking', 'bokning', 'admin', 'support', 'service', 'mail', 'hej',
  'kundservice', 'kund', 'verksamhet', 'goteborg', 'stockholm', 'malmo',
  'linkoping', 'vasteras', 'orebro', 'helsingborg', 'jonkoping', 'norrkoping',
  'umea', 'lulea', 'gavle', 'eskilstuna', 'sundsvall', 'vastmanland',
  'plastikkirurgi', 'estetik', 'clinic', 'klinik', 'office', 'kontor'
];

const DECISION_TITLES = [
  'VD', 'ägare', 'owner', 'CEO', 'COO', 'founder', 'co-founder',
  'klinikchef', 'klinikansvarig', 'medical director', 'verksamhetschef',
  'läkare', 'plastikkirurg', 'kirurg', 'chef', 'partner', 'managing director',
  'director', 'head', 'principal'
];

function isGenericEmail(email) {
  if (!email) return true;
  const local = email.split('@')[0].toLowerCase();
  return GENERIC_PREFIXES.some(p => local === p || local.startsWith(p + '.') || local.startsWith(p + '_'));
}

// ── APOLLO API ─────────────────────────────────────────────────────────────
async function apolloSearch(domain) {
  if (!APOLLO_API_KEY) return null;

  const body = {
    page: 1,
    per_page: 5,
    q_organization_domains: [domain],
    person_titles: DECISION_TITLES
  };

  try {
    const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      // Rate limited
      if (res.status === 429) {
        console.warn('  ⚠ Apollo rate limit hit — waiting 10s...');
        await sleep(10000);
      }
      return null;
    }

    const data = await res.json();
    const people = data.people || [];

    // Find first person with a revealed (non-masked) email
    for (const person of people) {
      const email = person.email;
      if (email && !email.includes('*') && !isGenericEmail(email)) {
        return {
          enriched_email:      email,
          enriched_name:       person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
          enriched_title:      person.title || '',
          enriched_source:     'apollo',
          enriched_linkedin:   person.linkedin_url || null,
          enriched_confidence: 'high'
        };
      }
    }

    // No revealed email — but maybe we have a name + domain (medium confidence guess)
    const best = people[0];
    if (best && best.first_name && best.last_name) {
      // Return name/title but no email (will fall through to Firecrawl)
      return {
        _apollo_name:  `${best.first_name} ${best.last_name}`.trim(),
        _apollo_title: best.title || '',
        _apollo_linkedin: best.linkedin_url || null
      };
    }

    return null;
  } catch (e) {
    console.warn(`  ⚠ Apollo error: ${e.message}`);
    return null;
  }
}

// ── FIRECRAWL API ──────────────────────────────────────────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

async function firecrawlScrape(url) {
  if (!FIRECRAWL_API_KEY) return null;

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({ url, formats: ['markdown'] })
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.markdown || data?.markdown || null;
  } catch (e) {
    return null;
  }
}

function extractPersonalEmails(markdown, domain) {
  if (!markdown) return [];
  const found = [...new Set(markdown.match(EMAIL_REGEX) || [])];
  return found.filter(e => {
    const local = e.split('@')[0].toLowerCase();
    // Must be on the same domain (or close), not a generic prefix
    const sameDomain = e.toLowerCase().includes(domain.replace('www.', '').split('.')[0]);
    return !isGenericEmail(e) && sameDomain;
  });
}

async function firecrawlFindEmail(domain, apolloHint) {
  const paths = ['/kontakt', '/om-oss', '/om-kliniken', '/team', '/vara-lakare', '/kontakta-oss'];
  const base = `https://${domain}`;

  for (const path of paths) {
    const md = await firecrawlScrape(base + path);
    if (!md) continue;

    // Try personal emails from the page
    const personal = extractPersonalEmails(md, domain);
    if (personal.length > 0) {
      return {
        enriched_email:      personal[0],
        enriched_name:       apolloHint?._apollo_name || null,
        enriched_title:      apolloHint?._apollo_title || null,
        enriched_source:     'firecrawl',
        enriched_linkedin:   apolloHint?._apollo_linkedin || null,
        enriched_confidence: apolloHint?._apollo_name ? 'medium' : 'low'
      };
    }
    await sleep(300);
  }

  // If Apollo gave us a name but no email, return that with confidence "low"
  if (apolloHint?._apollo_name) {
    return {
      enriched_email:      null,
      enriched_name:       apolloHint._apollo_name,
      enriched_title:      apolloHint._apollo_title || null,
      enriched_source:     'apollo_name_only',
      enriched_linkedin:   apolloHint._apollo_linkedin || null,
      enriched_confidence: 'low'
    };
  }

  return null;
}

// ── ENRICH A SINGLE LEAD ───────────────────────────────────────────────────
async function enrichLead(lead, dryRun) {
  const domain = lead.webbplats.replace(/^https?:\/\//, '').replace(/\/$/, '');

  if (dryRun) {
    console.log(`  [DRY-RUN] Would enrich: ${lead.namn} (${domain})`);
    return null;
  }

  process.stdout.write(`  #${String(lead.id).padStart(2)} ${lead.namn.padEnd(38)} `);

  // Step 1: Apollo
  const apolloResult = await apolloSearch(domain);
  await sleep(200);

  if (apolloResult && apolloResult.enriched_email) {
    console.log(`✓ Apollo   → ${apolloResult.enriched_name} <${apolloResult.enriched_email}>`);
    return { ...apolloResult, enriched_date: today() };
  }

  // Step 2: Firecrawl (with apollo name hint if available)
  const fcResult = await firecrawlFindEmail(domain, apolloResult);
  await sleep(500);

  if (fcResult && fcResult.enriched_email) {
    console.log(`✓ Firecrawl → ${fcResult.enriched_name || '?'} <${fcResult.enriched_email}>`);
    return { ...fcResult, enriched_date: today() };
  }

  if (fcResult && fcResult.enriched_name) {
    console.log(`~ Name only → ${fcResult.enriched_name} (${fcResult.enriched_title || 'no title'})`);
    return { ...fcResult, enriched_date: today() };
  }

  console.log(`✗ Not found`);
  return { enriched_source: null, enriched_email: null, enriched_name: null, enriched_confidence: null, enriched_date: today() };
}

// ── HELPERS ────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function loadEnrichedLeads() {
  if (!existsSync(ENRICHED_PATH)) return null;
  try { return JSON.parse(readFileSync(ENRICHED_PATH, 'utf8')); }
  catch { return null; }
}

function saveEnrichedLeads(leads) {
  const dataDir = join(ROOT, 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(ENRICHED_PATH, JSON.stringify(leads, null, 2), 'utf8');
}

function saveReport(results) {
  const tmpDir = join(ROOT, '.tmp');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2), 'utf8');
}

// ── STATUS ─────────────────────────────────────────────────────────────────
function showStatus() {
  const original = JSON.parse(readFileSync(LEADS_PATH, 'utf8'));
  const enriched = loadEnrichedLeads();

  if (!enriched) {
    console.log('⚠ leads_enriched.json not found. Run enrichment first.');
    return;
  }

  let apollo = 0, fc = 0, nameOnly = 0, notFound = 0, skipped = 0;
  for (const lead of enriched) {
    if (!isGenericEmail(original.find(l => l.id === lead.id)?.email || '')) {
      skipped++;
    } else if (!lead.enriched_source) {
      notFound++;
    } else if (lead.enriched_source === 'apollo') {
      apollo++;
    } else if (lead.enriched_source === 'firecrawl') {
      fc++;
    } else if (lead.enriched_source === 'apollo_name_only') {
      nameOnly++;
    }
  }

  const total = enriched.length;
  console.log('\n═══════════════════════════════════════════════');
  console.log('  BAHKO BYRÅ — Lead Enrichment Status');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Totalt leads:              ${total}`);
  console.log(`  ✅ Enriched via Apollo:    ${apollo}  (${pct(apollo, total)}%)`);
  console.log(`  ✅ Enriched via Firecrawl: ${fc}  (${pct(fc, total)}%)`);
  console.log(`  ~ Namn hittad (ej mejl):   ${nameOnly}  (${pct(nameOnly, total)}%)`);
  console.log(`  ✗ Ej hittad:               ${notFound}  (${pct(notFound, total)}%)`);
  console.log(`  ⏭ Redan personlig mejl:    ${skipped}  (${pct(skipped, total)}%)`);
  console.log('───────────────────────────────────────────────');

  // List enriched leads
  const enrichedList = enriched.filter(l => l.enriched_email);
  if (enrichedList.length > 0) {
    console.log('\n  Enriched leads med personlig mejl:');
    for (const l of enrichedList) {
      console.log(`  #${String(l.id).padStart(2)} ${l.namn.padEnd(35)} ${l.enriched_name?.padEnd(25) || '?'.padEnd(25)} ${l.enriched_email}`);
    }
  }
  console.log('═══════════════════════════════════════════════\n');
}

function pct(n, total) {
  return total ? Math.round((n / total) * 100) : 0;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  const args     = process.argv.slice(2);
  const dryRun   = args.includes('--dry-run');
  const statusOnly = args.includes('--status');
  const fromId   = parseInt(args.find(a => a.startsWith('--from-id='))?.split('=')[1] || '0', 10);
  const singleId = parseInt(args.find(a => a.startsWith('--id='))?.split('=')[1] || '0', 10);

  if (statusOnly) {
    showStatus();
    return;
  }

  if (!APOLLO_API_KEY && !FIRECRAWL_API_KEY) {
    console.error('✗ APOLLO_API_KEY och/eller FIRECRAWL_API_KEY saknas i .env');
    process.exit(1);
  }

  const original = JSON.parse(readFileSync(LEADS_PATH, 'utf8'));

  // Load or clone enriched leads
  let enriched = loadEnrichedLeads() || original.map(l => ({ ...l }));

  // Determine which leads to process
  let toProcess = enriched.filter(l => isGenericEmail(l.email));
  if (singleId) {
    toProcess = toProcess.filter(l => l.id === singleId);
    if (toProcess.length === 0) {
      const lead = enriched.find(l => l.id === singleId);
      if (lead) {
        console.log(`Lead #${singleId} (${lead.namn}) har redan personlig e-post: ${lead.email}`);
        return;
      }
      console.error(`Lead #${singleId} hittades inte.`);
      return;
    }
  } else if (fromId > 0) {
    toProcess = toProcess.filter(l => l.id >= fromId);
  }

  // Skip already enriched unless re-running single
  if (!singleId) {
    toProcess = toProcess.filter(l => !l.enriched_source);
  }

  console.log(`\n🔍 Bahko Byrå — Lead Enrichment ${dryRun ? '[DRY-RUN]' : ''}`);
  console.log(`   APIs:      ${APOLLO_API_KEY ? 'Apollo ✓' : 'Apollo ✗'}  ${FIRECRAWL_API_KEY ? 'Firecrawl ✓' : 'Firecrawl ✗'}`);
  console.log(`   Att berika: ${toProcess.length} leads (av ${enriched.filter(l => isGenericEmail(l.email)).length} med generisk e-post)`);
  if (fromId) console.log(`   Startar från ID: ${fromId}`);
  console.log('─────────────────────────────────────────────────\n');

  let apolloCount = 0, fcCount = 0, nameCount = 0, notFound = 0;

  for (const lead of toProcess) {
    const result = await enrichLead(lead, dryRun);

    if (!dryRun && result) {
      // Merge enrichment data into the enriched leads array
      const idx = enriched.findIndex(l => l.id === lead.id);
      if (idx !== -1) {
        enriched[idx] = { ...enriched[idx], ...result };
      }

      if (result.enriched_source === 'apollo')            apolloCount++;
      else if (result.enriched_source === 'firecrawl')    fcCount++;
      else if (result.enriched_source === 'apollo_name_only') nameCount++;
      else notFound++;

      // Save progress after each lead (so --from-id can resume)
      saveEnrichedLeads(enriched);
    }
  }

  if (!dryRun) {
    const report = {
      date: today(),
      total_leads: enriched.length,
      generic_emails: enriched.filter(l => isGenericEmail(l.email)).length,
      enriched_apollo: apolloCount,
      enriched_firecrawl: fcCount,
      name_only: nameCount,
      not_found: notFound
    };
    saveReport(report);

    console.log('\n─────────────────────────────────────────────────');
    console.log(`  ✅ Apollo:     ${apolloCount}`);
    console.log(`  ✅ Firecrawl:  ${fcCount}`);
    console.log(`  ~  Namn:       ${nameCount}`);
    console.log(`  ✗  Ej funnen:  ${notFound}`);
    console.log(`\n  Sparat → data/leads_enriched.json`);
    showStatus();
  }
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
