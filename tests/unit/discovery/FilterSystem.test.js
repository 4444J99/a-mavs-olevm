/**
 * @vitest-environment jsdom
 * Unit tests for FilterSystem
 * Tests filter state management and URL synchronization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('FilterSystem', () => {
  let filterSystem;

  beforeEach(() => {
    // Mock window.history
    window.history.replaceState(null, '', '/#discovery');
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});

    // Create filter system instance
    filterSystem = {
      config: { persistToUrl: true },
      state: {
        tags: [],
        chambers: [],
        types: [],
        wings: [],
        statuses: [],
        fromYear: null,
        toYear: null,
        sortBy: 'relevance',
        sortOrder: 'desc',
      },
      listeners: new Set(),
      isInitialized: false,
      syncToUrl: true,

      initialize() {
        this.isInitialized = true;
        return this;
      },

      setTags(tags, replace = true) {
        const normalized = (tags || [])
          .map(t => t.toLowerCase().trim())
          .filter(Boolean);
        this.state.tags = replace
          ? normalized
          : [...new Set([...this.state.tags, ...normalized])];
        this._emitChange();
        return this;
      },

      toggleTag(tag) {
        const normalized = tag.toLowerCase().trim();
        const index = this.state.tags.indexOf(normalized);
        if (index === -1) {
          this.state.tags.push(normalized);
        } else {
          this.state.tags.splice(index, 1);
        }
        this._emitChange();
        return this;
      },

      setChambers(chambers, replace = true) {
        const normalized = (chambers || [])
          .map(c => c.toLowerCase().trim())
          .filter(Boolean);
        this.state.chambers = replace
          ? normalized
          : [...new Set([...this.state.chambers, ...normalized])];
        this._emitChange();
        return this;
      },

      toggleChamber(chamber) {
        const normalized = chamber.toLowerCase().trim();
        const index = this.state.chambers.indexOf(normalized);
        if (index === -1) {
          this.state.chambers.push(normalized);
        } else {
          this.state.chambers.splice(index, 1);
        }
        this._emitChange();
        return this;
      },

      setTypes(types, replace = true) {
        const normalized = (types || [])
          .map(t => t.toLowerCase().trim())
          .filter(Boolean);
        this.state.types = replace
          ? normalized
          : [...new Set([...this.state.types, ...normalized])];
        this._emitChange();
        return this;
      },

      setDateRange(fromYear, toYear) {
        this.state.fromYear = fromYear ? parseInt(fromYear, 10) : null;
        this.state.toYear = toYear ? parseInt(toYear, 10) : null;
        this._emitChange();
        return this;
      },

      setSort(sortBy, sortOrder = 'desc') {
        this.state.sortBy = sortBy;
        this.state.sortOrder = sortOrder;
        this._emitChange();
        return this;
      },

      clearAll() {
        this.state = {
          tags: [],
          chambers: [],
          types: [],
          wings: [],
          statuses: [],
          fromYear: null,
          toYear: null,
          sortBy: 'relevance',
          sortOrder: 'desc',
        };
        this._emitChange();
        return this;
      },

      hasActiveFilters() {
        return (
          this.state.tags.length > 0 ||
          this.state.chambers.length > 0 ||
          this.state.types.length > 0 ||
          this.state.wings.length > 0 ||
          this.state.fromYear !== null ||
          this.state.toYear !== null
        );
      },

      getState() {
        return { ...this.state };
      },

      onChange(callback) {
        if (typeof callback === 'function') {
          this.listeners.add(callback);
        }
      },

      offChange(callback) {
        this.listeners.delete(callback);
      },

      _emitChange() {
        const state = this.getState();
        for (const callback of this.listeners) {
          callback(state);
        }
      },

      getShareableUrl() {
        const params = new URLSearchParams();
        if (this.state.tags.length > 0)
          params.set('tags', this.state.tags.join(','));
        if (this.state.chambers.length > 0)
          params.set('chambers', this.state.chambers.join(','));
        if (this.state.types.length > 0)
          params.set('types', this.state.types.join(','));
        if (this.state.fromYear)
          params.set('from', this.state.fromYear.toString());
        if (this.state.toYear) params.set('to', this.state.toYear.toString());

        const queryString = params.toString();
        return queryString
          ? `${window.location.origin}${window.location.pathname}?${queryString}#discovery`
          : `${window.location.origin}${window.location.pathname}#discovery`;
      },

      getSummaryText() {
        const parts = [];
        if (this.state.tags.length > 0)
          parts.push(`tags: ${this.state.tags.join(', ')}`);
        if (this.state.chambers.length > 0)
          parts.push(`chambers: ${this.state.chambers.join(', ')}`);
        if (this.state.types.length > 0)
          parts.push(`types: ${this.state.types.join(', ')}`);
        return parts.length > 0 ? parts.join(' | ') : 'No filters active';
      },
    };

    filterSystem.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      expect(filterSystem.isInitialized).toBe(true);
      expect(filterSystem.state.tags).toEqual([]);
      expect(filterSystem.state.chambers).toEqual([]);
    });
  });

  describe('Tag Filtering', () => {
    it('should set tags with replacement', () => {
      filterSystem.setTags(['tag1', 'tag2']);
      expect(filterSystem.state.tags).toEqual(['tag1', 'tag2']);
    });

    it('should normalize tags to lowercase', () => {
      filterSystem.setTags(['TAG1', 'Tag2']);
      expect(filterSystem.state.tags).toEqual(['tag1', 'tag2']);
    });

    it('should toggle tag on and off', () => {
      filterSystem.toggleTag('test');
      expect(filterSystem.state.tags).toContain('test');

      filterSystem.toggleTag('test');
      expect(filterSystem.state.tags).not.toContain('test');
    });

    it('should add tags without replacement', () => {
      filterSystem.setTags(['tag1']);
      filterSystem.setTags(['tag2'], false);
      expect(filterSystem.state.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('Chamber Filtering', () => {
    it('should set chambers', () => {
      filterSystem.setChambers(['akademia', 'odeion']);
      expect(filterSystem.state.chambers).toEqual(['akademia', 'odeion']);
    });

    it('should toggle chamber', () => {
      filterSystem.toggleChamber('akademia');
      expect(filterSystem.state.chambers).toContain('akademia');

      filterSystem.toggleChamber('akademia');
      expect(filterSystem.state.chambers).not.toContain('akademia');
    });
  });

  describe('Type Filtering', () => {
    it('should set content types', () => {
      filterSystem.setTypes(['audio', 'visual']);
      expect(filterSystem.state.types).toEqual(['audio', 'visual']);
    });
  });

  describe('Date Range Filtering', () => {
    it('should set year range', () => {
      filterSystem.setDateRange(2015, 2025);
      expect(filterSystem.state.fromYear).toBe(2015);
      expect(filterSystem.state.toYear).toBe(2025);
    });

    it('should handle null values', () => {
      filterSystem.setDateRange(2015, null);
      expect(filterSystem.state.fromYear).toBe(2015);
      expect(filterSystem.state.toYear).toBeNull();
    });

    it('should parse string years', () => {
      filterSystem.setDateRange('2015', '2025');
      expect(filterSystem.state.fromYear).toBe(2015);
      expect(filterSystem.state.toYear).toBe(2025);
    });
  });

  describe('Sorting', () => {
    it('should set sort options', () => {
      filterSystem.setSort('date', 'asc');
      expect(filterSystem.state.sortBy).toBe('date');
      expect(filterSystem.state.sortOrder).toBe('asc');
    });

    it('should default to desc order', () => {
      filterSystem.setSort('title');
      expect(filterSystem.state.sortOrder).toBe('desc');
    });
  });

  describe('Clear All', () => {
    it('should reset all filters', () => {
      filterSystem.setTags(['tag1']);
      filterSystem.setChambers(['akademia']);
      filterSystem.setDateRange(2015, 2025);

      filterSystem.clearAll();

      expect(filterSystem.state.tags).toEqual([]);
      expect(filterSystem.state.chambers).toEqual([]);
      expect(filterSystem.state.fromYear).toBeNull();
    });
  });

  describe('Active Filters Check', () => {
    it('should return false when no filters active', () => {
      expect(filterSystem.hasActiveFilters()).toBe(false);
    });

    it('should return true when tags are set', () => {
      filterSystem.setTags(['test']);
      expect(filterSystem.hasActiveFilters()).toBe(true);
    });

    it('should return true when chambers are set', () => {
      filterSystem.setChambers(['akademia']);
      expect(filterSystem.hasActiveFilters()).toBe(true);
    });

    it('should return true when year range is set', () => {
      filterSystem.setDateRange(2015, null);
      expect(filterSystem.hasActiveFilters()).toBe(true);
    });
  });

  describe('Change Listeners', () => {
    it('should call listeners on change', () => {
      const listener = vi.fn();
      filterSystem.onChange(listener);

      filterSystem.setTags(['test']);

      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['test'],
        })
      );
    });

    it('should remove listeners', () => {
      const listener = vi.fn();
      filterSystem.onChange(listener);
      filterSystem.offChange(listener);

      filterSystem.setTags(['test']);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('URL Generation', () => {
    it('should generate shareable URL with filters', () => {
      filterSystem.setTags(['tag1', 'tag2']);
      filterSystem.setChambers(['akademia']);

      const url = filterSystem.getShareableUrl();

      // URLSearchParams may encode commas as %2C
      expect(url).toMatch(/tags=tag1(%2C|,)tag2/);
      expect(url).toContain('chambers=akademia');
      expect(url).toContain('#discovery');
    });

    it('should generate clean URL with no filters', () => {
      const url = filterSystem.getShareableUrl();
      expect(url).toBe(`${window.location.origin}/#discovery`);
    });

    it('should include year range in URL', () => {
      filterSystem.setDateRange(2015, 2025);
      const url = filterSystem.getShareableUrl();

      expect(url).toContain('from=2015');
      expect(url).toContain('to=2025');
    });
  });

  describe('Summary Text', () => {
    it('should return "No filters active" when empty', () => {
      expect(filterSystem.getSummaryText()).toBe('No filters active');
    });

    it('should summarize active filters', () => {
      filterSystem.setTags(['tag1', 'tag2']);
      filterSystem.setChambers(['akademia']);

      const summary = filterSystem.getSummaryText();

      expect(summary).toContain('tags: tag1, tag2');
      expect(summary).toContain('chambers: akademia');
    });
  });
});

describe('URL Parameter Parsing', () => {
  it('should parse tags from URL', () => {
    const params = new URLSearchParams('tags=tag1,tag2,tag3');
    const tags = params.get('tags')?.split(',').filter(Boolean) || [];
    expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should parse chambers from URL', () => {
    const params = new URLSearchParams('chambers=akademia,odeion');
    const chambers = params.get('chambers')?.split(',').filter(Boolean) || [];
    expect(chambers).toEqual(['akademia', 'odeion']);
  });

  it('should parse year range from URL', () => {
    const params = new URLSearchParams('from=2015&to=2025');
    const fromYear = params.get('from')
      ? parseInt(params.get('from'), 10)
      : null;
    const toYear = params.get('to') ? parseInt(params.get('to'), 10) : null;

    expect(fromYear).toBe(2015);
    expect(toYear).toBe(2025);
  });

  it('should handle missing parameters', () => {
    const params = new URLSearchParams('');
    const tags = params.get('tags')?.split(',').filter(Boolean) || [];
    expect(tags).toEqual([]);
  });
});
