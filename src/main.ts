import * as core from "@actions/core";
import { glob } from "glob";
import * as ui5VersionCheck from "ui5-version-check";
import * as utils from "./lib/utils.js";

function printSummary(summary: ui5VersionCheck.ManifestCheckSummary[]) {
  core.summary.addTable([
    [
      { data: "Manifest path", header: true },
      { data: "Found version", header: true },
      { data: "Updated version", header: true },
      { data: "Status", header: true },
      { data: "Description", header: true }
    ],
    ...summary.map((s) => [
      { data: s.relPath },
      { data: s.oldVers },
      { data: s.newVers },
      { data: s.statusIcon },
      { data: s.statusText }
    ])
  ]);
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const repoPath = utils.getRepoPath();
    core.info(`Repository path: ${repoPath}`);

    const manifestPaths = utils.getInputAsArray("manifestPaths", { required: true });
    if (!manifestPaths.length) throw new Error("'manifestPaths' must not be empty");
    core.info(`Specified manifest paths: ${manifestPaths}`);

    core.startGroup("Determine manifest.json file paths");
    const resolvedManifestPaths = await glob(
      manifestPaths.map((p) => p + "/manifest.json"),
      { cwd: repoPath }
    );
    if (!resolvedManifestPaths?.length)
      throw new Error("Glob patterns in 'manifestPaths' did not resolve to any 'manifest.json' file");
    core.setOutput("foundManifests", resolvedManifestPaths);
    core.info(`Resolved the following manifest file paths: ${resolvedManifestPaths}`);
    core.endGroup();

    ui5VersionCheck.setLogger({
      info: core.info,
      group: core.startGroup,
      groupEnd: core.endGroup,
      warn: core.warning,
      error: core.error,
      notice: core.notice
    });

    const ui5VersCheck = new ui5VersionCheck.UI5VersionCheck({
      basePath: repoPath,
      manifestPaths: resolvedManifestPaths,
      fixOutdated: core.getBooleanInput("fixOutdated"),
      useLTS: core.getBooleanInput("useLTS"),
      eomAllowed: core.getBooleanInput("eomAllowed"),
      allowedDaysBeforeEocp: utils.getAllowedDaysBeforeEocp()
    });

    await ui5VersCheck.run();

    if (ui5VersCheck.updatedFiles.length > 0) {
      core.setOutput("modifiedFiles", ui5VersCheck.updatedFiles.join("\n"));
    }
    printSummary(ui5VersCheck.summary);

    core.summary.addBreak();
    core.summary.addLink(
      "Check this link for valid UI5 versions that can be used in SAP BTP",
      "https://ui5.sap.com/versionoverview.html"
    );

    if (ui5VersCheck.hasErrors) {
      core.setFailed("Some manifest.json files contain invalid/outdated versions");
    }
    core.setOutput("summary", core.summary.stringify());
    await core.summary.write();
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
