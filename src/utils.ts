import path from "path";
import * as core from "@actions/core";

export function getReminderBeforeEcopDays() {
  const configuredTime = parseInt(core.getInput("reminderBeforeEocp", { trimWhitespace: true }));
  return isNaN(configuredTime) ? 30 : configuredTime;
}

export function getRepoPath() {
  const githubWorkspace = process.env["GITHUB_WORKSPACE"];
  if (!githubWorkspace) {
    throw new Error("GITHUB_WORKSPACE not defined");
  }
  const repoPath = path.resolve(githubWorkspace);
  core.debug(`repoPath: ${repoPath}`);
  return repoPath;
}

export function getInputAsArray(name: string, options?: core.InputOptions): string[] {
  return getStringAsArray(core.getInput(name, options));
}

export function getStringAsArray(str: string): string[] {
  return str
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((x) => x !== "");
}
