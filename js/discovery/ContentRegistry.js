/**
 * @file ContentRegistry.js
 * @description Central data store aggregating all chamber configs into searchable indexes.
 * Singleton pattern following LivingPantheonCore approach.
 *
 * Features:
 * - Aggregates items from all chamber configurations
 * - Builds multiple indexes for efficient lookup (byTag, byChamber, byType, byDate)
 * - Normalizes different config formats into unified item structure
 * - Provides search(), filter(), getAllTags(), getItem() API
 *
 * Usage:
 * ------
 * const registry = ContentRegistry.getInstance();
 * await registry.initialize();
 *
 * // Get all items
 * const allItems = registry.getAllItems();
 *
 * // Filter by tags
 * const filtered = registry.filter({ tags: ['digital', 'art'] });
 *
 * // Get item by ID
 * const item = registry.getItem('digital-temple-web-architecture');
 */

'use strict';

/**
 * ContentRegistry - Central content aggregator singleton
 * @class
 */
class ContentRegistry {
  /**
   * Get or create the singleton instance
   * @static
   * @returns {ContentRegistry}
   */
  static getInstance() {
    if (!window.contentRegistryInstance) {
      window.contentRegistryInstance = new ContentRegistry();
    }
    return window.contentRegistryInstance;
  }

  /**
   * Create a new ContentRegistry instance
   * Private constructor - use getInstance() instead
   * @private
   */
  constructor() {
    // Configuration from global config
    this.config =
      typeof ETCETER4_CONFIG !== 'undefined'
        ? ETCETER4_CONFIG.discovery || {}
        : {};

    // Chamber definitions
    this.chambers =
      typeof ETCETER4_CONFIG !== 'undefined'
        ? ETCETER4_CONFIG.chambers || {}
        : {};

    // Core state
    this.isInitialized = false;

    // Item storage
    this.items = [];

    // Indexes for efficient lookup
    this.indexes = {
      byId: new Map(),
      byTag: new Map(),
      byChamber: new Map(),
      bySection: new Map(),
      byType: new Map(),
      byWing: new Map(),
      byStatus: new Map(),
      byYear: new Map(),
    };

    // Tag frequency counts
    this.tagCounts = new Map();

    // All unique values for filtering
    this.uniqueValues = {
      tags: new Set(),
      chambers: new Set(),
      sections: new Set(),
      types: new Set(),
      wings: new Set(),
      statuses: new Set(),
      years: new Set(),
    };
  }

  /**
   * Initialize the registry by loading all chamber configs
   * @returns {Promise<ContentRegistry>} Returns this for chaining
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('ContentRegistry: Already initialized');
      return this;
    }

    try {
      // Collect items from all available configs
      this._collectFromAkademiaConfig();
      this._collectFromBibliothekeConfig();
      this._collectFromPinakothekeConfig();
      this._collectFromOdeionConfig();
      this._collectFromAgoraConfig();
      this._collectFromOtherChambers();

      // Build all indexes
      this._buildIndexes();

      this.isInitialized = true;
      console.info(
        `ContentRegistry: Initialized with ${this.items.length} items`
      );

      // Emit initialization event
      window.dispatchEvent(
        new CustomEvent('content-registry-ready', {
          detail: { itemCount: this.items.length },
        })
      );
    } catch (error) {
      console.error('ContentRegistry: Initialization failed:', error);
    }

    return this;
  }

  /**
   * Collect items from akademiaConfig (sections with items arrays)
   * @private
   */
  _collectFromAkademiaConfig() {
    if (typeof akademiaConfig === 'undefined') {
      return;
    }

    const config = akademiaConfig;
    const chamberId = config.chamberId || 'akademia';
    const chamberMeta = this.chambers[chamberId] || {};

    // Iterate through sections
    if (config.sections) {
      Object.entries(config.sections).forEach(([sectionKey, section]) => {
        if (section.items && Array.isArray(section.items)) {
          section.items.forEach(item => {
            this.items.push(
              this._normalizeItem(item, {
                chamber: chamberId,
                chamberName: config.chamberName || 'AKADEMIA',
                chamberColor: config.primaryColor || chamberMeta.color,
                section: sectionKey,
                sectionTitle: section.title,
                wing: chamberMeta.wing || 'east',
                type: this._inferType(sectionKey, item),
              })
            );
          });
        }
      });
    }
  }

  /**
   * Collect items from bibliothekeConfig
   * @private
   */
  _collectFromBibliothekeConfig() {
    if (typeof bibliothekeConfig === 'undefined') {
      return;
    }

    const config = bibliothekeConfig;
    const chamberId = config.chamberId || 'bibliotheke';
    const chamberMeta = this.chambers[chamberId] || {};

    if (config.sections) {
      Object.entries(config.sections).forEach(([sectionKey, section]) => {
        if (section.items && Array.isArray(section.items)) {
          section.items.forEach(item => {
            this.items.push(
              this._normalizeItem(item, {
                chamber: chamberId,
                chamberName: config.chamberName || 'BIBLIOTHEKE',
                chamberColor: config.primaryColor || chamberMeta.color,
                section: sectionKey,
                sectionTitle: section.title,
                wing: chamberMeta.wing || 'east',
                type: this._inferType(sectionKey, item),
              })
            );
          });
        }
      });
    }
  }

  /**
   * Collect items from PINAKOTHEKE_CONFIG (flat items array)
   * @private
   */
  _collectFromPinakothekeConfig() {
    if (typeof PINAKOTHEKE_CONFIG === 'undefined') {
      return;
    }

    const config = PINAKOTHEKE_CONFIG;
    const chamberId = config.chamber || 'pinakotheke';
    const chamberMeta = this.chambers[chamberId] || {};

    if (config.items && Array.isArray(config.items)) {
      config.items.forEach(item => {
        this.items.push(
          this._normalizeItem(item, {
            chamber: chamberId,
            chamberName: config.name || 'PINAKOTHEKE',
            chamberColor: config.primaryColor || chamberMeta.color,
            section: item.section || item.category?.toLowerCase() || 'gallery',
            wing: config.wing || chamberMeta.wing || 'east',
            type: 'visual',
          })
        );
      });
    }
  }

  /**
   * Collect items from ODEION_CONFIG (multiple arrays: albums, singles, demos, experimental)
   * @private
   */
  _collectFromOdeionConfig() {
    if (typeof ODEION_CONFIG === 'undefined') {
      return;
    }

    const config = ODEION_CONFIG;
    const chamberId = config.chamber?.id || 'odeion';
    const chamberMeta = this.chambers[chamberId] || {};
    const chamberColor = config.chamber?.color || chamberMeta.color;
    const chamberName = config.chamber?.name || 'ODEION';
    const wing = config.chamber?.wing || chamberMeta.wing || 'south';

    // Collect from each category
    const categories = ['albums', 'singles', 'demos', 'experimental'];
    categories.forEach(category => {
      if (config[category] && Array.isArray(config[category])) {
        config[category].forEach(item => {
          this.items.push(
            this._normalizeItem(item, {
              chamber: chamberId,
              chamberName,
              chamberColor,
              section: category,
              wing,
              type: 'audio',
            })
          );
        });
      }
    });
  }

  /**
   * Collect items from AGORA_CONFIG
   * @private
   */
  _collectFromAgoraConfig() {
    if (typeof AGORA_CONFIG === 'undefined') {
      return;
    }

    const config = AGORA_CONFIG;
    const chamberId = config.chamber?.id || 'agora';
    const chamberMeta = this.chambers[chamberId] || {};
    const chamberColor = config.theme?.primary || chamberMeta.color;
    const chamberName = config.chamber?.name || 'AGORA';
    const wing =
      config.chamber?.wing?.toLowerCase() || chamberMeta.wing || 'west';

    if (config.content?.items && Array.isArray(config.content.items)) {
      config.content.items.forEach(item => {
        this.items.push(
          this._normalizeItem(item, {
            chamber: chamberId,
            chamberName,
            chamberColor,
            section: item.section || 'feed',
            wing,
            type: 'text',
          })
        );
      });
    }
  }

  /**
   * Collect from other chamber configs (symposion, oikos, theatron, ergasterion, khronos)
   * These may have different patterns or be empty/placeholder
   * @private
   */
  _collectFromOtherChambers() {
    // Symposion
    if (typeof SYMPOSION_CONFIG !== 'undefined') {
      this._collectGenericConfig(SYMPOSION_CONFIG, 'symposion', 'text');
    }

    // Oikos
    if (typeof OIKOS_CONFIG !== 'undefined') {
      this._collectGenericConfig(OIKOS_CONFIG, 'oikos', 'text');
    }

    // Theatron
    if (typeof THEATRON_CONFIG !== 'undefined') {
      this._collectGenericConfig(THEATRON_CONFIG, 'theatron', 'video');
    }

    // Ergasterion
    if (typeof ERGASTERION_CONFIG !== 'undefined') {
      this._collectGenericConfig(ERGASTERION_CONFIG, 'ergasterion', 'code');
    }

    // Khronos
    if (typeof KHRONOS_CONFIG !== 'undefined') {
      this._collectGenericConfig(KHRONOS_CONFIG, 'khronos', 'archive');
    }
  }

  /**
   * Generic config collector for chambers with varied structures
   * @private
   */
  _collectGenericConfig(config, defaultChamberId, defaultType) {
    const chamberId =
      config.chamber?.id || config.chamberId || defaultChamberId;
    const chamberMeta = this.chambers[chamberId] || {};
    const wing =
      typeof config.wing === 'string' ? config.wing : config.wing?.id;
    const context = {
      chamber: chamberId,
      chamberName:
        config.chamberName ||
        config.chamber?.name ||
        config.name ||
        chamberId.toUpperCase(),
      chamberColor:
        config.primaryColor ||
        config.chamber?.color ||
        config.theme?.primary ||
        chamberMeta.color,
      wing: (wing || config.chamber?.wing || chamberMeta.wing)?.toLowerCase(),
      type: defaultType,
    };
    const seen = new Set();
    const collect = (items, section, sectionTitle, sourceCollection) => {
      if (!Array.isArray(items)) {
        return;
      }
      items.forEach(item => {
        // A config may expose the same record through a section and a flat alias.
        // Preserve distinct objects; avoid adding the identical source twice.
        if (!item || typeof item !== 'object' || seen.has(item)) {
          return;
        }
        seen.add(item);
        this.items.push(
          this._normalizeItem(item, {
            ...context,
            section: section || item.section || 'general',
            sectionTitle,
            defaultStatus: sourceCollection ? 'unverified' : undefined,
            provenance: sourceCollection
              ? {
                  path: `${defaultChamberId}/config.js`,
                  collection: sourceCollection,
                  verification: 'unverified',
                }
              : undefined,
          })
        );
      });
    };

    // Configuration sections may contain settings only. Index their explicit
    // item collections, never entry templates, navigation arrays or storage.
    if (config.sections && typeof config.sections === 'object') {
      Object.entries(config.sections).forEach(([key, section]) => {
        if (section && typeof section === 'object') {
          collect(
            section.items || section.content?.items,
            key,
            section.title || section.name
          );
        }
      });
    }
    collect(config.items);
    collect(config.content?.items);

    // These are the actual shipped public record shapes, not arbitrary arrays.
    const namedCollections = {
      symposion: ['interviews', 'conversations'],
      theatron: ['performances', 'rehearsals'],
      khronos: ['eras', 'milestones'],
    };
    (namedCollections[defaultChamberId] || []).forEach(key => {
      collect(
        config[key],
        key,
        config.sections?.[key]?.title || config.sections?.[key]?.name,
        key
      );
    });
  }

  /**
   * Normalize item from various config formats into unified structure
   * @private
   * @param {Object} item - Raw item from config
   * @param {Object} context - Chamber/section context
   * @returns {Object} Normalized item
   */
  _normalizeItem(item, context) {
    // Extract date and year
    const rawDate = item.date || item.year || item.startYear;
    let date = null;
    let year = null;

    if (rawDate) {
      if (typeof rawDate === 'number') {
        year = rawDate;
        // A newly indexed source year is not evidence of January 1.
        date = context.provenance ? null : `${rawDate}-01-01`;
      } else if (typeof rawDate === 'string') {
        date = rawDate;
        year = parseInt(rawDate.substring(0, 4), 10) || null;
      }
    }

    // Extract tags
    let tags = [];
    if (item.tags && Array.isArray(item.tags)) {
      tags = item.tags.map(t => t.toLowerCase().trim());
    }
    if (item.category) {
      tags.push(item.category.toLowerCase().trim());
    }
    if (item.topic) {
      tags.push(item.topic.toLowerCase().trim());
    }
    if (item.features && Array.isArray(item.features)) {
      tags = tags.concat(item.features.map(f => f.toLowerCase().trim()));
    }
    // Deduplicate tags
    tags = [...new Set(tags)];

    return {
      // Core identifiers
      id: item.id,
      title: item.title || item.name || 'Untitled',
      subtitle: item.subtitle || item.artist || '',
      description: item.description || item.excerpt || item.content || '',

      // Dates
      date,
      year,

      // Classification
      chamber: context.chamber,
      chamberName: context.chamberName,
      chamberColor: context.chamberColor,
      section: context.section,
      sectionTitle: context.sectionTitle || context.section,
      wing: context.wing,
      type: context.type || this._inferType(context.section, item),
      status: item.status || context.defaultStatus || 'published',
      ...(context.provenance ? { provenance: context.provenance } : {}),

      // Searchable content
      tags,

      // Media references
      image:
        item.image || item.coverArt?.medium || item.coverArt?.small || null,
      content: item.content || null,
      wordCount: item.wordCount || null,
      readTime: item.readTime || null,
      trackCount: item.trackCount || null,
      duration: item.duration || null,

      // Original item reference (for additional properties)
      _raw: item,
    };
  }

  /**
   * Infer content type from section and item
   * @private
   */
  _inferType(section, item) {
    const sectionLower = (section || '').toLowerCase();

    // Audio types
    if (
      ['albums', 'singles', 'demos', 'experimental', 'music'].includes(
        sectionLower
      )
    ) {
      return 'audio';
    }

    // Visual types
    if (
      [
        'photography',
        'digital',
        'glitch',
        'generative',
        'gallery',
        'stills',
      ].includes(sectionLower)
    ) {
      return 'visual';
    }

    // Video types
    if (['video', 'performance', 'recordings'].includes(sectionLower)) {
      return 'video';
    }

    // Code types
    if (['code', 'experiments', 'prototypes', 'demos'].includes(sectionLower)) {
      return 'code';
    }

    // Text types (default for essays, papers, etc.)
    return 'text';
  }

  /**
   * Build all indexes for efficient lookup
   * @private
   */
  _buildIndexes() {
    // Clear existing indexes
    for (const index of Object.values(this.indexes)) {
      index.clear();
    }
    this.tagCounts.clear();
    for (const set of Object.values(this.uniqueValues)) {
      set.clear();
    }

    // Build indexes from items
    this.items.forEach(item => {
      // By ID
      this.indexes.byId.set(item.id, item);

      // By chamber
      this._addToMapIndex(this.indexes.byChamber, item.chamber, item);
      this.uniqueValues.chambers.add(item.chamber);

      // By section
      this._addToMapIndex(this.indexes.bySection, item.section, item);
      this.uniqueValues.sections.add(item.section);

      // By type
      this._addToMapIndex(this.indexes.byType, item.type, item);
      this.uniqueValues.types.add(item.type);

      // By wing
      if (item.wing) {
        this._addToMapIndex(this.indexes.byWing, item.wing, item);
        this.uniqueValues.wings.add(item.wing);
      }

      // By status
      this._addToMapIndex(this.indexes.byStatus, item.status, item);
      this.uniqueValues.statuses.add(item.status);

      // By year
      if (item.year) {
        this._addToMapIndex(this.indexes.byYear, item.year, item);
        this.uniqueValues.years.add(item.year);
      }

      // By tags (each tag gets its own index entry)
      item.tags.forEach(tag => {
        this._addToMapIndex(this.indexes.byTag, tag, item);
        this.uniqueValues.tags.add(tag);

        // Count tag frequency
        this.tagCounts.set(tag, (this.tagCounts.get(tag) || 0) + 1);
      });
    });
  }

  /**
   * Add item to a Map-based index (Map<key, Set<item>>)
   * @private
   */
  _addToMapIndex(index, key, item) {
    if (!key) {
      return;
    }
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key).add(item);
  }

  /**
   * Get all items
   * @returns {Array} All registered items
   */
  getAllItems() {
    return [...this.items];
  }

  /**
   * Get item by ID
   * @param {string} id - Item ID
   * @returns {Object|null} Item or null if not found
   */
  getItem(id) {
    return this.indexes.byId.get(id) || null;
  }

  /**
   * Get all unique tags sorted by frequency
   * @param {number} [limit] - Maximum number of tags to return
   * @returns {Array} Array of {tag, count} objects
   */
  getAllTags(limit) {
    const tags = Array.from(this.tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return limit ? tags.slice(0, limit) : tags;
  }

  /**
   * Get all unique chambers
   * @returns {Array} Array of chamber IDs
   */
  getAllChambers() {
    return Array.from(this.uniqueValues.chambers);
  }

  /**
   * Get all unique content types
   * @returns {Array} Array of type strings
   */
  getAllTypes() {
    return Array.from(this.uniqueValues.types);
  }

  /**
   * Get all unique wings
   * @returns {Array} Array of wing strings
   */
  getAllWings() {
    return Array.from(this.uniqueValues.wings);
  }

  /**
   * Get items by chamber
   * @param {string} chamberId - Chamber ID
   * @returns {Array} Items in the chamber
   */
  getItemsByChamber(chamberId) {
    const items = this.indexes.byChamber.get(chamberId);
    return items ? Array.from(items) : [];
  }

  /**
   * Get items by tag
   * @param {string} tag - Tag to filter by
   * @returns {Array} Items with the tag
   */
  getItemsByTag(tag) {
    const normalizedTag = tag.toLowerCase().trim();
    const items = this.indexes.byTag.get(normalizedTag);
    return items ? Array.from(items) : [];
  }

  /**
   * Filter items by multiple criteria
   * @param {Object} criteria - Filter criteria
   * @param {string[]} [criteria.tags] - Tags to filter by (AND logic)
   * @param {string[]} [criteria.chambers] - Chambers to include (OR logic)
   * @param {string[]} [criteria.types] - Content types to include (OR logic)
   * @param {string[]} [criteria.wings] - Wings to include (OR logic)
   * @param {string[]} [criteria.statuses] - Statuses to include (OR logic)
   * @param {number} [criteria.fromYear] - Minimum year
   * @param {number} [criteria.toYear] - Maximum year
   * @returns {Array} Filtered items
   */
  filter(criteria = {}) {
    let results = this.items;

    // Filter by tags (AND logic - must have ALL specified tags)
    if (criteria.tags && criteria.tags.length > 0) {
      const normalizedTags = criteria.tags.map(t => t.toLowerCase().trim());
      results = results.filter(item =>
        normalizedTags.every(tag => item.tags.includes(tag))
      );
    }

    // Filter by chambers (OR logic - in ANY of specified chambers)
    if (criteria.chambers && criteria.chambers.length > 0) {
      const chamberSet = new Set(criteria.chambers);
      results = results.filter(item => chamberSet.has(item.chamber));
    }

    // Filter by types (OR logic)
    if (criteria.types && criteria.types.length > 0) {
      const typeSet = new Set(criteria.types);
      results = results.filter(item => typeSet.has(item.type));
    }

    // Filter by wings (OR logic)
    if (criteria.wings && criteria.wings.length > 0) {
      const wingSet = new Set(criteria.wings);
      results = results.filter(item => item.wing && wingSet.has(item.wing));
    }

    // Filter by statuses (OR logic)
    if (criteria.statuses && criteria.statuses.length > 0) {
      const statusSet = new Set(criteria.statuses);
      results = results.filter(item => statusSet.has(item.status));
    }

    // Filter by year range
    if (criteria.fromYear) {
      results = results.filter(
        item => item.year && item.year >= criteria.fromYear
      );
    }
    if (criteria.toYear) {
      results = results.filter(
        item => item.year && item.year <= criteria.toYear
      );
    }

    return results;
  }

  /**
   * Get registry status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      itemCount: this.items.length,
      tagCount: this.uniqueValues.tags.size,
      chamberCount: this.uniqueValues.chambers.size,
      typeCount: this.uniqueValues.types.size,
    };
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    this.items = [];
    for (const index of Object.values(this.indexes)) {
      index.clear();
    }
    this.tagCounts.clear();
    for (const set of Object.values(this.uniqueValues)) {
      set.clear();
    }
    this.isInitialized = false;
  }
}

// Export for global scope
window.ContentRegistry = ContentRegistry;
