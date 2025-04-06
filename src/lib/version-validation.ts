import { ManifestVersion } from "./ui5-manifest.js";
import { BaseVersionInfo, UI5Version, UI5VersionPatch } from "./ui5-version-api.js";

export type ValidationMessage = {
  msg: string;
  type: "warn" | "error";
};

export class VersionValidator {
  private isValid = false;
  private messages: ValidationMessage[] = [];

  constructor(
    private mfVers: ManifestVersion,
    private ui5Versions: Map<string, UI5Version>,
    private ui5Patches: Map<string, UI5VersionPatch>,
    private allowedDaysBeforeEocp: number,
    private eomAllowed: boolean
  ) {}

  validate() {
    if (this.mfVers.patchUpdates) {
      this.validatePatchUpdateVersion();
    } else {
      this.validateSpecificVersion();
    }
    return { valid: this.isValid, messages: this.messages };
  }

  private validateSpecificVersion() {
    const matchingVersion = this.ui5Versions.get(this.mfVers.toPatchUpdateVers());
    if (!matchingVersion || matchingVersion.eocp) {
      this.addInvalidMsg();
      return;
    }
    if (!this.checkEom(matchingVersion.eom)) return;

    const matchingPatch = this.ui5Patches.get(this.mfVers.strVer);
    if (!matchingPatch) {
      const patchSemver = this.mfVers.semver;
      this.messages.push({
        msg: `Patch ${patchSemver.patch} of version ${patchSemver.major}.${patchSemver.minor} is not available`,
        type: "error"
      });
      return;
    }

    if (this.checkRemainingDays(matchingPatch)) {
      this.isValid = true;
    }
  }

  private validatePatchUpdateVersion() {
    const matchingVersion = this.ui5Versions.get(this.mfVers.strVer);
    if (!matchingVersion || matchingVersion.eocp) {
      this.addInvalidMsg();
      return;
    }
    if (!this.checkEom(matchingVersion.eom)) return;

    if (this.checkRemainingDays(matchingVersion)) {
      this.isValid = true;
    }
  }

  private checkEom(eom: boolean) {
    if (!eom) return true;

    const msg = `Version reached end of maintenance`;
    const type = this.eomAllowed ? "warn" : "error";
    this.messages.push({ msg, type });
    return type !== "error";
  }

  private addInvalidMsg() {
    this.messages.push({
      msg: `Version ${this.mfVers.strVer} is invalid or reached end of cloud provisioning`,
      type: "error"
    });
  }

  private checkRemainingDays(version: BaseVersionInfo) {
    const { isInEocpQuarter, remainingDaysToEocp } = version;
    if (isInEocpQuarter && remainingDaysToEocp) {
      if (remainingDaysToEocp < this.allowedDaysBeforeEocp) {
        this.messages.push({
          msg: `End of cloud provisioning for version imminent. Remaining days ${remainingDaysToEocp}`,
          type: "error"
        });
        return false;
      } else {
        this.messages.push({
          msg: `Version nearing end of cloud provisioning. Remaining days ${remainingDaysToEocp}`,
          type: "warn"
        });
        return true;
      }
    }
    return true;
  }
}
