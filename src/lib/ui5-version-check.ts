import * as core from "@actions/core";
import { SummaryTableRow } from "@actions/core/lib/summary.js";
import { UI5AppManifest } from "./ui5-manifest.js";
import { UI5Version, UI5VersionPatch, fetchMaintainedVersions } from "./ui5-version-api.js";
import * as utils from "./utils.js";
import { VersionValidator } from "./version-validation.js";

export class UI5VersionChecker {
  private fixOutdated: boolean;
  private useLTS: boolean;
  private eomAllowed: boolean;
  private allowedDaysBeforeEocp: number;
  private ui5Versions!: Map<string, UI5Version>;
  private ui5Patches!: Map<string, UI5VersionPatch>;
  private updatedFiles: string[] = [];
  private errorCount = 0;
  private summary: SummaryTableRow[] = [];
  private _newVersion: string | undefined;

  constructor(private manifestPaths: string[]) {
    this.fixOutdated = core.getBooleanInput("fixOutdated");
    this.useLTS = core.getBooleanInput("useLTS");
    this.eomAllowed = core.getBooleanInput("eomAllowed");
    this.allowedDaysBeforeEocp = utils.getAllowedDaysBeforeEocp();
  }

  async run() {
    core.startGroup("Loading UI5 versions");
    const versions = await fetchMaintainedVersions();
    this.ui5Versions = versions.versions;
    this.ui5Patches = versions.patches;
    core.endGroup();

    core.info("Checking UI5 version in manifest.json files");
    this.manifestPaths.forEach((mp) => {
      const manifest = new UI5AppManifest(mp);
      this.checkManifest(manifest);
      this.summary.push(manifest.getSummary());
    });
    if (this.updatedFiles.length) {
      core.setOutput("modifiedFiles", this.updatedFiles.join("\n"));
    }
  }

  get hasErrors() {
    return this.errorCount > 0;
  }

  printSummary() {
    core.summary.addHeading("UI5 Version Check Result");
    core.summary.addTable([
      [
        { data: "Manifest path", header: true },
        { data: "Found version", header: true },
        { data: "Updated version", header: true },
        { data: "Status", header: true },
        { data: "Description", header: true }
      ],
      ...this.summary
    ]);
  }

  private get newVersion() {
    if (this._newVersion) return this._newVersion;

    for (const [vId, v] of this.ui5Versions) {
      if (v.eocp || v.eom) continue;
      if (this.useLTS && !v.lts) continue;
      this._newVersion = vId;
      break;
    }

    if (!this._newVersion) {
      if (this.useLTS) {
        throw new Error(`No valid LTS UI5 version found to update`);
      } else {
        throw new Error(`No valid UI5 version found to update`);
      }
    }
    return this._newVersion;
  }

  private checkManifest(manifest: UI5AppManifest) {
    if (!manifest?.version) return;

    const { valid, messages } = this.validateVersion(manifest);

    if (this.fixOutdated) {
      if (!valid) {
        // fix the version in the manifest
        manifest.updateVersion(this.newVersion, this.useLTS);
        this.updatedFiles.push(manifest.relPath);
      } else {
        manifest.setNoChangeStatus(messages);
      }
    } else {
      if (valid) {
        manifest.setNoChangeStatus(messages);
      } else {
        this.errorCount++;
        manifest.setErrorStatus(messages);
      }
    }
  }

  private validateVersion(manifest: UI5AppManifest) {
    if (!manifest.version) {
      /* istanbul ignore next */
      return { valid: false, messages: [] };
    } else {
      const validator = new VersionValidator(
        manifest.version,
        this.ui5Versions,
        this.ui5Patches,
        this.allowedDaysBeforeEocp,
        this.eomAllowed
      );
      return validator.validate();
    }
  }
}
