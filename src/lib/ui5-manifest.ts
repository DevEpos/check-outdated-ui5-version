import { readFileSync, writeFileSync } from "fs";
import path from "path";
import * as semver from "semver";
import * as utils from "./utils.js";
import { ValidationMessage } from "./version-validation.js";

export type ManifestVersion = {
  strVer: string;
  semver: semver.SemVer;
  patchUpdates: boolean;
  toPatchUpdateVers(): string;
};

export class UI5AppManifest {
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

  setNoChangeStatus(messages: ValidationMessage[]) {
    if (messages.length) {
      this.versionStatus = "warn";
      this.versionStatusText = messages.map((m) => m.msg).join("\n");
    } else {
      this.versionStatus = "ok";
      this.versionStatusText = `No change required`;
    }
  }

  setErrorStatus(messages: ValidationMessage[]) {
    this.versionStatus = "error";
    this.versionStatusText = messages.map((m) => m.msg).join("\n");
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
