import * as core from "@actions/core";
import { SummaryTableRow } from "@actions/core/lib/summary.js";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import * as semver from "semver";
import { UI5Version, UI5VersionPatch, fetchMaintainedVersions } from "./ui5-versions.js";
import * as utils from "./utils.js";

type ManifestVersion = {
  strVer: string;
  semver: semver.SemVer;
  patchUpdates: boolean;
  toPatchUpdateVers(): string;
};

export class UI5VersionChecker {
  private fixOutdated: boolean;
  private useLTS: boolean;
  private eomAllowed: boolean;
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
      if (v.eocpInfo || v.eom) continue;
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

    // determine if the current version is a valid one
    const { valid, validPatch, eom } = this.validateVersion(manifest);

    if (this.fixOutdated) {
      if (!validPatch || (eom && !this.eomAllowed)) {
        // fix the version in the manifest
        manifest.updateVersion(this.newVersion, this.useLTS);
        this.updatedFiles.push(manifest.relPath);
      } else {
        manifest.setNoChangeStatus(eom);
      }
    } else {
      if (validPatch) {
        if (eom && !this.eomAllowed) {
          this.errorCount++;
          manifest.setErrorStatus(validPatch, valid, eom);
        } else {
          manifest.setNoChangeStatus(eom);
        }
      } else {
        this.errorCount++;
        manifest.setErrorStatus(valid, false, false);
      }
    }
  }

  private validateVersion(manifest: UI5AppManifest) {
    if (!manifest.version) {
      /* istanbul ignore next */
      return { valid: false, validPatch: false, eom: false };
    }

    let valid = false;
    let validPatch = false;
    let eom = false;

    const mfVers = manifest.version;
    if (manifest.version.patchUpdates) {
      const matchingVersion = this.ui5Versions.get(manifest.version.strVer);
      valid = !!(matchingVersion && !matchingVersion.eocpInfo);
      validPatch = valid;
      eom = !!matchingVersion?.eom;
    } else {
      const matchingVersion = this.ui5Versions.get(mfVers.toPatchUpdateVers());
      eom = !!matchingVersion?.eom;
      valid = !!matchingVersion;

      const matchingPatch = this.ui5Patches.get(mfVers.strVer);
      if (matchingPatch && !matchingPatch.eocpInfo) {
        validPatch = true;
      }
    }

    return { valid, validPatch, eom };
  }
}

class UI5AppManifest {
  fullPath: string;
  content: string;
  version: ManifestVersion | undefined;
  newVersion = "-";
  versionStatus: "ok" | "warn" | "error" = "ok";
  versionStatusText = "-";

  constructor(public relPath: string) {
    this.fullPath = path.join(utils.getRepoPath(), this.relPath);
    this.content = readFileSync(this.fullPath, { encoding: "utf8" });
    this.version = this.determineVersion();
  }

  private determineVersion(): ManifestVersion | undefined {
    const manifestJson = JSON.parse(this.content) as { "sap.platform.cf": { ui5VersionNumber?: string } };
    const currentVersionStr = manifestJson["sap.platform.cf"]?.ui5VersionNumber?.replace(/[xX]/, "*");
    if (!currentVersionStr) {
      this.versionStatusText = `No section 'sap.platform.cf/ui5VersionNumber' found. Skipping check`;
      return;
    }
    const currentSemver = semver.coerce(currentVersionStr);

    return {
      strVer: currentVersionStr,
      semver: currentSemver!,
      patchUpdates: /\d+\.\d+\.\*/.test(currentVersionStr),
      toPatchUpdateVers: () => `${currentSemver?.major}.${currentSemver?.minor}.*`
    };
  }

  updateVersion(version: string, isLTS: boolean) {
    const manifestContent = this.content.replace(
      /("sap\.platform\.cf"\s*:\s*\{\s*"ui5VersionNumber"\s*:\s*")(.*)(")/,
      `$1${version}$3`
    );
    writeFileSync(this.fullPath, manifestContent, { encoding: "utf8" });
    this.newVersion = version;
    /* istanbul ignore next */
    this.versionStatusText = `Version has been updated to latest ${isLTS ? "LTS" : ""} version`;
    this.versionStatus = "ok";
  }

  setNoChangeStatus(eom: boolean) {
    if (eom) {
      this.versionStatus = "warn";
      this.versionStatusText = `Version ${this.version!.strVer} has reached end of maintenance. Consider updating to maintenance version`;
    } else {
      this.versionStatus = "ok";
      this.versionStatusText = `No change required`;
    }
  }

  setErrorStatus(valid: boolean, validPatch: boolean, eom: boolean) {
    this.versionStatus = "error";
    const vers = this.version!;

    if (validPatch && eom) {
      this.versionStatusText = `Version ${this.version!.strVer} has reach end of maintenance`;
    } else if (valid) {
      // only the patch is invalid
      this.versionStatusText = `Patch ${vers.semver.patch} of version ${vers.semver.major}.${vers.semver.minor} is not available`;
    } else {
      this.versionStatusText = `Version ${vers.strVer} is invalid or reached end of cloud provisioning`;
    }
  }

  getSummary() {
    return [
      { data: this.relPath },
      { data: this.version?.strVer ?? "-" },
      { data: this.newVersion },
      { data: this.versionStatus === "ok" ? "✅" : this.versionStatus === "warn" ? "⚠️" : "❌" },
      { data: this.versionStatusText }
    ];
  }
}
