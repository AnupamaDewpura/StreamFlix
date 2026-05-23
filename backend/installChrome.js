const { execSync } = require('child_process');
const fs = require('fs');

async function ensureChrome() {
  // Check if chrome already exists in puppeteer cache
  const cacheBase = '/root/.cache/puppeteer/chrome';
  if (fs.existsSync(cacheBase)) {
    const versions = fs.readdirSync(cacheBase);
    for (const v of versions) {
      const bin = `${cacheBase}/${v}/chrome-linux64/chrome`;
      if (fs.existsSync(bin)) {
        console.log(`Chrome already installed at: ${bin}`);
        process.env.PUPPETEER_EXECUTABLE_PATH = bin;
        return bin;
      }
    }
  }

  // Not found — install it now
  console.log('Chrome not found. Installing now (this takes ~1 minute on first run)...');
  try {
    execSync('npx puppeteer browsers install chrome', {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log('Chrome installed successfully.');

    // Find the newly installed binary
    if (fs.existsSync(cacheBase)) {
      const versions = fs.readdirSync(cacheBase);
      for (const v of versions) {
        const bin = `${cacheBase}/${v}/chrome-linux64/chrome`;
        if (fs.existsSync(bin)) {
          process.env.PUPPETEER_EXECUTABLE_PATH = bin;
          console.log(`Chrome ready at: ${bin}`);
          return bin;
        }
      }
    }
  } catch (err) {
    console.error('Failed to install Chrome:', err.message);
  }

  return null;
}

module.exports = { ensureChrome };