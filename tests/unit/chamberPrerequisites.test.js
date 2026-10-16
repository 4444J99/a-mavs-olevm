/** Cold-load regressions for the shipped chamber manifest and gallery scripts. */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const carouselScript = 'js/modules/Carousel.js';
const imagesScript = 'js/images.js';
const imageChambers = [
  'akademia',
  'bibliotheke',
  'pinakotheke',
  'agora',
  'symposion',
  'oikos',
  'odeion',
  'theatron',
  'ergasterion',
  'khronos',
  'stills',
  'diary',
];

function evaluate(context, path) {
  return runInContext(readFileSync(resolve(root, path), 'utf8'), context, {
    filename: path,
  });
}

function readManifest() {
  const registrations = new Map();
  const context = createContext({
    ChamberLoader: {
      getInstance: () => ({
        register: (id, definition) => registrations.set(id, definition),
      }),
    },
  });
  evaluate(context, 'js/chamberManifest.js');
  return registrations;
}

describe('production chamber prerequisites', () => {
  it('declares Carousel once before images in every gallery consumer', () => {
    const registrations = readManifest();
    const consumers = [...registrations].filter(([, definition]) =>
      definition.scripts.includes(imagesScript)
    );
    expect(consumers.map(([id]) => id).sort()).toEqual(
      [...imageChambers].sort()
    );
    for (const [id, { scripts }] of consumers) {
      expect(
        scripts.filter(path => path === imagesScript),
        id
      ).toHaveLength(1);
      expect(
        scripts.filter(path => path === carouselScript),
        id
      ).toHaveLength(1);
      expect(scripts.indexOf(carouselScript), id).toBeLessThan(
        scripts.indexOf(imagesScript)
      );
    }
  });

  it.each(imageChambers)('%s can initialize images on its first visit', id => {
    const registrations = readManifest();
    const scripts = registrations.get(id).scripts;
    // An empty DOM is intentional: a cold chamber visit cannot depend on an
    // earlier visit to #stills. Only the jQuery event-registration boundary is
    // stubbed; the production config, Carousel, and images code execute below.
    const jquery = () => {
      const collection = { length: 0 };
      collection.on = vi.fn(() => collection);
      return collection;
    };
    const context = createContext({ $: jquery });
    context.window = context;
    evaluate(context, 'js/config.js');
    expect(() => {
      for (const path of scripts.slice(0, scripts.indexOf(imagesScript) + 1)) {
        evaluate(context, path);
      }
    }).not.toThrow();
    expect(runInContext('stillsCarousel instanceof Carousel', context)).toBe(
      true
    );
  });
});
