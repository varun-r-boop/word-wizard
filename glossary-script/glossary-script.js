/**
 * WordWizard - A glossary term highlighting and tooltip system
 * @author WordWizard
 * @version 1.0.0
 */
(function () {
  // Constants
  const API_URL = 'https://word-wizard-z3b5.onrender.com/api';
  const STORAGE_PREFIX = 'wordwizard-';
  const TOOLTIP_WIDTH = '300px';
  const TOOLTIP_BACKGROUND = '#333';
  const TOOLTIP_TEXT_COLOR = '#fff';

  /**
   * Injects the required CSS styles for glossary terms and tooltips
   */
  function injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      .glossary-term {
        position: relative;
        cursor: pointer;
        text-decoration: underline dotted;
        z-index: 9999;
      }

      .glossary-term::after {
        content: attr(data-tooltip);
        position: absolute;
        background-color: ${TOOLTIP_BACKGROUND};
        color: ${TOOLTIP_TEXT_COLOR};
        padding: 15px;
        border-radius: 5px;
        white-space: normal;
        width: ${TOOLTIP_WIDTH};
        height: auto;
        display: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        left: 50%;
        transform: translate(-50%, -119%);
        z-index: 1000;
        top: auto;
      }

      .glossary-term::before {
        content: '';
        position: absolute;
        top: -65%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 10px;
        border-style: solid;
        border-color: ${TOOLTIP_BACKGROUND} transparent transparent transparent;
        display: none;
        z-index: 999;
      }

      .glossary-term:hover::after,
      .glossary-term:focus::after,
      .glossary-term:hover::before,
      .glossary-term:focus::before {
        display: block;
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Creates a tooltip element for a glossary term
   * @param {string} term - The glossary term
   * @param {string} definition - The definition of the term
   * @returns {HTMLElement} The tooltip element
   */
  function createTooltip(term, definition) {
    const span = document.createElement('span');
    span.className = 'glossary-term';
    span.textContent = term;
    span.setAttribute('data-tooltip', definition);
    return span;
  }

  /**
   * Extracts main content from the webpage
   * @returns {string} The extracted content
   */
  function extractMainContent() {
    const contentSelectors = ['article', 'main', '.content', '.content_block_text'];
    return Array.from(document.body.querySelectorAll(contentSelectors.join(',')))
      .map(node => node.textContent.trim())
      .join(' ');
  }

  /**
   * Sends content to the server for glossary term extraction
   * @param {string} content - The content to analyze
   * @returns {Promise<Object>} The glossary terms and definitions
   */
  async function sendContentToServer(content) {
    try {
      const response = await fetch(`${API_URL}/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return parseGlossary(data);
    } catch (error) {
      console.error('Error sending content to server:', error);
      return {};
    }
  }

  /**
   * Parses the glossary data into a usable format
   * @param {Object} glossaryText - The raw glossary data
   * @returns {Object} The parsed glossary
   */
  function parseGlossary(glossaryText) {
    return Object.fromEntries(
      Object.entries(glossaryText).map(([term, definition]) => [term, definition])
    );
  }

  /**
   * Replaces terms within a specific node with tooltips
   * @param {Node} node - The node to process
   * @param {Object} glossary - The glossary terms and definitions
   */
  function replaceTermsInNode(node, glossary) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent;
      let replacedText = textContent;

      for (const [term, definition] of Object.entries(glossary)) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        if (regex.test(replacedText)) {
          replacedText = replacedText.replace(regex, (match) => {
            const tooltipSpan = createTooltip(match, definition);
            return tooltipSpan.outerHTML;
          });
          break;
        }
      }

      if (replacedText !== textContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = replacedText;
        const fragment = document.createDocumentFragment();
        Array.from(tempDiv.childNodes).forEach(child => fragment.appendChild(child));
        node.replaceWith(fragment);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('glossary-term')) {
      Array.from(node.childNodes).forEach(child => replaceTermsInNode(child, glossary));
    }
  }

  /**
   * Traverses the DOM and replaces terms with tooltips
   * @param {Object} glossary - The glossary terms and definitions
   */
  function traverseNodes(glossary) {
    document.body.querySelectorAll('article, main').forEach(node => {
      replaceTermsInNode(node, glossary);
    });
  }

  /**
   * Verifies the customer's API token and domain
   * @param {string} apiToken - The API token
   * @param {string} domain - The domain to verify
   * @returns {Promise<boolean>} Whether the verification was successful
   */
  async function verifyCustomer(apiToken, domain) {
    try {
      const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken, domain }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.isValid;
    } catch (error) {
      console.error('Error verifying customer:', error);
      return false;
    }
  }

  /**
   * Initializes the WordWizard functionality
   */
  async function initialize() {
    const domain = window.location.hostname;
    const path = window.location.pathname.split('/').pop();
    const apiToken = "123"; // TODO: Replace with actual token management

    const isValid = await verifyCustomer(apiToken, domain);
    if (!isValid) {
      console.warn('WordWizard: Unauthorized domain');
      return;
    }

    injectStyles();

    const storageKey = `${STORAGE_PREFIX}${path}`;
    let glossary = JSON.parse(window.localStorage.getItem(storageKey) || 'null');

    if (!glossary) {
      const content = extractMainContent();
      glossary = await sendContentToServer(content);
      window.localStorage.setItem(storageKey, JSON.stringify(glossary));
    }

    traverseNodes(glossary);
  }

  // Initialize on DOM content loaded
  document.addEventListener('DOMContentLoaded', initialize);
})();