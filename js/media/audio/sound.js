/**
 * @file sound.js
 * @description Sound and audio subsystem entrypoint / alias.
 * Bridges UISounds, EnhancedAudioPlayer, and ambient audio systems.
 */

'use strict';

/**
 * SoundSubsystem provides a unified entrypoint for audio playback,
 * sound effects, and audio readiness inspection.
 */
class SoundSubsystem {
  /**
   * Get the singleton EnhancedAudioPlayer instance if active.
   * @returns {Object|null}
   */
  static getPlayer() {
    return typeof window !== 'undefined'
      ? window.enhancedAudioPlayerInstance || null
      : null;
  }

  /**
   * Get UISounds interface if available.
   * @returns {Object|null}
   */
  static getUISounds() {
    return typeof window !== 'undefined' ? window.UISounds || null : null;
  }

  /**
   * Check whether Web Audio or Howler audio backend is ready.
   * @returns {boolean}
   */
  static isAudioReady() {
    if (typeof Howler !== 'undefined') {
      return true;
    }
    if (
      typeof window !== 'undefined' &&
      (window.AudioContext || window.webkitAudioContext)
    ) {
      return true;
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.SoundSubsystem = SoundSubsystem;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SoundSubsystem };
}
