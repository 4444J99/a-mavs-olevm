import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exhibits } from './publication-config.mjs';

export async function checkPublicationNeeds(
  needsPath = new URL('../publication-needs.json', import.meta.url)
) {
  const needs = JSON.parse(await readFile(needsPath, 'utf8'));
  const missing = exhibits
    .filter(name => needs.exhibits?.[name] !== 'verified')
    .map(name => `  - ${name}: ${needs.exhibits?.[name] || 'missing'}`);

  const isBlocked = needs.status !== 'ready' || missing.length > 0;
  const message = isBlocked
    ? `Publication is blocked: all four existing AI exhibits need safe credential and runtime verification.\n` +
      `Status: ${needs.status}\n` +
      `Exhibit status:\n${missing.join('\n')}\n` +
      `Preserve their source and finish the activation evidence at ${needs.issue}`
    : `All exhibits verified for publication.`;

  return {
    ok: !isBlocked,
    status: needs.status,
    issue: needs.issue,
    successor: needs.successor,
    exhibits: needs.exhibits,
    missing,
    message,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await checkPublicationNeeds();
  if (!result.ok) {
    throw new Error(result.message);
  }
  console.log(result.message);
}
