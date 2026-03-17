#!/usr/bin/env node
/**
 * outreach_manager.js — Bahko Byrå Email Automation
 *
 * Sequence per lead:
 *   Steg 1 (Dag 0):  Initialt utskick
 *   Steg 2 (Dag 3):  Uppföljning 1
 *   Steg 3 (Dag 5):  Uppföljning 2
 *   Steg 4 (Dag 7):  Sista uppföljningen
 *
 * Max 20 mejl per dag.
 * State sparas i .tmp/outreach_state.json
 *
 * Krav:
 *   .env med: FROM_EMAIL, FROM_NAME, SMTP_PASSWORD
 *
 * Användning:
 *   node tools/outreach_manager.js            # Kör utskick
 *   node tools/outreach_manager.js --dry-run  # Simulera utan att skicka
 *   node tools/outreach_manager.js --status   # Visa statistik
 *   node tools/outreach_manager.js --mark-replied=5   # Markera lead 5 som svarat
 *   node tools/outreach_manager.js --unsubscribe=12   # Avregistrera lead 12
 *   node tools/outreach_manager.js --reset=3          # Återställ lead 3 till start
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nodemailer from 'nodemailer';

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

const FROM_EMAIL     = process.env.FROM_EMAIL     || 'mathias@bahkobyra.se';
const FROM_NAME      = process.env.FROM_NAME      || 'Mathias Bahko';
const SMTP_PASSWORD  = process.env.SMTP_PASSWORD;
const MAX_PER_DAY    = parseInt(process.env.MAX_PER_DAY || '20', 10);
const LOOM_URL       = process.env.LOOM_URL       || null; // Valfritt: länk till Loom-video

const transporter = nodemailer.createTransport({
  host: 'send.one.com',
  port: 465,
  secure: true,
  auth: { user: FROM_EMAIL, pass: SMTP_PASSWORD }
});

// Days between steps (cumulative from step 1)
const STEP_DAYS = { 1: 0, 2: 3, 3: 5, 4: 7 };
const TOTAL_STEPS = 4;

// ── PATHS ──────────────────────────────────────────────────────────────────
const LEADS_PATH    = join(ROOT, 'data', 'leads.json');
const ENRICHED_PATH = join(ROOT, 'data', 'leads_enriched.json');
const STATE_PATH    = join(ROOT, '.tmp', 'outreach_state.json');

// ── LOAD DATA ──────────────────────────────────────────────────────────────
// Prefer enriched leads (decision-maker emails) if available
const _base     = JSON.parse(readFileSync(LEADS_PATH, 'utf8'));
const _enriched = existsSync(ENRICHED_PATH)
  ? JSON.parse(readFileSync(ENRICHED_PATH, 'utf8'))
  : null;

// Merge: use enriched_email (high/medium confidence) when available
const LEADS = _base.map(lead => {
  if (!_enriched) return lead;
  const e = _enriched.find(l => l.id === lead.id);
  if (e?.enriched_email && e.enriched_confidence !== 'low') {
    return {
      ...lead,
      email:          e.enriched_email,
      enriched_name:  e.enriched_name  || null,
      enriched_title: e.enriched_title || null
    };
  }
  return lead;
});

if (_enriched) {
  const upgraded = LEADS.filter((l, i) => l.email !== _base[i].email).length;
  if (upgraded > 0) console.log(`ℹ️  ${upgraded} leads använder berikad e-post (leads_enriched.json)\n`);
}

function loadState() {
  if (!existsSync(STATE_PATH)) return {};
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); }
  catch { return {}; }
}

function saveState(state) {
  const tmpDir = join(ROOT, '.tmp');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.floor((d2 - d1) / 86400000);
}

function countSentToday(state) {
  const t = today();
  return Object.values(state).filter(s => s.lastSentDate === t).length;
}

// ── EMAIL TEMPLATES ────────────────────────────────────────────────────────
function template(step, lead) {
  const { namn } = lead;

  const styles = `
    font-family: 'Helvetica Neue', Arial, sans-serif;
    max-width: 540px;
    margin: 0 auto;
    color: #1a1a1a;
    line-height: 1.7;
    font-size: 15px;
  `;
  const footerStyle = `
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    font-size: 13px;
    color: #888;
  `;

  const signature = `
    <div style="${footerStyle}">
      <strong style="color:#1a1a1a">${FROM_NAME}</strong><br>
      Bahko Byrå | Synlighet som säljer.<br>
      bahkobyra.se &nbsp;|&nbsp; ${FROM_EMAIL}
      <div style="margin-top:12px; font-size:11px; color:#bbb;">
        Vill du inte få fler mejl? Svara med "AVREGISTRERA" så tar vi bort dig direkt.
      </div>
    </div>
  `;

  if (step === 1) {
    return {
      subject: `Har ${namn} tänkt på detta?`,
      html: `<div style="${styles}">
        <p>Hej!</p>
        <p>Jag heter Mathias och jobbar med hemsidor för kliniker.</p>
        <p>Jag kikade in på er sida och tog fram ett <strong>gratis demo</strong>. Det visar hur ${namn} kan se ut med en nyare design och en tydlig bokningsknapp.</p>
        <p>Vi hjälpte nyligen en klinik som hade en liknande sida. Efter bytet fick de <strong>36% fler bokningar</strong> och hamnade på första sidan på Google inom 30 dagar.</p>
        ${LOOM_URL ? `<p>Jag spelade in en kort genomgång (90 sek) där jag visar vad jag menar:<br><a href="${LOOM_URL}" style="display:inline-block;margin-top:6px;padding:10px 18px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;">▶ Se videon</a></p>` : ''}
        <p>Ta en titt på demot: <a href="https://bahkobyra.cloud">bahkobyra.cloud</a></p>
        <p>Det tar under 2 minuter. Inga krav.</p>
        <p>Hör gärna av er!</p>
        ${signature}
      </div>`
    };
  }

  if (step === 2) {
    return {
      subject: `Såg ni mitt förslag, ${namn}?`,
      html: `<div style="${styles}">
        <p>Hej igen!</p>
        <p>Såg ni demot jag skickade om ${namn}?</p>
        <p>Länken: <a href="https://bahkobyra.cloud">bahkobyra.cloud</a></p>
        <p>Vi jobbar just nu med ett par kliniker i Sverige och det finns fortfarande plats. Vill inte att ni missar det.</p>
        ${signature}
      </div>`
    };
  }

  if (step === 3) {
    return {
      subject: `Kliniker som bytte hemsida`,
      html: `<div style="${styles}">
        <p>Hej!</p>
        <p>Kliniker som byter till en modern hemsida får oftast fler bokningar och syns bättre på Google.</p>
        <p>Vi har gjort ett demo redo för ${namn}: <a href="https://bahkobyra.cloud">bahkobyra.cloud</a></p>
        <p>Om ni svarar idag bjuder vi på ett gratis 15-minutersmöte.</p>
        ${signature}
      </div>`
    };
  }

  if (step === 4) {
    return {
      subject: `Sista mejlet från mig, ${namn}`,
      html: `<div style="${styles}">
        <p>Hej!</p>
        <p>Det här är mitt sista mejl, lovar.</p>
        <p>Om ni någon gång funderar på att byta hemsida kan ni alltid höra av er. Svara bara <strong>"ja"</strong> så bokar vi ett gratis 15-minutersmöte.</p>
        <p>Demot finns kvar: <a href="https://bahkobyra.cloud">bahkobyra.cloud</a></p>
        <p>Lycka till med kliniken!</p>
        ${signature}
      </div>`
    };
  }
}

// ── SEND EMAIL ─────────────────────────────────────────────────────────────
async function sendEmail(to, subject, html, dryRun) {
  if (dryRun) {
    console.log(`  [DRY-RUN] → ${to} | ${subject}`);
    return true;
  }

  if (!SMTP_PASSWORD) {
    console.error('  ✗ SMTP_PASSWORD saknas i .env');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      bcc: FROM_EMAIL,
      subject,
      html
    });
    return true;
  } catch (err) {
    console.error(`  ✗ Fel: ${err.message}`);
    return false;
  }
}

// ── DETERMINE CANDIDATES ───────────────────────────────────────────────────
function getCandidates(leads, state) {
  const t = today();
  const candidates = [];

  for (const lead of leads) {
    const s = state[lead.id] || {};

    // Skip unsubscribed or replied (no more sequences needed)
    if (s.unsubscribed) continue;
    if (s.replied) continue;

    // Determine next step to send
    const nextStep = (s.lastStepSent || 0) + 1;
    if (nextStep > TOTAL_STEPS) continue; // All steps done

    // Check timing
    if (nextStep === 1) {
      // First email — always a candidate if not yet sent
      candidates.push({ lead, step: 1 });
    } else {
      const prevStepDate = s[`step${nextStep - 1}Date`];
      if (!prevStepDate) continue;
      const requiredDays = STEP_DAYS[nextStep] - STEP_DAYS[nextStep - 1];
      const elapsed = daysBetween(prevStepDate, t);
      if (elapsed >= requiredDays) {
        candidates.push({ lead, step: nextStep });
      }
    }
  }

  return candidates;
}

// ── SHOW STATUS ────────────────────────────────────────────────────────────
function showStatus(leads, state) {
  let notStarted = 0, active = 0, completed = 0, unsubscribed = 0, replied = 0;
  const stepCounts = { 1:0, 2:0, 3:0, 4:0 };

  for (const lead of leads) {
    const s = state[lead.id] || {};
    if (s.unsubscribed) { unsubscribed++; continue; }
    if (s.replied)      { replied++;      continue; }
    if (!s.lastStepSent) { notStarted++;   continue; }
    if (s.lastStepSent >= TOTAL_STEPS) { completed++; continue; }
    active++;
    stepCounts[s.lastStepSent] = (stepCounts[s.lastStepSent] || 0) + 1;
  }

  const sentToday = countSentToday(state);

  console.log('\n═══════════════════════════════════════');
  console.log('  BAHKO BYRÅ — Utskick Status');
  console.log('═══════════════════════════════════════');
  console.log(`  Totalt leads:    ${leads.length}`);
  console.log(`  Ej påbörjat:     ${notStarted}`);
  console.log(`  Aktiva:          ${active}`);
  console.log(`    → Väntar steg 2: ${stepCounts[1]}`);
  console.log(`    → Väntar steg 3: ${stepCounts[2]}`);
  console.log(`    → Väntar steg 4: ${stepCounts[3]}`);
  console.log(`  Alla steg klara: ${completed}`);
  console.log(`  Svarat:          ${replied}`);
  console.log(`  Avregistrerade:  ${unsubscribed}`);
  console.log('───────────────────────────────────────');
  console.log(`  Skickade idag:   ${sentToday} / ${MAX_PER_DAY}`);
  console.log('═══════════════════════════════════════\n');
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun     = args.includes('--dry-run');
  const statusOnly = args.includes('--status');
  const markReplied  = args.find(a => a.startsWith('--mark-replied='))?.split('=')[1];
  const unsubscribe  = args.find(a => a.startsWith('--unsubscribe='))?.split('=')[1];
  const reset        = args.find(a => a.startsWith('--reset='))?.split('=')[1];

  const state = loadState();

  // Handle one-off commands
  if (markReplied) {
    state[markReplied] = { ...(state[markReplied]||{}), replied: true };
    saveState(state);
    const lead = LEADS.find(l => l.id == markReplied);
    console.log(`✓ ${lead?.namn || 'Lead ' + markReplied} markerad som svarat.`);
    return;
  }
  if (unsubscribe) {
    state[unsubscribe] = { ...(state[unsubscribe]||{}), unsubscribed: true };
    saveState(state);
    const lead = LEADS.find(l => l.id == unsubscribe);
    console.log(`✓ ${lead?.namn || 'Lead ' + unsubscribe} avregistrerad.`);
    return;
  }
  if (reset) {
    delete state[reset];
    saveState(state);
    const lead = LEADS.find(l => l.id == reset);
    console.log(`✓ ${lead?.namn || 'Lead ' + reset} återställd.`);
    return;
  }
  if (statusOnly) {
    showStatus(LEADS, state);
    return;
  }

  // Main send loop
  const t = today();
  const alreadySentToday = countSentToday(state);
  let remaining = MAX_PER_DAY - alreadySentToday;

  if (remaining <= 0) {
    console.log(`⚠️  Daglig gräns nådd (${MAX_PER_DAY} mejl/dag). Kör igen imorgon.`);
    showStatus(LEADS, state);
    return;
  }

  const candidates = getCandidates(LEADS, state);

  console.log(`\n🚀 Bahko Byrå — Mejlautomation ${dryRun ? '[DRY-RUN]' : ''}`);
  console.log(`   Datum: ${t}`);
  console.log(`   Kandidater: ${candidates.length} | Kan skicka idag: ${remaining}/${MAX_PER_DAY}`);
  console.log('─────────────────────────────────────\n');

  if (candidates.length === 0) {
    console.log('Inga leads redo att kontaktas idag.');
    showStatus(LEADS, state);
    return;
  }

  let sent = 0, failed = 0;

  for (const { lead, step } of candidates) {
    if (remaining <= 0) break;

    const { subject, html } = template(step, lead);
    const stepLabel = step === 1 ? 'Initialt' : `Uppföljning ${step-1}`;
    process.stdout.write(`  [Steg ${step}] ${lead.namn.padEnd(36)} ${stepLabel.padEnd(15)} `);

    const ok = await sendEmail(lead.email, subject, html, dryRun);
    if (ok) {
      if (!dryRun) {
        // Update state only on real sends
        state[lead.id] = state[lead.id] || {};
        state[lead.id].lastStepSent  = step;
        state[lead.id].lastSentDate  = t;
        state[lead.id][`step${step}Date`] = t;
      }
      sent++;
      remaining--;
      console.log(`✓`);
    } else {
      failed++;
      console.log(`✗`);
    }

    // 5 minute delay between sends
    if (!dryRun) {
      console.log(`  ⏳ Väntar 5 minuter...`);
      await new Promise(r => setTimeout(r, 300000));
    }
  }

  if (!dryRun) saveState(state);

  console.log('\n─────────────────────────────────────');
  console.log(`  Skickade: ${sent}  |  Misslyckades: ${failed}`);
  showStatus(LEADS, state);
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
