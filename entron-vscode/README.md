# Entron Language Support

> VS Code / Antigravity IDE extension providing syntax highlighting, code snippets, bracket matching, and editor configuration for the [Entron](https://github.com/samirxpikachuio/entron) plain-English programming language.

---

## What This Extension Does

| Feature | Status |
|---|---|
| Syntax highlighting for `.entron` and `.ent` | ✅ Implemented |
| Code snippets (28 built-in) | ✅ Implemented |
| Bracket / quote auto-closing | ✅ Implemented |
| Code folding (function, loop, if blocks) | ✅ Implemented |
| Auto-indentation rules | ✅ Implemented |
| `{{ }}` interpolation highlighting | ✅ Implemented |
| Go-to-definition / IntelliSense | ❌ Not implemented (requires Language Server) |
| Inline error diagnostics | ❌ Not implemented (requires Language Server) |
| Hover documentation | ❌ Not implemented (requires Language Server) |
| Rename / refactor | ❌ Not implemented (requires Language Server) |

> **Note:** This extension provides static syntax highlighting only. Real-time error reporting and auto-complete require a Language Server Protocol (LSP) implementation, which is a separate project.

---

## Supported File Extensions

| Extension | Description |
|---|---|
| `.entron` | Standard Entron source file |
| `.ent` | Short Entron source file |

---

## How to Build and Package

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later with `npm`
- `@vscode/vsce` (auto-downloaded via `npx`)

### Build the VSIX

```powershell
cd entron-vscode

# Package the extension (no compile step needed — pure JSON)
npx --yes @vscode/vsce package --no-dependencies --allow-missing-repository
```

This produces `entron-language-1.0.0.vsix` inside `entron-vscode/`.

### Repeatable Builds

Run the same command again after any edit. The version in `package.json` controls the output filename. Increment it before re-packaging for a new release.

---

## How to Install in Antigravity IDE

### Option A — Automated (recommended)

Run the included PowerShell script from the repo root:

```powershell
# From the eng= project root:
powershell -NoProfile -ExecutionPolicy Bypass -File entron-vscode\install-extension.ps1
```

This script:
1. Packages the extension automatically (calls `vsce package`).
2. Installs it via `agy plugin install`.
3. Reports the exact VSIX path and any errors.

### Option B — Manual VSIX Install

```powershell
# 1. Package
cd entron-vscode
npx --yes @vscode/vsce package --no-dependencies --allow-missing-repository

# 2. Install into Antigravity IDE
agy plugin install "entron-vscode\entron-language-1.0.0.vsix"
```

### Option C — Update an Existing Installation

Simply re-run the install command with the new VSIX. Antigravity IDE replaces the previous version:

```powershell
agy plugin install "entron-vscode\entron-language-1.0.0.vsix"
```

---

## How to Test Syntax Highlighting

1. Open any `.entron` or `.ent` file in Antigravity IDE.
2. Confirm the language mode displayed in the status bar reads **Entron**.
3. Verify these elements are coloured correctly:
   - `note:` lines → comment colour (typically grey/green)
   - `"strings"` and `'strings'` → string colour (typically orange/yellow)
   - `{{ expression }}` → distinct template-expression colour inside strings
   - `define function`, `if`, `repeat`, `while`, `for each` → keyword colour
   - `display`, `math square root of`, `list containing` → built-in function colour
   - Numbers → numeric constant colour
   - `true`, `false`, `yes`, `no` → boolean constant colour

### Run the Example File

```powershell
# From the eng= project root:
.\entron.exe run entron-vscode\examples\hello.ent
```

Expected output:
```
Hello from Entron!
Count: 1
Count: 2
Count: 3
Count: 4
Count: 5
Entron is working.
Entron is working.
Entron is working.
Language: Entron
Language: Python
Language: JavaScript
Entron v1 — plain English programming!
```

---

## Available Snippets

Trigger snippets by typing the prefix and pressing `Tab`:

| Prefix | Snippet |
|---|---|
| `hello` | Hello World program |
| `defvar` | `define variable` |
| `create` | `create` variable |
| `set` | `set` variable |
| `deffun` | Function definition (with params) |
| `deffun0` | Function definition (no params) |
| `call` | Function call |
| `if` | If statement |
| `ifelse` | If / otherwise |
| `ifelseif` | If / otherwise if / otherwise chain |
| `switch` | Switch statement |
| `repeat` | Repeat N times loop |
| `while` | While loop |
| `count` | Count from N to M loop |
| `countby` | Count loop with step |
| `foreach` | For each loop |
| `try` | Try / error handling |
| `list` | List definition |
| `record` | Record (dictionary) definition |
| `httpserver` | HTTP REST API server |
| `wsserver` | WebSocket server |
| `gqlserver` | GraphQL server |
| `mqttserver` | MQTT broker server |
| `note` | Comment line |
| `interp` | String interpolation example |
| `fetch` | Fetch URL |
| `readfile` | Read file safely |
| `writefile` | Write to file |
| `math` | Math operations |
| `wait` | Async delay/timer |
| `display` | Display output |

---

## How to Update an Existing Installation

1. Edit any file in `entron-vscode/` as needed.
2. Bump `"version"` in `entron-vscode/package.json` if distributing externally.
3. Re-run the install script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File entron-vscode\install-extension.ps1
```

---

## Current Limitations

- **No Language Server:** Auto-complete, hover docs, inline error underlines, and go-to-definition require a full LSP implementation, which is not part of this extension.
- **Multiword operator priority:** Because TextMate grammars match left-to-right, some multiword operators (e.g. `is greater than or equal to`) must be listed before shorter overlapping forms. The grammar handles this correctly, but adding new multi-token forms in the future requires care.
- **Comment trigger words:** `note:`, `comment:`, and `remark:` are only treated as comments when they start at the beginning of a line or are preceded by whitespace, to avoid false positives inside strings or identifiers.
- **Publisher field:** The `publisher` field in `package.json` is set to `entron-team`. If you publish to the VS Code Marketplace, replace it with your verified Marketplace publisher ID and remove `--allow-missing-publisher` from the package command.
- **Icon format:** The original `entron-icon.svg` was converted to `entron-icon.png` for VSIX compatibility; `vsce` requires PNG icons for marketplace submission.
