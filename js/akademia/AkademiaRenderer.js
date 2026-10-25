/**
 * @file AkademiaRenderer.js
 * @description Renders Akademia chamber cards from akademiaConfig data.
 * Replaces static HTML cards with data-driven generation.
 *
 * @requires akademiaConfig - from akademia/config.js
 */

'use strict';

/**
 * Renders Akademia chamber content from config data
 */
class AkademiaRenderer {
  /**
   * @param {Object} config - akademiaConfig object
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Build the metadata line for a card
   * @param {string} sectionTitle - Section name (e.g. 'Essays')
   * @param {Object} item - Item data
   * @returns {string} Metadata text
   */
  _buildMeta(sectionTitle, item) {
    const parts = [sectionTitle];
    if (item.readTime) {
      parts.push(`${item.readTime} read`);
    }
    if (item.category) {
      parts.push(item.category);
    }
    if (item.level) {
      parts.push(item.level);
    }
    if (item.status) {
      parts.push(item.status);
    }
    if (item.type) {
      parts.push(item.type);
    }
    return parts.join(' \u00b7 ');
  }

  /**
   * Build the study detail rows for a studies-section card
   * @param {Object} item - Item data with technique/reference/result fields
   * @returns {DocumentFragment} Fragment containing detail elements
   */
  _buildStudyDetails(item) {
    const frag = document.createDocumentFragment();
    const rows = [
      { label: 'Technique', value: item.technique },
      { label: 'Reference', value: item.reference },
      { label: 'Result', value: item.result },
    ];
    rows.forEach(({ label, value }) => {
      if (!value) {
        return;
      }
      const row = document.createElement('p');
      row.className = 'f7 mt1 mb0';
      const strong = document.createElement('strong');
      strong.className = 'o-70';
      strong.style.color = this.config.primaryColor;
      strong.textContent = `${label}: `;
      const span = document.createElement('span');
      span.className = 'o-60';
      span.textContent = value;
      row.appendChild(strong);
      row.appendChild(span);
      frag.appendChild(row);
    });
    return frag;
  }

  /**
   * Render a single card element
   * @param {string} sectionId - Section key
   * @param {string} sectionTitle - Section display name
   * @param {Object} item - Item data
   * @returns {HTMLElement} Card div
   */
  _renderCard(sectionId, sectionTitle, item) {
    const card = document.createElement('div');
    card.className =
      'chamber-card ba b--white-20 br3 pa4 ma3 mw6 hover-bg-white-10';
    card.dataset.section = sectionId;
    card.style.borderLeft = `3px solid ${this.config.primaryColor}`;

    const h3 = document.createElement('h3');
    h3.className = 'f4 mt0 mb2';
    h3.style.color = this.config.primaryColor;
    h3.textContent = item.title;

    const p = document.createElement('p');
    p.className = 'f6 o-70 mt0 mb2';
    p.textContent = item.subtitle || '';

    const meta = document.createElement('span');
    meta.className = 'f7 o-50';
    meta.textContent = this._buildMeta(sectionTitle, item);

    card.appendChild(h3);
    card.appendChild(p);
    if (sectionId === 'studies') {
      card.appendChild(this._buildStudyDetails(item));
    }
    card.appendChild(meta);
    return card;
  }

  /**
   * Render all cards into a container element
   * @param {string} containerSelector - CSS selector for the cards container
   */
  render(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      return;
    }

    // Clear existing static cards
    container.innerHTML = '';

    const sections = this.config.sections;
    Object.keys(sections).forEach(sectionId => {
      const section = sections[sectionId];
      if (!section.items || section.items.length === 0) {
        return;
      }
      section.items.forEach(item => {
        container.appendChild(this._renderCard(sectionId, section.title, item));
      });
    });
  }
}
