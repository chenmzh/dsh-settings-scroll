# DSH Settings Scroll

[中文说明](README.zh.md)

A small, standalone DSH Web plugin that makes the settings dialog's left navigation scroll vertically when its tabs exceed the available height.

The settings title stays visible. The right settings page keeps its own scroll position. Mouse wheels, trackpads and touch use native scrolling; Arrow Up/Down and Home/End move keyboard focus between navigation buttons. Enter or Space activates the focused section. The active section is brought into view when the dialog opens or the selection changes.

## Install

Requires DSH `>=0.1.5-rc.1`. The release includes built browser and host entries, with no runtime dependencies.

```sh
dsh plugin --profile web add https://github.com/chenmzh/dsh-settings-scroll/releases/download/v0.1.0/dsh-settings-scroll-0.1.0.tgz
```

Restart your `dsh web` service after installation, then refresh its page. Open **Settings** and scroll over the left navigation.

To remove:

```sh
dsh plugin --profile web remove dsh-settings-scroll
```

Restart the service and refresh again. Plugin unload removes its styles, event listeners and DOM markers.

## Development

```sh
npm ci
npm run build
npm test
dsh plugin --profile web add link:/absolute/path/to/dsh-settings-scroll
```

Source is under `src/`; the dependency-free build emits DSH's `window.__ModuleLoader__.load({ id, factory })` client format. `cordis.patch.yml` adds one plugin row. The host entry requires no services, and the browser effect is owned by Cordis.

For real-browser checks, run a separate DSH test profile with this plugin installed and pass its authenticated launch URL through `DSH_TEST_URL`, or a private startup log through `DSH_TEST_LOG`:

```sh
npx playwright install chromium
DSH_TEST_LOG=/path/to/private-test-host.log npm run test:browser
```

Install `test/fixture` into that isolated profile too (`dsh plugin --profile <test-profile> add link:/absolute/path/to/dsh-settings-scroll/test/fixture`). It contributes 30 test-only sections through the official settings slot API and is excluded from the release package.

Use `DSH_TEST_BROWSER=chrome` to use installed Google Chrome. Test output and screenshots go to ignored `artifacts/`. The test profile must contain no personal data.

## Compatibility

The plugin targets the official modal settings shell: a labelled dialog with a navigation title and CSS-module `*_navList` containing section buttons. It does not depend on a generated class hash or translated labels. Unsupported layouts are left untouched. Skins that replace the settings DOM or change navigation to a horizontal layout may require an adapter; future DSH releases may change this internal markup.

No DSH core files are modified. No network calls, account access, persistent settings or conversation data are required by the plugin.

See [validation notes](docs/validation.md) for the tested host version and limitations.

## License

MIT.
