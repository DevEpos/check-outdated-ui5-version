import semver from "semver";
import { UI5Version } from "../src/lib/ui5-version-api";
import { VersionValidator } from "../src/lib/version-validation";

describe("version-validation.ts (in eocp quarter)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 15));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("Remaining days until eocp is still acceptable", () => {
    const vutStr = "1.117.*";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: true,
        semver: vutSemver!,
        strVer: "1.117.*",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map([["1.117.*", new UI5Version(vutSemver!, "Q1/2026", true, false)]]),
      new Map(),
      10,
      false
    );
    expect(validator.validate()).toEqual({
      valid: true,
      messages: [{ msg: "Version is near the end of cloud provisioning (16 days remaining)!", type: "warn" }]
    });
  });

  it("Max allowed days to eocp reached", () => {
    const vutStr = "1.117.*";
    const vutSemver = semver.coerce(vutStr);
    const validator = new VersionValidator(
      {
        patchUpdates: true,
        semver: vutSemver!,
        strVer: "1.117.*",
        toPatchUpdateVers: () => "1.117.*"
      },
      new Map([["1.117.*", new UI5Version(vutSemver!, "Q1/2026", true, false)]]),
      new Map(),
      30,
      false
    );
    expect(validator.validate()).toEqual({
      valid: false,
      messages: [{ msg: "End of cloud provisioning for version imminent (16 days remaining)!", type: "error" }]
    });
  });
});
