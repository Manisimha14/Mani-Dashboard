const fs = require('fs');
const path = require('path');

const srcDesktop = "C:\\Users\\manis\\.gemini\\antigravity\\brain\\52445242-bc58-4375-8ec4-750c97bf8c68\\screenshot_desktop_1779272146955.png";
const srcMobile = "C:\\Users\\manis\\.gemini\\antigravity\\brain\\52445242-bc58-4375-8ec4-750c97bf8c68\\screenshot_mobile_1779272163550.png";

const destDesktop = path.join(__dirname, '../public/screenshot-desktop.png');
const destMobile = path.join(__dirname, '../public/screenshot-mobile.png');

try {
  if (fs.existsSync(srcDesktop)) {
    fs.copyFileSync(srcDesktop, destDesktop);
    console.log('Successfully copied screenshot-desktop.png to public/');
  } else {
    console.error('Source desktop file not found at:', srcDesktop);
  }
} catch (err) {
  console.error('Failed to copy desktop screenshot:', err);
}

try {
  // Let's resolve the path correctly by handling escaped slashes
  const fixedSrcMobile = srcMobile.replace('antigravity', '\\antigravity');
  const actualSrcMobile = fs.existsSync(srcMobile) ? srcMobile : (fs.existsSync(fixedSrcMobile) ? fixedSrcMobile : '');
  
  if (actualSrcMobile) {
    fs.copyFileSync(actualSrcMobile, destMobile);
    console.log('Successfully copied screenshot-mobile.png to public/');
  } else {
    console.error('Source mobile file not found.');
  }
} catch (err) {
  console.error('Failed to copy mobile screenshot:', err);
}
