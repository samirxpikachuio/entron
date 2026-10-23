#!/usr/bin/env bun
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { Lexer } from "./lexer/lexer";
import { Parser } from "./parser/parser";
import { Interpreter } from "./runtime/interpreter";
import { Environment } from "./runtime/environment";
import { formatValue } from "./runtime/values";
import { highlightEntron } from "./utils/highlighter";

const VERSION = "1.0.91";

const BANNER = `
  ███████╗███╗   ██╗████████╗██████╗  ██████╗ ███╗   ██╗
  ██╔════╝████╗  ██║╚══██╔══╝██╔══██╗██╔═══██╗████╗  ██║
  █████╗  ██╔██╗ ██║   ██║   ██████╔╝██║   ██║██╔██╗ ██║
  ██╔══╝  ██║╚██╗██║   ██║   ██╔══██╗██║   ██║██║╚██╗██║
  ███████╗██║ ╚████║   ██║   ██║  ██║╚██████╔╝██║ ╚████║
  ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
  v${VERSION}  —  The Modern Plain-English Programming Language
  Type 'exit' to quit, 'help' for commands, 'syntax' for reference.
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "repl") {
    await startRepl();
    return;
  }

  const command = args[0];

  if (command === "--version" || command === "-v") {
    console.log(`Entron v${VERSION}`);
    return;
  }

  if (command === "syntax") {
    printSyntax();
    return;
  }

  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }

  if (command === "run") {
    const filename = args[1];
    if (!filename) {
      console.error("Error: Please provide a filename to run.");
      console.log("Usage: entron run <filename.entron>");
      process.exit(1);
    }
    await runFile(filename);
    return;
  }

  if (command === "highlight") {
    const filename = args[1];
    if (!filename) {
      console.error("Error: Please provide a filename to highlight.");
      console.log("Usage: entron highlight <filename.entron>");
      process.exit(1);
    }
    const fullPath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(fullPath)) {
      console.error(`Error: File not found: ${filename}`);
      process.exit(1);
    }
    const source = fs.readFileSync(fullPath, "utf-8");
    console.log(highlightEntron(source));
    return;
  }

  // If user just typed `entron filename.entron`
  if (fs.existsSync(command)) {
    await runFile(command);
    return;
  }

  console.error(`Unknown command: '${command}'`);
  printHelp();
  process.exit(1);
}

async function runFile(filePath: string) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(fullPath, "utf-8");
  try {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const program = parser.parse();
    const interpreter = new Interpreter();
    await interpreter.run(program);
  } catch (error: any) {
    console.error("\n❌ Entron Execution Error:");
    console.error(error?.message ?? error);
    process.exit(1);
  }
}

async function startRepl() {
  console.log(BANNER);
  const globalEnv = Environment.createGlobal();
  const interpreter = new Interpreter(globalEnv);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "entron> "
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (trimmed === "exit" || trimmed === "quit") {
      rl.close();
      return;
    }

    if (trimmed === "help") {
      console.log(`
  Entron REPL Quick Guide:
  - define variable greeting as "Hello World"
  - display greeting joined with " from Entron!"
  - display 10 plus 25 times 2
  - repeat 3 times
      display "Entron loop!"
    end repeat
  - create numbers as list containing 1 and 2 and 3
  - append 4 to numbers
  - display numbers
      `);
      rl.prompt();
      return;
    }

    if (trimmed.length > 0) {
      try {
        const lexer = new Lexer(trimmed);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const program = parser.parse();
        const result = await interpreter.run(program);
        if (result.type !== "nothing") {
          console.log(`=> ${formatValue(result)}`);
        }
      } catch (err: any) {
        console.error(`Error: ${err?.message ?? err}`);
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nGoodbye!");
    process.exit(0);
  });
}

function printHelp() {
  console.log(`
Entron Programming Language - Plain English Dynamic Language (v${VERSION})

Usage:
  entron run <filename>    Execute an Entron source code file (.entron or .ent)
  entron repl              Launch interactive REPL session
  entron <filename>        Directly execute a file
  entron syntax            Print syntax reference
  entron --version         Show Entron version
  entron --help            Display this help message

Example:
  entron run examples/01_hello.entron
`);
}

function printSyntax() {
  console.log(`
Entron v${VERSION} — Syntax Reference
=====================================

Variables:
  define variable name as value
  define name as value
  set name to value

Output:
  display value
  display value joined with "text"

Input:
  ask "prompt" into variable

Math:
  plus, minus, times, divided by, modulo
  e.g. display 10 plus 25 times 2

Comparisons:
  is equal to, is not equal to
  is greater than, is less than
  is greater than or equal to, is less than or equal to

Logic:
  and, or, not

Conditionals:
  if condition then
    ...
  else
    ...
  end if

Loops:
  repeat N times
    ...
  end repeat

  while condition
    ...
  end while

  for each item in list
    ...
  end for

Lists:
  create nums as list containing 1 and 2 and 3
  append value to list
  remove value from list

Functions:
  function name with params
    ...
    return value
  end function
  call name with args

Full reference: see SYNTAX.md in the Entron repository.
`);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
