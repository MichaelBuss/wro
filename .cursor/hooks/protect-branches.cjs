#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");

const PROTECTED_BRANCHES = new Set(["main"]);
const SHELL_SEPARATORS = new Set(["&&", "||", ";", "|"]);
const GIT_GLOBAL_OPTIONS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--exec-path",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--config-env",
  "--super-prefix",
]);
const PROTECTED_BRANCH_MUTATING_GIT_SUBCOMMANDS = new Set([
  "cherry-pick",
  "commit",
  "merge",
  "pull",
  "rebase",
  "revert",
]);
const GH_API_PROTECTED_BRANCH_PATH_PATTERN = /(?:branches\/|ref\/heads\/|refs\/heads\/)(main)(?=$|[/?\s])/;

const allow = () => ({ permission: "allow" });

const deny = ({ agentMessage, userMessage }) => ({
  permission: "deny",
  user_message: userMessage,
  agent_message: agentMessage,
});

const parsePayload = payload => {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

const normalizeBranchName = value => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  return trimmedValue
    .replace(/^refs\/remotes\/origin\//, "")
    .replace(/^refs\/heads\//, "")
    .replace(/^origin\//, "");
};

const isProtectedBranch = value => {
  const normalizedBranchName = normalizeBranchName(value);
  return normalizedBranchName ? PROTECTED_BRANCHES.has(normalizedBranchName) : false;
};

const findProtectedBranch = value => {
  if (typeof value !== "string") {
    return null;
  }

  const candidateParts = value.split(/[:,=]/);

  for (const candidatePart of candidateParts) {
    const normalizedBranchName = normalizeBranchName(candidatePart);
    if (normalizedBranchName && PROTECTED_BRANCHES.has(normalizedBranchName)) {
      return normalizedBranchName;
    }
  }

  return null;
};

const getCurrentBranch = (cwd, execFn = execSync) => {
  if (!cwd) {
    return null;
  }

  try {
    const branchName = execFn("git branch --show-current", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return normalizeBranchName(branchName);
  } catch {
    return null;
  }
};

const resolveCommandPath = (cwd, targetPath) => {
  if (!cwd || !targetPath) {
    return targetPath || cwd || null;
  }

  return path.isAbsolute(targetPath) ? targetPath : path.resolve(cwd, targetPath);
};

const deriveRepoPathFromGitDir = gitDir => {
  if (!gitDir) {
    return null;
  }

  return path.basename(gitDir) === ".git" ? path.dirname(gitDir) : null;
};

const getExecutableName = token => {
  if (typeof token !== "string" || !token) {
    return null;
  }

  return path.basename(token);
};

const isGitOrGhToken = token => {
  const executableName = getExecutableName(token);
  return executableName === "git" || executableName === "gh";
};

const tokenizeShellCommand = command => {
  const tokens = [];
  let currentToken = "";
  let quote = null;
  let isEscaping = false;

  const pushCurrentToken = () => {
    if (!currentToken) {
      return;
    }

    tokens.push(currentToken);
    currentToken = "";
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    const nextTwoCharacters = command.slice(index, index + 2);

    if (isEscaping) {
      currentToken += character;
      isEscaping = false;
      continue;
    }

    if (quote === "'") {
      if (character === "'") {
        quote = null;
      } else {
        currentToken += character;
      }
      continue;
    }

    if (quote === '"') {
      if (character === '"') {
        quote = null;
      } else if (character === "\\") {
        index += 1;
        if (index < command.length) {
          currentToken += command[index];
        }
      } else {
        currentToken += character;
      }
      continue;
    }

    if (character === "\\") {
      isEscaping = true;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (SHELL_SEPARATORS.has(nextTwoCharacters)) {
      pushCurrentToken();
      tokens.push(nextTwoCharacters);
      index += 1;
      continue;
    }

    if (SHELL_SEPARATORS.has(character)) {
      pushCurrentToken();
      tokens.push(character);
      continue;
    }

    if (/\s/.test(character)) {
      pushCurrentToken();
      continue;
    }

    currentToken += character;
  }

  pushCurrentToken();

  return tokens;
};

const splitCommandSegments = tokens => {
  const segments = [];
  let currentSegment = [];

  for (const token of tokens) {
    if (SHELL_SEPARATORS.has(token)) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      continue;
    }

    currentSegment.push(token);
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
};

const isEnvironmentAssignment = token => /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token);

const unwrapShellSegment = ({ tokens, cwd }) => {
  if (tokens.length === 0) {
    return { type: "other", args: [] };
  }

  let currentTokens = tokens;

  while (currentTokens.length > 0 && isEnvironmentAssignment(currentTokens[0])) {
    currentTokens = currentTokens.slice(1);
  }

  if (currentTokens[0] === "env") {
    let index = 1;
    let effectiveCwd = cwd;

    while (index < currentTokens.length) {
      const token = currentTokens[index];

      if (token === "--") {
        index += 1;
        break;
      }

      if (token === "-C" || token === "--chdir") {
        const nextValue = currentTokens[index + 1];
        if (!nextValue) {
          return { type: "other", args: [] };
        }

        effectiveCwd = resolveCommandPath(effectiveCwd, nextValue);
        index += 2;
        continue;
      }

      if (token.startsWith("--chdir=")) {
        effectiveCwd = resolveCommandPath(effectiveCwd, token.slice("--chdir=".length));
        index += 1;
        continue;
      }

      if (isEnvironmentAssignment(token)) {
        index += 1;
        continue;
      }

      if (token.startsWith("-")) {
        return {
          type: "unsupported-wrapper",
          args: currentTokens.slice(index),
          cwd: effectiveCwd,
          wrapper: "env",
        };
      }

      break;
    }

    return unwrapShellSegment({
      tokens: currentTokens.slice(index),
      cwd: effectiveCwd,
    });
  }

  if (currentTokens[0] === "command" || currentTokens[0] === "nohup" || currentTokens[0] === "time") {
    return unwrapShellSegment({
      tokens: currentTokens.slice(1),
      cwd,
    });
  }

  if (currentTokens[0] === "sudo") {
    return {
      type: "unsupported-wrapper",
      args: currentTokens.slice(1),
      cwd,
      wrapper: "sudo",
    };
  }

  if (currentTokens[0] === "bash" || currentTokens[0] === "sh" || currentTokens[0] === "zsh") {
    const commandIndex = currentTokens.findIndex(token => token === "-c" || token === "-lc" || token === "-ic");

    if (commandIndex >= 0 && currentTokens[commandIndex + 1]) {
      return {
        type: "nested-shell",
        command: currentTokens[commandIndex + 1],
        cwd,
      };
    }
  }

  if (isGitOrGhToken(currentTokens[0])) {
    return {
      type: getExecutableName(currentTokens[0]),
      args: currentTokens.slice(1),
      cwd,
    };
  }

  return { type: "other", args: currentTokens.slice(1) };
};

const getGitSubcommand = gitArgs => {
  let index = 0;

  while (index < gitArgs.length) {
    const token = gitArgs[index];

    if (token === "--") {
      index += 1;
      break;
    }

    if (!token.startsWith("-")) {
      break;
    }

    if (GIT_GLOBAL_OPTIONS_WITH_VALUE.has(token)) {
      index += 2;
      continue;
    }

    if (
      token.startsWith("--git-dir=") ||
      token.startsWith("--work-tree=") ||
      token.startsWith("--namespace=") ||
      token.startsWith("--exec-path=") ||
      token.startsWith("--config-env=")
    ) {
      index += 1;
      continue;
    }

    index += 1;
  }

  return {
    subcommand: gitArgs[index] || null,
    subcommandArgs: gitArgs.slice(index + 1),
  };
};

const getGitExecutionContext = ({ cwd, gitArgs }) => {
  let currentDirectory = cwd;
  let gitDir = null;
  let workTree = null;
  let index = 0;

  while (index < gitArgs.length) {
    const token = gitArgs[index];

    if (token === "--") {
      index += 1;
      break;
    }

    if (!token.startsWith("-")) {
      break;
    }

    if (token === "-C") {
      const nextValue = gitArgs[index + 1];
      if (!nextValue) {
        break;
      }

      currentDirectory = resolveCommandPath(currentDirectory, nextValue);
      index += 2;
      continue;
    }

    if (token === "--git-dir") {
      const nextValue = gitArgs[index + 1];
      if (!nextValue) {
        break;
      }

      gitDir = resolveCommandPath(currentDirectory, nextValue);
      index += 2;
      continue;
    }

    if (token === "--work-tree") {
      const nextValue = gitArgs[index + 1];
      if (!nextValue) {
        break;
      }

      workTree = resolveCommandPath(currentDirectory, nextValue);
      index += 2;
      continue;
    }

    if (token.startsWith("--git-dir=")) {
      gitDir = resolveCommandPath(currentDirectory, token.slice("--git-dir=".length));
      index += 1;
      continue;
    }

    if (token.startsWith("--work-tree=")) {
      workTree = resolveCommandPath(currentDirectory, token.slice("--work-tree=".length));
      index += 1;
      continue;
    }

    if (token.startsWith("--namespace=") || token.startsWith("--exec-path=") || token.startsWith("--config-env=")) {
      index += 1;
      continue;
    }

    if (GIT_GLOBAL_OPTIONS_WITH_VALUE.has(token)) {
      index += 2;
      continue;
    }

    index += 1;
  }

  const repoPath = workTree || deriveRepoPathFromGitDir(gitDir) || currentDirectory;

  return {
    repoPath,
    ...getGitSubcommand(gitArgs),
  };
};

const findFirstNonFlagArgument = args => {
  for (const argument of args) {
    if (argument === "--") {
      return null;
    }

    if (argument.startsWith("-")) {
      continue;
    }

    return argument;
  }

  return null;
};

const findBranchCreatedByGitCommand = subcommandArgs => {
  for (let index = 0; index < subcommandArgs.length; index += 1) {
    const argument = subcommandArgs[index];

    if (
      argument === "-b" ||
      argument === "-B" ||
      argument === "-c" ||
      argument === "-C" ||
      argument === "--create" ||
      argument === "--orphan"
    ) {
      return normalizeBranchName(subcommandArgs[index + 1]) || subcommandArgs[index + 1] || null;
    }

    if (argument.startsWith("--create=")) {
      return normalizeBranchName(argument.slice("--create=".length)) || argument.slice("--create=".length);
    }
  }

  return null;
};

const getNextBranchAfterGitCommand = ({ currentBranch, subcommand, subcommandArgs }) => {
  if (subcommand !== "checkout" && subcommand !== "switch") {
    return currentBranch;
  }

  const createdBranch = findBranchCreatedByGitCommand(subcommandArgs);
  if (createdBranch) {
    return createdBranch;
  }

  const checkoutTarget = findFirstNonFlagArgument(subcommandArgs);
  if (!checkoutTarget || checkoutTarget === "-") {
    return currentBranch;
  }

  return normalizeBranchName(checkoutTarget) || checkoutTarget;
};

const findGhBranchArgument = args => {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "-b" || argument === "--branch") {
      return args[index + 1] || null;
    }

    if (argument.startsWith("--branch=")) {
      return argument.slice("--branch=".length);
    }
  }

  return null;
};

const blockProtectedCommit = branchName =>
  deny({
    userMessage: `Blocked commit on protected branch "${branchName}".`,
    agentMessage: `Blocked commit on protected branch "${branchName}". Create or switch to a feature branch first.`,
  });

const blockProtectedBranchMutation = ({ action, branchName }) =>
  deny({
    userMessage: `Blocked ${action} on protected branch "${branchName}".`,
    agentMessage: `Blocked ${action} on protected branch "${branchName}". Create or switch to a feature branch first.`,
  });

const blockProtectedPush = branchName =>
  deny({
    userMessage: `Blocked push to protected branch "${branchName}".`,
    agentMessage: `Blocked push to protected branch "${branchName}". Push a feature branch and open a PR instead.`,
  });

const blockProtectedRefUpdate = branchName =>
  deny({
    userMessage: `Blocked protected ref update for branch "${branchName}".`,
    agentMessage: `Blocked protected ref update for branch "${branchName}". Use a feature branch and PR flow instead.`,
  });

const blockRepoSync = branchName =>
  deny({
    userMessage: branchName
      ? `Blocked gh repo sync for protected branch "${branchName}".`
      : "Blocked gh repo sync without an explicit non-protected branch.",
    agentMessage: branchName
      ? `Blocked gh repo sync for protected branch "${branchName}". Use a feature branch and PR flow instead.`
      : "Blocked gh repo sync without an explicit non-protected branch because it can update the default branch directly.",
  });

const blockProtectedPrMerge = branchName =>
  deny({
    userMessage: `Blocked gh pr merge because it can land changes on protected branch "${branchName}".`,
    agentMessage: `Blocked gh pr merge because it can land changes on protected branch "${branchName}". Merge via the normal reviewed workflow instead.`,
  });

const evaluateGitCommand = ({ currentBranch, subcommand, subcommandArgs }) => {
  if (!subcommand) {
    return allow();
  }

  if (subcommand === "commit" && isProtectedBranch(currentBranch)) {
    return blockProtectedCommit(normalizeBranchName(currentBranch));
  }

  if (PROTECTED_BRANCH_MUTATING_GIT_SUBCOMMANDS.has(subcommand) && isProtectedBranch(currentBranch)) {
    return blockProtectedBranchMutation({
      action: subcommand,
      branchName: normalizeBranchName(currentBranch),
    });
  }

  if (subcommand === "push") {
    if (isProtectedBranch(currentBranch)) {
      return blockProtectedPush(normalizeBranchName(currentBranch));
    }

    for (const argument of subcommandArgs) {
      const protectedBranch = findProtectedBranch(argument);
      if (protectedBranch) {
        return blockProtectedPush(protectedBranch);
      }
    }
  }

  return allow();
};

const evaluateGhCommand = ghArgs => {
  if (ghArgs[0] === "repo" && ghArgs[1] === "sync") {
    const branchArgument = findGhBranchArgument(ghArgs.slice(2));

    if (!branchArgument) {
      return blockRepoSync(null);
    }

    const protectedBranch = findProtectedBranch(branchArgument);
    if (protectedBranch) {
      return blockRepoSync(protectedBranch);
    }
  }

  if (ghArgs[0] === "api") {
    const apiArguments = ghArgs.slice(1);
    const protectedBranchPathMatch = apiArguments.join(" ").match(GH_API_PROTECTED_BRANCH_PATH_PATTERN);

    if (protectedBranchPathMatch?.[1]) {
      return blockProtectedRefUpdate(protectedBranchPathMatch[1]);
    }

    for (const argument of apiArguments) {
      const protectedBranch = findProtectedBranch(argument);
      if (protectedBranch) {
        return blockProtectedRefUpdate(protectedBranch);
      }
    }
  }

  if (ghArgs[0] === "pr" && ghArgs[1] === "merge") {
    return blockProtectedPrMerge("main");
  }

  return allow();
};

const shouldBlockShellCommand = ({ command, cwd, execFn = execSync }) => {
  if (!command) {
    return allow();
  }

  const commandSegments = splitCommandSegments(tokenizeShellCommand(command));
  const branchByRepoPath = new Map();

  const containsGitOrGhInvocation = tokens =>
    tokens.some(token => {
      return isGitOrGhToken(token);
    });

  const getBranchForRepoPath = repoPath => {
    if (!repoPath) {
      return null;
    }

    if (!branchByRepoPath.has(repoPath)) {
      branchByRepoPath.set(repoPath, getCurrentBranch(repoPath, execFn));
    }

    return branchByRepoPath.get(repoPath) || null;
  };

  for (const commandSegment of commandSegments) {
    const unwrappedSegment = unwrapShellSegment({
      tokens: commandSegment,
      cwd,
    });

    if (unwrappedSegment.type === "unsupported-wrapper") {
      if (containsGitOrGhInvocation(unwrappedSegment.args)) {
        return deny({
          userMessage: `Blocked unsupported ${unwrappedSegment.wrapper} wrapper around git/gh command.`,
          agentMessage: `Blocked unsupported ${unwrappedSegment.wrapper} wrapper around git/gh command because the hook cannot safely inspect it.`,
        });
      }

      continue;
    }

    if (unwrappedSegment.type === "nested-shell") {
      const nestedDecision = shouldBlockShellCommand({
        command: unwrappedSegment.command,
        cwd: unwrappedSegment.cwd || cwd,
        execFn,
      });

      if (nestedDecision.permission === "deny") {
        return nestedDecision;
      }
    }

    if (unwrappedSegment.type === "git") {
      const gitContext = getGitExecutionContext({
        cwd: unwrappedSegment.cwd || cwd,
        gitArgs: unwrappedSegment.args,
      });
      const currentBranch = getBranchForRepoPath(gitContext.repoPath);
      const decision = evaluateGitCommand({
        currentBranch,
        subcommand: gitContext.subcommand,
        subcommandArgs: gitContext.subcommandArgs,
      });

      if (decision.permission === "deny") {
        return decision;
      }

      branchByRepoPath.set(
        gitContext.repoPath,
        getNextBranchAfterGitCommand({
          currentBranch,
          subcommand: gitContext.subcommand,
          subcommandArgs: gitContext.subcommandArgs,
        })
      );
    }

    if (unwrappedSegment.type === "gh") {
      const decision = evaluateGhCommand(unwrappedSegment.args);

      if (decision.permission === "deny") {
        return decision;
      }
    }

    if (unwrappedSegment.type === "other" && containsGitOrGhInvocation(commandSegment)) {
      return deny({
        userMessage: "Blocked unclassified git/gh command wrapper.",
        agentMessage: "Blocked unclassified git/gh command wrapper because the hook cannot safely inspect it.",
      });
    }
  }

  return allow();
};

const main = async () => {
  const stdinChunks = [];

  for await (const chunk of process.stdin) {
    stdinChunks.push(chunk);
  }

  const payload = parsePayload(Buffer.concat(stdinChunks).toString("utf8"));
  if (!payload) {
    process.stdout.write(JSON.stringify(allow()));
    return;
  }

  const decision = shouldBlockShellCommand({
    command: payload.command,
    cwd: payload.cwd,
  });

  process.stdout.write(JSON.stringify(decision));
};

if (require.main === module) {
  main();
}

module.exports = {
  PROTECTED_BRANCHES,
  parsePayload,
  normalizeBranchName,
  isProtectedBranch,
  findProtectedBranch,
  getCurrentBranch,
  resolveCommandPath,
  deriveRepoPathFromGitDir,
  tokenizeShellCommand,
  splitCommandSegments,
  unwrapShellSegment,
  getGitSubcommand,
  getGitExecutionContext,
  findFirstNonFlagArgument,
  findBranchCreatedByGitCommand,
  getNextBranchAfterGitCommand,
  findGhBranchArgument,
  shouldBlockShellCommand,
};
