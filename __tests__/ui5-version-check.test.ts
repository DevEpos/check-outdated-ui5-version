import { mockCoreWithEmptyImpl } from "../__fixtures__/core";
import { mockNodeFetch } from "../__fixtures__/fetch";
import { UI5VersionChecker } from "../src/lib/ui5-version-check";
import fs from "fs";

const { mock: fetchMock, mockFetchResponse } = mockNodeFetch();

const manifestPaths = [
  "sample-project/app/rating/webapp/manifest.json",
  "sample-project/app/chatbot/webapp/manifest.json",
  "sample-project/app/catalog/webapp/manifest.json",
  "sample-project/app/admin/webapp/manifest.json",
  "sample-project/app/apitester/webapp/manifest.json"
];

describe("ui5-version-check.ts", () => {
  const oldEnv = process.env;

  beforeEach(() => {
    fetchMock.mockClear();
    jest.useFakeTimers().setSystemTime(new Date("2025-03-15"));
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    process.env = { ...oldEnv };
  });

  it("Check UI5 versions successfully (eom: true; lts: false)", async () => {
    mockFetchResponse(mockedVersionsOverview);
    const core = mockCoreWithEmptyImpl();
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    process.env["GITHUB_WORKSPACE"] = __dirname;
    process.env["INPUT_FIXOUTDATED"] = "false";
    process.env["INPUT_USELTS"] = "false";
    process.env["INPUT_EOMALLOWED"] = "true";

    const versionChecker = new UI5VersionChecker(manifestPaths);
    await expect(versionChecker.run()).resolves.toBeUndefined();
    expect(versionChecker.hasErrors).toBeTruthy();
    expect(versionChecker.printSummary()).toBeUndefined();

    expect(core.info).toHaveBeenCalledWith("Checking UI5 version in manifest.json files");
  });

  it("Check UI5 versions successfully (eom: false; lts: true)", async () => {
    mockFetchResponse(mockedVersionsOverview);
    const core = mockCoreWithEmptyImpl();
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    process.env["GITHUB_WORKSPACE"] = __dirname;
    process.env["INPUT_FIXOUTDATED"] = "false";
    process.env["INPUT_USELTS"] = "true";
    process.env["INPUT_EOMALLOWED"] = "false";

    const versionChecker = new UI5VersionChecker(manifestPaths);
    await expect(versionChecker.run()).resolves.toBeUndefined();
    expect(versionChecker.hasErrors).toBeTruthy();
    expect(versionChecker.printSummary()).toBeUndefined();

    expect(core.info).toHaveBeenCalledWith("Checking UI5 version in manifest.json files");
  });

  it("Check UI5 versions successfully (eom: false; lts: false)", async () => {
    mockFetchResponse(mockedVersionsOverview);
    const core = mockCoreWithEmptyImpl();
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    process.env["GITHUB_WORKSPACE"] = __dirname;
    process.env["INPUT_FIXOUTDATED"] = "false";
    process.env["INPUT_USELTS"] = "false";
    process.env["INPUT_EOMALLOWED"] = "false";

    const versionChecker = new UI5VersionChecker(manifestPaths);
    await expect(versionChecker.run()).resolves.toBeUndefined();
    expect(versionChecker.hasErrors).toBeTruthy();
    expect(versionChecker.printSummary()).toBeUndefined();

    expect(core.info).toHaveBeenCalledWith("Checking UI5 version in manifest.json files");
  });

  it("Updates UI5 versions successfully", async () => {
    mockFetchResponse(mockedVersionsOverview);
    const core = mockCoreWithEmptyImpl();
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    process.env["GITHUB_WORKSPACE"] = __dirname;
    process.env["INPUT_FIXOUTDATED"] = "true";
    process.env["INPUT_USELTS"] = "false";
    process.env["INPUT_EOMALLOWED"] = "true";

    await expect(new UI5VersionChecker(manifestPaths).run()).resolves.toBeUndefined();

    expect(core.info).toHaveBeenCalledWith("Checking UI5 version in manifest.json files");
  });

  it("Update of UI5 versions not possible as no LTS version found", async () => {
    const clonedMockVersOverview = structuredClone(mockedVersionsOverview);
    clonedMockVersOverview.versions.forEach((v) => {
      if (v.lts) v.lts = false;
    });
    mockFetchResponse(clonedMockVersOverview);
    const core = mockCoreWithEmptyImpl();
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    process.env["GITHUB_WORKSPACE"] = __dirname;
    process.env["INPUT_FIXOUTDATED"] = "true";
    process.env["INPUT_USELTS"] = "true";
    process.env["INPUT_EOMALLOWED"] = "true";

    await expect(new UI5VersionChecker(manifestPaths).run()).rejects.toThrow(
      new Error("No valid LTS UI5 version found to update")
    );

    expect(core.info).toHaveBeenCalledWith("Checking UI5 version in manifest.json files");
  });

  it("Update of UI5 versions not possible as no latest maintained version found", async () => {
    const clonedMockVersOverview = structuredClone(mockedVersionsOverview);
    clonedMockVersOverview.versions.forEach((v) => {
      if (v.lts) v.lts = false;
      v.eocp = "Q4/2024";
      v.eom = "Q4/2024";
      v.support = "Out of maintenance";
    });
    mockFetchResponse(clonedMockVersOverview);
    const core = mockCoreWithEmptyImpl();
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    process.env["GITHUB_WORKSPACE"] = __dirname;
    process.env["INPUT_FIXOUTDATED"] = "true";
    process.env["INPUT_USELTS"] = "false";
    process.env["INPUT_EOMALLOWED"] = "true";

    await expect(new UI5VersionChecker(manifestPaths).run()).rejects.toThrow(
      new Error("No valid UI5 version found to update")
    );

    expect(core.info).toHaveBeenCalledWith("Checking UI5 version in manifest.json files");
  });

  it("Tests version validation > breaks because manifest version is undefined", async () => {
    process.env["GITHUB_WORKSPACE"] = __dirname;
    process.env["INPUT_FIXOUTDATED"] = "false";
    process.env["INPUT_USELTS"] = "false";
    process.env["INPUT_EOMALLOWED"] = "false";

    const versionChecker = new UI5VersionChecker(manifestPaths);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((versionChecker as any).validateVersion({})).toEqual({ valid: false, messages: [] });
  });
});

const mockedVersionsOverview = {
  versions: [
    {
      version: "1.134.*",
      support: "Maintenance",
      lts: false,
      eom: "",
      eocp: "Q1/2026"
    },
    {
      version: "1.133.*",
      support: "Maintenance",
      lts: false,
      eom: "Q3/2025",
      eocp: "Q3/2026"
    },
    {
      version: "1.132.*",
      support: "Out of maintenance",
      lts: false,
      eom: "",
      eocp: "Q2/2026"
    },
    {
      version: "1.129.*",
      support: "Out of maintenance",
      lts: false,
      eom: "Q1/2025",
      eocp: "Q1/2026"
    },
    {
      version: "1.120.*",
      support: "Maintenance",
      lts: true,
      eom: "Q1/2025",
      eocp: "Q1/2026"
    },
    {
      version: "1.114.*",
      support: "Out of maintenance",
      lts: false,
      eom: "Q4/2024",
      eocp: "Q1/2025"
    }
  ],
  patches: [
    {
      version: "1.134.0",
      eocp: "To Be Determined"
    },
    {
      version: "1.133.0",
      eocp: "To Be Determined"
    },
    {
      version: "1.132.1",
      eocp: "Q1/2026"
    },
    {
      version: "1.132.0",
      eocp: "Q1/2026"
    },
    {
      version: "1.129.1",
      eocp: "Q1/2026"
    },
    {
      version: "1.129.0",
      eocp: "Q4/2025"
    },
    {
      version: "1.130.8",
      eocp: "To Be Determined"
    },
    {
      version: "1.130.7",
      eocp: "Q1/2026"
    },
    {
      version: "1.130.6",
      eocp: "Q1/2026"
    },
    {
      version: "1.130.5",
      eocp: "Q1/2026"
    },
    {
      version: "1.130.4",
      eocp: "Q1/2026"
    },
    {
      version: "1.130.3",
      eocp: "Q4/2025"
    },
    {
      version: "1.130.2",
      eocp: "Q4/2025"
    },
    {
      version: "1.130.1",
      eocp: "Q4/2025"
    },
    {
      version: "1.120.1",
      eocp: "Q2/2025"
    },
    {
      version: "1.114.4",
      eocp: "Q3/2024",
      removed: true
    },
    {
      version: "1.114.3",
      eocp: "Q3/2024",
      removed: true
    },
    {
      version: "1.114.2",
      eocp: "Q3/2024",
      removed: true
    },
    {
      version: "1.114.1",
      eocp: "Q3/2024",
      removed: true
    }
  ]
};
