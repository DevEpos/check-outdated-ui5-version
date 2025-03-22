import * as core from "@actions/core";
import { SummaryTableRow } from "@actions/core/lib/summary.js";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import * as semver from "semver";
import { UI5VersionInfo, fetchMaintainedVersions } from "./ui5-versions.js";
import * as utils from "./utils.js";

type UI5Version = {
  version: string;
  semver: semver.SemVer;
  patchUpdates: boolean;
};

export class UI5VersionChecker {
  private fixOutdated: boolean;
  private useLTS: boolean;
  private validVersions!: UI5VersionInfo[];
  private updatedFiles: string[] = [];
  private errorCount = 0;
  private summary: SummaryTableRow[] = [];
  private _newVersion: UI5VersionInfo | undefined;

  constructor(private manifestPaths: string[]) {
    this.fixOutdated = core.getBooleanInput("fixOutdated");
    this.useLTS = core.getBooleanInput("useLTS");
  }

  async run() {
    core.startGroup("Loading UI5 versions");
    this.validVersions = await fetchMaintainedVersions();
    core.endGroup();

    core.info("Checking UI5 version in manifest.json files");
    this.manifestPaths.forEach((mp) => {
      const manifest = new UI5AppManifest(mp);
      this.checkManifest(manifest);
      this.summary.push(manifest.getSummary());
    });
    if (this.updatedFiles.length) {
      core.setOutput("modifiedFiles", this.updatedFiles.join(","));
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
        { data: "Status", header: true }
      ],
      ...this.summary
    ]);
  }

  private get newVersion() {
    if (this._newVersion) return this._newVersion;
    this._newVersion = this.useLTS ? this.validVersions.find((v) => v.lts) : this.validVersions[0];
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

    const mfVers = manifest.version;

    // determine if the current version is a valid one
    const { valid, validPatch } = this.validateVersion(manifest);

    if (validPatch) {
      manifest.versionStatus = `No change required`;
    } else if (this.fixOutdated) {
      manifest.updateVersion(this.newVersion.version, this.useLTS);
      this.updatedFiles.push(manifest.relPath);
    } else {
      // check if updates are enabled
      this.errorCount++;
      manifest.outdated = true;
      if (valid) {
        // only the patch is invalid
        manifest.versionStatus = `Patch ${mfVers.semver.patch} of version ${mfVers.semver.major}.${mfVers.semver.minor} is not available`;
      } else {
        manifest.versionStatus = `Version ${mfVers.version} in file ${manifest.relPath} is invalid or no longer available`;
      }
    }
  }

  private validateVersion(manifest: UI5AppManifest) {
    if (!manifest.version) return { valid: false, validPatch: false };

    let valid = false;
    let validPatch = false;

    const mfVers = manifest.version;
    if (manifest.version.patchUpdates) {
      valid = this.validVersions.some((v) => semver.compare(v.semver, mfVers.semver) === 0);
      validPatch = valid;
    } else {
      const validMajorMinor = this.validVersions.find(
        (v) => mfVers.semver.major === v.semver.major && mfVers.semver.minor === v.semver.minor
      );
      if (validMajorMinor) {
        valid = true;
        validPatch = validMajorMinor.patches.includes(mfVers.semver.patch);
      }
    }

    return { valid, validPatch };
  }
}

class UI5AppManifest {
  fullPath: string;
  content: string;
  version: UI5Version | undefined;
  newVersion = "-";
  versionStatus = "-";
  outdated = false;

  constructor(public relPath: string) {
    this.fullPath = path.join(utils.getRepoPath(), this.relPath);
    this.content = readFileSync(this.fullPath, { encoding: "utf8" });
    this.version = this.determineVersion();
  }

  private determineVersion(): UI5Version | undefined {
    const manifestJson = JSON.parse(this.content) as { "sap.platform.cf": { ui5VersionNumber?: string } };
    const currentVersionStr = manifestJson["sap.platform.cf"]?.ui5VersionNumber?.replace(/[xX]/, "*");
    if (!currentVersionStr) {
      this.versionStatus = `No section 'sap.platform.cf/ui5VersionNumber' found. Skipping check`;
      return;
    }
    const currentSemver = semver.coerce(currentVersionStr);

    return { version: currentVersionStr, semver: currentSemver!, patchUpdates: /\d+\.\d+\.\*/.test(currentVersionStr) };
  }

  updateVersion(version: string, isLTS: boolean) {
    const manifestContent = this.content.replace(
      /("sap\.platform\.cf"\s*:\s*\{\s*"ui5VersionNumber"\s*:\s*")(.*)(")/,
      `$1${version}$3`
    );
    writeFileSync(this.fullPath, manifestContent, { encoding: "utf8" });
    this.newVersion = version;
    this.versionStatus = `Version has been updated to latest ${isLTS ? "LTS" : ""} version`;
  }

  getSummary() {
    return [
      { data: this.relPath },
      { data: this.version?.version ?? "-" },
      { data: this.newVersion },
      { data: `${this.outdated ? "❌" : "✅"} ${this.versionStatus}` }
    ];
  }
}
