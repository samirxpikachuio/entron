import { Token, TokenType } from "./token";

const KEYWORDS: Record<string, TokenType> = {
  define: TokenType.DEFINE,
  create: TokenType.DEFINE,
  variable: TokenType.VARIABLE,
  function: TokenType.FUNCTION,
  with: TokenType.WITH,
  and: TokenType.AND,
  or: TokenType.OR,
  not: TokenType.NOT,
  as: TokenType.AS,
  to: TokenType.TO,
  by: TokenType.BY,
  from: TokenType.FROM,
  into: TokenType.INTO,
  set: TokenType.SET,
  change: TokenType.CHANGE,
  add: TokenType.ADD,
  subtract: TokenType.SUBTRACT,
  call: TokenType.CALL,
  return: TokenType.RETURN,
  if: TokenType.IF,
  then: TokenType.THEN,
  otherwise: TokenType.OTHERWISE,
  else: TokenType.OTHERWISE,
  end: TokenType.END,
  repeat: TokenType.REPEAT,
  times: TokenType.TIMES,
  while: TokenType.WHILE,
  do: TokenType.DO,
  for: TokenType.FOR,
  each: TokenType.EACH,
  in: TokenType.IN,
  count: TokenType.COUNT,
  break: TokenType.BREAK,
  continue: TokenType.CONTINUE,
  loop: TokenType.LOOP,
  display: TokenType.DISPLAY,
  print: TokenType.PRINT,
  ask: TokenType.ASK,
  read: TokenType.READ,
  write: TokenType.WRITE,
  append: TokenType.APPEND,
  file: TokenType.FILE,
  exists: TokenType.EXISTS,
  fetch: TokenType.FETCH,
  url: TokenType.URL,
  headers: TokenType.HEADERS,
  json: TokenType.JSON,
  parse: TokenType.PARSE,
  start: TokenType.START,
  server: TokenType.SERVER,
  http: TokenType.HTTP,
  websocket: TokenType.WEBSOCKET,
  graphql: TokenType.GRAPHQL,
  mqtt: TokenType.MQTT,
  port: TokenType.PORT,
  handler: TokenType.HANDLER,
  listen: TokenType.LISTEN,
  socket: TokenType.SOCKET,
  send: TokenType.SEND,
  message: TokenType.MESSAGE,
  publish: TokenType.PUBLISH,
  topic: TokenType.TOPIC,
  payload: TokenType.PAYLOAD,
  schema: TokenType.SCHEMA,
  resolvers: TokenType.RESOLVERS,
  open: TokenType.OPEN,
  close: TokenType.CLOSE,
  wait: TokenType.WAIT,
  milliseconds: TokenType.MILLISECONDS,
  seconds: TokenType.SECONDS,
  try: TokenType.TRY,
  on: TokenType.ON,
  error: TokenType.ERROR,
  record: TokenType.RECORD,
  key: TokenType.KEY,
  keys: TokenType.KEYS,
  values: TokenType.VALUES,
  list: TokenType.LIST,
  containing: TokenType.CONTAINING,
  empty: TokenType.EMPTY,
  item: TokenType.ITEM,
  at: TokenType.AT,
  position: TokenType.POSITION,
  first: TokenType.FIRST,
  last: TokenType.LAST,
  length: TokenType.LENGTH,
  of: TokenType.OF,
  joined: TokenType.JOINED,
  split: TokenType.SPLIT,
  trimmed: TokenType.TRIMMED,
  uppercase: TokenType.UPPERCASE,
  lowercase: TokenType.LOWERCASE,
  contains: TokenType.CONTAINS,
  reversed: TokenType.REVERSED,
  sorted: TokenType.SORTED,
  remove: TokenType.REMOVE,
  get: TokenType.GET,
  value: TokenType.VALUE,
  switch: TokenType.SWITCH,
  case: TokenType.CASE,
  collect: TokenType.COLLECT,
  where: TokenType.WHERE,
  lambda: TokenType.LAMBDA,
  returning: TokenType.RETURNING,
  class: TokenType.CLASS,
  extends: TokenType.EXTENDS,
  new: TokenType.NEW,
  this: TokenType.THIS,
  field: TokenType.FIELD,
  method: TokenType.METHOD,
  module: TokenType.MODULE,
  import: TokenType.IMPORT,
  export: TokenType.EXPORT,
  true: TokenType.TRUE,
  yes: TokenType.YES,
  false: TokenType.FALSE,
  no: TokenType.NO,
  nothing: TokenType.NOTHING,
  none: TokenType.NONE,
  null: TokenType.NOTHING,
  plus: TokenType.PLUS,
  minus: TokenType.MINUS,
  multiplied: TokenType.MULTIPLIED,
  divided: TokenType.DIVIDED,
  modulo: TokenType.MODULO,
  remainder: TokenType.REMAINDER,
  is: TokenType.IS,
  equal: TokenType.EQUAL,
  equals: TokenType.EQUALS,
  greater: TokenType.GREATER,
  less: TokenType.LESS,
  than: TokenType.THAN,
  least: TokenType.LEAST,
  most: TokenType.MOST,
  negative: TokenType.NEGATIVE,
  number: TokenType.NUMBER_WORD,
  math: TokenType.MATH,
  square: TokenType.SQUARE,
  root: TokenType.ROOT,
  power: TokenType.POWER,
  random: TokenType.RANDOM,
  between: TokenType.BETWEEN,
  timestamp: TokenType.TIMESTAMP,
  current: TokenType.CURRENT,
  round: TokenType.ROUND,
  floor: TokenType.FLOOR,
  ceil: TokenType.CEIL,
  absolute: TokenType.ABSOLUTE
};

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      // Handle comments
      if (this.isCommentStart()) {
        this.skipComment();
        continue;
      }

      // Handle newlines
      if (char === "\n" || (char === "\r" && this.peek(1) === "\n")) {
        const startLine = this.line;
        const startCol = this.column;
        if (char === "\r") this.advance();
        this.advance();
        this.line++;
        this.column = 1;

        // Collapse multiple newlines into a single NEWLINE token
        if (tokens.length > 0 && tokens[tokens.length - 1].type !== TokenType.NEWLINE) {
          tokens.push({
            type: TokenType.NEWLINE,
            value: "\n",
            line: startLine,
            column: startCol
          });
        }
        continue;
      }

      // Skip whitespace (spaces and tabs)
      if (char === " " || char === "\t" || char === "\r") {
        this.advance();
        continue;
      }

      // Grouping parenthesis if used
      if (char === "(") {
        tokens.push(this.makeToken(TokenType.LPAREN, "("));
        this.advance();
        continue;
      }
      if (char === ")") {
        tokens.push(this.makeToken(TokenType.RPAREN, ")"));
        this.advance();
        continue;
      }
      if (char === ",") {
        tokens.push(this.makeToken(TokenType.COMMA, ","));
        this.advance();
        continue;
      }
      if (char === ":") {
        tokens.push(this.makeToken(TokenType.COLON, ":"));
        this.advance();
        continue;
      }
      if (char === ".") {
        tokens.push(this.makeToken(TokenType.DOT, "."));
        this.advance();
        continue;
      }

      // Numbers
      if (this.isDigit(char)) {
        tokens.push(this.readNumber());
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        tokens.push(this.readString(char));
        continue;
      }

      // Words (identifiers or keywords)
      if (this.isAlpha(char) || char === "_") {
        tokens.push(this.readIdentifierOrKeyword());
        continue;
      }

      // If unrecognized symbol, throw friendly error
      throw new Error(
        `Syntax Error at line ${this.line}, column ${this.column}: Unexpected character '${char}'. Entron is designed to use plain English words instead of symbols.`
      );
    }

    tokens.push({
      type: TokenType.EOF,
      value: "",
      line: this.line,
      column: this.column
    });

    return tokens;
  }

  private isCommentStart(): boolean {
    // Check for "note:", "comment:", "remark:", or "--"
    if (this.source.slice(this.pos, this.pos + 2) === "--") return true;
    if (this.source.slice(this.pos, this.pos + 5).toLowerCase() === "note:") return true;
    if (this.source.slice(this.pos, this.pos + 8).toLowerCase() === "comment:") return true;
    if (this.source.slice(this.pos, this.pos + 7).toLowerCase() === "remark:") return true;
    return false;
  }

  private skipComment(): void {
    while (this.pos < this.source.length && this.source[this.pos] !== "\n") {
      this.advance();
    }
  }

  private readNumber(): Token {
    const startCol = this.column;
    const startLine = this.line;
    let numStr = "";
    let hasDot = false;

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (this.isDigit(char)) {
        numStr += char;
        this.advance();
      } else if (char === "." && !hasDot && this.isDigit(this.peek(1))) {
        hasDot = true;
        numStr += char;
        this.advance();
      } else {
        break;
      }
    }

    return {
      type: TokenType.NUMBER,
      value: numStr,
      line: startLine,
      column: startCol
    };
  }

  private readString(quote: string): Token {
    const startCol = this.column;
    const startLine = this.line;
    this.advance(); // consume opening quote
    let strVal = "";
    let hasInterpolation = false;

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === quote) {
        this.advance(); // consume closing quote
        return {
          type: hasInterpolation ? TokenType.INTERPOLATED_STRING : TokenType.STRING,
          value: strVal,
          line: startLine,
          column: startCol
        };
      }
      if (char === "{" && this.source[this.pos + 1] === "{") {
        // Interpolation placeholder: {{ expression }}
        const closeIndex = this.source.indexOf("}}", this.pos + 2);
        if (closeIndex === -1) {
          // Unterminated placeholder: treat '{{' as literal text.
          strVal += "{{";
          this.advance();
          this.advance();
          continue;
        }
        hasInterpolation = true;
        strVal += "{{";
        this.advance();
        this.advance();
        while (this.pos < this.source.length) {
          const inner = this.source[this.pos];
          if (inner === "}" && this.source[this.pos + 1] === "}") {
            strVal += "}}";
            this.advance();
            this.advance();
            break;
          }
          if (inner === "\n") {
            this.line++;
            this.column = 0;
          }
          strVal += inner;
          this.advance();
        }
        continue;
      }
      if (char === "\\") {
        this.advance();
        if (this.pos >= this.source.length) break;
        const esc = this.source[this.pos];
        if (esc === "n") strVal += "\n";
        else if (esc === "t") strVal += "\t";
        else if (esc === "r") strVal += "\r";
        else if (esc === "\\") strVal += "\\";
        else if (esc === quote) strVal += quote;
        else strVal += esc;
        this.advance();
      } else {
        if (char === "\n") {
          this.line++;
          this.column = 0;
        }
        strVal += char;
        this.advance();
      }
    }

    throw new Error(`Syntax Error at line ${startLine}, column ${startCol}: Unterminated string literal.`);
  }

  private readIdentifierOrKeyword(): Token {
    const startCol = this.column;
    const startLine = this.line;
    let word = "";

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (this.isAlphaNumeric(char) || char === "_") {
        word += char;
        this.advance();
      } else {
        break;
      }
    }

    const lower = word.toLowerCase();
    const keywordType = KEYWORDS[lower];

    if (keywordType) {
      return {
        type: keywordType,
        value: lower,
        line: startLine,
        column: startCol
      };
    }

    return {
      type: TokenType.IDENTIFIER,
      value: word,
      line: startLine,
      column: startCol
    };
  }

  private advance(): void {
    this.pos++;
    this.column++;
  }

  private peek(offset: number = 0): string {
    const target = this.pos + offset;
    if (target >= this.source.length) return "";
    return this.source[target];
  }

  private isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
  }

  private isAlpha(char: string): boolean {
    return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isDigit(char) || this.isAlpha(char);
  }

  private makeToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column
    };
  }
}
