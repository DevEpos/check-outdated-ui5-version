# Check/update UI5 versions for use in Cloud Foundry

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This GitHub Action can be used to check SAPUI5/OpenUI5 projects for the use of outdated versions (see
[SAPUI5 Version Overview](https://ui5.sap.com/versionoverview.html)). This is relevant if the UI5 application is used in
Cloud Foundry environments like
[SAP Build Workzone](https://help.sap.com/docs/build-work-zone-standard-edition/sap-build-work-zone-standard-edition/expose-html5-applications-in-sap-build-work-zone-standard-edition?locale=en-US&q=ui5VersionNumber).

## Usage

For workflows running in pull requests.

```yaml
- name: Check UI5 versions
  id: check-ui5
  uses: DevEpos/check-outdated-ui5-version@v1
  with:
    manifestPaths: |
      router
      app/**/webapp
```

For scheduled jobs to periodically check for outdated UI5 versions

````yaml
name: Fix outdated UI5 versions
on:
  schedule:
    - cron: "30 0 * * 1"
  workflow_dispatch:

jobs:
  - name: Check/update UI5 versions
    id: fix-ui5
    uses: DevEpos/check-outdated-ui5-version@v1
    with:
      fixOutdated: true
      useLTS: true
      manifestPaths: |
        router
        app/**/webapp

  - name: Create Pull Request
    if: ${{ steps.fix-ui5.outputs.modifiedFiles != '' }}
    uses: peter-evans/create-pull-request@v7
    with:
      commit-message: "chore: update outdated UI5 versions"
      branch: "update-ui5-versions/patch"
      title: "Update Outdated UI5 Versions"
      add-paths: ${{ steps.fix-ui5.outputs.modifiedFiles }}
      body: |
        This pull request updates the outdated UI5 versions found in the following files:

        ```
        ${{ steps.fix-ui5.outputs.modifiedFiles }}
        ```
````

### Action inputs

| Name                    | Description                                                                                                                                                                                                  | Required | Default |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------- |
| `manifestPaths`         | List of newline or comma-separated paths to folders that contain a `manifest.json` file. <br/> **Note**: Glob patterns can be used                                                                           | ✅       |         |
| `eomAllowed`            | If `true`, versions that are no longer maintained but have not yet reached the end of cloud provisioning will only produce warnings                                                                          |          | `true`  |
| `allowedDaysBeforeEocp` | Number of allowed days before the eocp. Is only relevant if the current date falls into the eocp quarter.<br/>**Note**: Produces warnings when the remaining number of days is higher than the allowed value |          | `30`    |
| `fixOutdated`           | If `true` the outdated version will be updated to the latest (LTS) version                                                                                                                                   |          | `false` |
| `useLTS`                | Can be used to update to the latest LTS version that is currently available                                                                                                                                  |          | `false` |

### Action outputs

| Name             | Description                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `foundManifests` | List of `manifest.json` file paths that have been found according to the specified paths in `manifestPaths` |
| `modifiedFiles`  | List of `manifest.json` files that have been updated. Can be used to pass to e.g. an action to create a PR  |
| `summary`        | Check summary as html string as printed to the action output ([see](#example-of-action-result))             |

## Example of action result

![Action Result](docs/img/action-result.png)
