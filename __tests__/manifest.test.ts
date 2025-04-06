import { UI5AppManifest } from "../src/lib/ui5-manifest";
import * as semver from "semver";
import * as utils from "../src/lib/utils";
import fs from "fs";

describe("ui5-manifest.ts", () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.spyOn(utils, "getRepoPath").mockReturnValue("/repopath");
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    process.env = { ...oldEnv };
  });

  it("Determines version in manifest with required section", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(
      JSON.stringify({
        "sap.platform.cf": {
          ui5VersionNumber: "1.120.*"
        }
      })
    );
    const manifest = new UI5AppManifest("test/manifest.json");
    expect(manifest.version?.semver).toEqual(semver.coerce("1.120.*"));
    expect(manifest.version?.patchUpdates).toBeTruthy();
    expect(manifest.version?.toPatchUpdateVers()).toEqual("1.120.*");

    expect(manifest.getSummary()).toEqual([
      { data: manifest.relPath },
      { data: "1.120.*" },
      { data: "-" },
      { data: "✅" },
      { data: "-" }
    ]);
  });

  it("Test different values of version status", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({}));
    const manifest = new UI5AppManifest("test/manifest.json");

    manifest.setNoChangeStatus([]);
    expect(manifest.versionStatus).toBe("ok");
    expect(manifest.versionStatusText).toBe("No change required");
    expect(manifest.getSummary()).toEqual([
      { data: manifest.relPath },
      { data: "-" },
      { data: "-" },
      { data: "✅" },
      { data: "No change required" }
    ]);

    manifest.setNoChangeStatus([
      { msg: "Eom", type: "warn" },
      { msg: "Unsafe", type: "warn" }
    ]);
    expect(manifest.versionStatus).toBe("warn");
    expect(manifest.versionStatusText).toBe("Eom<br/>Unsafe");
    expect(manifest.getSummary()).toEqual([
      { data: manifest.relPath },
      { data: "-" },
      { data: "-" },
      { data: "⚠️" },
      { data: "Eom<br/>Unsafe" }
    ]);

    manifest.setErrorStatus([{ msg: "Eocp reached", type: "error" }]);
    expect(manifest.versionStatus).toBe("error");
    expect(manifest.versionStatusText).toBe("Eocp reached");
    expect(manifest.getSummary()).toEqual([
      { data: manifest.relPath },
      { data: "-" },
      { data: "-" },
      { data: "❌" },
      { data: "Eocp reached" }
    ]);
  });

  it("updateVersion()", () => {
    const writeFsMock = jest.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(
      JSON.stringify({
        "sap.platform.cf": {
          ui5VersionNumber: "1.117.*"
        }
      })
    );
    const manifest = new UI5AppManifest("test/manifest.json");
    expect(manifest.newVersion).toBe("-");
    manifest.updateVersion("1.134.1", true);
    expect(manifest.newVersion).toBe("1.134.1");
    expect(writeFsMock).toHaveBeenCalledWith(
      "/repopath/test/manifest.json",
      JSON.stringify({
        "sap.platform.cf": {
          ui5VersionNumber: "1.134.1"
        }
      }),
      { encoding: "utf8" }
    );
    expect(manifest.versionStatusText).toBe("Version has been updated to latest LTS version");
  });

  it("Manifest does not contain section for sap.platform.cf", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({}));
    const manifest = new UI5AppManifest("test/manifest.json");
    expect(manifest.version).toBeUndefined();
  });
});
