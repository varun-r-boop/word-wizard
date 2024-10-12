(function () {
  const API_URL = 'https://word-wizard-z3b5.onrender.com/api';

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
  background-color: #333;
  color: #fff;
  padding: 15px;
  border-radius: 5px;
  white-space: normal;
  width: 300px;
  height: auto; /* Auto height for better content fitting */
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
      top: -65%; /* Place triangle right below the tooltip */
  left: 50%;
  transform: translateX(-50%);
  border-width: 10px;
  border-style: solid;
  border-color: #333 transparent transparent transparent; /* Triangle pointing upwards */
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

function createTooltip(term, definition) {
  const span = document.createElement('span');
  span.className = 'glossary-term';
  span.textContent = term;
  span.setAttribute('data-tooltip', definition);
  return span;
}

  // Function to extract text content from the webpage
  function extractMainContent() {
    let textContent = '';
    //textContent = document.body.innerText.trim();
    document.body.querySelectorAll('article, main, .content, .content_block_text').forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        textContent += node.textContent.trim() + ' ';
      }
    });
    return textContent;
  }

  // Function to get glossary terms from OpenAI API
  async function sendContentToServer(content) {
    try {
        const response = await fetch(API_URL+'/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        });

        if (response.ok) {
            const data = await response.json();
            // Handle the glossary terms
            return parseGlossary(data);
        } else {
            console.error('Failed to fetch glossary:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error sending content to server:', error);
    }
}

  // Function to parse the glossary text returned by OpenAI
  function parseGlossary(glossaryText) {
    const glossary = {};
    for (const [term, definition] of Object.entries(glossaryText)) {
      glossary[term] = definition;
  }
    return glossary;
  }


// Function to traverse and replace terms with glossary tooltips
function traverseNodes(glossary) {
  const contentNodes = document.body.querySelectorAll('article, main');
  contentNodes.forEach(node => {
    replaceTermsInNode(node, glossary);
  });
}

// Helper function to replace terms within a specific node
function replaceTermsInNode(node, glossary) {
  // Process only text nodes
  if (node.nodeType === Node.TEXT_NODE) {
    const textContent = node.textContent;
    let replacedText = textContent;

    // Replace each glossary term with the tooltip
    for (const term of Object.keys(glossary)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(replacedText)) {
          replacedText = replacedText.replace(regex, (match) => {
              const tooltipSpan = createTooltip(match, glossary[term]);
              return tooltipSpan.outerHTML;
          });
          break;  // Exit the loop after first replacement
      }
  }

    // Only replace text node if any term was matched
    if (replacedText !== textContent) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = replacedText;

      // Replace text node with the new content, preserving structure
      const fragment = document.createDocumentFragment();
      Array.from(tempDiv.childNodes).forEach(child => fragment.appendChild(child));
      node.replaceWith(fragment);
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Avoid replacing inside existing tooltips
    if (!node.classList.contains('glossary-term')) {
      // Recursively process child nodes
      Array.from(node.childNodes).forEach(child => replaceTermsInNode(child, glossary));
    }
  }
}

async function verifyCustomer(apiToken, domain) {
  try {
    const response = await fetch(API_URL+'/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiToken, domain }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.isValid;
    } else {
      console.error('Failed to verify customer:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error verifying customer:', error);
  }
  return false;
}

  // Execute on DOM content loaded
  document.addEventListener('DOMContentLoaded', async function () {
    // const apiToken = document.currentScript.getAttribute('data-id');
    const domain = window.location.hostname;
    const parts = window.location.pathname.split('/');
    const path = parts[parts.length - 1];
    const apiToken = "123";
    //const domain = ".com";

    const isValid = await verifyCustomer(apiToken, domain);
    if (!isValid) {
      console.warn('This script is not authorized to run on this domain.');
      return;
    }   
    injectStyles();
  var glossary = window.localStorage.getItem(`wordwizard-${path}`);
  if(glossary && glossary !== "undefined") {
    glossary = JSON.parse(glossary);
  }
    if(!glossary || glossary == "undefined") {
      const content = extractMainContent();
      glossary = await sendContentToServer(content);
      window.localStorage.setItem(`wordwizard-${path}`, JSON.stringify(glossary));
    }
  
    traverseNodes(glossary);
  });
})();