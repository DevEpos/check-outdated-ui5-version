import { UI5Version, UI5VersionPatch } from "../src/lib/ui5-version-api";
import { VersionValidator } from "../src/lib/version-validation";
import semver from "semver";

describe("version-validation.ts (before eocp quarter)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 5, 10));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("Successful validation of patch update version", () => {
    const vutStr = "1.117.*";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: true,
        semver: vutSemver!,
        strVer: "1.117.*",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map([[vutStr, new UI5Version(vutSemver!, "Q1/2026", true, false)]]),
      new Map([["1.117.1", new UI5VersionPatch(semver.coerce("1.117.1")!, "Q1/2026")]]),
      30,
      false
    );
    expect(validator.validate()).toEqual({ valid: true, messages: [] });
  });

  it("Successful validation of specific version", () => {
    const vutStr = "1.117.1";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: false,
        semver: vutSemver!,
        strVer: "1.117.1",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map([["1.117.*", new UI5Version(vutSemver!, "Q1/2026", true, false)]]),
      new Map([["1.117.1", new UI5VersionPatch(semver.coerce("1.117.1")!, "Q1/2026")]]),
      30,
      false
    );
    expect(validator.validate()).toEqual({ valid: true, messages: [] });
  });

  it("Invalid patch update version detected", () => {
    const vutStr = "1.117.*";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: true,
        semver: vutSemver!,
        strVer: "1.117.*",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map(),
      new Map(),
      30,
      false
    );
    expect(validator.validate()).toEqual({
      valid: false,
      messages: [{ msg: "Version 1.117.* is invalid or reached end of cloud provisioning!", type: "error" }]
    });
  });

  it("Patch update version is eom which is not allowed", () => {
    const vutStr = "1.117.*";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: true,
        semver: vutSemver!,
        strVer: "1.117.*",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map([["1.117.*", new UI5Version(vutSemver!, "Q1/2026", true, true)]]),
      new Map(),
      30,
      false
    );
    expect(validator.validate()).toEqual({
      valid: false,
      messages: [{ msg: "Version reached end of maintenance!", type: "error" }]
    });
  });

  it("Patch update version is eom which is allowed and produces only a warning", () => {
    const vutStr = "1.117.*";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: true,
        semver: vutSemver!,
        strVer: "1.117.*",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map([["1.117.*", new UI5Version(vutSemver!, "Q1/2026", true, true)]]),
      new Map(),
      30,
      true
    );
    expect(validator.validate()).toEqual({
      valid: true,
      messages: [{ msg: "Version reached end of maintenance!", type: "warn" }]
    });
  });

  it("Invalid specific version detected that has reached eom", () => {
    const vutStr = "1.117.1";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: false,
        semver: vutSemver!,
        strVer: "1.117.1",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map([["1.117.*", new UI5Version(vutSemver!, "Q1/2026", true, true)]]),
      new Map(),
      30,
      false
    );
    expect(validator.validate()).toEqual({
      valid: false,
      messages: [{ msg: "Version reached end of maintenance!", type: "error" }]
    });
  });

  it("Invalid specific version detected", () => {
    const vutStr = "1.117.1";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: false,
        semver: vutSemver!,
        strVer: "1.117.1",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map(),
      new Map(),
      30,
      false
    );
    expect(validator.validate()).toEqual({
      valid: false,
      messages: [{ msg: "Version 1.117.1 is invalid or reached end of cloud provisioning!", type: "error" }]
    });
  });

  it("Invalid patch in specific version detected", () => {
    const vutStr = "1.117.1";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: false,
        semver: vutSemver!,
        strVer: "1.117.1",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map([["1.117.*", new UI5Version(vutSemver!, "Q1/2026", true, false)]]),
      new Map(),
      30,
      false
    );
    expect(validator.validate()).toEqual({
      valid: false,
      messages: [{ msg: "Patch 1 of version 1.117 is not available", type: "error" }]
    });
  });
});
