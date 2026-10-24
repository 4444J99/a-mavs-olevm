/** Execute the actual chamber records and production collector, not copied models. */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
import { runInContext, createContext } from 'node:vm';

const sourceFiles = {
  symposion: 'SYMPOSION_CONFIG',
  oikos: 'OIKOS_CONFIG',
  theatron: 'THEATRON_CONFIG',
  ergasterion: 'ERGASTERION_CONFIG',
  khronos: 'KHRONOS_CONFIG',
};
const expectedCollections = {
  symposion: {
    interviews: ['interview-001', 'interview-002'],
    conversations: ['conversation-001', 'conversation-002'],
  },
  theatron: {
    performances: [
      'electronica-2015',
      'ogod-release-show',
      'modular-session-01',
    ],
    rehearsals: ['electronica-prep-01', 'visual-dev-session'],
  },
  khronos: {
    eras: ['era-genesis', 'era-expansion', 'era-refinement', 'era-integration'],
    milestones: [
      'milestone-launch',
      'milestone-first-chamber',
      'milestone-audio-system',
      'milestone-p5js-shaders',
      'milestone-ci-pipeline',
      'milestone-living-pantheon',
      'milestone-gemini-integration',
      'milestone-khronos-chamber',
    ],
  },
};

function evaluate(context, path) {
  return runInContext(readFileSync(resolve(root, path), 'utf8'), context, {
    filename: path,
  });
}

async function loadSources() {
  const context = createContext({
    console: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    dispatchEvent: vi.fn(),
    CustomEvent: class {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
  });
  context.window = context;
  evaluate(context, 'js/config.js');
  const configs = {};
  for (const [chamber, symbol] of Object.entries(sourceFiles)) {
    evaluate(context, `${chamber}/config.js`);
    configs[chamber] = runInContext(symbol, context);
  }
  evaluate(context, 'js/discovery/ContentRegistry.js');
  const registry = new context.ContentRegistry();
  await registry.initialize();
  return { registry, configs, context };
}

for (const [chamber, collections] of Object.entries(expectedCollections)) {
  describe(`${chamber} production source collections`, () => {
    for (const [collection, ids] of Object.entries(collections)) {
      it(`indexes every ${collection} record with its source identity and context`, async () => {
        const { registry, configs } = await loadSources();
        const items = registry
          .getAllItems()
          .filter(
            item => item.chamber === chamber && item.section === collection
          );
        expect(items.map(item => item.id)).toEqual(ids);
        for (const item of items) {
          const source = configs[chamber][collection].find(
            record => record.id === item.id
          );
          expect(registry.getItem(item.id)).toBe(item);
          expect(item._raw).toBe(source);
          expect(item.title).toBe(source.title || source.name);
          expect(item.description).toBe(
            source.description || source.excerpt || ''
          );
          expect(item.provenance).toEqual({
            path: `${chamber}/config.js`,
            collection,
            verification: 'unverified',
          });
          expect(item.status).toBe(source.status || 'unverified');
          expect(item.wing).toBe(
            { symposion: 'west', theatron: 'south', khronos: 'north' }[chamber]
          );
        }
      });
    }
  });
}

describe('source boundaries', () => {
  it('indexes the 21 existing named records once and leaves empty chambers empty', async () => {
    const { registry, context } = await loadSources();
    const items = registry.getAllItems();
    expect(items).toHaveLength(21);
    expect(new Set(items.map(item => item.id)).size).toBe(21);
    expect(
      items.filter(item => ['oikos', 'ergasterion'].includes(item.chamber))
    ).toEqual([]);
    expect(context.console.error).not.toHaveBeenCalled();
  });

  it('preserves precise source dates and year-only era/performance claims without inventing January 1', async () => {
    const { registry, configs } = await loadSources();
    const era = registry.getItem('era-genesis');
    expect(era.title).toBe('Genesis');
    expect(era.year).toBe(configs.khronos.eras[0].startYear);
    expect(era.date).toBeNull();
    expect(era._raw.dateRange).toBe('2022-01-01 to 2022-06-30');
    expect(registry.getItem('electronica-2015').year).toBe(2015);
    expect(registry.getItem('electronica-2015').date).toBeNull();
    expect(registry.getItem('milestone-launch').date).toBe('2022-01-15');
    expect(registry.getItem('interview-001').date).toBe('2024-01-15');
  });

  it('keeps template labels and unverified media references as source claims, without manufacturing playback', async () => {
    const { registry, configs } = await loadSources();
    expect(registry.getItem('interview-001').title).toBe(
      'Interview with [Guest Name]'
    );
    expect(registry.getItem('interview-001').status).toBe('unverified');
    const performance = registry.getItem('electronica-2015');
    expect(performance.status).toBe('unverified');
    expect(performance.image).toBeNull();
    expect(performance.url).toBeUndefined();
    expect(performance._raw.thumbnail).toBe(
      configs.theatron.performances[0].thumbnail
    );
  });
});
