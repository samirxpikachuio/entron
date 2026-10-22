# Changelog

All notable changes to the **Entron Language Support** extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] – 2026-10-23

### Added

- Syntax highlighting for `.entron` and `.ent` files via TextMate grammar (`source.entron`).
- Language registration with file-type icons for both extensions.
- Grammar coverage for:
  - Line comments: `note:`, `comment:`, `remark:`, `--`
  - Double-quoted and single-quoted strings with escape sequences.
  - String interpolation using `{{ ... }}`.
  - Numeric literals (integer and decimal).
  - Boolean constants: `true`, `false`, `yes`, `no`.
  - Null-like constants: `nothing`, `none`, `null`.
  - Mathematical constants: `pi`, `euler`.
  - HTTP, WebSocket, GraphQL, and MQTT server statements.
  - Function definitions (`define function`) and calls (`call`).
  - Conditional flow: `if`, `then`, `otherwise if`, `otherwise`, `end if`.
  - Loop constructs: `repeat … times`, `while … do`, `for each … in`, `count from … to`.
  - Loop control: `break loop`, `continue loop`.
  - Error handling: `try`, `otherwise on error`, `end try`.
  - Switch statements: `switch`, `case`, `end switch`.
  - Variable definitions: `define variable`, `create`, `set`, `change`, `add`, `subtract`.
  - Arithmetic, comparison, logical, and string operators (plain-English forms).
  - Built-in I/O, collection, math, and time functions.
- `language-configuration.json` with:
  - Line comment token (`note: `).
  - Bracket matching for `()`, `[]`, `{}`.
  - Auto-closing pairs for brackets, quotes, and `{{ }}`.
  - Code folding rules matching Entron block syntax.
  - Indentation rules for `define function`, `if`, loop blocks, etc.
- 28 code snippets covering all major language constructs.
- Example file `examples/hello.ent` validated against the Entron 1.0.0 runtime.
- `install-extension.ps1` for repeatable VSIX installation.
