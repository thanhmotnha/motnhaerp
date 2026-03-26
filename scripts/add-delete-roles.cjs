/**
 * Script to add RBAC roles to DELETE route handlers.
 * Approach: regex-based replacement of the closing ");" of withAuth calls.
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, 'app', 'api');

const MANAGERS_FILES = [
  'admin/users/[id]/route.js',
  'employees/[id]/route.js',
];

const FINANCE_FILES = [
  'journal-entries/[id]/route.js',
  'project-expenses/route.js',
  'contractor-payments/[id]/route.js',
  'contractor-payments/[id]/items/[itemId]/route.js',
  'commitments/[id]/route.js',
  'budget/change-orders/[id]/route.js',
  'expense-categories/[id]/route.js',
];

const PROJECT_OPS_FILES = [
  'projects/[id]/route.js',
  'quotations/[id]/route.js',
  'contracts/[id]/route.js',
  'work-orders/[id]/route.js',
  'material-requisitions/[id]/route.js',
  'material-plans/[id]/route.js',
  'schedule-tasks/[id]/route.js',
  'schedule-tasks/[id]/contractors/route.js',
  'schedule-tasks/dependencies/route.js',
  'schedule-templates/[id]/route.js',
  'punch-list/[id]/route.js',
  'warranty/[id]/route.js',
  'site-logs/[id]/route.js',
  'furniture-orders/[id]/route.js',
  'furniture-orders/[id]/designs/[designId]/route.js',
  'furniture-orders/[id]/material-selections/[selId]/route.js',
];

const OFFICE_FILES = [
  'products/[id]/route.js',
  'products/[id]/bom/[bomId]/route.js',
  'products/[id]/attributes/[attrId]/route.js',
  'products/[id]/attributes/[attrId]/options/[optionId]/route.js',
  'product-categories/[id]/route.js',
  'suppliers/[id]/route.js',
  'customers/[id]/route.js',
  'contractors/[id]/route.js',
  'contract-templates/[id]/route.js',
  'work-item-library/[id]/route.js',
  'variant-templates/[id]/route.js',
  'variant-templates/[id]/options/route.js',
  'furniture-templates/[id]/route.js',
  'document-folders/[id]/route.js',
  'project-documents/[id]/route.js',
  'partner-documents/[id]/route.js',
  'workshops/[id]/route.js',
];

const ALL_FILES = [
  'drafts/[key]/route.js',
  'hr/leave-requests/[id]/route.js',
];

function processFile(relPath, roleGroup) {
  const fullPath = path.join(API_DIR, ...relPath.split('/'));
  if (!fs.existsSync(fullPath)) {
    console.log('SKIP (not found): ' + relPath);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already has roles on DELETE
  var deleteIdx = content.indexOf('export const DELETE = withAuth(');
  if (deleteIdx === -1) {
    console.log('SKIP (no DELETE): ' + relPath);
    return;
  }

  // Find the closing of the withAuth call by tracking parens from "withAuth("
  var withAuthOpenParen = content.indexOf('withAuth(', deleteIdx) + 'withAuth'.length;
  var parenDepth = 0;
  var endIndex = -1;
  
  for (var i = withAuthOpenParen; i < content.length; i++) {
    if (content[i] === '(') parenDepth++;
    else if (content[i] === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1) {
    console.log('SKIP (cant find end): ' + relPath);
    return;
  }

  var fullCall = content.substring(deleteIdx, endIndex + 1);
  
  if (fullCall.includes('roles:')) {
    console.log('SKIP (already has roles): ' + relPath);
    return;
  }

  // Step 1: Add ROLE_GROUPS import if not present
  if (!content.includes('ROLE_GROUPS')) {
    var withAuthImportRe = /import\s*\{[^}]*\}\s*from\s*['"]@\/lib\/apiHandler['"];?\r?\n/;
    if (withAuthImportRe.test(content)) {
      content = content.replace(withAuthImportRe, function(match) {
        return match + "import { ROLE_GROUPS } from '@/lib/roles';\r\n";
      });
    } else {
      // Add after first import line
      content = content.replace(/^(import .+;\r?\n)/m, function(match) {
        return match + "import { ROLE_GROUPS } from '@/lib/roles';\r\n";
      });
    }
    // Recalculate indices after inserting import
    deleteIdx = content.indexOf('export const DELETE = withAuth(');
    withAuthOpenParen = content.indexOf('withAuth(', deleteIdx) + 'withAuth'.length;
    parenDepth = 0;
    endIndex = -1;
    for (var k = withAuthOpenParen; k < content.length; k++) {
      if (content[k] === '(') parenDepth++;
      else if (content[k] === ')') {
        parenDepth--;
        if (parenDepth === 0) { endIndex = k; break; }
      }
    }
  }

  var rolesValue = 'ROLE_GROUPS.' + roleGroup;

  // Strategy: look backwards from endIndex (closing paren)
  // If the char before the closing paren is "}" (possibly preceded by whitespace/newline)
  // that's the end of either the function body or an options object.
  // 
  // Check if there's already an options object as 2nd arg:
  // We look for pattern: "}, {" between the function body and endIndex
  // 
  // Simpler approach: just check what's between the last "}" and endIndex
  // and look for an existing comma + object

  var insideWithAuth = content.substring(withAuthOpenParen + 1, endIndex);
  
  // Check if there's an existing options object by looking for the pattern:
  // The withAuth call ends with either:
  //   1) "...});" - just the async function, no options
  //   2) "...}, { entityType: '...' });" - with options
  //   3) "...}, { roles: [...] });" - already has roles
  
  // Find the last occurrence of "}" before endIndex
  // Then check if between that "}" and endIndex there are only spaces/newlines
  // OR if there's another "{ ... }" after a comma
  
  // Better approach: Use the fact that withAuth(fn) or withAuth(fn, opts)
  // The fn is always `async (...) => { ... }`
  // So we need to find where the arrow function body ends
  
  // Find the `=> {` pattern, then track braces from there
  var arrowBodyStart = -1;
  var searchFrom = withAuthOpenParen;
  
  // Find "=>" then the first "{" after it
  while (true) {
    var arrowIdx = content.indexOf('=>', searchFrom);
    if (arrowIdx === -1 || arrowIdx > endIndex) break;
    
    // Find the first non-whitespace after =>
    var afterArrow = arrowIdx + 2;
    while (afterArrow < endIndex && /\s/.test(content[afterArrow])) afterArrow++;
    
    if (content[afterArrow] === '{') {
      arrowBodyStart = afterArrow;
      break;
    }
    searchFrom = arrowIdx + 2;
  }
  
  if (arrowBodyStart === -1) {
    console.log('SKIP (cant find arrow body): ' + relPath);
    return;
  }
  
  // Now track braces from arrowBodyStart to find function body end
  var bd = 0;
  var bodyEnd = -1;
  for (var m = arrowBodyStart; m < endIndex; m++) {
    if (content[m] === '{') bd++;
    else if (content[m] === '}') {
      bd--;
      if (bd === 0) {
        bodyEnd = m;
        // DON'T break - continue to find if there's a deeper nested object that resets to 0
        // Actually no - the first time we reach 0, that's the end of the outermost block
        // which is the function body.
        break;
      }
    }
  }
  
  if (bodyEnd === -1) {
    console.log('SKIP (cant find body end): ' + relPath);
    return;
  }
  
  // Check what's between bodyEnd+1 and endIndex
  var afterBody = content.substring(bodyEnd + 1, endIndex).trim();
  
  if (afterBody === '') {
    // No options -> add options
    var before = content.substring(0, endIndex);
    var after = content.substring(endIndex);
    content = before + ', { roles: ' + rolesValue + ' }' + after;
  } else if (afterBody.startsWith(',')) {
    // Has options object -> add roles to existing options
    var optBraceIdx = content.indexOf('{', bodyEnd + 1);
    if (optBraceIdx !== -1 && optBraceIdx < endIndex) {
      var before2 = content.substring(0, optBraceIdx + 1);
      var after2 = content.substring(optBraceIdx + 1);
      content = before2 + ' roles: ' + rolesValue + ',' + after2;
    } else {
      console.log('WARN: ' + relPath);
      return;
    }
  } else {
    console.log('SKIP (unexpected after body): ' + relPath + ' -> [' + afterBody + ']');
    return;
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('DONE: ' + relPath + ' -> ' + roleGroup);
}

console.log('=== MANAGERS ===');
MANAGERS_FILES.forEach(function(f) { processFile(f, 'MANAGERS'); });

console.log('=== FINANCE ===');
FINANCE_FILES.forEach(function(f) { processFile(f, 'FINANCE'); });

console.log('=== PROJECT_OPS ===');
PROJECT_OPS_FILES.forEach(function(f) { processFile(f, 'PROJECT_OPS'); });

console.log('=== OFFICE ===');
OFFICE_FILES.forEach(function(f) { processFile(f, 'OFFICE'); });

console.log('=== ALL ===');
ALL_FILES.forEach(function(f) { processFile(f, 'ALL'); });
