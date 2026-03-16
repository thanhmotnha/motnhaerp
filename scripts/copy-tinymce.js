const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'tinymce');
const dst = path.join(__dirname, '..', 'public', 'tinymce');
function copyDir(s, d){ if(!fs.existsSync(s)) return; fs.mkdirSync(d,{recursive:true}); for(const e of fs.readdirSync(s,{withFileTypes:true})){ const sp=path.join(s,e.name); const dp=path.join(d,e.name); if(e.isDirectory()) copyDir(sp,dp); else fs.copyFileSync(sp,dp);} }
try{ copyDir(src,dst); console.log('[copy-tinymce] done'); }catch(e){ console.warn('[copy-tinymce] skipped',e.message); }
