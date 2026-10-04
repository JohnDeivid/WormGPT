const fs = require('fs');

try {
  let html = fs.readFileSync('C:/Users/User Name/Downloads/WormGPT--main/integrar.html', 'utf8');

  // If the file is UTF-16, node might read it as UTF-8 with null bytes. Let's clean it up if needed.
  if (html.includes('\0')) {
    html = Buffer.from(html, 'utf8').toString('utf16le');
  }

  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
  const css = styleMatch ? styleMatch[1] : '';

  const startStr = '<div class="contract-container" id="contractContainer">';
  let startIdx = html.indexOf(startStr);
  
  if (startIdx === -1) {
    // try case-insensitive or without quotes
    const regex = /<div\s+class="contract-container"\s+id="contractContainer"\s*>/i;
    const match = html.match(regex);
    if (match) startIdx = match.index;
    else throw new Error("Could not find contract container");
  }

  const substr = html.slice(startIdx);
  const divRegex = /<\/?div[^>]*>/gi;
  let match;
  let openDivs = 0;
  let endIdx = startIdx;

  while ((match = divRegex.exec(substr)) !== null) {
    if (match[0].toLowerCase().startsWith('<div')) openDivs++;
    else if (match[0].toLowerCase().startsWith('</div')) openDivs--;
    
    if (openDivs === 0) {
      endIdx = startIdx + match.index + match[0].length;
      break;
    }
  }

  let contractHtml = html.slice(startIdx, endIdx);

  // Convert HTML to JSX
  contractHtml = contractHtml
    .replace(/class=/g, 'className=')
    .replace(/style="([^"]+)"/g, (m, p1) => {
      const styleObj = {};
      p1.split(';').forEach(rule => {
        const parts = rule.split(':');
        if (parts.length === 2) {
          const key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
          const val = parts[1].trim();
          styleObj[key] = val;
        }
      });
      return `style={${JSON.stringify(styleObj)}}`;
    })
    .replace(/contenteditable="true"/gi, 'contentEditable={true}')
    .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

  const tsxContent = `import React from 'react';
import './ContratosEditor.css';

interface ContratosEditorProps {
  zoom: number;
}

export const ContratosEditor: React.FC<ContratosEditorProps> = ({ zoom }) => {
  return (
    <div className="editor-canvas" id="editorCanvas">
      <div 
        className="canvas-inner" 
        id="canvasInner"
        style={{ transform: \`scale(\${zoom / 100})\`, transformOrigin: 'top center' }}
      >
        ${contractHtml}
      </div>
    </div>
  );
};
`;

  fs.writeFileSync('C:/Users/User Name/Downloads/WormGPT--main/WormGPT--main/WormgptWindows/wormgpt_enhanced/app/src/components/ContratosEditor.tsx', tsxContent);
  fs.writeFileSync('C:/Users/User Name/Downloads/WormGPT--main/WormGPT--main/WormgptWindows/wormgpt_enhanced/app/src/components/ContratosEditor.css', css);

  console.log("Extraction complete!");
} catch (e) {
  console.error(e);
}
