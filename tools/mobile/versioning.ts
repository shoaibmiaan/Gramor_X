import fs from 'node:fs';
import path from 'node:path';

type Platform = 'android' | 'ios';

interface Options {
  version: string;
  platforms: Set<Platform>;
  androidCode?: number;
  iosBuild?: number;
  notes?: string;
  changelogPath: string;
  date: string;
  skipPackageUpdate: boolean;
  dryRun: boolean;
}

interface AndroidVersionConfig {
  versionName: string;
  versionCode: number;
}

interface IOSVersionConfig {
  versionName: string;
  buildNumber: number;
}

const ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      map.set(key, 'true');
    } else {
      map.set(key, next);
      i++;
    }
  }

  const version = map.get('version') || map.get('app-version') || map.get('v');
  if (!version) {
    throw new Error('Missing required `--version` argument.');
  }

  const platformInput = (map.get('platform') || map.get('platforms') || 'android,ios')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const platforms: Set<Platform> = new Set();
  for (const value of platformInput) {
    if (value === 'all' || value === '*') {
      platforms.add('android');
      platforms.add('ios');
      continue;
    }
    if (value === 'android' || value === 'ios') {
      platforms.add(value);
      continue;
    }
    throw new Error(`Unsupported platform "${value}". Use android, ios, or all.`);
  }

  if (platforms.size === 0) {
    throw new Error('At least one platform must be provided.');
  }

  const notes = map.get('notes') || map.get('summary') || undefined;
  const changelogPath = path.resolve(
    ROOT,
    map.get('changelog') || path.join('docs', 'mobile', 'CHANGELOG.md'),
  );
  const date = map.get('date') || new Date().toISOString().slice(0, 10);

  const skipPackageUpdate = map.get('skip-package') === 'true';
  const dryRun = map.get('dry-run') === 'true';

  const androidCodeValue = map.get('android-code') || map.get('code');
  const iosBuildValue = map.get('ios-build') || map.get('build') || map.get('code');

  return {
    version,
    platforms,
    androidCode: androidCodeValue ? Number(androidCodeValue) : undefined,
    iosBuild: iosBuildValue ? Number(iosBuildValue) : undefined,
    notes,
    changelogPath,
    date,
    skipPackageUpdate,
    dryRun,
  };
}

function deriveNumericVersion(version: string): number {
  const segments = version.split('.').map((seg) => Number.parseInt(seg, 10) || 0);
  while (segments.length < 3) {
    segments.push(0);
  }
  const [major, minor, patch] = segments;
  return major * 10000 + minor * 100 + patch;
}

function readJSON<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Unable to parse JSON at ${filePath}: ${(error as Error).message}`);
  }
}

function writeJSON(filePath: string, data: unknown, dryRun: boolean) {
  if (dryRun) {
    console.log(`[dry-run] Would write ${filePath}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function updatePackageVersion(version: string, skip: boolean, dryRun: boolean) {
  if (skip) {
    console.log('Skipping package.json version update (skip-package flag set).');
    return;
  }
  const packagePath = path.join(ROOT, 'package.json');
  const pkg = readJSON(packagePath, {} as Record<string, unknown>);
  if (pkg.version === version) {
    console.log(`package.json already at v${version}`);
    return;
  }
  const updated = { ...pkg, version } as Record<string, unknown>;
  if (dryRun) {
    console.log(`[dry-run] Would update package.json version to ${version}`);
    return;
  }
  fs.writeFileSync(packagePath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  console.log(`Updated package.json version to v${version}`);
}

function ensureChangelogHeader(contents: string): string {
  if (contents.trim().length === 0) {
    return '# Mobile Release Changelog\n\n';
  }
  if (!contents.startsWith('#')) {
    return `# Mobile Release Changelog\n\n${contents}`;
  }
  return contents;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface ChangelogEntryData {
  version: string;
  date: string;
  webVersion: string;
  notes?: string;
  android?: AndroidVersionConfig;
  ios?: IOSVersionConfig;
}

function formatChangelogEntry(data: ChangelogEntryData): string {
  const lines = [`## v${data.version} — ${data.date}`, '', `- Web: v${data.webVersion}`];

  if (data.android) {
    lines.push(
      `- Android: v${data.android.versionName} (versionCode ${data.android.versionCode})`,
    );
  }
  if (data.ios) {
    lines.push(`- iOS: v${data.ios.versionName} (build ${data.ios.buildNumber})`);
  }
  if (data.notes) {
    lines.push(`- Notes: ${data.notes}`);
  }

  return `${lines.join('\n')}\n\n`;
}

function upsertChangelog(entry: ChangelogEntryData, changelogPath: string, dryRun: boolean) {
  const exists = fs.existsSync(changelogPath);
  const contents = exists ? fs.readFileSync(changelogPath, 'utf8') : '';
  const prepared = ensureChangelogHeader(contents);
  const block = formatChangelogEntry(entry);
  const pattern = new RegExp(`## v${escapeRegExp(entry.version)}[\s\S]*?(?=\n## v|$)`, 'm');

  let updated: string;
  if (pattern.test(prepared)) {
    updated = prepared.replace(pattern, block.trimEnd());
  } else {
    const firstEntryIndex = prepared.indexOf('\n## ');
    if (firstEntryIndex === -1) {
      const normalized = prepared.trimEnd();
      updated = `${normalized}\n\n${block}`;
    } else {
      const before = prepared.slice(0, firstEntryIndex).trimEnd();
      const after = prepared.slice(firstEntryIndex).trimStart();
      updated = `${before}\n\n${block}${after.length > 0 ? `\n${after}` : ''}`;
    }
  }

  if (!updated.endsWith('\n')) {
    updated += '\n';
  }

  if (dryRun) {
    console.log(`[dry-run] Would update changelog at ${changelogPath}`);
    console.log(updated);
    return;
  }

  fs.mkdirSync(path.dirname(changelogPath), { recursive: true });
  fs.writeFileSync(changelogPath, updated, 'utf8');
  console.log(`Updated changelog → ${path.relative(ROOT, changelogPath)}`);
}

function updateAndroid(version: string, code: number, dryRun: boolean): AndroidVersionConfig {
  const filePath = path.join(ROOT, 'mobile', 'android', 'version.json');
  const current = readJSON<AndroidVersionConfig>(filePath, {
    versionName: version,
    versionCode: code,
  });
  const payload: AndroidVersionConfig = {
    versionName: version,
    versionCode: code,
  };
  if (current.versionName === payload.versionName && current.versionCode === payload.versionCode) {
    console.log(`Android version already at v${version} (${code})`);
  } else {
    writeJSON(filePath, payload, dryRun);
    console.log(`Set Android version → v${version} (code ${code})`);
  }
  return payload;
}

function updateIOS(version: string, buildNumber: number, dryRun: boolean): IOSVersionConfig {
  const filePath = path.join(ROOT, 'mobile', 'ios', 'version.json');
  const current = readJSON<IOSVersionConfig>(filePath, {
    versionName: version,
    buildNumber,
  });
  const payload: IOSVersionConfig = {
    versionName: version,
    buildNumber,
  };
  if (current.versionName === payload.versionName && current.buildNumber === payload.buildNumber) {
    console.log(`iOS version already at v${version} (build ${buildNumber})`);
  } else {
    writeJSON(filePath, payload, dryRun);
    console.log(`Set iOS version → v${version} (build ${buildNumber})`);
  }
  return payload;
}

function main() {
  const options = parseArgs();

  const webVersion = options.version;

  const androidCode =
    options.platforms.has('android')
      ? options.androidCode ?? deriveNumericVersion(options.version)
      : undefined;
  const iosBuild =
    options.platforms.has('ios')
      ? options.iosBuild ?? deriveNumericVersion(options.version)
      : undefined;

  updatePackageVersion(webVersion, options.skipPackageUpdate, options.dryRun);

  let androidData: AndroidVersionConfig | undefined;
  let iosData: IOSVersionConfig | undefined;

  if (options.platforms.has('android') && androidCode !== undefined) {
    androidData = updateAndroid(options.version, androidCode, options.dryRun);
  }

  if (options.platforms.has('ios') && iosBuild !== undefined) {
    iosData = updateIOS(options.version, iosBuild, options.dryRun);
  }

  upsertChangelog(
    {
      version: options.version,
      date: options.date,
      webVersion,
      notes: options.notes,
      android: androidData,
      ios: iosData,
    },
    options.changelogPath,
    options.dryRun,
  );
}

try {
  main();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
