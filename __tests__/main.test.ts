import { jest } from "@jest/globals";
import { mockCoreWithEmptyImpl } from "../__fixtures__/core";
import { run } from "../src/main";
import * as ui5VersionCheck from "ui5-version-check";
import * as utils from "../src/lib/utils";

describe("main.ts", () => {
  const oldEnv = process.env;
  beforeEach(() => {});

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    process.env = { ...oldEnv };
  });

  it('Input "manifestPaths" not provided -> action goes to failed', async () => {
    const coreMock = mockCoreWithEmptyImpl();
    jest.spyOn(utils, "getRepoPath").mockReturnValueOnce(__dirname);
    jest.spyOn(utils, "getInputAsArray").mockReturnValueOnce([]);

    await expect(run()).resolves.toBeUndefined();
    expect(coreMock.setFailed).toHaveBeenCalledWith("'manifestPaths' must not be empty");
  });

  it("Successful version check results in action success", async () => {
    const coreMock = mockCoreWithEmptyImpl();
    jest.spyOn(utils, "getRepoPath").mockReturnValueOnce(__dirname);
    jest.spyOn(utils, "getInputAsArray").mockReturnValueOnce(["sample-project/app/**/webapp"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ui5VersionCheck as any, "UI5VersionCheck").mockImplementation(() => ({
      run: jest.fn()
      // printSummary: jest.fn()
    }));

    await expect(run()).resolves.toBeUndefined();

    expect(coreMock.info).toHaveBeenCalled();
    expect(coreMock.startGroup).toHaveBeenCalledWith("Determine manifest.json file paths");
    expect(coreMock.endGroup).toHaveBeenCalledTimes(1);
    expect(coreMock.setOutput).toHaveBeenCalledWith(
      "foundManifests",
      expect.arrayContaining([
        "sample-project/app/rating/webapp/manifest.json",
        "sample-project/app/chatbot/webapp/manifest.json",
        "sample-project/app/catalog/webapp/manifest.json",
        "sample-project/app/apitester/webapp/manifest.json",
        "sample-project/app/admin/webapp/manifest.json"
      ])
    );
    expect(coreMock.summary.addBreak).toHaveBeenCalled();
    expect(coreMock.summary.addLink).toHaveBeenCalledWith(
      `Check this link for valid UI5 versions that can be used in SAP BTP`,
      "https://ui5.sap.com/versionoverview.html"
    );
    expect(coreMock.summary.write).toHaveBeenCalled();
  });

  it("Version check ends with errors -> action goes to failed", async () => {
    const coreMock = mockCoreWithEmptyImpl();

    jest.spyOn(utils, "getRepoPath").mockReturnValueOnce(__dirname);
    jest.spyOn(utils, "getInputAsArray").mockReturnValueOnce(["sample-project/app/**/webapp"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ui5VersionCheck as any, "UI5VersionCheck").mockImplementation(() => ({
      run: jest.fn(),
      // printSummary: jest.fn(),
      get hasErrors() {
        return true;
      }
    }));

    await expect(run()).resolves.toBeUndefined();

    expect(coreMock.setFailed).toHaveBeenCalledWith("Some manifest.json files contain invalid/outdated versions");
  });

  it("Version check throws error -> action goes to failed with thrown error", async () => {
    const coreMock = mockCoreWithEmptyImpl();

    jest.spyOn(utils, "getRepoPath").mockReturnValueOnce(__dirname);
    jest.spyOn(utils, "getInputAsArray").mockReturnValueOnce(["sample-project/app/**/webapp"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ui5VersionCheck as any, "UI5VersionCheck").mockImplementation(() => ({
      run: () => Promise.reject(new Error("Version fetch failed!")),
      // printSummary: jest.fn(),
      get hasErrors() {
        return true;
      }
    }));

    await expect(run()).resolves.toBeUndefined();

    expect(coreMock.setFailed).toHaveBeenCalledWith("Version fetch failed!");
  });

  it("Glob patterns for manifest paths cannot be determine -> action goes to failed with thrown error", async () => {
    const coreMock = mockCoreWithEmptyImpl();

    jest.spyOn(utils, "getRepoPath").mockReturnValueOnce(__dirname);
    jest.spyOn(utils, "getInputAsArray").mockReturnValueOnce(["sample-project/app/**/webapps"]);

    await expect(run()).resolves.toBeUndefined();

    expect(coreMock.setFailed).toHaveBeenCalledWith(
      "Glob patterns in 'manifestPaths' did not resolve to any 'manifest.json' file"
    );
  });
});
