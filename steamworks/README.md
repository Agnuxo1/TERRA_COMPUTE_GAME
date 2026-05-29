# Steamworks Build Notes

Terra Compute is packaged for Steam as a Windows desktop build using Electron.

Build output:

```text
release/win-unpacked/Terra Compute.exe
release/terra-compute-steam-win.zip
```

For SteamPipe, upload the contents of `release/win-unpacked` as the Windows depot and set the launch executable to:

```text
Terra Compute.exe
```

Required Steamworks values:

- App ID
- Windows Depot ID
- Steamworks SDK `ContentBuilder` path, or a working `steamcmd.exe`
- Steam account with build upload permission

This game can be configured as free-to-play/free in Steamworks, but pricing/release actions happen in the Steam partner dashboard and should be reviewed before publishing.
