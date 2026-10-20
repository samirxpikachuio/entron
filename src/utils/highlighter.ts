// ANSI terminal color codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const BRIGHT_CYAN = "\x1b[96m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const BRIGHT_GREEN = "\x1b[92m";
const MAGENTA = "\x1b[35m";
const BRIGHT_MAGENTA = "\x1b[95m";
const BLUE = "\x1b[34m";
const BRIGHT_BLUE = "\x1b[94m";
const GRAY = "\x1b[90m";
const RED = "\x1b[31m";

export function highlightEntron(code: string): string {
  const lines = code.split("\n");
  return lines.map(highlightLine).join("\n");
}

function highlightLine(line: string): string {
  // Check for comments
  const commentMatch = line.match(/^(\s*)(note:|comment:|remark:|--)(.*)$/i);
  if (commentMatch) {
    return `${commentMatch[1]}${GRAY}${DIM}${commentMatch[2]}${commentMatch[3]}${RESET}`;
  }

  // Tokenize line using regex patterns
  const tokens = line.split(/(\"[^\"]*\"|\'[^\']*\'|\b\w+\b|[^\s\w])/g).filter(Boolean);

  const keywordsControl = new Set([
    "if", "then", "otherwise", "else", "end", "repeat", "times",
    "while", "do", "for", "each", "in", "count", "from", "to", "by", "as",
    "break", "continue", "loop", "return", "try", "on", "error"
  ]);

  const keywordsDecl = new Set([
    "define", "variable", "create", "function", "set", "change",
    "add", "subtract", "call", "with", "into"
  ]);

  const keywordsOps = new Set([
    "plus", "minus", "multiplied", "divided", "modulo", "remainder",
    "joined", "is", "equal", "equals", "greater", "less", "than",
    "least", "most", "contains", "and", "or", "not", "negative"
  ]);

  const keywordsServer = new Set([
    "start", "server", "http", "websocket", "graphql", "mqtt",
    "publish", "send", "message", "socket", "topic", "payload",
    "schema", "resolvers", "headers", "handler", "port", "open", "close"
  ]);

  const keywordsBuiltins = new Set([
    "display", "print", "ask", "read", "write", "append", "file", "exists",
    "fetch", "url", "parse", "json", "wait", "milliseconds", "seconds",
    "list", "containing", "empty", "record", "key", "keys", "values",
    "item", "position", "first", "last", "length", "of", "reversed", "sorted",
    "trimmed", "uppercase", "lowercase", "split", "math", "square", "root",
    "absolute", "value", "power", "random", "number", "between", "current", "timestamp"
  ]);

  const constants = new Set([
    "true", "false", "yes", "no", "nothing", "none", "null", "pi", "euler"
  ]);

  let result = "";

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const lower = tok.toLowerCase();

    // Strings
    if ((tok.startsWith('"') && tok.endsWith('"')) || (tok.startsWith("'") && tok.endsWith("'"))) {
      result += `${GREEN}${tok}${RESET}`;
    }
    // Numbers
    else if (/^\d+(\.\d+)?$/.test(tok)) {
      result += `${YELLOW}${tok}${RESET}`;
    }
    // Constants
    else if (constants.has(lower)) {
      result += `${BRIGHT_MAGENTA}${BOLD}${tok}${RESET}`;
    }
    // Server keywords
    else if (keywordsServer.has(lower)) {
      result += `${BRIGHT_CYAN}${BOLD}${tok}${RESET}`;
    }
    // Control flow
    else if (keywordsControl.has(lower)) {
      result += `${MAGENTA}${BOLD}${tok}${RESET}`;
    }
    // Declarations
    else if (keywordsDecl.has(lower)) {
      result += `${BLUE}${BOLD}${tok}${RESET}`;
    }
    // Operators
    else if (keywordsOps.has(lower)) {
      result += `${CYAN}${tok}${RESET}`;
    }
    // Built-in functions
    else if (keywordsBuiltins.has(lower)) {
      result += `${BRIGHT_BLUE}${tok}${RESET}`;
    }
    // Identifiers or other text
    else {
      result += tok;
    }
  }

  return result;
}
