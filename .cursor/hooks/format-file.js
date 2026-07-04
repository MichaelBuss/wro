#!/usr/bin/env node
/**
 * Cursor hook: Format files after agent edits using Prettier.
 * Receives JSON payload via stdin: {"file_path": "/absolute/path/to/file.tsx", ...}
 *
 * Uses .prettierrc for config and .prettierignore for exclusions.
 *
 * NOTE: This is intentionally plain JS, not TypeScript.
 * This hook runs on EVERY file edit by Cursor's agent, so startup time matters.
 * Using ts-node would add ~500-1000ms overhead per edit, degrading developer experience.
 * Plain Node.js starts instantly and handles JSON parsing natively.
 */

import { execSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const FORMATTABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.scss',
  '.html',
])

/**
 * Parse JSON payload and extract file_path
 * @param {string} payload - JSON string from stdin
 * @returns {string | null} - Extracted file path or null if invalid
 */
const parsePayload = (payload) => {
  try {
    const data = JSON.parse(payload)
    return data.file_path || null
  } catch {
    return null
  }
}

/**
 * Check if a file extension is formattable
 * @param {string} filePath - File path to check
 * @returns {boolean} - True if the file extension is formattable
 */
const isFormattable = (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  return FORMATTABLE_EXTENSIONS.has(ext)
}

/**
 * Convert absolute path to relative path from repo root
 * @param {string} filePath - Absolute file path
 * @param {string} repoRoot - Repository root path
 * @returns {string | null} - Relative path or null if not under repo root
 */
const toRelativePath = (filePath, repoRoot) => {
  const repoRootWithSep = repoRoot.endsWith('/') ? repoRoot : repoRoot + '/'
  if (filePath.startsWith(repoRootWithSep)) {
    return filePath.slice(repoRootWithSep.length)
  }
  // File is outside the repository — don't attempt to format it
  return null
}

/**
 * Run Prettier on a file, respecting .prettierrc and .prettierignore
 * @param {string} relativePath - Relative path to the file
 * @param {string} repoRoot - Repository root path
 * @param {Function} [execFn] - Optional exec function for testing
 * @returns {boolean} - True if formatting succeeded
 */
const runFormatter = (relativePath, repoRoot, execFn = execSync) => {
  try {
    execFn(`npx prettier --write --ignore-unknown "${relativePath}"`, {
      cwd: repoRoot,
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

const main = async () => {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  const payload = Buffer.concat(chunks).toString('utf8')

  const filePath = parsePayload(payload)
  if (!filePath) {
    process.exit(0)
  }

  if (!isFormattable(filePath)) {
    process.exit(0)
  }

  const repoRoot = path.resolve(import.meta.dirname, '../..')
  const relativePath = toRelativePath(filePath, repoRoot)

  // Skip files outside the repository (e.g., ~/.cursor/plans/*.md)
  if (!relativePath) {
    process.exit(0)
  }

  runFormatter(relativePath, repoRoot)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}

export {
  FORMATTABLE_EXTENSIONS,
  parsePayload,
  isFormattable,
  toRelativePath,
  runFormatter,
}
