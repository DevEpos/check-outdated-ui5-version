/* eslint-disable @typescript-eslint/no-explicit-any */
import * as core from "@actions/core";
import { jest } from "@jest/globals";

export function mockCoreWithEmptyImpl() {
  const summary: {
    addBreak?: jest.SpiedFunction<(typeof core)["summary"]["addBreak"]>;
    addLink?: jest.SpiedFunction<(typeof core)["summary"]["addLink"]>;
    addHeading?: jest.SpiedFunction<(typeof core)["summary"]["addHeading"]>;
    addTable?: jest.SpiedFunction<(typeof core)["summary"]["addTable"]>;
    write?: jest.SpiedFunction<(typeof core)["summary"]["write"]>;
  } = {};
  summary.addBreak = jest.spyOn(core.summary, "addBreak").mockImplementation(() => summary as any);
  summary.addLink = jest.spyOn(core.summary, "addLink").mockImplementation(() => summary as any);
  summary.addHeading = jest.spyOn(core.summary, "addHeading").mockImplementation(() => summary as any);
  summary.addTable = jest.spyOn(core.summary, "addTable").mockImplementation(() => summary as any);
  summary.write = jest.spyOn(core.summary, "write").mockImplementation(() => Promise.resolve(undefined) as any);

  const mock = {
    getBooleanInput: jest.spyOn(core, "getBooleanInput").mockImplementation(() => true),
    info: jest.spyOn(core, "info").mockImplementation(() => {}),
    error: jest.spyOn(core, "error").mockImplementation(() => {}),
    debug: jest.spyOn(core, "debug").mockImplementation(() => {}),
    startGroup: jest.spyOn(core, "startGroup").mockImplementation(() => {}),
    endGroup: jest.spyOn(core, "endGroup").mockImplementation(() => {}),
    setOutput: jest.spyOn(core, "setOutput").mockImplementation(() => {}),
    setFailed: jest.spyOn(core, "setFailed").mockImplementationOnce(() => {}),
    summary
  };

  return mock;
}
