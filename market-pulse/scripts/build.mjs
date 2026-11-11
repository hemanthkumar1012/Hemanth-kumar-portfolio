#!/usr/bin/env node
/**
 * Zero-dependency build: bundles the ES modules and stylesheets into a single
 * self-contained dist/index.html (works from file://, easy to host anywhere).
 *
 * It is deliberately simple. Modules are concatenated in dependency order inside
 * one IIFE, so the only rule is that top-level names must be unique across
 * files. The script checks that and fails loudly instead of producing a broken
 * bundle. No `import x as y`, default exports or dynamic imports.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IMPORT_RE = /^import\s+(?:[\s\S]*?\s+from\s+)?["'](.+?)["'];?\s*$/gm;
const DECL_RE = /^(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;

function collect(entry) {
  const ordered = [];
  const seen = new Set();

  const visit = (file, trail = []) => {
    if (seen.has(file)) return;
    if (trail.includes(file)) throw new Error(`Circular import: ${[...trail, file].map((f) => relative(root, f)).join(" → ")}`);
    const source = readFileSync(file, "utf8");
    for (const [, spec] of source.matchAll(IMPORT_RE)) {
      if (!spec.startsWith(".")) throw new Error(`Bare import "${spec}" in ${relative(root, file)} is not supported`);
      visit(resolve(dirname(file), spec), [...trail, file]);
    }
    seen.add(file);
    ordered.push({ file, source });
  };

  visit(entry);
  return ordered;
}

function assertUniqueNames(modules) {
  const owners = new Map();
  for (const { file, source } of modules) {
    for (const [, name] of source.matchAll(DECL_RE)) {
      if (owners.has(name)) {
        throw new Error(`Top-level name "${name}" is declared in both ${relative(root, owners.get(name))} and ${relative(root, file)}`);
      }
      owners.set(name, file);
    }
  }
}

function strip(source) {
  return source
    .replace(IMPORT_RE, "")
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, "")
    .replace(/^export\s+(?=(async\s+)?(function|const|let|var|class)\b)/gm, "");
}

const entry = resolve(root, "src/main.js");
const modules = collect(entry);
assertUniqueNames(modules);

const js = modules
  .map(({ file, source }) => `// ---- ${relative(root, file)}\n${strip(source).trim()}\n`)
  .join("\n");

let html = readFileSync(resolve(root, "index.html"), "utf8");

html = html.replace(/<link rel="stylesheet" href="(src\/[^"]+)">/g, (_, href) =>
  `<style>\n${readFileSync(resolve(root, href), "utf8")}\n</style>`);

html = html.replace(
  /<script type="module" src="src\/main\.js"><\/script>/,
  () => `<script>\n(() => {\n"use strict";\n${js}\n})();\n</script>`
);

mkdirSync(resolve(root, "dist"), { recursive: true });
writeFileSync(resolve(root, "dist/index.html"), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`Built dist/index.html — ${modules.length} modules, ${kb} KB`);
