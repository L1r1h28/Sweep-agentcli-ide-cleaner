import type { WhitelistRules } from "./types.ts";

/**
 * Converts a glob pattern string into a RegExp for cross-platform path matching.
 * Handles Windows `\` and POSIX `/`, wildcard `*`, recursive wildcard `**`, and `?`.
 */
export function globToRegex(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, "/").trim();
  let regexStr = "";
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i];
    if (char === "*") {
      if (normalized[i + 1] === "*") {
        if (normalized[i + 2] === "/") {
          regexStr += "(?:.*/)?";
          i += 3;
          continue;
        } else {
          regexStr += ".*";
          i += 2;
          continue;
        }
      } else {
        regexStr += "[^/]*";
        i++;
        continue;
      }
    } else if (char === "?") {
      regexStr += "[^/]";
      i++;
    } else if (["[", "]", "(", ")", "{", "}", ".", "+", "^", "$", "|"].includes(char)) {
      regexStr += `\\${char}`;
      i++;
    } else {
      regexStr += char;
      i++;
    }
  }

  return new RegExp(`(^|/)${regexStr}($|/)`, "i");
}

/**
 * Checks if a file/directory path is covered by any glob patterns in whitelist.
 */
export function isPathWhitelisted(targetPath: string, rules?: WhitelistRules): boolean {
  if (!rules?.patterns || rules.patterns.length === 0) return false;
  const normalizedPath = targetPath.replace(/\\/g, "/");

  for (const pattern of rules.patterns) {
    if (!pattern || typeof pattern !== "string") continue;
    try {
      const regex = globToRegex(pattern);
      if (regex.test(normalizedPath)) {
        return true;
      }
      // Also test basename specifically
      const parts = normalizedPath.split("/");
      const baseName = parts[parts.length - 1] || "";
      if (regex.test(baseName)) {
        return true;
      }
    } catch {
      // If regex compilation fails, fallback to simple inclusion
      if (normalizedPath.toLowerCase().includes(pattern.toLowerCase().replace(/\\/g, "/"))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a project name or project path matches any entry in rules.projects.
 */
export function isProjectWhitelisted(projectNameOrPath: string, rules?: WhitelistRules): boolean {
  if (!rules?.projects || rules.projects.length === 0) return false;
  const normalized = projectNameOrPath.toLowerCase().replace(/\\/g, "/").trim();

  for (const proj of rules.projects) {
    if (!proj || typeof proj !== "string") continue;
    const normProj = proj.toLowerCase().replace(/\\/g, "/").trim();
    if (normalized === normProj) return true;
    if (normalized.includes(normProj) || normProj.includes(normalized)) return true;
  }

  return false;
}

/**
 * Checks if a session ID is explicitly whitelisted.
 */
export function isSessionIdWhitelisted(sessionId: string, rules?: WhitelistRules): boolean {
  if (!rules?.sessionIds || rules.sessionIds.length === 0) return false;
  return rules.sessionIds.some((id) => id && id.trim() === sessionId.trim());
}

/**
 * Comprehensive check for a conversation session.
 */
export function isSessionWhitelisted(
  session: { id: string; projectName?: string; path: string },
  rules?: WhitelistRules,
): boolean {
  if (!rules) return false;

  if (isSessionIdWhitelisted(session.id, rules)) return true;
  if (session.projectName && isProjectWhitelisted(session.projectName, rules)) return true;
  if (isPathWhitelisted(session.path, rules)) return true;

  return false;
}

/**
 * Checks if a ScanEntry path or target matches whitelist rules.
 */
export function isScanEntryWhitelisted(
  entry: { path: string; targetId?: string; toolId?: string },
  rules?: WhitelistRules,
): boolean {
  if (!rules) return false;
  if (isPathWhitelisted(entry.path, rules)) return true;
  return false;
}
