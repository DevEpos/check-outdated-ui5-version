import * as core from "@actions/core";
import { getAllowedDaysBeforeEocp, getInputAsArray, getRepoPath } from "../src/lib/utils";
import { mockCoreWithEmptyImpl } from "../__fixtures__/core";

describe("utils.ts", () => {
  const oldEnv = process.env;

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    process.env = { ...oldEnv };
  });

  it("Repo path returned from env var GITHUB_WORKSPACE", async () => {
    const core = mockCoreWithEmptyImpl();
    process.env["GITHUB_WORKSPACE"] = "/home/container/reponame/reponame";

    expect(getRepoPath()).toEqual("/home/container/reponame/reponame");

    expect(core.debug).toHaveBeenCalledWith(`repoPath: /home/container/reponame/reponame`);
  });

  it("getRepoPath() throws error when GITHUB_WORKSPACE is not defined in env", () => {
    process.env["GITHUB_WORKSPACE"] = undefined;
    expect(() => getRepoPath()).toThrow(new Error("GITHUB_WORKSPACE not defined"));
  });

  it("Array input successfully retrieved from core.getInput", () => {
    jest.spyOn(core, "getInput").mockReturnValueOnce("app/**/test\nrouter");
    expect(getInputAsArray("manifestPaths")).toBeDefined();
  });

  it("Invalid number in 'allowedDaysBeforeEocp'", () => {
    process.env["INPUT_ALLOWEDDAYSBEFOREEOCP"] = "ss";
    expect(getAllowedDaysBeforeEocp()).toBe(30);
  });

  it("Valid number in 'allowedDaysBeforeEocp'", () => {
    process.env["INPUT_ALLOWEDDAYSBEFOREEOCP"] = "10";
    expect(getAllowedDaysBeforeEocp()).toBe(10);
  });
});
