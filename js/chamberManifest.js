'use strict';

/**
 * @file chamberManifest.js
 * @description Declares every extractable chamber's assets (HTML fragment, scripts, styles).
 * Loaded eagerly but triggers nothing — ChamberLoader.ensureLoaded() activates on navigation.
 * Scripts are loaded sequentially via ScriptLoader to preserve dependency order.
 *
 * @requires ChamberLoader
 */

(function () {
  if (typeof ChamberLoader === 'undefined') {
    return;
  }

  // eslint-disable-next-line no-undef
  const loader = ChamberLoader.getInstance();

  // Shared scripts used by multiple chambers (ScriptLoader deduplicates)
  const CAROUSEL = 'js/modules/Carousel.js';
  // images.js creates a Carousel immediately; preserve this prerequisite on cold entry.
  const IMAGE_SCRIPTS = [CAROUSEL, 'js/images.js'];
  const DIARY = 'js/diary.js';

  // ── East Wing ──────────────────────────────────────────────
  loader.register('akademia', {
    html: 'chambers/akademia/fragment.html',
    scripts: [
      ...IMAGE_SCRIPTS,
      'akademia/config.js',
      'js/akademia/AkademiaRenderer.js',
    ],
    styles: [],
  });

  loader.register('bibliotheke', {
    html: 'chambers/bibliotheke/fragment.html',
    scripts: [
      ...IMAGE_SCRIPTS,
      'bibliotheke/config.js',
      'js/generative/BibliothekePoetry.js',
    ],
    styles: [],
  });

  loader.register('pinakotheke', {
    html: 'chambers/pinakotheke/fragment.html',
    scripts: [
      ...IMAGE_SCRIPTS,
      'pinakotheke/config.js',
      'js/generative/PinakothekeGenerator.js',
    ],
    styles: [],
  });

  // ── West Wing ──────────────────────────────────────────────
  loader.register('agora', {
    html: 'chambers/agora/fragment.html',
    scripts: [...IMAGE_SCRIPTS, 'agora/config.js'],
    styles: [],
  });

  loader.register('symposion', {
    html: 'chambers/symposion/fragment.html',
    scripts: [...IMAGE_SCRIPTS, 'js/generative/SymposionDialogues.js'],
    styles: [],
  });

  loader.register('oikos', {
    html: 'chambers/oikos/fragment.html',
    scripts: [...IMAGE_SCRIPTS, 'js/generative/OikosJournal.js'],
    styles: [],
  });

  // ── South Wing ─────────────────────────────────────────────
  loader.register('odeion', {
    html: 'chambers/odeion/fragment.html',
    scripts: [
      ...IMAGE_SCRIPTS,
      'odeion/config.js',
      'dependencies/vendor/howler/howler.core.min.js',
      'js/media/MediaURLResolver.js',
      'js/media/audio/EnhancedAudioPlayer.js',
      'js/media/audio/WaveformVisualizer.js',
      'js/media/audio/PlaylistManager.js',
      'js/media/audio/LyricsSync.js',
    ],
    styles: [],
  });

  loader.register('theatron', {
    html: 'chambers/theatron/fragment.html',
    scripts: [...IMAGE_SCRIPTS, 'js/generative/TheatronVisuals.js'],
    styles: [],
  });

  // ── North Wing ─────────────────────────────────────────────
  loader.register('ergasterion', {
    html: 'chambers/ergasterion/fragment.html',
    scripts: [
      ...IMAGE_SCRIPTS,
      'js/ergasterion/ExhibitBridge.js',
      'js/ergasterion/ExhibitPortal.js',
    ],
    styles: [],
  });

  loader.register('khronos', {
    html: 'chambers/khronos/fragment.html',
    scripts: [...IMAGE_SCRIPTS, 'js/generative/KhronosTimeline.js'],
    styles: [],
  });

  // ── Heavy Pages ────────────────────────────────────────────
  loader.register('ogod3d', {
    html: 'chambers/ogod3d/fragment.html',
    scripts: [
      {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js',
        crossOrigin: 'anonymous',
        integrity:
          'sha384-3946Q06UAmZay3zeE4BKiFHZUjTbO8RWJf6qxfhuK9SMP+RPHdztQL1I9vJqPgPZ',
      },
      'js/3d/postprocessing/ThreePostProcessing.js',
      'js/ogod/OGOD3DController.js',
      'js/3d/ogod/controls/FirstPersonController.js',
      'js/3d/ogod/environments/EnvironmentBase.js',
      'js/3d/ogod/environments/GradientFogEnv.js',
      'js/3d/ogod/environments/StripeBarEnv.js',
      'js/3d/ogod/environments/BokehGridEnv.js',
      'js/3d/ogod/environments/HighContrastEnv.js',
      'js/3d/ogod/environments/LayeredColorsEnv.js',
      'js/3d/ogod/environments/GlitchDigitalEnv.js',
      'js/3d/ogod/OGODSceneManager.js',
      'js/3d/ogod/OGODAudioEngine.js',
    ],
    styles: [],
  });

  loader.register('ogod-viewer', {
    html: 'chambers/ogod-viewer/fragment.html',
    scripts: [
      'js/ogod/OGODViewerController.js',
      'js/ogod/OGODFrameSequencer.js',
      'js/ogod/OGODImageLoader.js',
      'js/ogod/renderers/OGODCanvasRenderer.js',
      'js/ogod/renderers/OGODWebGLRenderer.js',
      'js/ogod/renderers/OGODGenerativeRenderer.js',
      'js/ogod/renderers/OGODTKOLRenderer.js',
      'js/ogod/OGODExportPipeline.js',
      'js/ogod/OGODAudioAdapter.js',
      'js/ogod/OGODAnimationEngine.js',
      'js/ogod.js',
    ],
    styles: [],
  });

  loader.register('discovery', {
    html: 'chambers/discovery/fragment.html',
    scripts: [
      {
        src: 'https://cdn.jsdelivr.net/npm/minisearch@6.3.0/dist/umd/index.js',
        crossOrigin: 'anonymous',
        integrity:
          'sha384-rOQt62aHbMfSFddgQU78TokzAkqU6b+HoSm/dJMCz6Tn8rMlfE9FUprXQKgyIyBV',
      },
      // Load metadata without activating every chamber's renderers or media.
      // Otherwise a first-use search permanently indexes zero unvisited items.
      'akademia/config.js',
      'bibliotheke/config.js',
      'pinakotheke/config.js',
      'odeion/config.js',
      'agora/config.js',
      'symposion/config.js',
      'oikos/config.js',
      'theatron/config.js',
      'ergasterion/config.js',
      'khronos/config.js',
      'js/discovery/ContentRegistry.js',
      'js/discovery/SearchEngine.js',
      'js/discovery/FilterSystem.js',
      'js/discovery/RelatedWorksEngine.js',
      'js/discovery/ShareLinks.js',
      'js/discovery/DiscoveryController.js',
    ],
    styles: [],
  });

  // ── Gallery Pages ──────────────────────────────────────────
  loader.register('stills', {
    html: 'chambers/stills/fragment.html',
    scripts: [...IMAGE_SCRIPTS],
    styles: [],
  });

  loader.register('diary', {
    html: 'chambers/diary/fragment.html',
    scripts: [...IMAGE_SCRIPTS, DIARY],
    styles: [],
  });

  loader.register('video', {
    html: 'chambers/video/fragment.html',
    scripts: [
      {
        src: 'https://vjs.zencdn.net/8.6.1/video.min.js',
        crossOrigin: 'anonymous',
        integrity:
          'sha384-7WJd15qzjuxEd6cGsqMXUooY6KsQuT9lKEkD7sFJVQKpTh3I5MbGcoGoJEMzNZJf',
      },
      {
        src: 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js',
        crossOrigin: 'anonymous',
        integrity:
          'sha384-miJUhTuRucSoqFe3/VSB2sRghSMoev6wpPoEyj5fhF0PARehD+naPBsAkl5NqwPO',
      },
      'js/media/video/HLSLoader.js',
      'js/media/video/EnhancedVideoPlayer.js',
    ],
    styles: [],
  });
})();
