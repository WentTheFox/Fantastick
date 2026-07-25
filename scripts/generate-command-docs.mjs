#!/usr/bin/env node
// Generates the static homepage (README content + command reference) for GitHub Pages,
// from src/commands.json + locale strings + the repo README.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { marked } from 'marked';

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..');
const outDir = path.join(rootDir, '_site');

const commandsFile = JSON.parse(readFileSync(path.join(rootDir, 'src/commands.json'), 'utf8'));
const translations = JSON.parse(readFileSync(path.join(rootDir, 'src/locales/en-US/translation.json'), 'utf8'));
const readme = readFileSync(path.join(rootDir, 'README.md'), 'utf8');

const rawCommands = Array.isArray(commandsFile) ? commandsFile : commandsFile.commands;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

const chatInputCommands = [];
const contextMenuCommands = [];

for (const command of rawCommands) {
  const locale = translations.commands?.[command.name];

  if (command.type === 'MESSAGE') {
    contextMenuCommands.push({
      name: locale?.name ?? command.name,
    });
    continue;
  }

  const options = (command.options ?? []).map((option) => {
    const optionLocale = locale?.options?.[option.name];
    return {
      name: optionLocale?.name ?? option.name,
      description: optionLocale?.description ?? '',
      type: option.type,
      required: Boolean(option.required),
      autocomplete: Boolean(option.autocomplete),
      minLength: option.min_length,
      maxLength: option.max_length,
      minValue: option.min_value,
      maxValue: option.max_value,
    };
  });

  chatInputCommands.push({
    name: locale?.name ?? command.name,
    description: locale?.description ?? '',
    nsfw: Boolean(command.nsfw),
    options,
  });
}

chatInputCommands.sort((a, b) => a.name.localeCompare(b.name));
contextMenuCommands.sort((a, b) => a.name.localeCompare(b.name));

const renderConstraints = (option) => {
  const parts = [];
  if (option.minLength != null || option.maxLength != null) {
    parts.push(`length ${option.minLength ?? 0}–${option.maxLength ?? '∞'}`);
  }
  if (option.minValue != null || option.maxValue != null) {
    parts.push(`value ${option.minValue ?? '−∞'}–${option.maxValue ?? '∞'}`);
  }
  return parts.join(', ');
};

const renderOption = (option) => `
        <li class="list-group-item">
          <div class="d-flex align-items-center flex-wrap gap-2">
            <code>${escapeHtml(option.name)}</code>
            <span class="badge text-bg-secondary">${escapeHtml(option.type)}</span>
            ${option.required ? '<span class="badge text-bg-danger">required</span>' : '<span class="badge text-bg-light border">optional</span>'}
            ${option.autocomplete ? '<span class="badge text-bg-info">autocomplete</span>' : ''}
          </div>
          ${option.description ? `<p class="text-body-secondary small mb-0 mt-1">${escapeHtml(option.description)}</p>` : ''}
          ${renderConstraints(option) ? `<p class="text-body-secondary small font-monospace mb-0">${escapeHtml(renderConstraints(option))}</p>` : ''}
        </li>`;

const renderCommand = (command) => `
      <article class="card mb-3">
        <div class="card-body">
          <h3 class="card-title h5 d-flex align-items-center flex-wrap gap-2 mb-2">
            <code>/${escapeHtml(command.name)}</code>
            ${command.nsfw ? '<span class="badge text-bg-danger">NSFW</span>' : ''}
          </h3>
          ${command.description ? `<p class="card-text">${escapeHtml(command.description)}</p>` : ''}
          ${command.options.length > 0 ? `<ul class="list-group list-group-flush mt-2">${command.options.map(renderOption).join('')}
          </ul>` : ''}
        </div>
      </article>`;

const renderContextMenuCommand = (command) => `
      <article class="card mb-3">
        <div class="card-body">
          <h3 class="card-title h5 d-flex align-items-center flex-wrap gap-2 mb-0">
            <code>${escapeHtml(command.name)}</code>
            <span class="badge text-bg-secondary">message context menu</span>
          </h3>
        </div>
      </article>`;

const slugCounts = new Map();
const slugify = (html) => {
  const base = html
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;|&apos;/g, '')
    .replace(/&quot;/g, '')
    .replace(/&amp;/g, 'and')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/\s+/g, '-');
  const count = slugCounts.get(base) ?? 0;
  slugCounts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
};

marked.use({
  renderer: {
    heading(token) {
      const text = this.parser.parseInline(token.tokens);
      return `<h${token.depth} id="${slugify(text)}">${text}</h${token.depth}>\n`;
    },
  },
});

let readmeHtml = marked.parse(readme, { gfm: true });
readmeHtml = readmeHtml
  .replace(/<table>/g, '<table class="table table-bordered align-middle">')
  .replace(/<blockquote>/g, '<blockquote class="blockquote border-start border-3 ps-3 py-1 text-body-secondary fs-6">')
  .replace(/<pre><code/g, '<pre class="bg-body-secondary rounded p-3 overflow-auto"><code')
  .replace(/<img /g, '<img class="img-fluid" ');

const html = `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fantastick</title>
<meta name="description" content="Fantastick — a Discord app for managing and sending custom stickers, plus a reference of all its commands.">
<script>
  (function () {
    var query = window.matchMedia('(prefers-color-scheme: dark)');
    var apply = function () {
      document.documentElement.setAttribute('data-bs-theme', query.matches ? 'dark' : 'light');
    };
    apply();
    query.addEventListener('change', apply);
  })();
</script>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
  integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
  crossorigin="anonymous">
<style>
  body {
    padding: 2.5rem 1.25rem 4rem;
  }
  .page-container {
    max-width: 48rem;
  }
  .section-title {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 2.5rem 0 1rem;
  }
  .readme :is(h1, h2, h3, h4) {
    margin-top: 2rem;
  }
  .readme h1 {
    margin-top: 0;
  }
</style>
</head>
<body>
<div class="container page-container">
  <nav class="d-flex justify-content-end mb-4">
    <a class="btn btn-outline-secondary btn-sm" href="https://github.com/WentTheFox/Fantastick">View on GitHub →</a>
  </nav>

  <div class="readme border-bottom mb-4 pb-3">
${readmeHtml}
  </div>

  <h2 class="section-title text-body-secondary fs-6 fw-bold">Slash commands</h2>
${chatInputCommands.map(renderCommand).join('\n')}

  <h2 class="section-title text-body-secondary fs-6 fw-bold">Context menu commands</h2>
${contextMenuCommands.map(renderContextMenuCommand).join('\n')}

  <footer class="mt-5 text-body-secondary small">
    Generated automatically from the bot's README and command manifest on every push to <code>main</code>.
  </footer>
</div>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'index.html'), html);

console.log(`Wrote ${chatInputCommands.length} slash commands and ${contextMenuCommands.length} context menu commands to ${path.join(outDir, 'index.html')}`);
