import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes needed for desktop app
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

// Desktop icon SVG template function
function createDesktopIconSVG(size) {
  const cornerRadius = Math.round(size * 0.22); // Rounded corners
  
  // Scale all elements based on size
  const scale = size / 1024;
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- 圆角矩形背景 -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2c3e50"/>
      <stop offset="100%" style="stop-color:#3498db"/>
    </linearGradient>
  </defs>
  
  <!-- 应用背景 -->
  <rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#bgGradient)"/>
  
  <!-- 桌面显示器外壳 -->
  <rect x="${Math.round(180 * scale)}" y="${Math.round(160 * scale)}" width="${Math.round(664 * scale)}" height="${Math.round(416 * scale)}" rx="${Math.round(25 * scale)}" ry="${Math.round(25 * scale)}" fill="white"/>
  
  <!-- 显示器屏幕 -->
  <rect x="${Math.round(220 * scale)}" y="${Math.round(200 * scale)}" width="${Math.round(584 * scale)}" height="${Math.round(336 * scale)}" rx="${Math.round(15 * scale)}" ry="${Math.round(15 * scale)}" fill="#2c3e50"/>
  
  <!-- 窗口控制点 -->
  <circle cx="${Math.round(260 * scale)}" cy="${Math.round(240 * scale)}" r="${Math.round(12 * scale)}" fill="#e74c3c"/>
  <circle cx="${Math.round(300 * scale)}" cy="${Math.round(240 * scale)}" r="${Math.round(12 * scale)}" fill="#f39c12"/>
  <circle cx="${Math.round(340 * scale)}" cy="${Math.round(240 * scale)}" r="${Math.round(12 * scale)}" fill="#27ae60"/>
  
  <!-- 终端提示符 -->
  <text x="${Math.round(260 * scale)}" y="${Math.round(320 * scale)}" font-family="monospace" font-size="${Math.round(40 * scale)}" fill="white" font-weight="bold">&gt;</text>
  <rect x="${Math.round(300 * scale)}" y="${Math.round(295 * scale)}" width="${Math.round(60 * scale)}" height="${Math.round(8 * scale)}" fill="white"/>
  
  <!-- 显示器底座 -->
  <rect x="${Math.round(460 * scale)}" y="${Math.round(576 * scale)}" width="${Math.round(104 * scale)}" height="${Math.round(24 * scale)}" rx="${Math.round(12 * scale)}" ry="${Math.round(12 * scale)}" fill="white"/>
  <rect x="${Math.round(360 * scale)}" y="${Math.round(600 * scale)}" width="${Math.round(304 * scale)}" height="${Math.round(40 * scale)}" rx="${Math.round(20 * scale)}" ry="${Math.round(20 * scale)}" fill="white"/>
</svg>`;
}

// Ensure icons directory exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Generate SVG files for each size
sizes.forEach(size => {
  const svgContent = createDesktopIconSVG(size);
  const filename = `desktop-icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Created ${filename}`);
});

// Create main app icon
const mainIconContent = createDesktopIconSVG(1024);
const mainIconPath = path.join(__dirname, 'app-icon.svg');
fs.writeFileSync(mainIconPath, mainIconContent);
console.log('Updated app-icon.svg');

console.log('\n✅ Desktop icons created!');
console.log('\nFor Electron app packaging, the following are recommended:');
console.log('- macOS: 512x512 and 1024x1024 PNG files');
console.log('- Windows: 256x256 ICO file');
console.log('- Linux: 512x512 PNG file');
console.log('\nTo convert SVG to PNG/ICO, you can use online tools or:');
console.log('- ImageMagick: convert icon.svg icon.png');
console.log('- Inkscape: inkscape --export-type=png icon.svg');