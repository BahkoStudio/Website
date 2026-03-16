#!/usr/bin/env node
/**
 * generate_report.js
 * Genererar en branded HTML-konkurrensanalysrapport från research_raw.json.
 * Output: .tmp/competitor_report_DATUM.html (öppnas automatiskt i browser)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { exec } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INPUT = join(ROOT, ".tmp", "research_raw.json");
const BRAND = join(ROOT, "brand", "brand.json");

// ── Logo → base64 ────────────────────────────────────────────────────────────
function loadLogoB64(brand) {
  const logoPath = join(ROOT, brand.logo_path || "brand/logo.png");
  if (!existsSync(logoPath)) return "";
  const ext = logoPath.split(".").pop().toLowerCase();
  const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml" }[ext] || "image/png";
  const b64 = readFileSync(logoPath).toString("base64");
  return `data:${mime};base64,${b64}`;
}

// ── Markdown-lite → HTML ─────────────────────────────────────────────────────
function mdToHtml(text) {
  const lines = text.split("\n");
  const out = [];
  let inUl = false;

  for (let line of lines) {
    if (line.startsWith("### ")) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push(`<h4>${line.slice(4).trim()}</h4>`);
    } else if (line.startsWith("## ")) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push(`<h3>${line.slice(3).trim()}</h3>`);
    } else if (line.startsWith("# ")) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push(`<h2>${line.slice(2).trim()}</h2>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inUl) { out.push("<ul>"); inUl = true; }
      const content = line.slice(2).trim().replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      out.push(`<li>${content}</li>`);
    } else if (line.trim() === "") {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push("<br>");
    } else {
      if (inUl) { out.push("</ul>"); inUl = false; }
      const content = line.trim().replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      if (content) out.push(`<p>${content}</p>`);
    }
  }
  if (inUl) out.push("</ul>");
  return out.join("\n");
}

// ── HTML ─────────────────────────────────────────────────────────────────────
function generateHtml(data, brand) {
  const company    = brand.company_name || "Bahko Byrå";
  const tagline    = brand.tagline || "";
  const primary    = brand.primary_color || "#c9a96e";
  const secondary  = brand.secondary_color || "#0c0a09";
  const accent     = brand.accent_color || "#e0c48a";
  const textColor  = brand.text_color || "#f0ece4";
  const fontH      = brand.font_heading || "Cormorant Garamond";
  const fontB      = brand.font_body || "Outfit";
  const services   = brand.services || [];
  const target     = brand.target_market || "";

  const dt         = new Date(data.generated_at || new Date());
  const dateStr    = dt.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
  const year       = dt.getFullYear();

  const logoB64    = loadLogoB64(brand);
  const logoHtml   = logoB64
    ? `<img src="${logoB64}" alt="${company}" class="logo-img">`
    : `<span class="logo-text">${company}</span>`;

  const research   = data.research || {};
  const ORDER      = ["landscape", "pricing", "clinic_niche", "social_media", "competitor_offers", "positioning", "opportunities"];
  const ICONS      = { landscape: "🏢", pricing: "💰", clinic_niche: "🏥", social_media: "📱", competitor_offers: "📦", positioning: "🎯", opportunities: "✨" };

  const sectionsHtml = ORDER.filter(k => research[k]).map(k => {
    const sec     = research[k];
    const icon    = ICONS[k] || "📊";
    const answer  = sec.answer || "";
    const content = answer.startsWith("FEL:")
      ? `<div class="error-box">⚠️ ${answer}</div>`
      : mdToHtml(answer);
    return `
      <section class="report-section" id="${k}">
        <div class="section-header">
          <span class="section-icon">${icon}</span>
          <h2 class="section-title">${sec.label}</h2>
        </div>
        <div class="section-content">${content}</div>
      </section>`;
  }).join("\n");

  const navHtml    = ORDER.filter(k => research[k]).map(k =>
    `<a href="#${k}" class="nav-item">${ICONS[k] || "📊"} ${research[k].label}</a>`
  ).join("\n");

  const badgesHtml = services.map(s => `<span class="badge">${s}</span>`).join("");

  // SERP results section
  const serpData = data.serp_results || {};
  let serpHtml = "";
  const allSerp = [...(serpData.social || []), ...(serpData.competitors || [])];
  if (allSerp.length > 0) {
    const rows = allSerp.slice(0, 20).map(r =>
      `<tr><td><a href="${r.link}" target="_blank" style="color:var(--gold);text-decoration:none">${r.title}</a></td><td style="color:var(--text-dim);font-size:.8rem">${r.snippet || ""}</td></tr>`
    ).join("");
    serpHtml = `
      <section class="report-section" id="serp">
        <div class="section-header">
          <span class="section-icon">🔍</span>
          <h2 class="section-title">Google-sökresultat (SerpAPI)</h2>
        </div>
        <div class="section-content">
          <table style="width:100%;border-collapse:collapse;font-size:.85rem">
            <thead><tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:.5rem 0;color:var(--text-faint);font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;width:35%">Sida</th>
              <th style="text-align:left;padding:.5rem 0;color:var(--text-faint);font-size:.65rem;letter-spacing:.12em;text-transform:uppercase">Beskrivning</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  }

  return `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${company} — Konkurrensanalys ${year}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:${secondary};--surface:#141210;--surface2:#1c1916;
  --gold:${primary};--gold-lt:${accent};--gold-dim:rgba(201,169,110,.35);
  --border:rgba(201,169,110,.12);--border-md:rgba(201,169,110,.28);
  --text:${textColor};--text-dim:rgba(240,236,228,.55);--text-faint:rgba(240,236,228,.22);
  --serif:'${fontH}',Georgia,serif;--sans:'${fontB}',system-ui,sans-serif;--r:8px;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:15px;line-height:1.7}
.layout{display:flex;min-height:100vh}

/* Sidebar */
.sidebar{width:240px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);
  position:sticky;top:0;height:100vh;overflow-y:auto;padding:2rem 1.5rem;
  display:flex;flex-direction:column;gap:2rem}
.sidebar-brand{text-align:center;padding-bottom:1.5rem;border-bottom:1px solid var(--border)}
.logo-img{max-width:100px;max-height:60px;object-fit:contain}
.logo-text{font-family:var(--serif);font-size:1.1rem;color:var(--gold);letter-spacing:.08em}
.sidebar-meta{font-size:.7rem;color:var(--text-faint);text-transform:uppercase;letter-spacing:.1em;margin-top:.5rem}
.sidebar-nav{display:flex;flex-direction:column;gap:.25rem}
.nav-item{display:block;padding:.6rem .75rem;border-radius:var(--r);color:var(--text-dim);
  text-decoration:none;font-size:.82rem;transition:all .2s;border:1px solid transparent}
.nav-item:hover{color:var(--gold);background:rgba(201,169,110,.06);border-color:var(--border)}
.sidebar-services{margin-top:auto}
.sidebar-services h4{font-size:.65rem;text-transform:uppercase;letter-spacing:.12em;
  color:var(--text-faint);margin-bottom:.5rem}

/* Main */
.main{flex:1;max-width:900px;padding:3rem 3rem 6rem;margin:0 auto}

/* Header */
.report-header{padding:3rem 0 2.5rem;border-bottom:1px solid var(--border);margin-bottom:3rem}
.report-eyebrow{font-size:.7rem;text-transform:uppercase;letter-spacing:.18em;color:var(--gold);margin-bottom:.75rem}
.report-title{font-family:var(--serif);font-size:clamp(2rem,4vw,3.2rem);font-weight:300;line-height:1.15;margin-bottom:1rem}
.report-title span{color:var(--gold);font-style:italic}
.report-meta{display:flex;gap:2rem;flex-wrap:wrap;margin-top:1.5rem}
.meta-item{display:flex;flex-direction:column;gap:.2rem}
.meta-label{font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-faint)}
.meta-value{font-size:.85rem;color:var(--text-dim)}

/* Sections */
.report-section{margin-bottom:3.5rem;padding-bottom:3rem;border-bottom:1px solid var(--border)}
.report-section:last-child{border-bottom:none}
.section-header{display:flex;align-items:center;gap:.75rem;margin-bottom:1.5rem}
.section-icon{font-size:1.4rem;line-height:1}
.section-title{font-family:var(--serif);font-size:1.7rem;font-weight:400}
.section-content h2{font-family:var(--serif);font-size:1.3rem;font-weight:400;color:var(--gold-lt);margin:1.5rem 0 .5rem}
.section-content h3{font-size:.85rem;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);margin:1.25rem 0 .4rem}
.section-content h4{font-size:.8rem;color:var(--text-dim);margin:1rem 0 .3rem}
.section-content p{color:var(--text-dim);margin-bottom:.75rem;font-size:.92rem}
.section-content strong{color:var(--text)}
.section-content ul{list-style:none;padding:0;margin:.5rem 0 1rem}
.section-content ul li{padding:.4rem 0 .4rem 1.25rem;position:relative;color:var(--text-dim);
  font-size:.9rem;border-bottom:1px solid var(--border)}
.section-content ul li:last-child{border-bottom:none}
.section-content ul li::before{content:'✦';position:absolute;left:0;color:var(--gold-dim);
  font-size:.5rem;top:.65rem}
.error-box{background:rgba(158,64,64,.1);border:1px solid rgba(158,64,64,.3);
  border-radius:var(--r);padding:1rem 1.25rem;color:#d4a0a0;font-size:.875rem}

/* Badges */
.badge{display:inline-block;padding:.2rem .6rem;background:rgba(201,169,110,.1);
  border:1px solid var(--border-md);border-radius:100px;font-size:.7rem;
  color:var(--gold);letter-spacing:.05em;margin:.15rem}

/* Footer */
.report-footer{margin-top:4rem;padding-top:2rem;border-top:1px solid var(--border);
  display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
.footer-brand{font-family:var(--serif);color:var(--gold);font-size:.9rem}
.footer-meta{font-size:.75rem;color:var(--text-faint)}

@media print{.sidebar{display:none}.main{padding:1rem;max-width:100%}}
@media(max-width:768px){.sidebar{display:none}.main{padding:1.5rem}}
</style>
</head>
<body>
<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-brand">
      ${logoHtml}
      <div class="sidebar-meta">Konkurrensanalys ${year}</div>
    </div>
    <div class="sidebar-nav">${navHtml}</div>
    <div class="sidebar-services">
      <h4>Tjänster</h4>
      ${badgesHtml}
    </div>
  </nav>
  <main class="main">
    <header class="report-header">
      <div class="report-eyebrow">Konkurrensanalys · ${year}</div>
      <h1 class="report-title">${company}<br><span>Marknadsanalys &amp; Konkurrenter</span></h1>
      ${tagline ? `<p style="color:var(--text-dim);margin-top:.5rem;font-style:italic">${tagline}</p>` : ""}
      <div class="report-meta">
        <div class="meta-item"><span class="meta-label">Genererad</span><span class="meta-value">${dateStr}</span></div>
        <div class="meta-item"><span class="meta-label">Målmarknad</span><span class="meta-value">${target}</span></div>
        <div class="meta-item"><span class="meta-label">Tjänster</span><span class="meta-value">${services.join(", ")}</span></div>
      </div>
    </header>
    ${sectionsHtml}
    ${serpHtml}
    <footer class="report-footer">
      <span class="footer-brand">${company}</span>
      <span class="footer-meta">Konfidentiellt · Genererad ${dateStr} · Powered by Perplexity AI</span>
    </footer>
  </main>
</div>
</body>
</html>`;
}

// ── Öppna i browser ──────────────────────────────────────────────────────────
function openInBrowser(filePath) {
  const url = `file:///${filePath.replace(/\\/g, "/")}`;
  const cmd = process.platform === "win32" ? `start "" "${url}"` : `open "${url}"`;
  exec(cmd, (err) => { if (err) console.log(`   Öppna manuellt: ${url}`); });
}

// ── Huvud ────────────────────────────────────────────────────────────────────
function main() {
  if (!existsSync(INPUT)) {
    console.error(`❌ Ingen research-data: ${INPUT}`);
    console.error("   Kör först: node tools/competitor_research.js");
    process.exit(1);
  }
  if (!existsSync(BRAND)) {
    console.error(`❌ Ingen brand.json: ${BRAND}`);
    process.exit(1);
  }

  const data  = JSON.parse(readFileSync(INPUT, "utf-8"));
  const brand = JSON.parse(readFileSync(BRAND, "utf-8"));
  console.log(`✅ Genererar rapport för: ${brand.company_name}`);

  const html     = generateHtml(data, brand);
  const dateTag  = new Date().toISOString().slice(0, 10);
  const outDir   = join(ROOT, ".tmp");
  mkdirSync(outDir, { recursive: true });
  const outPath  = join(outDir, `competitor_report_${dateTag}.html`);
  writeFileSync(outPath, html, "utf-8");

  console.log(`✅ Rapport sparad: ${outPath}`);
  console.log("   Öppnar i browser...");
  openInBrowser(outPath);
}

main();
