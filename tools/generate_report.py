"""
generate_report.py
Genererar en branded HTML-konkurrensanalysrapport från research_raw.json.
Output: .tmp/competitor_report_DATUM.html  (öppnas automatiskt i browser)
"""

import json
import sys
import webbrowser
import base64
from datetime import datetime
from pathlib import Path

# ── Sökvägar ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
INPUT_FILE = ROOT / ".tmp" / "research_raw.json"
BRAND_FILE = ROOT / "brand" / "brand.json"

# ── Hjälp: ladda logo som base64 ────────────────────────────────────────────
def load_logo_b64(brand: dict) -> str:
    logo_path = ROOT / brand.get("logo_path", "brand/logo.png")
    if logo_path.exists():
        ext = logo_path.suffix.lower().lstrip(".")
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "svg": "image/svg+xml"}.get(ext, "image/png")
        b64 = base64.b64encode(logo_path.read_bytes()).decode()
        return f"data:{mime};base64,{b64}"
    return ""


# ── Markdown-lite → HTML ────────────────────────────────────────────────────
def md_to_html(text: str) -> str:
    """Konverterar enkel markdown till HTML (rubriker, fet, listor)."""
    import re
    lines = text.split("\n")
    html_lines = []
    in_ul = False

    for line in lines:
        # Rubriker
        if line.startswith("### "):
            if in_ul: html_lines.append("</ul>"); in_ul = False
            html_lines.append(f"<h4>{line[4:].strip()}</h4>")
        elif line.startswith("## "):
            if in_ul: html_lines.append("</ul>"); in_ul = False
            html_lines.append(f"<h3>{line[3:].strip()}</h3>")
        elif line.startswith("# "):
            if in_ul: html_lines.append("</ul>"); in_ul = False
            html_lines.append(f"<h2>{line[2:].strip()}</h2>")
        # Listor
        elif line.startswith("- ") or line.startswith("* "):
            if not in_ul: html_lines.append("<ul>"); in_ul = True
            content = line[2:].strip()
            content = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", content)
            html_lines.append(f"<li>{content}</li>")
        elif line.strip() == "":
            if in_ul: html_lines.append("</ul>"); in_ul = False
            html_lines.append("<br>")
        else:
            if in_ul: html_lines.append("</ul>"); in_ul = False
            content = line.strip()
            content = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", content)
            if content:
                html_lines.append(f"<p>{content}</p>")

    if in_ul:
        html_lines.append("</ul>")

    return "\n".join(html_lines)


# ── HTML-generering ──────────────────────────────────────────────────────────
def generate_html(data: dict, brand: dict) -> str:
    company = brand.get("company_name", "Ditt Företag")
    tagline = brand.get("tagline", "")
    primary = brand.get("primary_color", "#c9a96e")
    secondary = brand.get("secondary_color", "#0c0a09")
    accent = brand.get("accent_color", "#e0c48a")
    text_color = brand.get("text_color", "#f0ece4")
    font_h = brand.get("font_heading", "Cormorant Garamond")
    font_b = brand.get("font_body", "Outfit")
    services = brand.get("services", [])
    target = brand.get("target_market", "")

    generated_at = datetime.fromisoformat(data.get("generated_at", datetime.now().isoformat()))
    date_str = generated_at.strftime("%-d %B %Y") if sys.platform != "win32" else generated_at.strftime("%d %B %Y")

    logo_b64 = load_logo_b64(brand)
    logo_html = f'<img src="{logo_b64}" alt="{company} logo" class="logo-img">' if logo_b64 else f'<span class="logo-text">{company}</span>'

    research = data.get("research", {})
    section_order = ["landscape", "pricing", "clinic_niche", "positioning", "opportunities"]
    section_icons = {
        "landscape": "🏢",
        "pricing": "💰",
        "clinic_niche": "🏥",
        "positioning": "🎯",
        "opportunities": "✨",
    }

    sections_html = ""
    for key in section_order:
        if key not in research:
            continue
        sec = research[key]
        icon = section_icons.get(key, "📊")
        label = sec.get("label", key)
        answer = sec.get("answer", "")
        if answer.startswith("FEL:"):
            content_html = f'<div class="error-box">⚠️ {answer}</div>'
        else:
            content_html = md_to_html(answer)

        sections_html += f"""
        <section class="report-section" id="{key}">
          <div class="section-header">
            <span class="section-icon">{icon}</span>
            <h2 class="section-title">{label}</h2>
          </div>
          <div class="section-content">
            {content_html}
          </div>
        </section>
        """

    services_badges = "".join(f'<span class="badge">{s}</span>' for s in services)
    nav_items = "".join(
        f'<a href="#{key}" class="nav-item">{section_icons.get(key,"📊")} {research[key]["label"]}</a>'
        for key in section_order if key in research
    )

    return f"""<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{company} — Konkurrensanalys {generated_at.year}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    :root {{
      --bg:      {secondary};
      --surface: #141210;
      --surface2:#1c1916;
      --gold:    {primary};
      --gold-lt: {accent};
      --gold-dim:rgba(201,169,110,0.35);
      --border:  rgba(201,169,110,0.12);
      --border-md:rgba(201,169,110,0.28);
      --text:    {text_color};
      --text-dim:rgba(240,236,228,0.55);
      --text-faint:rgba(240,236,228,0.25);
      --serif:   '{font_h}', Georgia, serif;
      --sans:    '{font_b}', system-ui, sans-serif;
      --radius:  8px;
    }}

    html {{ scroll-behavior: smooth; }}

    body {{
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      font-size: 15px;
      line-height: 1.7;
      min-height: 100vh;
    }}

    /* ── Sidebar nav ─────────────────────────────────── */
    .layout {{ display: flex; min-height: 100vh; }}

    .sidebar {{
      width: 240px;
      flex-shrink: 0;
      background: var(--surface);
      border-right: 1px solid var(--border);
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }}

    .sidebar-brand {{
      text-align: center;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }}

    .logo-img {{ max-width: 100px; max-height: 60px; object-fit: contain; }}
    .logo-text {{ font-family: var(--serif); font-size: 1.1rem; color: var(--gold); letter-spacing: 0.08em; }}

    .sidebar-meta {{
      font-size: 0.7rem;
      color: var(--text-faint);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 0.5rem;
    }}

    .sidebar-nav {{ display: flex; flex-direction: column; gap: 0.25rem; }}

    .nav-item {{
      display: block;
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius);
      color: var(--text-dim);
      text-decoration: none;
      font-size: 0.82rem;
      transition: all 0.2s;
      border: 1px solid transparent;
    }}

    .nav-item:hover {{
      color: var(--gold);
      background: rgba(201,169,110,0.06);
      border-color: var(--border);
    }}

    .sidebar-services {{ margin-top: auto; }}
    .sidebar-services h4 {{
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--text-faint);
      margin-bottom: 0.5rem;
    }}

    /* ── Main content ────────────────────────────────── */
    .main {{
      flex: 1;
      max-width: 900px;
      padding: 3rem 3rem 6rem;
      margin: 0 auto;
    }}

    /* ── Report header ───────────────────────────────── */
    .report-header {{
      padding: 3rem 0 2.5rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 3rem;
    }}

    .report-eyebrow {{
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--gold);
      margin-bottom: 0.75rem;
    }}

    .report-title {{
      font-family: var(--serif);
      font-size: clamp(2rem, 4vw, 3.2rem);
      font-weight: 300;
      line-height: 1.15;
      color: var(--text);
      margin-bottom: 1rem;
    }}

    .report-title span {{ color: var(--gold); font-style: italic; }}

    .report-meta {{
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
      margin-top: 1.5rem;
    }}

    .meta-item {{
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }}

    .meta-label {{
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-faint);
    }}

    .meta-value {{
      font-size: 0.85rem;
      color: var(--text-dim);
    }}

    /* ── Sections ────────────────────────────────────── */
    .report-section {{
      margin-bottom: 3.5rem;
      padding-bottom: 3rem;
      border-bottom: 1px solid var(--border);
    }}

    .report-section:last-child {{ border-bottom: none; }}

    .section-header {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }}

    .section-icon {{
      font-size: 1.4rem;
      line-height: 1;
    }}

    .section-title {{
      font-family: var(--serif);
      font-size: 1.7rem;
      font-weight: 400;
      color: var(--text);
      letter-spacing: -0.01em;
    }}

    .section-content h2 {{
      font-family: var(--serif);
      font-size: 1.3rem;
      font-weight: 400;
      color: var(--gold-lt);
      margin: 1.5rem 0 0.5rem;
    }}

    .section-content h3 {{
      font-family: var(--sans);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--gold);
      margin: 1.25rem 0 0.4rem;
    }}

    .section-content h4 {{
      font-family: var(--sans);
      font-size: 0.8rem;
      color: var(--text-dim);
      margin: 1rem 0 0.3rem;
    }}

    .section-content p {{
      color: var(--text-dim);
      margin-bottom: 0.75rem;
      font-size: 0.92rem;
    }}

    .section-content strong {{ color: var(--text); }}

    .section-content ul {{
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 1rem;
    }}

    .section-content ul li {{
      padding: 0.4rem 0 0.4rem 1.25rem;
      position: relative;
      color: var(--text-dim);
      font-size: 0.9rem;
      border-bottom: 1px solid var(--border);
    }}

    .section-content ul li:last-child {{ border-bottom: none; }}

    .section-content ul li::before {{
      content: '✦';
      position: absolute;
      left: 0;
      color: var(--gold-dim);
      font-size: 0.5rem;
      top: 0.65rem;
    }}

    .error-box {{
      background: rgba(158,64,64,0.1);
      border: 1px solid rgba(158,64,64,0.3);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      color: #d4a0a0;
      font-size: 0.875rem;
    }}

    /* ── Badges ──────────────────────────────────────── */
    .badge {{
      display: inline-block;
      padding: 0.2rem 0.6rem;
      background: rgba(201,169,110,0.1);
      border: 1px solid var(--border-md);
      border-radius: 100px;
      font-size: 0.7rem;
      color: var(--gold);
      letter-spacing: 0.05em;
      margin: 0.15rem;
    }}

    /* ── Footer ──────────────────────────────────────── */
    .report-footer {{
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }}

    .footer-brand {{ font-family: var(--serif); color: var(--gold); font-size: 0.9rem; }}
    .footer-meta {{ font-size: 0.75rem; color: var(--text-faint); }}

    /* ── Print ───────────────────────────────────────── */
    @media print {{
      .sidebar {{ display: none; }}
      .main {{ padding: 1rem; max-width: 100%; }}
    }}

    /* ── Mobile ──────────────────────────────────────── */
    @media (max-width: 768px) {{
      .sidebar {{ display: none; }}
      .main {{ padding: 1.5rem; }}
    }}
  </style>
</head>
<body>
<div class="layout">

  <!-- Sidebar -->
  <nav class="sidebar">
    <div class="sidebar-brand">
      {logo_html}
      <div class="sidebar-meta">Konkurrensanalys {generated_at.year}</div>
    </div>
    <div class="sidebar-nav">
      {nav_items}
    </div>
    <div class="sidebar-services">
      <h4>Tjänster</h4>
      {services_badges}
    </div>
  </nav>

  <!-- Main -->
  <main class="main">

    <!-- Header -->
    <header class="report-header">
      <div class="report-eyebrow">Konkurrensanalys · {generated_at.year}</div>
      <h1 class="report-title">
        {company}<br>
        <span>Marknadsanalys & Konkurrenter</span>
      </h1>
      {f'<p style="color:var(--text-dim);margin-top:0.5rem;font-style:italic;">{tagline}</p>' if tagline else ''}
      <div class="report-meta">
        <div class="meta-item">
          <span class="meta-label">Genererad</span>
          <span class="meta-value">{date_str}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Målmarknad</span>
          <span class="meta-value">{target}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Tjänster analyserade</span>
          <span class="meta-value">{", ".join(services)}</span>
        </div>
      </div>
    </header>

    <!-- Sections -->
    {sections_html}

    <!-- Footer -->
    <footer class="report-footer">
      <span class="footer-brand">{company}</span>
      <span class="footer-meta">Konfidentiellt · Genererad {date_str} · Powered by Perplexity AI</span>
    </footer>

  </main>
</div>
</body>
</html>"""


# ── Huvud ───────────────────────────────────────────────────────────────────
def main():
    if not INPUT_FILE.exists():
        print(f"❌ Ingen research-data hittad på: {INPUT_FILE}")
        print("   Kör först: python tools/competitor_research.py")
        sys.exit(1)

    if not BRAND_FILE.exists():
        print(f"❌ Hittade inte brand.json på: {BRAND_FILE}")
        sys.exit(1)

    data = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
    brand = json.loads(BRAND_FILE.read_text(encoding="utf-8"))

    print(f"✅ Genererar rapport för: {brand.get('company_name')}")

    html = generate_html(data, brand)

    date_tag = datetime.now().strftime("%Y-%m-%d")
    output_file = ROOT / ".tmp" / f"competitor_report_{date_tag}.html"
    output_file.parent.mkdir(exist_ok=True)
    output_file.write_text(html, encoding="utf-8")

    print(f"✅ Rapport sparad: {output_file}")
    print("   Öppnar i browser...")
    webbrowser.open(output_file.as_uri())


if __name__ == "__main__":
    main()
