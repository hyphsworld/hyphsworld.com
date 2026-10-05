const fs = require('node:fs');
const path = require('node:path');
function files(dir = process.cwd(), out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}
module.exports = { files };
