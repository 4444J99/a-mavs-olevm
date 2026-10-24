/**
 * @file tests/unit/setup.js
 * @description Test setup and mocks for Vitest unit tests
 * Provides mocked Three.js and Tone.js objects for testing
 */

import { vi } from 'vitest';

// Mock THREE.js namespace
const createMockVector3 = (x = 0, y = 0, z = 0) => {
  const vec = { x, y, z };
  vec.clone = vi
    .fn()
    .mockImplementation(() => createMockVector3(vec.x, vec.y, vec.z));
  vec.copy = vi.fn().mockImplementation(other => {
    vec.x = other.x;
    vec.y = other.y;
    vec.z = other.z;
    return vec;
  });
  vec.add = vi.fn().mockImplementation(other => {
    vec.x += other?.x || 0;
    vec.y += other?.y || 0;
    vec.z += other?.z || 0;
    return vec;
  });
  vec.sub = vi.fn().mockReturnValue(vec);
  vec.multiplyScalar = vi.fn().mockImplementation(scalar => {
    vec.x *= scalar;
    vec.y *= scalar;
    vec.z *= scalar;
    return vec;
  });
  vec.normalize = vi.fn().mockReturnValue(vec);
  vec.crossVectors = vi.fn().mockReturnValue(vec);
  vec.lerp = vi.fn().mockReturnValue(vec);
  vec.length = vi.fn().mockImplementation(() => {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
  });
  vec.lengthSq = vi.fn().mockImplementation(() => {
    return vec.x * vec.x + vec.y * vec.y + vec.z * vec.z;
  });
  vec.set = vi.fn().mockImplementation((newX, newY, newZ) => {
    vec.x = newX;
    vec.y = newY;
    vec.z = newZ;
    return vec;
  });
  vec.distanceTo = vi.fn().mockImplementation(other => {
    const dx = vec.x - (other?.x || 0);
    const dy = vec.y - (other?.y || 0);
    const dz = vec.z - (other?.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  });
  return vec;
};
const mockVector3 = vi.fn().mockImplementation(function (x, y, z) {
  return createMockVector3(x, y, z);
});

const mockVector2 = vi.fn().mockImplementation(function (x = 0, y = 0) {
  const vec = { x, y };
  vec.set = vi.fn().mockImplementation((newX, newY) => {
    vec.x = newX;
    vec.y = newY;
    return vec;
  });
  vec.clone = vi.fn().mockReturnValue({ x: vec.x, y: vec.y });
  return vec;
});

const mockColor = vi.fn().mockImplementation(function (colorInput) {
  let r = 1,
    g = 1,
    b = 1;

  // Check for 3 numeric args first (r, g, b)
  if (arguments.length === 3) {
    r = arguments[0];
    g = arguments[1];
    b = arguments[2];
  } else if (typeof colorInput === 'string' && colorInput.startsWith('#')) {
    // Parse hex string
    const hex = parseInt(colorInput.slice(1), 16);
    r = ((hex >> 16) & 255) / 255;
    g = ((hex >> 8) & 255) / 255;
    b = (hex & 255) / 255;
  } else if (typeof colorInput === 'number') {
    // Parse hex number
    r = ((colorInput >> 16) & 255) / 255;
    g = ((colorInput >> 8) & 255) / 255;
    b = (colorInput & 255) / 255;
  }

  const color = { r, g, b };
  color.setHex = vi.fn().mockImplementation(hex => {
    color.r = ((hex >> 16) & 255) / 255;
    color.g = ((hex >> 8) & 255) / 255;
    color.b = (hex & 255) / 255;
    return color;
  });
  color.clone = vi
    .fn()
    .mockImplementation(() => mockColor(color.r, color.g, color.b));
  return color;
});

const mockEuler = vi.fn().mockImplementation(function (
  x = 0,
  y = 0,
  z = 0,
  order = 'XYZ'
) {
  return {
    x,
    y,
    z,
    order,
    setFromQuaternion: vi.fn().mockReturnThis(),
  };
});

const mockQuaternion = vi.fn().mockImplementation(function () {
  return {
    setFromEuler: vi.fn().mockReturnThis(),
  };
});

const mockClock = vi.fn().mockImplementation(function () {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    getDelta: vi.fn().mockReturnValue(0.016),
    getElapsedTime: vi.fn().mockReturnValue(0),
  };
});

const mockWebGLRenderer = vi.fn().mockImplementation(function () {
  return {
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    getSize: vi.fn().mockReturnValue({ x: 800, y: 600 }),
    setRenderTarget: vi.fn(),
    domElement: document.createElement('canvas'),
    outputColorSpace: '',
    toneMapping: 0,
    toneMappingExposure: 1,
  };
});

const mockScene = vi.fn().mockImplementation(function () {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn(),
    background: null,
    fog: null,
  };
});

const mockPerspectiveCamera = vi
  .fn()
  .mockImplementation(function (fov, aspect, near, far) {
    const position = createMockVector3(0, 0, 5);
    return {
      fov,
      aspect,
      near,
      far,
      position,
      quaternion: { setFromEuler: vi.fn() },
      updateProjectionMatrix: vi.fn(),
      getWorldDirection: vi.fn().mockImplementation(target => target),
      getWorldPosition: vi.fn().mockImplementation(target => {
        if (target) {
          target.x = position.x;
          target.y = position.y;
          target.z = position.z;
        }
        return target;
      }),
    };
  });

const mockBufferGeometry = vi.fn().mockImplementation(function () {
  return {
    setAttribute: vi.fn(),
    dispose: vi.fn(),
  };
});

const mockBufferAttribute = vi
  .fn()
  .mockImplementation(function (array, itemSize) {
    return {
      array,
      itemSize,
    };
  });

const mockMesh = vi.fn().mockImplementation(function (geometry, material) {
  return {
    geometry,
    material,
    position: { x: 0, y: 0, z: 0, set: vi.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    visible: true,
    name: '',
    userData: {},
    add: vi.fn(),
  };
});

const mockGroup = vi.fn().mockImplementation(function () {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    position: { x: 0, y: 0, z: 0, set: vi.fn(), copy: vi.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1, set: vi.fn() },
    visible: true,
    name: '',
    userData: {},
    getWorldPosition: vi.fn().mockImplementation(target => target),
  };
});

const mockLine = vi.fn().mockImplementation(function (geometry, material) {
  return {
    geometry,
    material,
    position: { x: 0, y: 0, z: 0, set: vi.fn() },
    scale: { x: 1, y: 1, z: 1, z: 1 },
    visible: true,
    userData: {},
  };
});

const mockRingGeometry = vi.fn().mockImplementation(function () {
  return {
    dispose: vi.fn(),
    rotateX: vi.fn().mockReturnThis(),
  };
});

const mockCircleGeometry = vi.fn().mockImplementation(function () {
  return {
    dispose: vi.fn(),
    rotateX: vi.fn().mockReturnThis(),
  };
});

const mockCylinderGeometry = vi.fn().mockImplementation(function () {
  return {
    dispose: vi.fn(),
  };
});

const mockPoints = vi.fn().mockImplementation(function (geometry, material) {
  return {
    geometry: geometry || { dispose: vi.fn(), setAttribute: vi.fn() },
    material: material || { dispose: vi.fn(), uniforms: {} },
    position: { x: 0, y: 0, z: 0, set: vi.fn() },
    visible: true,
    name: '',
  };
});

const mockMaterial = {
  dispose: vi.fn(),
  color: { r: 1, g: 1, b: 1 },
};

const mockMatrix4 = vi.fn().mockImplementation(function () {
  return {
    copy: vi.fn().mockReturnThis(),
    multiply: vi.fn().mockReturnThis(),
    makeRotationFromQuaternion: vi.fn().mockReturnThis(),
    makeTranslation: vi.fn().mockReturnThis(),
    elements: new Float32Array(16),
  };
});

// Create THREE mock namespace and stub it globally
const THREEMock = {
  Vector3: mockVector3,
  Vector2: mockVector2,
  Color: mockColor,
  Euler: mockEuler,
  Quaternion: mockQuaternion,
  Matrix4: mockMatrix4,
  Clock: mockClock,
  WebGLRenderer: mockWebGLRenderer,
  Scene: mockScene,
  PerspectiveCamera: mockPerspectiveCamera,
  OrthographicCamera: vi.fn().mockImplementation(function () {
    return {};
  }),
  BufferGeometry: mockBufferGeometry,
  BufferAttribute: mockBufferAttribute,
  Mesh: mockMesh,
  Group: mockGroup,
  Line: mockLine,
  Points: mockPoints,
  SphereGeometry: vi.fn().mockImplementation(function () {
    return { dispose: vi.fn() };
  }),
  PlaneGeometry: vi.fn().mockImplementation(function () {
    return { dispose: vi.fn() };
  }),
  BoxGeometry: vi.fn().mockImplementation(function () {
    return { dispose: vi.fn() };
  }),
  RingGeometry: mockRingGeometry,
  CircleGeometry: mockCircleGeometry,
  CylinderGeometry: mockCylinderGeometry,
  IcosahedronGeometry: vi.fn().mockImplementation(function () {
    return { dispose: vi.fn() };
  }),
  Float32BufferAttribute: vi
    .fn()
    .mockImplementation(function (array, itemSize) {
      return {
        array,
        itemSize,
        setXYZ: vi.fn(),
        needsUpdate: false,
      };
    }),
  LineBasicMaterial: vi.fn().mockImplementation(function () {
    return {
      ...mockMaterial,
      vertexColors: true,
    };
  }),
  Raycaster: vi.fn().mockImplementation(function () {
    return {
      ray: {
        origin: { setFromMatrixPosition: vi.fn() },
        direction: { set: vi.fn().mockReturnThis(), applyMatrix4: vi.fn() },
      },
      intersectObjects: vi.fn().mockReturnValue([]),
    };
  }),
  MeshBasicMaterial: vi.fn().mockImplementation(function () {
    return { ...mockMaterial };
  }),
  MeshStandardMaterial: vi.fn().mockImplementation(function () {
    return { ...mockMaterial };
  }),
  PointsMaterial: vi.fn().mockImplementation(function () {
    return { ...mockMaterial };
  }),
  ShaderMaterial: vi.fn().mockImplementation(function (options) {
    // Deep copy uniforms with proper value structure
    const uniforms = {};
    if (options?.uniforms) {
      for (const [key, val] of Object.entries(options.uniforms)) {
        uniforms[key] = { value: val?.value ?? 0 };
      }
    }
    return {
      dispose: vi.fn(),
      uniforms,
      vertexShader: options?.vertexShader || '',
      fragmentShader: options?.fragmentShader || '',
    };
  }),
  AmbientLight: vi.fn().mockImplementation(function () {
    return {};
  }),
  DirectionalLight: vi.fn().mockImplementation(function () {
    return { position: { set: vi.fn() } };
  }),
  PointLight: vi.fn().mockImplementation(function () {
    return { position: { set: vi.fn() } };
  }),
  Fog: vi.fn().mockImplementation(function (color, near, far) {
    return { color, near, far };
  }),
  FogExp2: vi.fn().mockImplementation(function (color, density) {
    return { color, density };
  }),
  WebGLRenderTarget: vi.fn().mockImplementation(function () {
    return {
      texture: {},
      setSize: vi.fn(),
      dispose: vi.fn(),
    };
  }),
  LinearFilter: 1,
  RGBAFormat: 1,
  FloatType: 1015,
  UnsignedByteType: 1009,
  SRGBColorSpace: 'srgb',
  ACESFilmicToneMapping: 4,
  AdditiveBlending: 2,
  DoubleSide: 2,
  MathUtils: {
    degToRad: deg => (deg * Math.PI) / 180,
    radToDeg: rad => (rad * 180) / Math.PI,
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
  },
  // Post-processing classes (simple mocks)
  EffectComposer: vi.fn().mockImplementation(function () {
    return {
      addPass: vi.fn(),
      render: vi.fn(),
      setSize: vi.fn(),
      dispose: vi.fn(),
    };
  }),
  RenderPass: vi.fn().mockImplementation(function () {
    return {
      enabled: true,
      render: vi.fn(),
    };
  }),
  UnrealBloomPass: vi.fn().mockImplementation(function () {
    return {
      enabled: true,
      strength: 0.5,
      threshold: 0.8,
      radius: 0.5,
      render: vi.fn(),
      dispose: vi.fn(),
    };
  }),
};

// Expose THREE globally for all environments (jsdom + node)
global.THREE = THREEMock;
globalThis.THREE = THREEMock;
if (typeof window !== 'undefined') {
  window.THREE = THREEMock;
}

// Mock Tone.js namespace
const mockTonePlayer = vi.fn().mockImplementation(function () {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    toSeconds: vi.fn().mockReturnValue(0),
    loaded: Promise.resolve(),
  };
});

const mockToneGain = vi.fn().mockImplementation(function (value = 1) {
  return {
    gain: { value, setValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  };
});

const mockToneReverb = vi.fn().mockImplementation(function () {
  return {
    wet: { value: 0.3, setValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  };
});

const mockToneFeedbackDelay = vi.fn().mockImplementation(function () {
  return {
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  };
});

const mockToneAnalyser = vi.fn().mockImplementation(function () {
  return {
    getValue: vi.fn().mockReturnValue(new Float32Array(1024)),
    dispose: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    smoothing: 0.8,
  };
});

const ToneMock = {
  Player: mockTonePlayer,
  Gain: mockToneGain,
  Reverb: mockToneReverb,
  FeedbackDelay: mockToneFeedbackDelay,
  Analyser: mockToneAnalyser,
  start: vi.fn().mockResolvedValue(undefined),
  now: vi.fn().mockReturnValue(0),
  context: {
    sampleRate: 44100,
  },
};
global.Tone = ToneMock;
globalThis.Tone = ToneMock;
if (typeof window !== 'undefined') {
  window.Tone = ToneMock;
}

// Mock global configuration
global.ETCETER4_CONFIG = {
  threeD: {
    weatherApiKey: '',
    astronomyApiId: '',
    astronomyApiSecret: '',
    ogodEnv: {
      camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        moveSpeed: 5.0,
        lookSpeed: 0.002,
      },
      fog: {
        enabled: true,
        near: 1,
        far: 50,
        density: 0.02,
      },
      postProcessing: {
        bloom: { enabled: true, strength: 0.5, threshold: 0.8, radius: 0.5 },
      },
      audio: {
        masterVolume: 0.8,
        stemBlendRadius: 15,
        reverbMix: 0.3,
        delayTime: 0.2,
      },
    },
  },
  ogodTracks: {
    1: {
      game: 'Animal Crossing',
      archetype: 'gradient-fog',
      palette: ['#6B4C7A', '#C45B8E', '#D98C4A', '#5A6B3D'],
    },
  },
};

// Mock localStorage for jsdom environment
const localStorageMock = {
  store: {},
  getItem: vi.fn(key => localStorageMock.store[key] || null),
  setItem: vi.fn((key, value) => {
    localStorageMock.store[key] = String(value);
  }),
  removeItem: vi.fn(key => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  get length() {
    return Object.keys(localStorageMock.store).length;
  },
  key: vi.fn(i => Object.keys(localStorageMock.store)[i] || null),
};
global.localStorage = localStorageMock;
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

// Mock window.devicePixelRatio
global.window = global.window || {};
Object.defineProperty(global.window, 'devicePixelRatio', {
  value: 1,
  writable: true,
  configurable: true,
});

// Mock requestAnimationFrame — return incrementing IDs without scheduling
// to prevent infinite recursive loops from render() methods during tests
let rafId = 0;
global.requestAnimationFrame = vi.fn(() => ++rafId);
global.cancelAnimationFrame = vi.fn();

// Mock navigator
global.navigator = {
  ...global.navigator,
  geolocation: {
    getCurrentPosition: vi.fn(success => {
      success({ coords: { latitude: 40.7128, longitude: -74.006 } });
    }),
  },
  maxTouchPoints: 0,
  vibrate: vi.fn(),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
  deviceMemory: 8,
  xr: {
    isSessionSupported: vi.fn().mockResolvedValue(true),
    requestSession: vi.fn().mockResolvedValue({
      requestReferenceSpace: vi.fn().mockResolvedValue({}),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    }),
  },
};

// Mock fetch
globalThis.__nativeFetch = globalThis.fetch;
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({}),
});

// Mock Howler.js
const createMockHowl = vi.fn().mockImplementation(function (options = {}) {
  let isPlaying = false;
  let currentVolume = options.volume ?? 1;
  let currentSeek = 0;
  const duration = options._duration ?? 180; // 3 minutes default
  const callbacks = {};

  return {
    play: vi.fn().mockImplementation(() => {
      isPlaying = true;
      if (callbacks.play) callbacks.play.forEach(cb => cb());
      return 1; // sound id
    }),
    pause: vi.fn().mockImplementation(() => {
      isPlaying = false;
      if (callbacks.pause) callbacks.pause.forEach(cb => cb());
    }),
    stop: vi.fn().mockImplementation(() => {
      isPlaying = false;
      currentSeek = 0;
      if (callbacks.stop) callbacks.stop.forEach(cb => cb());
    }),
    seek: vi.fn().mockImplementation(time => {
      if (time !== undefined) {
        currentSeek = time;
        if (callbacks.seek) callbacks.seek.forEach(cb => cb());
        return time;
      }
      return currentSeek;
    }),
    volume: vi.fn().mockImplementation(vol => {
      if (vol !== undefined) {
        currentVolume = vol;
        return vol;
      }
      return currentVolume;
    }),
    fade: vi.fn(),
    rate: vi.fn().mockReturnValue(1),
    duration: vi.fn().mockReturnValue(duration),
    playing: vi.fn().mockImplementation(() => isPlaying),
    state: vi.fn().mockReturnValue('loaded'),
    unload: vi.fn(),
    load: vi.fn(),
    on: vi.fn().mockImplementation((event, callback) => {
      if (!callbacks[event]) callbacks[event] = [];
      callbacks[event].push(callback);
      // Auto-fire load event
      if (event === 'load') {
        setTimeout(() => callback(), 0);
      }
      return this;
    }),
    off: vi.fn().mockImplementation((event, callback) => {
      if (callbacks[event]) {
        callbacks[event] = callbacks[event].filter(cb => cb !== callback);
      }
      return this;
    }),
    once: vi.fn().mockImplementation((event, callback) => {
      if (event === 'load') {
        setTimeout(() => callback(), 0);
      }
      return this;
    }),
  };
});

global.Howl = createMockHowl;
global.Howler = {
  volume: vi.fn().mockReturnValue(1),
  mute: vi.fn(),
  stop: vi.fn(),
  unload: vi.fn(),
  codecs: vi.fn().mockReturnValue(true),
  ctx: {
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 256,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
  },
  masterGain: {
    connect: vi.fn(),
  },
};

// Mock HLS.js for video player
const createMockHls = vi.fn().mockImplementation(function () {
  const callbacks = {};
  return {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    destroy: vi.fn(),
    currentLevel: -1,
    levels: [
      { height: 360, bitrate: 500000 },
      { height: 480, bitrate: 1000000 },
      { height: 720, bitrate: 2500000 },
      { height: 1080, bitrate: 5000000 },
    ],
    on: vi.fn().mockImplementation((event, callback) => {
      if (!callbacks[event]) callbacks[event] = [];
      callbacks[event].push(callback);
    }),
    off: vi.fn(),
    trigger: vi.fn().mockImplementation((event, data) => {
      if (callbacks[event]) {
        callbacks[event].forEach(cb => cb(event, data));
      }
    }),
  };
});

createMockHls.isSupported = vi.fn().mockReturnValue(true);
createMockHls.Events = {
  MANIFEST_PARSED: 'hlsManifestParsed',
  LEVEL_LOADED: 'hlsLevelLoaded',
  ERROR: 'hlsError',
  FRAG_LOADED: 'hlsFragLoaded',
};
createMockHls.ErrorTypes = {
  NETWORK_ERROR: 'networkError',
  MEDIA_ERROR: 'mediaError',
};

global.Hls = createMockHls;

// Mock matchMedia
global.matchMedia = vi.fn().mockImplementation(function (query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
});

// Mock DeviceOrientationEvent
global.DeviceOrientationEvent = class DeviceOrientationEvent extends Event {
  static requestPermission = vi.fn().mockResolvedValue('granted');
};

// Export mocks for tests to use directly
export {
  mockVector3,
  mockVector2,
  mockColor,
  mockClock,
  mockWebGLRenderer,
  mockScene,
  mockPerspectiveCamera,
  mockTonePlayer,
  mockToneGain,
  mockToneAnalyser,
};
