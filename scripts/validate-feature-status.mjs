#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const MANIFEST_PATH = path.resolve('config/feature-status.yml');
const FEATURE_ROOTS = ['pages/', 'components/', 'lib/'];

function readManifest(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const manifest = { overrideTag: 'feature-status-override', features: [] };
  let current = null;
  let inFileGlobs = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('overrideTag:')) {
      manifest.overrideTag = line.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
      continue;
    }

    if (line.startsWith('- name:')) {
      if (current) manifest.features.push(current);
      current = {
        name: line.slice('- name:'.length).trim(),
        status: 'incomplete',
        owner: '',
        fileGlobs: [],
      };
      inFileGlobs = false;
      continue;
    }

    if (!current) continue;

    if (line.startsWith('status:')) {
      current.status = line.slice('status:'.length).trim();
      inFileGlobs = false;
      continue;
    }

    if (line.startsWith('owner:')) {
      current.owner = line.slice('owner:'.length).trim();
      inFileGlobs = false;
      continue;
    }

    if (line.startsWith('fileGlobs:')) {
      inFileGlobs = true;
      continue;
    }

    if (inFileGlobs && line.startsWith('- ')) {
      current.fileGlobs.push(line.slice(2).trim().replace(/^['"]|['"]$/g, ''));
    }
  }

  if (current) manifest.features.push(current);
  return manifest;
}

function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAnyGlob(file, globs) {
  return globs.some((glob) => globToRegExp(glob).test(file));
}

function getChangedFiles(baseRef, diffFilter) {
  const ranges = [
    `${baseRef}...HEAD`,
    'HEAD~1...HEAD',
    'HEAD',
  ];

  for (const range of ranges) {
    try {
      const cmd = `git diff --name-only --diff-filter=${diffFilter} ${range}`;
      const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      return output ? output.split(/\r?\n/).filter(Boolean) : [];
    } catch {
      // try next range
    }
  }

  return [];
}

function resolveBaseRef() {
  const explicit = process.env.FEATURE_STATUS_BASE;
  if (explicit) return explicit;

  const githubBaseSha = process.env.GITHUB_BASE_SHA;
  if (githubBaseSha) return githubBaseSha;

  try {
    const defaultBranch = execSync('git symbolic-ref refs/remotes/origin/HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      .trim()
      .split('/')
      .pop();
    return `origin/${defaultBranch}`;
  } catch {
    return 'origin/main';
  }
}

function hasOverrideTag(tag) {
  if (process.env.FEATURE_STATUS_OVERRIDE === '1') return true;
  const title = process.env.PR_TITLE ?? '';
  const body = process.env.PR_BODY ?? '';
  const labels = process.env.PR_LABELS ?? '';
  const metadata = `${title}\n${body}\n${labels}`.toLowerCase();
  return metadata.includes(tag.toLowerCase());
}

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Missing manifest: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const manifest = readManifest(MANIFEST_PATH);
  const allGlobs = manifest.features.flatMap((f) => f.fileGlobs);
  const doneGlobs = manifest.features.filter((f) => f.status === 'done').flatMap((f) => f.fileGlobs);

  const baseRef = resolveBaseRef();
  const changedFiles = getChangedFiles(baseRef, 'ACMR');
  const addedFiles = getChangedFiles(baseRef, 'A');

  const doneTouched = changedFiles.filter((file) => matchesAnyGlob(file, doneGlobs));
  const newFeatureFilesWithoutStatus = addedFiles.filter((file) => {
    if (!FEATURE_ROOTS.some((root) => file.startsWith(root))) return false;
    return !matchesAnyGlob(file, allGlobs);
  });

  const errors = [];
  if (doneTouched.length > 0 && !hasOverrideTag(manifest.overrideTag)) {
    errors.push(
      `Modified files in done features require override tag \`${manifest.overrideTag}\` in PR title/body/labels (or FEATURE_STATUS_OVERRIDE=1).\n` +
        doneTouched.map((file) => `  - ${file}`).join('\n'),
    );
  }

  if (newFeatureFilesWithoutStatus.length > 0) {
    errors.push(
      'New feature files were added without a matching manifest entry in config/feature-status.yml.\n' +
        newFeatureFilesWithoutStatus.map((file) => `  - ${file}`).join('\n'),
    );
  }

  if (errors.length > 0) {
    console.error('Feature status validation failed:\n');
    console.error(errors.join('\n\n'));
    process.exit(1);
  }

  console.log('Feature status validation passed.');
}

main();
