# APK update lifecycle

The old updater only saved a build number after calling next(). A surviving
localStorage marker could indefinitely display “ready” after a missing package,
failed switch, or rollback. Download completion did not establish activation.

## Current flow

- Cold start checks the manifest and offers an update dialog. Foreground checks
  are throttled; checking never downloads without consent.
- The dialog shows running/target versions and native download percentages.
  No progress event means an indeterminate bar, not an invented percentage.
- Native list() is the authority for available packages. Legacy pending markers
  with missing/error/downloading entries cannot claim the bundle is ready.
- User consent downloads and verifies the package. No next() call is made:
  merely backgrounding a match must not activate a newly downloaded package.
- If a mode is active, installation waits until the exit guard reports idle.
  Canceling the scheduled restart preserves the downloaded package. Downloads
  may continue in the background without consent to automatically install.
- Activation checks inventory and active modes again, then calls prepareUpdate().
  The completed Werewolf match is saved; save failure prevents reload.
- The target is persisted before set() tears down JavaScript. A resolved set()
  alone is never success. No reload produces a visible failure/retry option.
- On the new page, markBootOk() awaits notifyAppReady() and checks runtime/native
  version before clearing pending state and showing completion.
- Old runtime after an attempted update reports failed/not started or rolled
  back. It does not claim to distinguish these causes without native evidence.
  A retry requests a new download rather than automatically reinstalling it.

The bridge uses the plugin download/list/set/current/notifyAppReady APIs;
see [Capgo updater API](https://capgo.app/docs/plugins/updater/api/).
No native dependency or signing configuration is changed.

## Verification

- node scripts/test-hot-update.mjs (offline bridge lifecycle and failure cases)
- node scripts/test-hot-update-progress-browser.mjs (offline bilingual UI,
  proactive prompt, actual DOM progress, defer/cancel, activation and new boot)
- node scripts/test-exit-guard.mjs (mode and save-failure protection)

These tests simulate the native bridge, not an Android device. Actual on-device
download verification, WebView switch, kill/reopen and native rollback must still
be acceptance-tested. An old installation stuck before this updater is installed
may need a same-signature APK overlay installation to bootstrap the new flow.
Do not uninstall or clear application data as a recovery instruction.
