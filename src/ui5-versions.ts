import * as core from "@actions/core";
import * as semver from "semver";

const VERSION_OVERVIEW_URL = "https://ui5.sap.com/versionoverview.json";

type ExternalUI5VersionInfo = {
  /** Version (e.g. 1.132.*) */
  version: string;
  support: "Out of maintenance" | "Maintenance";
  lts: boolean;
  eom: string;
  eocp: string;
};

type ExternalUI5VersionPatch = {
  version: string;
  eocp: string;
  removed?: boolean;
  hidden?: boolean;
};

type EocpInfo = {
  eocp: boolean;
  inEocpQuarter: boolean;
  remainingDaysToEocp?: number;
  eocpDate: Date;
};

export type UI5Version = {
  semver: semver.SemVer;
  lts: boolean;
  eom: boolean;
  eocpInfo: EocpInfo | undefined;
};

export type UI5VersionPatch = {
  semver: semver.SemVer;
  eocpInfo: EocpInfo | undefined;
};

export type UI5VersionOverview = {
  versions: Map<string, UI5Version>;
  patches: Map<string, UI5VersionPatch>;
};

const yearQuarterToDate = new Map<string, EocpInfo>();

/**
 * @returns array of valid UI5 versions to be used in SAP BTP
 */
export async function fetchMaintainedVersions(): Promise<UI5VersionOverview> {
  core.info(`Checking ${VERSION_OVERVIEW_URL} for available UI5 versions...`);
  const res = await fetch(VERSION_OVERVIEW_URL);
  const ui5Versions = (await res.json()) as { versions: ExternalUI5VersionInfo[]; patches: ExternalUI5VersionPatch[] };

  const patchMap = new Map<string, UI5VersionPatch>();

  ui5Versions.patches
    .filter((p) => !p.removed && !p.hidden)
    .forEach((p) => {
      patchMap.set(p.version, { semver: semver.coerce(p.version as string)!, eocpInfo: checkEocp(p.eocp) });
    });

  if (!ui5Versions.versions?.length) throw new Error(`No UI5 versions found in response`);

  const versionMap = new Map<string, UI5Version>();
  ui5Versions.versions.forEach((v) => {
    versionMap.set(v.version, {
      semver: semver.coerce(v.version)!,
      lts: v.lts,
      eom: v.support !== "Maintenance",
      eocpInfo: checkEocp(v.eocp)
    });
  });

  return { versions: versionMap, patches: patchMap };
}

function checkEocp(yearQuarter: string) {
  let eocpInfo = yearQuarterToDate.get(yearQuarter);
  if (eocpInfo !== undefined) return eocpInfo;

  const matchRes = yearQuarter.match(/Q([1-4])\/(\d+)/);
  if (!matchRes?.length) return undefined;

  const quarter = parseInt(matchRes[1]);
  const month = quarter === 1 ? 0 : quarter === 2 ? 3 : quarter === 3 ? 6 : 9;
  const year = parseInt(matchRes[2]);

  const dateForYearQuarterStart = new Date(Date.UTC(year, month, 1));
  const dateForQueryQuarterEnd = new Date(Date.UTC(year, month + 3, 0));
  const now = new Date();

  eocpInfo = {
    eocp: dateForQueryQuarterEnd > now,
    eocpDate: dateForQueryQuarterEnd, // NOTE: there is actually a 1 week buffer until removal
    inEocpQuarter: dateForYearQuarterStart < now && dateForQueryQuarterEnd > now,
    remainingDaysToEocp: Math.floor(
      Math.abs(dateForQueryQuarterEnd.valueOf() - dateForYearQuarterStart.valueOf()) / (1000 * 60 * 60 * 24)
    )
  };

  yearQuarterToDate.set(yearQuarter, eocpInfo);
  return eocpInfo;
}
