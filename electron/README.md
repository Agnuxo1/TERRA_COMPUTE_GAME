# Steam Desktop Build

This folder contains the Electron wrapper used to package Terra Compute as a desktop game for Steam.

Build commands:

```bash
npm run build:steam
```

Output:

```text
release/win-unpacked/Terra Compute.exe
```

Use the `win-unpacked` folder as the Steam depot content. Steam should launch `Terra Compute.exe`.
