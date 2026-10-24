/**
 * @file DiscoveryController.js
 * @description Main controller orchestrating all discovery systems.
 * Handles UI events, pagination, result rendering, and search modal.
 *
 * Features:
 * - Orchestrates ContentRegistry, SearchEngine, FilterSystem, RelatedWorksEngine, ShareLinks
 * - Renders search results with pagination
 * - Handles global search modal (Cmd+K)
 * - Tag cloud generation
 * - Quick filter buttons
 * - Keyboard navigation
 * - Accessibility support
 *
 * Usage:
 * ------
 * // Called automatically on discovery page load
 * DiscoveryController.initialize();
 *
 * // Or manually
 * const controller = DiscoveryController.getInstance();
 * controller.initialize();
 */

'use strict';

/**
 * DiscoveryController - Main discovery UI controller
 * @class
 */
class DiscoveryController {
  /**
   * Get or create the singleton instance
   * @static
   * @returns {DiscoveryController}
   */
  static getInstance() {
    if (!window.discoveryControllerInstance) {
      window.discoveryControllerInstance = new DiscoveryController();
    }
    return window.discoveryControllerInstance;
  }

  /**
   * Static initialize method for page initialization
   * @static
   */
  static initialize() {
    return DiscoveryController.getInstance().initialize();
  }

  /**
   * Create a new DiscoveryController instance
   * @private
   */
  constructor() {
    // Configuration
    this.config =
      typeof ETCETER4_CONFIG !== 'undefined'
        ? ETCETER4_CONFIG.discovery || {}
        : {};

    // Subsystem references
    this.registry = null;
    this.searchEngine = null;
    this.filterSystem = null;
    this.relatedWorks = null;
    this.shareLinks = null;

    // UI state
    this.currentPage = 1;
    this.currentResults = [];
    this.currentSearchQuery = '';
    this.isSearchModalOpen = false;
    this.selectedResultIndex = -1;

    // DOM element references (cached after init)
    this.elements = {};

    // Initialization flag
    this.isInitialized = false;

    // Bind methods
    this._onSearchInput = this._onSearchInput.bind(this);
    this._onFilterChange = this._onFilterChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onGlobalSearchInput = this._onGlobalSearchInput.bind(this);
  }

  /**
   * Initialize the discovery controller
   * @returns {Promise<DiscoveryController>}
   */
  async initialize() {
    if (this.isInitialized) {
      return this;
    }

    try {
      // Initialize subsystems
      this.registry = ContentRegistry.getInstance();
      await this.registry.initialize();

      this.searchEngine = SearchEngine.getInstance();
      await this.searchEngine.initialize();

      this.filterSystem = FilterSystem.getInstance();
      this.filterSystem.initialize();

      this.relatedWorks = RelatedWorksEngine.getInstance();
      this.relatedWorks.initialize();

      this.shareLinks = ShareLinks.getInstance();

      // Cache DOM elements
      this._cacheElements();

      // Set up event listeners
      this._setupEventListeners();

      // Render initial state
      this._renderTagCloud();
      this._renderQuickFilters();
      this._renderResults();

      // Check for shared item in URL
      this._checkForSharedItem();

      this.isInitialized = true;
      console.info('DiscoveryController: Initialized');
    } catch (error) {
      console.error('DiscoveryController: Initialization failed:', error);
      throw error;
    }

    return this;
  }

  /**
   * Cache DOM element references
   * @private
   */
  _cacheElements() {
    this.elements = {
      // Discovery page elements
      searchInput: document.getElementById('discoverySearchInput'),
      resultsGrid: document.getElementById('resultsGrid'),
      pagination: document.getElementById('pagination'),
      tagCloud: document.getElementById('tagCloud'),
      quickFilters: document.getElementById('quickFilters'),
      filterPanel: document.getElementById('filterPanel'),
      chamberFilters: document.getElementById('chamberFilters'),
      typeFilters: document.getElementById('typeFilters'),
      wingFilters: document.getElementById('wingFilters'),
      yearFromInput: document.getElementById('yearFromInput'),
      yearToInput: document.getElementById('yearToInput'),
      clearFiltersBtn: document.getElementById('clearFiltersBtn'),
      filterSummary: document.getElementById('filterSummary'),
      resultCount: document.getElementById('resultCount'),
      sortSelect: document.getElementById('sortSelect'),
      recommendations: document.getElementById('recommendationsGrid'),

      // Global search modal elements
      searchModal: document.getElementById('searchModal'),
      globalSearchInput: document.getElementById('globalSearchInput'),
      globalSearchResults: document.getElementById('globalSearchResults'),
    };
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Discovery page search input
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', this._onSearchInput);
    }

    // Filter change listener
    this.filterSystem.onChange(this._onFilterChange);

    // Global keyboard shortcuts
    document.addEventListener('keydown', this._onKeyDown);

    // Global search modal input
    if (this.elements.globalSearchInput) {
      this.elements.globalSearchInput.addEventListener(
        'input',
        this._onGlobalSearchInput
      );
    }

    // Clear filters button
    if (this.elements.clearFiltersBtn) {
      this.elements.clearFiltersBtn.addEventListener('click', () => {
        this.filterSystem.clearAll();
        if (this.elements.searchInput) {
          this.elements.searchInput.value = '';
        }
        this.currentSearchQuery = '';
      });
    }

    // Sort select
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('change', e => {
        const value = e.target.value;
        const [sortBy, sortOrder] = value.split('-');
        this.filterSystem.setSort(sortBy, sortOrder || 'desc');
      });
    }

    // Year range inputs
    if (this.elements.yearFromInput) {
      this.elements.yearFromInput.addEventListener('change', () => {
        this.filterSystem.setDateRange(
          this.elements.yearFromInput.value || null,
          this.elements.yearToInput?.value || null
        );
      });
    }
    if (this.elements.yearToInput) {
      this.elements.yearToInput.addEventListener('change', () => {
        this.filterSystem.setDateRange(
          this.elements.yearFromInput?.value || null,
          this.elements.yearToInput.value || null
        );
      });
    }

    // Modal close on backdrop click
    if (this.elements.searchModal) {
      this.elements.searchModal.addEventListener('click', e => {
        if (e.target === this.elements.searchModal) {
          this.closeSearchModal();
        }
      });
    }
  }

  /**
   * Handle search input changes
   * @private
   */
  async _onSearchInput(e) {
    const query = e.target.value.trim();
    this.currentSearchQuery = query;
    this.currentPage = 1;

    if (query.length >= (this.config.search?.minQueryLength || 2)) {
      const results = await this.searchEngine.searchDebounced(query);
      this.currentResults = results.map(r => r.item);
      this._renderResults();
    } else if (query.length === 0) {
      // Show filtered results
      this.currentResults = this.filterSystem.getFilteredItems();
      this._renderResults();
    }
  }

  /**
   * Handle filter changes
   * @private
   */
  _onFilterChange(state) {
    this.currentPage = 1;

    // If not in search mode, update results from filters
    if (!this.currentSearchQuery) {
      this.currentResults = this.filterSystem.getFilteredItems();
    } else {
      // Re-run search with new filters
      const results = this.searchEngine.search(this.currentSearchQuery, {
        filter: state,
      });
      this.currentResults = results.map(r => r.item);
    }

    this._renderResults();
    this._updateFilterUI(state);
  }

  /**
   * Handle keyboard shortcuts
   * @private
   */
  _onKeyDown(e) {
    const shortcuts = this.config.shortcuts || {};

    // Cmd/Ctrl + K to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.openSearchModal();
      return;
    }

    // Escape to close modal
    if (e.key === 'Escape' && this.isSearchModalOpen) {
      e.preventDefault();
      this.closeSearchModal();
      return;
    }

    // Arrow navigation in search results
    if (this.isSearchModalOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._navigateResults(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._navigateResults(-1);
      } else if (e.key === 'Enter' && this.selectedResultIndex >= 0) {
        e.preventDefault();
        this._selectResult(this.selectedResultIndex);
      }
    }
  }

  /**
   * Handle global search modal input
   * @private
   */
  async _onGlobalSearchInput(e) {
    const query = e.target.value.trim();

    if (query.length >= (this.config.search?.minQueryLength || 2)) {
      const results = await this.searchEngine.searchDebounced(query, {
        limit: 8,
      });
      this._renderGlobalSearchResults(results);
    } else {
      this._renderGlobalSearchResults([]);
    }
  }

  /**
   * Open global search modal
   */
  openSearchModal() {
    if (!this.elements.searchModal) {
      return;
    }

    this.elements.searchModal.classList.remove('dn');
    this.elements.searchModal.classList.add('db');
    this.isSearchModalOpen = true;
    this.selectedResultIndex = -1;

    // Focus input
    if (this.elements.globalSearchInput) {
      this.elements.globalSearchInput.value = '';
      this.elements.globalSearchInput.focus();
    }

    // Clear previous results
    this._renderGlobalSearchResults([]);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close global search modal
   */
  closeSearchModal() {
    if (!this.elements.searchModal) {
      return;
    }

    this.elements.searchModal.classList.remove('db');
    this.elements.searchModal.classList.add('dn');
    this.isSearchModalOpen = false;
    this.selectedResultIndex = -1;

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Navigate through search results with arrow keys
   * @private
   */
  _navigateResults(direction) {
    const container = this.elements.globalSearchResults;
    if (!container) {
      return;
    }

    const items = container.querySelectorAll('.search-result-item');
    if (items.length === 0) {
      return;
    }

    // Update selected index
    this.selectedResultIndex += direction;
    if (this.selectedResultIndex < 0) {
      this.selectedResultIndex = items.length - 1;
    } else if (this.selectedResultIndex >= items.length) {
      this.selectedResultIndex = 0;
    }

    // Update visual selection
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedResultIndex);
    });

    // Scroll into view
    items[this.selectedResultIndex]?.scrollIntoView({ block: 'nearest' });
  }

  /**
   * Select a search result
   * @private
   */
  _selectResult(index) {
    const container = this.elements.globalSearchResults;
    if (!container) {
      return;
    }

    const items = container.querySelectorAll('.search-result-item');
    const item = items[index];

    if (item && item.dataset.itemId) {
      this.closeSearchModal();
      this._navigateToItem(item.dataset.itemId);
    }
  }

  /**
   * Navigate to an item
   * @private
   */
  _navigateToItem(itemId) {
    const item = this.registry.getItem(itemId);
    if (!item) {
      return;
    }

    // Navigate to item's chamber with item highlighted
    const chamberHash = `#${item.chamber}`;

    // Store item ID to highlight after navigation
    sessionStorage.setItem('etceter4-highlight-item', itemId);

    // Navigate
    if (typeof showNewSection === 'function') {
      showNewSection(chamberHash);
    } else {
      window.location.hash = chamberHash;
    }
  }

  /**
   * Render tag cloud
   * @private
   */
  _renderTagCloud() {
    const container = this.elements.tagCloud;
    if (!container) {
      return;
    }

    const maxTags = this.config.filters?.maxTagsShown || 20;
    const tags = this.registry.getAllTags(maxTags);

    if (tags.length === 0) {
      container.innerHTML = '<p class="f6 gray">No tags available</p>';
      return;
    }

    // Calculate size range
    const maxCount = Math.max(...tags.map(t => t.count));
    const minCount = Math.min(...tags.map(t => t.count));
    const range = maxCount - minCount || 1;

    container.innerHTML = tags
      .map(({ tag, count }) => {
        // Scale font size based on frequency (1rem to 1.5rem)
        const scale = (count - minCount) / range;
        const fontSize = 1 + scale * 0.5;
        const isActive = this.filterSystem.getState().tags.includes(tag);

        return `
        <button
          class="tag-btn ${isActive ? 'tag-btn--active' : ''}"
          data-tag="${this._escapeHtml(tag)}"
          style="font-size: ${fontSize}rem"
          aria-pressed="${isActive}"
        >
          ${this._escapeHtml(tag)}
          <span class="tag-count">${count}</span>
        </button>
      `;
      })
      .join('');

    // Add click handlers
    container.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterSystem.toggleTag(btn.dataset.tag);
        btn.classList.toggle('tag-btn--active');
        btn.setAttribute(
          'aria-pressed',
          btn.classList.contains('tag-btn--active')
        );
      });
    });
  }

  /**
   * Render quick filter buttons
   * @private
   */
  _renderQuickFilters() {
    const container = this.elements.quickFilters;
    if (!container) {
      return;
    }

    const presets = this.config.ui?.quickFilters || [
      { id: 'all', label: 'All', criteria: {} },
      { id: 'audio', label: 'Audio', criteria: { types: ['audio'] } },
      { id: 'visual', label: 'Visual', criteria: { types: ['visual'] } },
      { id: 'text', label: 'Writing', criteria: { types: ['text'] } },
    ];

    container.innerHTML = presets
      .map(
        preset => `
      <button
        class="quick-filter-btn ${preset.id === 'all' ? 'quick-filter-btn--active' : ''}"
        data-filter-id="${preset.id}"
      >
        ${this._escapeHtml(preset.label)}
      </button>
    `
      )
      .join('');

    // Add click handlers
    container.querySelectorAll('.quick-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = presets.find(p => p.id === btn.dataset.filterId);
        if (preset) {
          // Clear existing and apply preset
          this.filterSystem.clearAll();
          if (preset.criteria.types) {
            this.filterSystem.setTypes(preset.criteria.types);
          }
          if (preset.criteria.chambers) {
            this.filterSystem.setChambers(preset.criteria.chambers);
          }
          if (preset.criteria.tags) {
            this.filterSystem.setTags(preset.criteria.tags);
          }

          // Update active state
          container.querySelectorAll('.quick-filter-btn').forEach(b => {
            b.classList.remove('quick-filter-btn--active');
          });
          btn.classList.add('quick-filter-btn--active');
        }
      });
    });
  }

  /**
   * Render search/filter results
   * @private
   */
  _renderResults() {
    const container = this.elements.resultsGrid;
    if (!container) {
      return;
    }

    // Get paginated results
    const itemsPerPage = this.config.pagination?.itemsPerPage || 24;
    const startIndex = (this.currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = this.currentResults.slice(startIndex, endIndex);

    // Update result count
    if (this.elements.resultCount) {
      this.elements.resultCount.textContent = `${this.currentResults.length} items`;
    }

    // Render empty state
    if (paginatedResults.length === 0) {
      container.innerHTML = `
        <div class="discovery-empty tc pa4">
          <p class="f4 gray">No items found</p>
          <p class="f6 gray">Try adjusting your search or filters</p>
        </div>
      `;
      this._renderPagination(0);
      return;
    }

    // Render result cards
    container.innerHTML = paginatedResults
      .map(item => this._renderResultCard(item))
      .join('');

    // Add click handlers
    container.querySelectorAll('.result-card').forEach(card => {
      card.addEventListener('click', () => {
        const itemId = card.dataset.itemId;
        this._navigateToItem(itemId);
      });

      // Share button
      const shareBtn = card.querySelector('.share-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', e => {
          e.stopPropagation();
          this.shareLinks.shareItem(card.dataset.itemId);
        });
      }
    });

    // Render pagination
    const totalPages = Math.ceil(this.currentResults.length / itemsPerPage);
    this._renderPagination(totalPages);
  }

  /**
   * Render a single result card
   * @private
   */
  _renderResultCard(item) {
    const chamberColor = item.chamberColor || '#000';
    const typeIcon = this._getTypeIcon(item.type);

    return `
      <article class="result-card" data-item-id="${this._escapeHtml(item.id)}" tabindex="0">
        <div class="result-card__header" style="border-color: ${chamberColor}">
          <span class="result-card__chamber" style="background-color: ${chamberColor}">
            ${this._escapeHtml(item.chamberName || item.chamber)}
          </span>
          <span class="result-card__type">${typeIcon}</span>
        </div>
        ${item.image ? `<img class="result-card__image" src="${this._escapeHtml(item.image)}" alt="" loading="lazy">` : ''}
        <div class="result-card__body">
          <h3 class="result-card__title">${this._escapeHtml(item.title)}</h3>
          ${item.subtitle ? `<p class="result-card__subtitle">${this._escapeHtml(item.subtitle)}</p>` : ''}
          ${item.description ? `<p class="result-card__desc">${this._escapeHtml(this._truncate(item.description, 100))}</p>` : ''}
        </div>
        <div class="result-card__footer">
          <div class="result-card__tags">
            ${item.tags
              .slice(0, 3)
              .map(
                tag =>
                  `<span class="result-tag">${this._escapeHtml(tag)}</span>`
              )
              .join('')}
          </div>
          <button class="share-btn" aria-label="Share this item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </article>
    `;
  }

  /**
   * Render global search modal results
   * @private
   */
  _renderGlobalSearchResults(results) {
    const container = this.elements.globalSearchResults;
    if (!container) {
      return;
    }

    if (results.length === 0) {
      container.innerHTML =
        '<p class="search-empty tc pa3 dark-gray">Type to search...</p>';
      return;
    }

    container.innerHTML = results
      .map((result, i) => {
        const item = result.item;
        const highlights = result.highlights || {};

        return `
        <div class="search-result-item ${i === this.selectedResultIndex ? 'selected' : ''}" data-item-id="${this._escapeHtml(item.id)}" tabindex="0">
          <div class="search-result-chamber" style="background-color: ${item.chamberColor || '#000'}">
            ${this._escapeHtml(item.chamberName || item.chamber)}
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${highlights.title || this._escapeHtml(item.title)}</div>
            ${highlights.description ? `<div class="search-result-desc">${highlights.description}</div>` : ''}
          </div>
        </div>
      `;
      })
      .join('');

    // Add click handlers
    container.querySelectorAll('.search-result-item').forEach((el, i) => {
      el.addEventListener('click', () => this._selectResult(i));
    });
  }

  /**
   * Render pagination controls
   * @private
   */
  _renderPagination(totalPages) {
    const container = this.elements.pagination;
    if (!container) {
      return;
    }

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const maxButtons = this.config.pagination?.maxPageButtons || 7;
    const pages = this._getPaginationRange(
      this.currentPage,
      totalPages,
      maxButtons
    );

    container.innerHTML = `
      <button class="page-btn" ${this.currentPage <= 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
        ← Prev
      </button>
      ${pages
        .map(page => {
          if (page === '...') {
            return '<span class="page-ellipsis">...</span>';
          }
          return `
          <button class="page-btn ${page === this.currentPage ? 'page-btn--active' : ''}" data-page="${page}">
            ${page}
          </button>
        `;
        })
        .join('')}
      <button class="page-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
        Next →
      </button>
    `;

    // Add click handlers
    container.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        if (page && page !== this.currentPage) {
          this.currentPage = page;
          this._renderResults();
          // Scroll to top of results
          this.elements.resultsGrid?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Calculate pagination range with ellipsis
   * @private
   */
  _getPaginationRange(current, total, maxButtons) {
    if (total <= maxButtons) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = [];
    const sideButtons = Math.floor((maxButtons - 3) / 2);

    if (current <= sideButtons + 2) {
      // Near start
      for (let i = 1; i <= maxButtons - 2; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(total);
    } else if (current >= total - sideButtons - 1) {
      // Near end
      pages.push(1);
      pages.push('...');
      for (let i = total - maxButtons + 3; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Middle
      pages.push(1);
      pages.push('...');
      for (let i = current - sideButtons; i <= current + sideButtons; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(total);
    }

    return pages;
  }

  /**
   * Update filter UI to reflect current state
   * @private
   */
  _updateFilterUI(state) {
    // Update filter summary
    if (this.elements.filterSummary) {
      this.elements.filterSummary.textContent =
        this.filterSystem.getSummaryText();
    }

    // Update tag cloud active states
    if (this.elements.tagCloud) {
      this.elements.tagCloud.querySelectorAll('.tag-btn').forEach(btn => {
        const isActive = state.tags.includes(btn.dataset.tag);
        btn.classList.toggle('tag-btn--active', isActive);
        btn.setAttribute('aria-pressed', isActive);
      });
    }

    // Update year inputs
    if (this.elements.yearFromInput) {
      this.elements.yearFromInput.value = state.fromYear || '';
    }
    if (this.elements.yearToInput) {
      this.elements.yearToInput.value = state.toYear || '';
    }
  }

  /**
   * Check for shared item in URL and navigate to it
   * @private
   */
  _checkForSharedItem() {
    const itemId = this.shareLinks.getItemIdFromUrl();
    if (itemId) {
      // Wait for page to settle, then navigate
      setTimeout(() => {
        this._navigateToItem(itemId);
      }, 500);
    }
  }

  /**
   * Get icon for content type
   * @private
   */
  _getTypeIcon(type) {
    const icons = {
      audio: '🎵',
      visual: '🎨',
      text: '📝',
      video: '🎬',
      code: '💻',
      archive: '📚',
    };
    return icons[type] || '📄';
  }

  /**
   * Truncate text to max length
   * @private
   */
  _truncate(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Escape HTML special characters
   * @private
   */
  _escapeHtml(text) {
    if (!text) {
      return '';
    }
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get controller status
   * @returns {Object}
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      currentPage: this.currentPage,
      resultCount: this.currentResults.length,
      searchQuery: this.currentSearchQuery,
      isSearchModalOpen: this.isSearchModalOpen,
    };
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    // Remove event listeners
    document.removeEventListener('keydown', this._onKeyDown);

    if (this.elements.searchInput) {
      this.elements.searchInput.removeEventListener(
        'input',
        this._onSearchInput
      );
    }
    if (this.elements.globalSearchInput) {
      this.elements.globalSearchInput.removeEventListener(
        'input',
        this._onGlobalSearchInput
      );
    }

    this.filterSystem.offChange(this._onFilterChange);

    // Clear state
    this.currentResults = [];
    this.isInitialized = false;
  }
}

// Export for global scope
window.DiscoveryController = DiscoveryController;
