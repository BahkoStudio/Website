#!/usr/bin/env node
/**
 * server.js — Lokal dev-server för Bahko Byrå
 * Kör: node server.js
 * Öppnar automatiskt i Edge på http://localhost:3000
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

const server = createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // API: serve outreach state
  if (urlPath === '/api/state') {
    const statePath = join(__dirname, '.tmp', 'outreach_state.json');
    if (existsSync(statePath)) {
      const data = readFileSync(statePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(data);
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    }
    return;
  }

  // API: serve LinkedIn profile data
  if (urlPath === '/api/linkedin') {
    const liPath = join(__dirname, '.tmp', 'linkedin_data.json');
    if (existsSync(liPath)) {
      const data = readFileSync(liPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(data);
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    }
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  let filePath = join(__dirname, urlPath);

  // Serve index.html for directory requests
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + urlPath);
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Server Error');
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('\n══════════════════════════════════════');
  console.log('  Bahko Byrå — Dev Server');
  console.log('══════════════════════════════════════');
  console.log(`  ${url}`);
  console.log('──────────────────────────────────────');
  console.log(`  Hub:       ${url}/`);
  console.log(`  Byrå:      ${url}/bahkobyra/`);
  console.log(`  Pitch:     ${url}/bahkobyra/pitchdeck.html`);
  console.log(`  Demo:      ${url}/kliniker/elara-klinik-demo-v2.html`);
  console.log(`  CRM:       ${url}/kliniker/crm.html`);
  console.log(`  Rapport:   ${url}/.tmp/competitor_report_2026-03-16.html`);
  console.log('──────────────────────────────────────');
  console.log('  Ctrl+C för att stänga\n');

  // Öppna Edge automatiskt
  exec(`start msedge ${url}`, err => {
    if (err) exec(`start ${url}`);
  });
});
