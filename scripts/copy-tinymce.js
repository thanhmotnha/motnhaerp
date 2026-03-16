/**
 * Copy TinyMCE assets from node_modules to public/tinymce
 * Run: node scripts/copy-tinymce.js
 * Also runs automatically via postinstall
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'tinymce');
const dest = path.join(__dirname, '..', 'public', 'tinymce');

function copyDir(srcDir, destDir) {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            // Skip unnecessary dirs
            if (['LICENSE', '.github', 'CHANGELOG'].includes(entry.name)) continue;
            copyDir(srcPath, destPath);
        } else {
            // Skip non-essential files
            if (entry.name === 'package.json' || entry.name === 'README.md' || entry.name === 'CHANGELOG.md') continue;
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('📋 Copying TinyMCE assets to public/tinymce...');
copyDir(src, dest);
console.log('✅ TinyMCE assets copied successfully!');
