/**
 * Fast verification test covering all 29 OGOD recording bindings,
 * real disk files (non-LFS hydrated MP3s), catalogue mappings,
 * and consecutive-track transition definitions.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { isLfsPointer } from '../../scripts/stage-public.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const romanNumerals = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX',
  'XXI',
  'XXII',
  'XXIII',
  'XXIV',
  'XXV',
  'XXVI',
  'XXVII',
  'XXVIII',
  'XXIX',
];

function evaluateFile(context, relative) {
  return runInContext(readFileSync(resolve(root, relative), 'utf8'), context, {
    filename: relative,
  });
}

function setupAudioContext() {
  const sounds = [];

  const Howl = vi.fn(function (options) {
    const sound = {
      options,
      play: vi.fn(() => options.onplay?.()),
      pause: vi.fn(() => options.onpause?.()),
      stop: vi.fn(() => options.onstop?.()),
      unload: vi.fn(),
      fade: vi.fn(),
      volume: vi.fn(),
      seek: vi.fn(() => 0),
      duration: vi.fn(() => 180),
    };
    sounds.push(sound);
    return sound;
  });

  const context = createContext({
    document,
    window: globalThis.window,
    console,
    Howl,
    URL: globalThis.URL,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    location: { hostname: 'etceter4.com' },
  });
  context.window = context;

  evaluateFile(context, 'js/data/source-catalogue.js');
  evaluateFile(context, 'js/config.js');
  evaluateFile(context, 'js/data/ogodTracks.js');
  evaluateFile(context, 'audio/albums/config.js');
  evaluateFile(context, 'js/media/audio/EnhancedAudioPlayer.js');
  evaluateFile(context, 'js/media/audio/PlaylistManager.js');
  evaluateFile(context, 'js/media/MediaURLResolver.js');
  evaluateFile(context, 'odeion/config.js');

  return {
    context,
    catalogue: context.ETCETER4_SOURCE_CATALOGUE,
    config: runInContext('ETCETER4_CONFIG', context),
    legacyAlbums: runInContext('albumsConfig', context),
    odeion: runInContext('ODEION_CONFIG', context),
    EnhancedAudioPlayer: context.EnhancedAudioPlayer,
    PlaylistManager: context.PlaylistManager,
    Howl,
    sounds,
  };
}

describe('OGOD 29-track recording bindings and transitions', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<main id="catalogue"></main>';
    env = setupAudioContext();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function createPlaylist() {
    document.getElementById('catalogue').innerHTML = `
      <div id="odeion-player-container">
        <div id="odeion-controls">
          <button id="odeion-play-btn">Play</button>
          <input id="odeion-volume" type="range" min="0" max="100" value="80">
        </div>
      </div>`;
    const player = new env.EnhancedAudioPlayer();
    const manager = new env.PlaylistManager({
      container: document.getElementById('catalogue'),
      player,
    });
    manager.initialize();
    manager.selectAlbum(manager.albums.findIndex(album => album.id === 'ogod'));
    return { player, manager };
  }

  it('verifies all 29 OGOD recording files exist on disk, are valid size, and not unhydrated LFS pointers', () => {
    for (let i = 1; i <= 29; i++) {
      const padded = String(i).padStart(2, '0');
      const roman = romanNumerals[i - 1];
      const relPath = `ogod/ogodtracks/${padded} ${roman}.mp3`;
      const fullPath = resolve(root, relPath);

      expect(existsSync(fullPath), `File must exist: ${relPath}`).toBe(true);

      const stats = statSync(fullPath);
      // Each historical OGOD MP3 is between ~2MB and ~15MB; pointer stubs are ~130 bytes
      expect(
        stats.size,
        `File ${relPath} size ${stats.size} is too small to be real audio`
      ).toBeGreaterThan(1000000);

      const buffer = readFileSync(fullPath);
      expect(
        isLfsPointer(buffer),
        `File ${relPath} must not be an unhydrated Git LFS pointer`
      ).toBe(false);
    }
  });

  it('verifies source-catalogue bindings for all 29 OGOD tracks', () => {
    const ogod = env.catalogue.albums.ogod;
    expect(ogod).toBeDefined();
    expect(ogod.tracks).toHaveLength(29);

    ogod.tracks.forEach((track, index) => {
      const trackNumber = index + 1;
      const padded = String(trackNumber).padStart(2, '0');
      const roman = romanNumerals[index];

      expect(track.number).toBe(trackNumber);
      expect(track.id).toBe(`ogod-${padded}`);
      expect(track.title).toBe(roman);
      expect(track.src).toBe(`ogod/ogodtracks/${padded} ${roman}.mp3`);
      expect(track.url).toBe(`ogod/ogodtracks/${padded} ${roman}.mp3`);
      expect(typeof track.duration).toBe('string');
      expect(track.externalUrl).toContain(`https://etceter4.bandcamp.com/track/`);
    });
  });

  it('verifies legacy audio/albums/config.js and odeion/config.js bindings for all 29 tracks', () => {
    const legacyOgod = env.legacyAlbums.ogod;
    expect(legacyOgod).toBeDefined();
    expect(legacyOgod.tracks).toHaveLength(29);

    for (let i = 1; i <= 29; i++) {
      const legacyTrack = legacyOgod.tracks[i - 1];
      expect(legacyTrack.id).toBe(i);
      expect(legacyTrack.canonicalId).toBe(`ogod-${String(i).padStart(2, '0')}`);

      const audioUrl = env.odeion.getAudioUrl('ogod', i);
      const roman = romanNumerals[i - 1];
      const padded = String(i).padStart(2, '0');
      expect(audioUrl).toBe(`ogod/ogodtracks/${padded} ${roman}.mp3`);
    }
  });

  it('verifies ETCETER4_CONFIG.ogodTracks metadata definitions for all 29 tracks', () => {
    const ogodTracks = env.config.ogodTracks;
    expect(Object.keys(ogodTracks)).toHaveLength(29);

    for (let i = 1; i <= 29; i++) {
      const meta = ogodTracks[i];
      expect(meta, `Metadata for track ${i} must exist`).toBeDefined();
      expect(typeof meta.game).toBe('string');
      expect(meta.game.length).toBeGreaterThan(0);
      expect(typeof meta.archetype).toBe('string');
      expect(meta.archetype.length).toBeGreaterThan(0);
      expect(Array.isArray(meta.palette)).toBe(true);
      expect(meta.palette).toHaveLength(4);
      meta.palette.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
      expect(meta.artwork === null || typeof meta.artwork === 'string').toBe(true);
      expect(typeof meta.sourceImage).toBe('string');
    }
  });

  it('verifies consecutive-track transitions from track 1 to 29 and termination at end', () => {
    const { player, manager } = createPlaylist();
    expect(manager.queue).toHaveLength(29);

    manager.playTrack(0);
    expect(player.currentTrackIndex).toBe(0);
    expect(manager.currentTrackIndex).toBe(0);
    expect(player.isPlaying).toBe(true);

    let calls = env.Howl.mock.calls.length;

    // Verify all 28 consecutive transitions (0 -> 1 -> 2 ... -> 28)
    for (let count = 1; count < 29; count++) {
      env.Howl.mock.calls.at(-1)[0].onend();
      expect(env.Howl).toHaveBeenCalledTimes(calls + 1);
      expect(player.currentTrackIndex).toBe(count);
      expect(manager.currentTrackIndex).toBe(count);
      expect(player.isPlaying).toBe(true);
      calls = env.Howl.mock.calls.length;
    }

    // Now on track 28 (Track 29, the final track)
    expect(manager.currentTrackIndex).toBe(28);
    calls = env.Howl.mock.calls.length;

    // With repeatMode = 'none': ending track 28 must stop playback and NOT wrap
    expect(manager.repeatMode).toBe('none');
    env.Howl.mock.calls.at(-1)[0].onend();
    expect(env.Howl).toHaveBeenCalledTimes(calls);
    expect(player.currentTrackIndex).toBe(28);
    expect(manager.currentTrackIndex).toBe(28);
    expect(player.isPlaying).toBe(false);

    // With repeatMode = 'all': ending track 28 wraps around to track 0
    manager.playTrack(28);
    manager.repeatMode = 'all';
    calls = env.Howl.mock.calls.length;
    env.Howl.mock.calls.at(-1)[0].onend();
    expect(env.Howl).toHaveBeenCalledTimes(calls + 1);
    expect(player.currentTrackIndex).toBe(0);
    expect(manager.currentTrackIndex).toBe(0);
    expect(player.isPlaying).toBe(true);

    // With repeatMode = 'one': ending track 0 repeats track 0
    manager.repeatMode = 'one';
    calls = env.Howl.mock.calls.length;
    env.Howl.mock.calls.at(-1)[0].onend();
    expect(env.Howl).toHaveBeenCalledTimes(calls + 1);
    expect(player.currentTrackIndex).toBe(0);
    expect(manager.currentTrackIndex).toBe(0);
    expect(player.isPlaying).toBe(true);

    manager.dispose();
    player.dispose();
  });
});
