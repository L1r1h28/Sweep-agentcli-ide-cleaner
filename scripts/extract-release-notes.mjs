import fs from 'node:fs';

export function extractReleaseNotes(changelogPath, version) {
  const content = fs.readFileSync(changelogPath, 'utf8');
  const lines = content.split(/\r?\n/);

  let capturing = false;
  const result = [];
  const targetHeader = `## [${version}]`;

  for (const line of lines) {
    if (line.startsWith('## [')) {
      if (line.startsWith(targetHeader)) {
        capturing = true;
        continue;
      } else if (capturing) {
        break; // Reached next version
      }
    } else if (capturing) {
      result.push(line);
    }
  }

  const text = result.join('\n').trim();
  return text || `# Sweep v${version}\n\nInitial Release.`;
}

if (process.argv[1]?.includes('extract-release-notes')) {
  const version = process.argv[2] || '1.0.0';
  const notes = extractReleaseNotes('CHANGELOG.md', version);
  fs.writeFileSync('RELEASE_NOTES_BODY.md', notes);
  console.log(`[extract-release-notes] Extracted notes for v${version} (${notes.length} bytes):\n`);
  console.log(notes);
}
