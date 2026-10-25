/**
 * Akademia Chamber Configuration
 * Defines content metadata, sections, and settings for the scholarly chamber
 * Part of ETCETER4 Pantheon Project
 *
 * Chamber Details:
 * - Name: AKADEMIA
 * - Subtitle: Essays, research, papers, and scholarly work
 * - Color: #00FFFF (cyan)
 * - Secondary Color: #E0F7FF (light cyan)
 */

'use strict';

/**
 * Akademia configuration object
 * Contains metadata for essays, papers, tutorials, and research projects
 */
const akademiaConfig = {
  chamberId: 'akademia',
  chamberName: 'AKADEMIA',
  chamberSubtitle: 'Essays, research, papers, and scholarly work',
  primaryColor: '#00FFFF',
  secondaryColor: '#E0F7FF',

  /**
   * Section definitions for content organization
   */
  sections: {
    essays: {
      id: 'essays',
      title: 'Essays',
      description:
        'Long-form explorations of ideas, culture, and creative practice',
      items: [
        {
          id: 'digital-temple-web-architecture',
          title: 'The Digital Temple',
          subtitle: 'Reflections on Web Architecture as Sacred Space',
          readTime: '15 min',
        },
        {
          id: 'generative-aesthetics-browser-canvas',
          title: 'Generative Aesthetics and the Browser Canvas',
          subtitle:
            'How p5.js and WebGL reshape the relationship between artist and algorithm',
          readTime: '12 min',
        },
      ],
    },

    papers: {
      id: 'papers',
      title: 'Papers',
      description: 'Academic research papers and formal scholarly work',
      items: [
        {
          id: 'procedural-music-emotional-architecture',
          title: 'Procedural Music as Emotional Architecture',
          subtitle:
            'A framework for mapping algorithmic composition to affective states in interactive media',
          category: 'Sound Studies',
        },
        {
          id: 'spa-navigation-spatial-metaphor',
          title: 'SPA Navigation as Spatial Metaphor',
          subtitle:
            'Analyzing single-page application routing through the lens of architectural wayfinding',
          category: 'Digital Culture',
        },
      ],
    },

    tutorials: {
      id: 'tutorials',
      title: 'Tutorials',
      description: 'Educational guides and teaching materials',
      items: [
        {
          id: 'generative-art-gallery-p5js',
          title: 'Building a Generative Art Gallery with p5.js',
          subtitle:
            'Instance-mode sketches, IntersectionObserver optimization, and canvas lifecycle management',
          category: 'Creative Coding',
          level: 'Intermediate',
        },
        {
          id: 'audio-reactive-visuals-web-audio',
          title: 'Audio-Reactive Visuals with Web Audio API',
          subtitle:
            'Connecting frequency analysis to shader parameters for live audiovisual performance',
          category: 'Creative Coding',
          level: 'Advanced',
        },
        {
          id: 'spa-navigation-without-framework',
          title: 'Designing SPA Navigation Without a Framework',
          subtitle:
            'Page class patterns, transition state machines, and hash-based routing from scratch',
          category: 'Technology & Art',
          level: 'Intermediate',
        },
      ],
    },

    research: {
      id: 'research',
      title: 'Research',
      description: 'Ongoing investigations and experimental studies',
      items: [
        {
          id: 'living-pantheon-generative-atmosphere',
          title: 'Living Pantheon: Generative Atmosphere Systems',
          subtitle:
            'Research into chamber-aware ambient visual layers that respond to user navigation and presence',
          status: 'Ongoing',
        },
        {
          id: 'ogod-visual-album',
          title: 'OGOD: One Game One Day Visual Album',
          subtitle:
            '29 procedurally-generated audio-visual compositions exploring the boundaries of music and code',
          status: 'Completed',
        },
      ],
    },

    reviews: {
      id: 'reviews',
      title: 'Reviews',
      description: 'Critical analysis of books, music, art, and ideas',
      items: [
        {
          id: 'nature-of-code-shiffman',
          title: 'The Nature of Code by Daniel Shiffman',
          subtitle:
            'A review of the foundational text for creative coders bridging biology, physics, and generative art',
          type: 'Book',
        },
        {
          id: 'designing-sound-farnell',
          title: 'Designing Sound by Andy Farnell',
          subtitle:
            'Pure Data, procedural audio, and the philosophy of synthesizing reality from first principles',
          type: 'Book',
        },
      ],
    },

    studies: {
      id: 'studies',
      title: 'Studies',
      description:
        'Technique and process explorations: art-historical reference → exploration → artifact',
      items: [
        {
          id: 'newtonian-forces-line-friction',
          title: 'Force-Driven Line Systems',
          subtitle:
            'Applying Newtonian mechanics (wind, gravity, friction) to sixty independent line segments — each a mass obeying F=ma — until equilibrium dissolves into drift',
          technique: 'Physics Simulation / p5.js instance mode',
          reference: 'Paul Klee — Pedagogical Sketchbook (1925)',
          result: 'line_friction.js — live sketch in Ergasterion',
        },
        {
          id: 'perlin-noise-flow-fields',
          title: 'Noise-Field Particle Studies',
          subtitle:
            'Sampling three-dimensional Perlin noise at each particle position to derive an angle of travel; the field evolves over time, producing organic, continuously varying flow without explicit rules for the shape',
          technique: 'Perlin Noise Flow Fields / p5.js',
          reference: 'Vera Molnár — algorithmic plotter drawings (1968–)',
          result:
            'Flow Fields #7 — Pinakotheke generative series; Ergasterion noise-field experiment',
        },
        {
          id: 'audio-reactive-glsl-shaders',
          title: 'Audio-Reactive GLSL Shaders',
          subtitle:
            'Routing live frequency bands (bass, mid, treble) and beat-detection pulses into WebGL uniform variables so the shader canvas breathes with the sound — visuals as real-time audiovisual instrument',
          technique: 'Web Audio API → GLSL uniforms / p5.js WEBGL',
          reference:
            'Iannis Xenakis — UPIC graphical sound-composition system (1977)',
          result:
            'audioReactiveShader.js — AudioAnalyzerBridge integration in Ergasterion',
        },
      ],
    },
  },

  /**
   * Categories for organizing content
   */
  categories: [
    'Music Theory',
    'Sound Studies',
    'Digital Culture',
    'Technology & Art',
    'Creative Coding',
    'Philosophy',
    'Education',
    'Cultural Criticism',
    'Performance Studies',
    'Interdisciplinary Research',
  ],

  // Get all items across all sections
  getAllItems() {
    const items = [];
    Object.keys(this.sections).forEach(sectionKey => {
      if (this.sections[sectionKey].items) {
        items.push(...this.sections[sectionKey].items);
      }
    });
    return items;
  },

  // Get items by section
  getBySection(sectionId) {
    return this.sections[sectionId]?.items || [];
  },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = akademiaConfig;
}
