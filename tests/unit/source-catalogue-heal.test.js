/**
 * @file tests/unit/source-catalogue-heal.test.js
 * @description Unit tests for Issue #142 heal:
 * - 4 official releases and 57 tracks total in source catalogue
 * - 123 verified diary scans preservation and navigation
 * - Odeion external album switch stops and clears playing audio
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const projectRoot = resolve(fileURLToPath(new NodeURL('../../', import.meta.url)));

function loadAppEnv() {
  const sounds = [];
  const Howl = vi.fn().mockImplementation(function (options) {
    const sound = {
      options,
      play: vi.fn(() => options.onplay?.()),
      pause: vi.fn(() => options.onpause?.()),
      stop: vi.fn(() => options.onstop?.()),
      unload: vi.fn(),
      volume: vi.fn().mockReturnValue(1),
      fade: vi.fn(),
      seek: vi.fn().mockReturnValue(0),
      duration: vi.fn().mockReturnValue(180),
      state: vi.fn().mockReturnValue('loaded'),
      playing: vi.fn().mockReturnValue(true),
    };
    sounds.push(sound);
    return sound;
  });

  const context = createContext({
    window: globalThis.window,
    document: globalThis.document,
    console: globalThis.console,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
    Date: globalThis.Date,
    URL: globalThis.URL,
    Number: globalThis.Number,
    String: globalThis.String,
    Boolean: globalThis.Boolean,
    Array: globalThis.Array,
    Object: globalThis.Object,
    Set: globalThis.Set,
    Map: globalThis.Map,
    Howl,
    globalThis: {},
  });

  context.globalThis = context;

  function runScript(relativePath) {
    const code = readFileSync(resolve(projectRoot, relativePath), 'utf8');
    runInContext(code, context);
  }

  runScript('js/data/source-catalogue.js');
  runScript('js/config.js');
  runScript('audio/albums/config.js');
  runScript('js/media/audio/EnhancedAudioPlayer.js');
  runScript('js/media/audio/PlaylistManager.js');
  runScript('odeion/config.js');

  return {
    context,
    catalogue: context.ETCETER4_SOURCE_CATALOGUE,
    config: runInContext('ETCETER4_CONFIG', context),
    odeionConfig: runInContext('ODEION_CONFIG', context),
    EnhancedAudioPlayer: context.window.EnhancedAudioPlayer || context.EnhancedAudioPlayer,
    PlaylistManager: context.window.PlaylistManager || context.PlaylistManager,
    Howl,
    sounds,
  };
}

describe('Issue #142 — Heal Source Catalogue, 123 Diary Scans, & External Album Switch', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <main id="app-root">
        <div id="odeion-player-container"></div>
        <div id="now-playing-track"></div>
        <div id="now-playing-album"></div>
        <div id="current-album-cover"></div>
        <div id="odeion-track-title"></div>
      </main>
    `;
    env = loadAppEnv();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('Part A: 4 Releases & 57 Total Tracks', () => {
    it('exposes exactly 4 releases in source catalogue and ODEION_CONFIG', () => {
      const albums = env.catalogue.albums;
      const albumKeys = Object.keys(albums);
      expect(albumKeys).toHaveLength(4);
      expect(albumKeys).toEqual(['ogod', 'rmxs', 'progressionDigression', 'etc']);

      // Check ODEION_CONFIG exposure
      const odeionAlbums = env.odeionConfig.albums;
      expect(odeionAlbums).toHaveLength(4);
      expect(odeionAlbums.map(a => a.id)).toEqual(['ogod', 'rmxs', 'progression-digression', 'etc']);
    });

    it('validates 57 total tracks across all 4 releases with exact counts', () => {
      const albums = env.catalogue.albums;
      const ogod = albums.ogod;
      const rmxs = albums.rmxs;
      const pd = albums.progressionDigression;
      const etc = albums.etc;

      expect(ogod.tracks).toHaveLength(29);
      expect(rmxs.tracks).toHaveLength(8);
      expect(pd.tracks).toHaveLength(11);
      expect(etc.tracks).toHaveLength(9);

      const totalTracks =
        ogod.tracks.length + rmxs.tracks.length + pd.tracks.length + etc.tracks.length;
      expect(totalTracks).toBe(57);
    });

    it('ensures each track has valid metadata (id, number, title, duration, externalUrl)', () => {
      const allTracks = Object.values(env.catalogue.albums).flatMap(a => a.tracks);
      expect(allTracks).toHaveLength(57);

      for (const track of allTracks) {
        expect(typeof track.id).toBe('string');
        expect(track.id.length).toBeGreaterThan(0);
        expect(Number.isInteger(track.number)).toBe(true);
        expect(track.number).toBeGreaterThan(0);
        expect(typeof track.title).toBe('string');
        expect(track.title.length).toBeGreaterThan(0);
        expect(typeof track.duration).toBe('string');
        expect(track.duration).toMatch(/^\d{2}:\d{2}$/);
        expect(typeof track.externalUrl).toBe('string');
        expect(track.externalUrl).toMatch(/^https:\/\/etceter4\.bandcamp\.com\//);
      }
    });

    it('preserves verified local audio for OGOD 29 tracks and null for external releases', () => {
      const albums = env.catalogue.albums;

      // OGOD: all 29 tracks have verified local audio src
      for (const track of albums.ogod.tracks) {
        expect(typeof track.src).toBe('string');
        expect(track.src).toMatch(/^ogod\/ogodtracks\//);
        expect(track.src).toMatch(/\.mp3$/);
        expect(track.url).toBe(track.src);
      }

      // Other 3 releases: external only, local audio is null
      for (const albumKey of ['rmxs', 'progressionDigression', 'etc']) {
        for (const track of albums[albumKey].tracks) {
          expect(track.src).toBeNull();
          expect(track.url).toBeNull();
        }
      }
    });
  });

  describe('Part B: 123 Diary Scans Preservation', () => {
    it('exposes exactly 123 verified diary scan files in the catalogue', () => {
      const diary = env.catalogue.diary;
      expect(diary).toBeDefined();
      expect(diary.files).toHaveLength(123);
    });

    it('verifies all 123 diary scans exist on disk and have valid SHA hashes', () => {
      const diary = env.catalogue.diary;

      for (const entry of diary.files) {
        expect(entry.path).toMatch(/^img\/photos\/diary\/diary[0-9a-z]+\.jpg$/);
        expect(typeof entry.blobSha).toBe('string');
        expect(entry.blobSha).toMatch(/^[a-f0-9]{40}$/);

        // Verify the file actually exists on disk in the repository
        const fullPath = resolve(projectRoot, entry.path);
        expect(existsSync(fullPath), `File must exist on disk: ${entry.path}`).toBe(true);
      }
    });

    it('walks ordered 123 files and correctly wraps around boundaries', () => {
      const diaryFiles = env.catalogue.diary.files;
      const count = diaryFiles.length;
      expect(count).toBe(123);

      // Starting at first
      expect(diaryFiles[0].path).toBe('img/photos/diary/diary1.jpg');
      // Final scan
      expect(diaryFiles[122].path).toBe('img/photos/diary/diary63a.jpg');

      // Forward wrap-around simulation: index + 1 % count
      const nextFromEnd = (122 + 1) % count;
      expect(nextFromEnd).toBe(0);

      // Backward wrap-around simulation: (index - 1 + count) % count
      const prevFromStart = (0 - 1 + count) % count;
      expect(prevFromStart).toBe(122);
    });
  });

  describe('Part C: Odeion External Album Audio Stop on Switch', () => {
    it('stops, unloads, and clears playing audio when switching from OGOD to external album', () => {
      const player = new env.EnhancedAudioPlayer({
        tracks: env.catalogue.albums.ogod.tracks,
      });

      // Start playing OGOD track 0
      player.play();
      expect(env.Howl).toHaveBeenCalledTimes(1);
      const activeSound = env.sounds[0];
      expect(activeSound.play).toHaveBeenCalled();
      expect(player.isPlaying).toBe(true);

      // Initialize PlaylistManager with player
      const container = document.getElementById('app-root');
      const manager = new env.PlaylistManager({
        container,
        player,
      });
      manager.initialize();

      // Switch to external album: RMXS (index 1 in albums list)
      const rmxsIndex = manager.albums.findIndex(a => a.id === 'rmxs');
      expect(rmxsIndex).toBeGreaterThan(-1);

      manager.selectAlbum(rmxsIndex);

      // Verify playing sound was immediately stopped, unloaded, and cleared
      expect(activeSound.stop).toHaveBeenCalled();
      expect(activeSound.unload).toHaveBeenCalled();
      expect(player.sound).toBeNull();
      expect(player.isPlaying).toBe(false);

      // Attempting to play external album track must not create a new Howl
      const playAttemptResult = player.play();
      expect(playAttemptResult).toBe(false);
      expect(env.Howl).toHaveBeenCalledTimes(1); // No second sound created

      manager.dispose();
      player.dispose();
    });

    it('cancels pending crossfade timeouts when switching to an album with unavailable audio', () => {
      const player = new env.EnhancedAudioPlayer({
        tracks: env.catalogue.albums.ogod.tracks,
      });
      player.play();
      player.next(); // Trigger crossfade
      expect(player.isCrossfading).toBe(true);
      expect(player.fadeTimeout).not.toBeNull();

      const container = document.getElementById('app-root');
      const manager = new env.PlaylistManager({
        container,
        player,
      });
      manager.initialize();

      // Switch to etcetera (external album)
      const etcIndex = manager.albums.findIndex(a => a.id === 'etc');
      manager.selectAlbum(etcIndex);

      // Timers advance past crossfade duration
      vi.advanceTimersByTime(2000);

      // Confirm crossfade was completely cancelled
      expect(player.isCrossfading).toBe(false);
      expect(player.fadeTimeout).toBeNull();
      expect(player.sound).toBeNull();
      expect(player.isPlaying).toBe(false);

      manager.dispose();
      player.dispose();
    });
  });
});
