#!/usr/bin/env node

/**
 * @file transcode-video.js
 * @description Transcode videos to HLS format for adaptive streaming.
 *
 * This script requires FFmpeg:
 * - macOS: brew install ffmpeg
 * - Linux: apt install ffmpeg
 * - Windows: Download from https://ffmpeg.org/download.html
 *
 * Usage:
 *   node scripts/transcode-video.js <input-file> <output-dir> [options]
 *   node scripts/transcode-video.js ./input.mp4 ./output/video-name
 *   node scripts/transcode-video.js ./input.mp4 ./output/video-name --thumbnails
 *
 * Options:
 *   --thumbnails    Generate thumbnail VTT sprite
 *   --qualities     Comma-separated quality levels (default: 1080,720,480,360)
 *   --audio-only    Only transcode audio track (for audio-only content)
 *
 * Output structure:
 *   output-dir/
 *   ├── master.m3u8           (Master playlist)
 *   ├── 1080p.m3u8            (1080p variant playlist)
 *   ├── 720p.m3u8             (720p variant playlist)
 *   ├── 480p.m3u8             (480p variant playlist)
 *   ├── 360p.m3u8             (360p variant playlist)
 *   ├── segments/             (Video segments)
 *   │   ├── 1080p_000.ts
 *   │   ├── 1080p_001.ts
 *   │   └── ...
 *   └── thumbnails.vtt        (Optional thumbnail sprite)
 */

'use strict';

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Quality presets for HLS encoding
const QUALITY_PRESETS = {
  1080: {
    resolution: '1920x1080',
    bitrate: '5000k',
    maxrate: '5500k',
    bufsize: '10000k',
    audioBitrate: '192k',
    name: '1080p',
  },
  720: {
    resolution: '1280x720',
    bitrate: '2500k',
    maxrate: '2750k',
    bufsize: '5000k',
    audioBitrate: '128k',
    name: '720p',
  },
  480: {
    resolution: '854x480',
    bitrate: '1000k',
    maxrate: '1100k',
    bufsize: '2000k',
    audioBitrate: '128k',
    name: '480p',
  },
  360: {
    resolution: '640x360',
    bitrate: '500k',
    maxrate: '550k',
    bufsize: '1000k',
    audioBitrate: '96k',
    name: '360p',
  },
};

// HLS configuration
const HLS_CONFIG = {
  segmentDuration: 6, // seconds
  playlistType: 'vod',
  hlsSegmentFilename: 'segments/%s_%03d.ts',
};

/**
 * Check if FFmpeg is installed
 */
function checkDependencies() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'pipe', timeout: 10000 });
    return true;
  } catch {
    console.error('Error: FFmpeg is not installed.');
    console.error('Install it with:');
    console.error('  macOS: brew install ffmpeg');
    console.error('  Linux: apt install ffmpeg');
    console.error('  Windows: Download from https://ffmpeg.org/download.html');
    return false;
  }
}

/**
 * Get video information using FFprobe
 * @param {string} inputPath - Path to input video
 * @returns {Object} Video info
 */
function getVideoInfo(inputPath) {
  try {
    const result = execFileSync(
      'ffprobe',
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        inputPath,
      ],
      { encoding: 'utf-8', timeout: 30000 }
    );
    return JSON.parse(result);
  } catch (error) {
    console.error('Error getting video info:', error.message);
    return null;
  }
}

/**
 * Get source video dimensions
 * @param {Object} videoInfo - FFprobe output
 * @returns {{width: number, height: number}}
 */
function getSourceDimensions(videoInfo) {
  const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
  if (videoStream) {
    return {
      width: videoStream.width,
      height: videoStream.height,
    };
  }
  return { width: 1920, height: 1080 }; // Default
}

/**
 * Filter quality presets to only those <= source resolution
 * @param {Object} sourceInfo - Video dimensions
 * @param {number[]} requestedQualities - Requested quality levels
 * @returns {Object[]} Filtered presets
 */
function filterQualityPresets(sourceInfo, requestedQualities) {
  const filtered = [];

  for (const quality of requestedQualities) {
    const preset = QUALITY_PRESETS[quality];
    if (!preset) {
      console.warn(`Unknown quality preset: ${quality}`);
      continue;
    }

    const [, height] = preset.resolution.split('x').map(Number);

    // Only include if source is >= this quality
    if (sourceInfo.height >= height) {
      filtered.push({ ...preset, quality });
    }
  }

  return filtered;
}

/**
 * Generate HLS variant for a specific quality
 * @param {string} inputPath - Input video path
 * @param {string} outputDir - Output directory
 * @param {Object} preset - Quality preset
 * @returns {Promise<boolean>}
 */
function generateVariant(inputPath, outputDir, preset) {
  return new Promise(resolve => {
    const segmentsDir = path.join(outputDir, 'segments');
    if (!fs.existsSync(segmentsDir)) {
      fs.mkdirSync(segmentsDir, { recursive: true });
    }

    const outputPlaylist = path.join(outputDir, `${preset.name}.m3u8`);
    const segmentPattern = path.join(segmentsDir, `${preset.name}_%03d.ts`);

    const args = [
      '-threads',
      '1',
      '-filter_threads',
      '1',
      '-i',
      inputPath,
      '-vf',
      `scale=${preset.resolution.replace('x', ':')}:force_original_aspect_ratio=decrease,pad=${preset.resolution.replace('x', ':')}:(ow-iw)/2:(oh-ih)/2`,
      '-c:v',
      'libx264',
      '-threads',
      '1',
      '-preset',
      'medium',
      '-crf',
      '23',
      '-b:v',
      preset.bitrate,
      '-maxrate',
      preset.maxrate,
      '-bufsize',
      preset.bufsize,
      '-c:a',
      'aac',
      '-b:a',
      preset.audioBitrate,
      '-ar',
      '44100',
      '-hls_time',
      String(HLS_CONFIG.segmentDuration),
      '-hls_playlist_type',
      HLS_CONFIG.playlistType,
      '-hls_base_url',
      'segments/',
      '-hls_segment_filename',
      segmentPattern,
      '-y',
      outputPlaylist,
    ];

    console.log(`  Encoding ${preset.name}...`);

    const proc = spawn('ffmpeg', args, { timeout: 120000 });
    let stderr = '';

    proc.stderr.on('data', data => {
      stderr = (stderr + data.toString()).slice(-8000);
      // Parse progress from FFmpeg output
      const timeMatch = stderr.match(/time=(\d+:\d+:\d+\.\d+)/);
      if (timeMatch) {
        process.stdout.write(`\r    Progress: ${timeMatch[1]}    `);
      }
    });

    proc.on('close', code => {
      process.stdout.write('\n');
      if (code === 0) {
        console.log(`    -> ${preset.name}.m3u8`);
        resolve(true);
      } else {
        console.error(`    Error encoding ${preset.name}`);
        console.error(stderr.slice(-4000));
        resolve(false);
      }
    });

    proc.on('error', err => {
      console.error(`    Error spawning ffmpeg: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * Generate master playlist
 * @param {string} outputDir - Output directory
 * @param {Object[]} variants - Array of quality presets that were generated
 */
function generateMasterPlaylist(outputDir, variants) {
  const masterPath = path.join(outputDir, 'master.m3u8');

  let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

  for (const variant of variants) {
    const [width, height] = variant.resolution.split('x');
    const bitrate = parseInt(variant.bitrate, 10) * 1000; // Convert to bits

    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bitrate},RESOLUTION=${width}x${height},NAME="${variant.name}"\n`;
    content += `${variant.name}.m3u8\n\n`;
  }

  fs.writeFileSync(masterPath, `${content.trimEnd()}\n`);
  console.log(`  -> master.m3u8`);
}

/**
 * Generate thumbnail VTT sprite
 * @param {string} inputPath - Input video path
 * @param {string} outputDir - Output directory
 * @param {Object} videoInfo - Video info from FFprobe
 * @returns {Promise<boolean>}
 */
function generateThumbnails(inputPath, outputDir, videoInfo) {
  return new Promise(resolve => {
    const duration = parseFloat(videoInfo.format.duration);
    const interval = 10; // Thumbnail every 10 seconds
    const thumbWidth = 160;
    const thumbHeight = 90;

    const thumbDir = path.join(outputDir, 'thumbs');
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    console.log('  Generating thumbnails...');

    // Generate thumbnail images
    const args = [
      '-i',
      inputPath,
      '-vf',
      `fps=1/${interval},scale=${thumbWidth}:${thumbHeight}`,
      '-q:v',
      '5',
      '-y',
      path.join(thumbDir, 'thumb_%04d.jpg'),
    ];

    const proc = spawn('ffmpeg', args);

    proc.on('close', code => {
      if (code !== 0) {
        console.error('    Error generating thumbnails');
        resolve(false);
        return;
      }

      // Generate VTT file
      const vttPath = path.join(outputDir, 'thumbnails.vtt');
      let vttContent = 'WEBVTT\n\n';

      const thumbCount = Math.ceil(duration / interval);

      for (let i = 0; i < thumbCount; i++) {
        const startTime = i * interval;
        const endTime = Math.min((i + 1) * interval, duration);

        const startStr = formatVttTime(startTime);
        const endStr = formatVttTime(endTime);

        const thumbFile = `thumbs/thumb_${String(i + 1).padStart(4, '0')}.jpg`;

        vttContent += `${startStr} --> ${endStr}\n`;
        vttContent += `${thumbFile}\n\n`;
      }

      fs.writeFileSync(vttPath, vttContent);
      console.log('    -> thumbnails.vtt');
      resolve(true);
    });

    proc.on('error', err => {
      console.error(`    Error: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * Format seconds to VTT time format (HH:MM:SS.mmm)
 * @param {number} seconds
 * @returns {string}
 */
function formatVttTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: null,
    output: null,
    thumbnails: false,
    qualities: [1080, 720, 480, 360],
    audioOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--thumbnails') {
      options.thumbnails = true;
    } else if (arg === '--qualities' && args[i + 1]) {
      options.qualities = args[++i].split(',').map(Number);
    } else if (arg === '--audio-only') {
      options.audioOnly = true;
    } else if (!options.input) {
      options.input = arg;
    } else if (!options.output) {
      options.output = arg;
    }
  }

  return options;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  if (!options.input || !options.output) {
    console.log(
      'Usage: node scripts/transcode-video.js <input-file> <output-dir> [options]'
    );
    console.log('');
    console.log('Options:');
    console.log('  --thumbnails      Generate thumbnail VTT sprite');
    console.log(
      '  --qualities       Comma-separated quality levels (default: 1080,720,480,360)'
    );
    console.log('  --audio-only      Only transcode audio track');
    console.log('');
    console.log('Example:');
    console.log(
      '  node scripts/transcode-video.js ./video.mp4 ./output/my-video --thumbnails'
    );
    process.exit(1);
  }

  // Check dependencies
  if (!checkDependencies()) {
    process.exit(1);
  }

  // Validate input file
  if (!fs.existsSync(options.input)) {
    console.error(`Error: Input file not found: ${options.input}`);
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true });
  }

  // Get video info
  console.log(`\nAnalyzing: ${options.input}`);
  const videoInfo = getVideoInfo(options.input);
  if (!videoInfo) {
    console.error('Failed to analyze input video');
    process.exit(1);
  }

  const sourceDimensions = getSourceDimensions(videoInfo);
  console.log(
    `Source resolution: ${sourceDimensions.width}x${sourceDimensions.height}`
  );

  // Filter quality presets
  const presets = filterQualityPresets(sourceDimensions, options.qualities);
  if (presets.length === 0) {
    console.error('No valid quality presets for source resolution');
    process.exit(1);
  }

  console.log(
    `Generating ${presets.length} quality variant(s): ${presets.map(p => p.name).join(', ')}\n`
  );

  // Generate variants
  const successfulVariants = [];

  for (const preset of presets) {
    const success = await generateVariant(
      options.input,
      options.output,
      preset
    );
    if (success) {
      successfulVariants.push(preset);
    }
  }

  // Generate master playlist
  if (successfulVariants.length > 0) {
    console.log('\nGenerating master playlist...');
    generateMasterPlaylist(options.output, successfulVariants);
  }

  // Generate thumbnails if requested
  if (options.thumbnails) {
    console.log('\nGenerating thumbnails...');
    await generateThumbnails(options.input, options.output, videoInfo);
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Input: ${options.input}`);
  console.log(`Output: ${options.output}`);
  console.log(`Variants: ${successfulVariants.length}/${presets.length}`);

  console.log('\nGenerated files:');
  console.log(`  ${options.output}/master.m3u8`);
  successfulVariants.forEach(v => {
    console.log(`  ${options.output}/${v.name}.m3u8`);
  });
  if (options.thumbnails) {
    console.log(`  ${options.output}/thumbnails.vtt`);
  }

  process.exit(successfulVariants.length === presets.length ? 0 : 1);
}

// Run main function
main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
