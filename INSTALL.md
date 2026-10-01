# Installing AI Code Tagger

The extension is distributed as a single `.vsix` file — no Node.js, npm, or other packages are needed to run it. Only VS Code itself is required.

## Install from the .vsix file

1. Get the `.vsix` file from your teacher (shared via the school LMS, a drive link, etc.) — e.g. `AICodeTagger-0.1.0.vsix`.
2. In VS Code, open the Extensions view (`Ctrl+Shift+X`).
3. Click the **"..."** menu at the top of the Extensions view → **Install from VSIX...**
4. Select the `.vsix` file you downloaded.
5. When prompted, click **Reload Window** (or run **Developer: Reload Window** from the Command Palette) to activate it.

### Alternative: command line

If you'd rather use a terminal:

```
code --install-extension AICodeTagger-0.1.0.vsix
```

## Confirm it installed

Open the Command Palette (`Ctrl+Shift+P`) and type `Tag AI Code` — it should appear in the list. If it doesn't show up, make sure you reloaded the window after installing, or try fully restarting VS Code.

The extension is installed per VS Code profile, so once installed it's available in every project you open — not just the one it was installed from.

## Teacher setup (optional)

To save students from typing their name and AI engine every time, pre-fill them in a starter project's `.vscode/settings.json`:

```json
{
  "aiTagger.studentName": "",
  "aiTagger.defaultEngine": "Claude"
}
```

Leave `aiTagger.studentName` blank (each student should fill in their own name) and set `aiTagger.defaultEngine` to whichever AI tool your class is standardised on, or leave it blank too if students use a mix.

## Updating

To update to a newer version, repeat the install steps above with the new `.vsix` file — it will replace the old version. Reload the window afterward.

## Uninstalling

Open the Extensions view (`Ctrl+Shift+X`), find **AI Code Tagger** under Installed, click the gear icon → **Uninstall**.
