(function () {
  const API_URL = 'http://localhost:3000/api/proxy';

function injectStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
  .glossary-term {
      position: relative;
      cursor: pointer;
      text-decoration: underline dotted;
    }
.glossary-term::after {
  content: attr(data-tooltip);
  position: absolute;
  background-color: #333;
  color: #fff;
  padding: 15px; /* Increased padding for more space inside the tooltip */
  border-radius: 5px;
  white-space: normal; /* Allow line breaks for long content */
  width: 300px;
  height: 200px;
  display: block; /* Necessary to apply height */
  opacity: 0;
  transition: opacity 0.3s ease;
  transform: translateY(-100%);
  top: -200px; /* Adjust to place the tooltip above the term */
  left: 50%; /* Center horizontally */
  transform: translate(-50%, -10px); /* Center alignment fix */
  overflow: hidden; /* Hide overflow content */
}

.glossary-term:hover::after,
.glossary-term:focus::after {
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
        const response = await fetch(API_URL, {
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
  const contentNodes = document.body.querySelectorAll('article, main, .content, .content_block_text');
  contentNodes.forEach(node => {
    replaceTermsInNode(node, glossary);
  });
}

// Helper function to replace terms within a specific node
function replaceTermsInNode(node, glossary) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const textContent = node.textContent;
    let replacedText = textContent;

    // Replace each glossary term with the tooltip
    Object.keys(glossary).forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      replacedText = replacedText.replace(regex, (match) => {
        const tooltipSpan = createTooltip(match, glossary[term]);
        return tooltipSpan.outerHTML;
      });
    });

    // Replace the original text node with the new span element if any term was replaced
    if (replacedText !== textContent) {
      const span = document.createElement('span');
      span.innerHTML = replacedText;
      node.replaceWith(...span.childNodes);
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Recursively process child nodes
    node.childNodes.forEach(child => replaceTermsInNode(child, glossary));
  }
}

  // Execute on DOM content loaded
  document.addEventListener('DOMContentLoaded', async function () {
    injectStyles();
    const content = extractMainContent();
    //const glossary = await sendContentToServer(content);
    debugger
    const defaultGlossary = {
      Security:'A platform for building mobile and desktop web applications.',
      Angular:'A building block of Angular applications.',
    };
    traverseNodes(defaultGlossary);
  });
})();