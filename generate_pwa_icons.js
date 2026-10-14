const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const iconsDir = path.join(__dirname, 'assets', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function renderSvgToPng(svgContent, outputPath, width, height) {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: transparent; }
  svg { display: block; width: ${width}px; height: ${height}px; }
</style>
</head>
<body>
${svgContent}
</body>
</html>`;

  const tmpHtml = path.join(__dirname, `_temp_icon_${width}x${height}.html`);
  fs.writeFileSync(tmpHtml, htmlContent, 'utf8');

  try {
    const cmd = `"${edgePath}" --headless --disable-gpu --default-background-color=00000000 --force-device-scale-factor=1 --window-size=${width},${height} --screenshot="${outputPath}" "${tmpHtml}"`;
    execSync(cmd, { stdio: 'pipe' });
  } finally {
    if (fs.existsSync(tmpHtml)) {
      fs.unlinkSync(tmpHtml);
    }
  }
}

// 1. Standard Icon SVG (512x512 base)
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="hfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9be15d" />
      <stop offset="100%" stop-color="#63d6bd" />
    </linearGradient>
    <filter id="hfGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#9be15d" flood-opacity="0.35" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="128" fill="#0b1220" />
  <rect x="56" y="56" width="400" height="400" rx="100" fill="url(#hfGrad)" filter="url(#hfGlow)" />
  <g fill="#102014" transform="translate(256,256)">
    <!-- 8-spoke Asterisk / HabitFlow Starburst mark -->
    <rect x="-24" y="-128" width="48" height="256" rx="24" />
    <rect x="-128" y="-24" width="256" height="48" rx="24" />
    <rect x="-24" y="-128" width="48" height="256" rx="24" transform="rotate(45)" />
    <rect x="-24" y="-128" width="48" height="256" rx="24" transform="rotate(-45)" />
  </g>
</svg>`;

// 2. Maskable Icon SVG (full bleed #0b1220 background, safe-zone padded mark)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="hfGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9be15d" />
      <stop offset="100%" stop-color="#63d6bd" />
    </linearGradient>
    <filter id="hfGlowMask" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#9be15d" flood-opacity="0.35" />
    </filter>
  </defs>
  <!-- Full bleed background for adaptive icon masking -->
  <rect width="512" height="512" fill="#0b1220" />
  <!-- Safe zone inner container (within 80% circle) -->
  <rect x="88" y="88" width="336" height="336" rx="84" fill="url(#hfGradMask)" filter="url(#hfGlowMask)" />
  <g fill="#102014" transform="translate(256,256) scale(0.84)">
    <rect x="-24" y="-128" width="48" height="256" rx="24" />
    <rect x="-128" y="-24" width="256" height="48" rx="24" />
    <rect x="-24" y="-128" width="48" height="256" rx="24" transform="rotate(45)" />
    <rect x="-24" y="-128" width="48" height="256" rx="24" transform="rotate(-45)" />
  </g>
</svg>`;

console.log('Generating PWA icons...');

// Generate 192x192 standard icon
renderSvgToPng(standardSvg, path.join(iconsDir, 'icon-192.png'), 192, 192);
console.log('Generated icon-192.png');

// Generate 512x512 standard icon
renderSvgToPng(standardSvg, path.join(iconsDir, 'icon-512.png'), 512, 512);
console.log('Generated icon-512.png');

// Generate 192x192 maskable icon
renderSvgToPng(maskableSvg, path.join(iconsDir, 'icon-maskable-192.png'), 192, 192);
console.log('Generated icon-maskable-192.png');

// Generate 512x512 maskable icon
renderSvgToPng(maskableSvg, path.join(iconsDir, 'icon-maskable-512.png'), 512, 512);
console.log('Generated icon-maskable-512.png');

// Generate 180x180 Apple touch icon
renderSvgToPng(standardSvg, path.join(iconsDir, 'apple-touch-icon.png'), 180, 180);
console.log('Generated apple-touch-icon.png');

// Clean up test_edge.js if exists
if (fs.existsSync(path.join(__dirname, 'test_edge.js'))) {
  fs.unlinkSync(path.join(__dirname, 'test_edge.js'));
}

console.log('All icons generated successfully!');
