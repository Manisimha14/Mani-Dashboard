const fs = require('fs');

const targetFile = 'c:/Coding/Vibecoding/Dashboard/src/pages/Dashboard.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// 1. Replace the lazy import
const oldImport = "const CognitiveCockpit = lazy(() => import('../components/CognitiveCockpit'));";
const newImport = "const QuickScratchpad = lazy(() => import('../components/QuickScratchpad'));";

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  console.log('Successfully updated Dashboard.tsx imports!');
} else {
  console.log('Error: Could not find CognitiveCockpit lazy import in Dashboard.tsx');
}

// 2. Replace the TSX element rendering
const oldRender = `<CognitiveCockpit />`;
const newRender = `<QuickScratchpad />`;

if (content.includes(oldRender)) {
  content = content.replace(oldRender, newRender);
  console.log('Successfully updated Dashboard.tsx layout rendering!');
} else {
  console.log('Error: Could not find <CognitiveCockpit /> in Dashboard.tsx');
}

// Convert back to CRLF before writing
const finalContent = content.replace(/\n/g, '\r\n');
fs.writeFileSync(targetFile, finalContent, 'utf8');
console.log('Finished modifying Dashboard.tsx successfully!');
