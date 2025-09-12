#!/usr/bin/env node
/*
  Temporarily move the locked onboarding directory out of Next.js app tree
  to prevent EPERM readlink errors during production builds.
  - Renames src/app/onboarding -> src/app/onboarding-locked-temp (if possible)
  - Writes a marker file to restore after build
*/
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..');
const onboardingDir = path.join(appDir, 'src', 'app', 'onboarding');
const tempDir = path.join(appDir, 'src', 'app', 'onboarding-locked-temp');
const markerFile = path.join(__dirname, '.onboarding_renamed');

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

const mode = process.argv[2] || 'pre'; // 'pre' or 'post'

if (mode === 'pre') {
  try {
    if (exists(onboardingDir)) {
      // If tempDir exists from a prior interrupted build, remove it first
      if (exists(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
      }
      fs.renameSync(onboardingDir, tempDir);
      fs.writeFileSync(markerFile, 'renamed', 'utf8');
      console.log('🛡️  Moved locked onboarding directory -> onboarding-locked-temp');
    } else {
      console.log('ℹ️  No src/app/onboarding directory to move.');
    }
  } catch (err) {
    console.warn('⚠️  Could not move onboarding directory. Proceeding anyway:', err.message);
  }
} else if (mode === 'post') {
  try {
    if (exists(markerFile)) {
      // Restore only if we actually moved it
      if (exists(tempDir)) {
        fs.renameSync(tempDir, onboardingDir);
        console.log('✅ Restored onboarding directory to original location');
      }
      try {
        fs.rmSync(markerFile, { force: true });
      } catch {}
    } else {
      // No-op
    }
  } catch (err) {
    console.warn('⚠️  Could not restore onboarding directory:', err.message);
  }
}
