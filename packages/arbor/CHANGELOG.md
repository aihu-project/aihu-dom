# Changelog

## Unreleased

## 4.2.0

- `hydrate()` captures a light-DOM host's original children before adopting its template and calls an optional `projectLightDomSlot` hook after adoption, so named-slot children survive top-level hydration (aihu#477). Native shadow-DOM slots are unchanged when the hook is absent.
- New `MountOptions.onAfterRender`: runs after each completed DOM patch, initial render included, in commit order (aihu#867).

## 4.1.4

- Pass each row's item index to `each()` key functions during rendering, reconciliation, and hydration.
