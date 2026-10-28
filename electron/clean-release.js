const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');

if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true });
  console.log('[electron:clean] Dossier release/ supprimé.');
} else {
  console.log('[electron:clean] Rien à nettoyer.');
}
