import * as core from "@actions/core";
import { glob } from "glob";
import { UI5VersionChecker } from "./lib/ui5-version-check.js";
import * as utils from "./lib/utils.js";

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

    const ui5VersChecker = new UI5VersionChecker(resolvedManifestPaths);
    await ui5VersChecker.run();

    ui5VersChecker.printSummary();

    core.summary.addBreak();
    core.summary.addLink(
      "Check this link for valid UI5 versions that can be used in SAP BTP",
      "https://ui5.sap.com/versionoverview.html"
    );

    if (ui5VersChecker.hasErrors) {
      core.setFailed("Some manifest.json files contain invalid/outdated versions");
    }
    core.setOutput("summary", core.summary.stringify());
    await core.summary.write();
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
