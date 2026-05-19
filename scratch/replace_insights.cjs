const fs = require('fs');

const targetFile = 'c:/Coding/Vibecoding/Dashboard/src/pages/Dashboard.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// 1. Replace lazy import
const oldImport = "const ProductivityInsights = lazy(() => import('../components/dashboard/ProductivityInsights'));";
const newImport = "const SpaceClock = lazy(() => import('../components/dashboard/SpaceClock'));";

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  console.log('Successfully updated Dashboard.tsx lazy imports!');
} else {
  console.log('Error: Could not find ProductivityInsights lazy import in Dashboard.tsx');
}

// 2. Replace render block
const oldRender = `      {/* Productivity Insights */}
      <motion.div variants={item}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightSkeleton />
            <InsightSkeleton />
          </div>
        ) : (
          <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><InsightSkeleton /><InsightSkeleton /></div>}>
            <ProductivityInsights />
          </Suspense>
        )}
      </motion.div>`;

const newRender = `      {/* Real-time System Space Clock */}
      <motion.div variants={item}>
        <Suspense fallback={null}>
          <SpaceClock />
        </Suspense>
      </motion.div>`;

if (content.includes(oldRender)) {
  content = content.replace(oldRender, newRender);
  console.log('Successfully replaced ProductivityInsights render block with SpaceClock!');
} else {
  // Let's do a fallback replace if the indentation is slightly different
  const fallbackOldRender = `<ProductivityInsights />`;
  if (content.includes(fallbackOldRender)) {
    content = content.replace(fallbackOldRender, `<SpaceClock />`);
    console.log('Fallback: Successfully replaced ProductivityInsights TSX element!');
  } else {
    console.log('Error: Could not find ProductivityInsights render block in Dashboard.tsx');
  }
}

// Convert back to CRLF before writing
const finalContent = content.replace(/\n/g, '\r\n');
fs.writeFileSync(targetFile, finalContent, 'utf8');
console.log('Finished modifying Dashboard.tsx successfully!');
