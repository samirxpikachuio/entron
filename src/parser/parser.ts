import { Token, TokenType } from "../lexer/token";
import {
  Statement,
  Expression,
  Program,
  VariableDeclarationStmt,
  AssignmentStmt,
  ChangeVariableStmt,
  DisplayStmt,
  AskStmt,
  IfStmt,
  IfBranch,
  RepeatStmt,
  WhileStmt,
  ForEachStmt,
  CountStmt,
  BreakStmt,
  ContinueStmt,
  FunctionDefStmt,
  ReturnStmt,
  ExpressionStmt,
  AppendToListStmt,
  RemoveFromListStmt,
  SetRecordKeyStmt,
  WriteFileStmt,
  ReadFileStmt,
  FetchUrlStmt,
  WaitStmt,
  TryCatchStmt,
  StartHttpServerStmt,
  StartWebSocketServerStmt,
  StartGraphqlServerStmt,
  StartMqttServerStmt,
  SendSocketMessageStmt,
  PublishMqttStmt,
  SwitchStmt,
  SwitchCase,
  ClassDefStmt,
  ClassField,
  ClassMethod,
  ImportStmt,
  ExportStmt,
  InterpolatedStringExpr,
  LambdaExpr,
  ListComprehensionExpr,
  MemberAccessExpr,
  MethodCallExpr,
  NewInstanceExpr,
  ThisExpr,
  Position,
  BinaryOperator,
  UnaryOperator
} from "./ast";
import { Lexer } from "../lexer/lexer";

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): Program {
    const statements: Statement[] = [];
    this.skipNewlines();

    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
      this.skipNewlines();
    }

    return {
      kind: "Program",
      body: statements,
      pos: { line: 1, column: 1 }
    };
  }

  // --- Statement Parsers ---

  private parseStatement(): Statement {
    this.skipNewlines();
    const token = this.peek();

    // define / create variable
    if (this.match(TokenType.DEFINE)) {
      if (this.match(TokenType.FUNCTION)) {
        return this.parseFunctionDef();
      }
      if (this.match(TokenType.VARIABLE)) {
        return this.parseVariableDeclaration();
      }
      if (this.match(TokenType.CLASS)) {
        return this.parseClassDef();
      }
      // If "create <name> as <expr>"
      return this.parseVariableDeclaration();
    }

    // set <name> to <expr> OR set key <key> in <record> to <val>
    if (this.match(TokenType.SET)) {
      if (this.match(TokenType.KEY)) {
        return this.parseSetRecordKey();
      }
      return this.parseAssignment();
    }

    // change <name> by <expr>
    if (this.match(TokenType.CHANGE)) {
      return this.parseChangeVariable();
    }

    // add <expr> to <name>
    if (this.match(TokenType.ADD)) {
      return this.parseAdd();
    }

    // subtract <expr> from <name>
    if (this.match(TokenType.SUBTRACT)) {
      return this.parseSubtract();
    }

    // display / print <expr>
    if (this.match(TokenType.DISPLAY) || this.match(TokenType.PRINT)) {
      return this.parseDisplay();
    }

    // ask <prompt> into <var>
    if (this.match(TokenType.ASK)) {
      return this.parseAsk();
    }

    // if <cond> then
    if (this.match(TokenType.IF)) {
      return this.parseIf();
    }

    // repeat <n> times
    if (this.match(TokenType.REPEAT)) {
      return this.parseRepeat();
    }

    // while <cond> do
    if (this.match(TokenType.WHILE)) {
      return this.parseWhile();
    }

    // for each <var> in <list> do
    if (this.match(TokenType.FOR)) {
      return this.parseForEach();
    }

    // count from <start> to <end> [by <step>] as <var> do
    if (this.match(TokenType.COUNT)) {
      return this.parseCount();
    }

    // break loop / stop loop
    if (this.match(TokenType.BREAK)) {
      this.match(TokenType.LOOP);
      return { kind: "BreakStmt", pos: this.pos() };
    }

    // continue loop / skip to next
    if (this.match(TokenType.CONTINUE)) {
      this.match(TokenType.LOOP);
      return { kind: "ContinueStmt", pos: this.pos() };
    }

    // return [expr]
    if (this.match(TokenType.RETURN)) {
      return this.parseReturn();
    }

    // call <fn> ...
    if (this.match(TokenType.CALL)) {
      const expr = this.parseFunctionCallAfterCallToken();
      return { kind: "ExpressionStmt", expr, pos: this.pos() };
    }

    // append <expr> to <listVar>
    if (this.match(TokenType.APPEND)) {
      return this.parseAppend();
    }

    // remove item at position <expr> from <listVar>
    if (this.match(TokenType.REMOVE)) {
      return this.parseRemove();
    }

    // write <expr> to file <path>
    if (this.match(TokenType.WRITE)) {
      return this.parseWriteFile(false);
    }

    // read file <path> into <var>
    if (this.match(TokenType.READ)) {
      return this.parseReadFile();
    }

    // fetch url <url> into <var>
    if (this.match(TokenType.FETCH)) {
      return this.parseFetchUrl();
    }

    // wait <n> milliseconds / seconds
    if (this.match(TokenType.WAIT)) {
      return this.parseWait();
    }

    // try ... otherwise on error <err>
    if (this.match(TokenType.TRY)) {
      return this.parseTryCatch();
    }

    // start <http / websocket / graphql / mqtt> server ...
    if (this.match(TokenType.START)) {
      return this.parseStartServer();
    }

    // send message <msg> to socket <sock>
    if (this.match(TokenType.SEND)) {
      return this.parseSendSocketMessage();
    }

    // publish mqtt topic <topic> with payload <payload>
    if (this.match(TokenType.PUBLISH)) {
      return this.parsePublishMqtt();
    }

    // switch <expr> ... case ... otherwise ... end switch
    if (this.match(TokenType.SWITCH)) {
      return this.parseSwitch();
    }

    // define class <Name> ... end class
    if (this.match(TokenType.CLASS)) {
      return this.parseClassDef();
    }

    // import <module>
    if (this.match(TokenType.IMPORT)) {
      return this.parseImport();
    }

    // export ...
    if (this.match(TokenType.EXPORT)) {
      return this.parseExport();
    }

    // Fallback: expression statement
    const expr = this.parseExpression();
    return { kind: "ExpressionStmt", expr, pos: this.pos() };
  }

  private parseVariableDeclaration(): VariableDeclarationStmt {
    const pos = this.pos();
    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'define variable' or 'create'.");
    this.consume(TokenType.AS, "Expected 'as' after variable name in declaration.");
    const initializer = this.parseExpression();
    return {
      kind: "VariableDeclarationStmt",
      name: nameToken.value,
      initializer,
      pos
    };
  }

  private parseAssignment(): AssignmentStmt {
    const pos = this.pos();
    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'set'.");
    this.consume(TokenType.TO, "Expected 'to' after variable name in 'set <name> to <value>'.");
    const value = this.parseExpression();
    return {
      kind: "AssignmentStmt",
      name: nameToken.value,
      value,
      pos
    };
  }

  private parseSetRecordKey(): SetRecordKeyStmt {
    const pos = this.pos();
    const keyExpr = this.parseExpression();
    this.consume(TokenType.IN, "Expected 'in' after record key in 'set key <key> in <record> to <val>'.");
    const recordToken = this.consume(TokenType.IDENTIFIER, "Expected record variable name.");
    this.consume(TokenType.TO, "Expected 'to' before value in 'set key <key> in <record> to <val>'.");
    const valueExpr = this.parseExpression();
    return {
      kind: "SetRecordKeyStmt",
      recordVar: recordToken.value,
      keyExpr,
      valueExpr,
      pos
    };
  }

  private parseChangeVariable(): ChangeVariableStmt {
    const pos = this.pos();
    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'change'.");
    this.consume(TokenType.BY, "Expected 'by' in 'change <name> by <amount>'.");
    const amount = this.parseExpression();
    return {
      kind: "ChangeVariableStmt",
      name: nameToken.value,
      amount,
      isSubtraction: false,
      pos
    };
  }

  private parseAdd(): ChangeVariableStmt | AppendToListStmt {
    const pos = this.pos();
    const expr = this.parseExpression();
    this.consume(TokenType.TO, "Expected 'to' in 'add <expr> to <var>'.");
    const targetToken = this.consume(TokenType.IDENTIFIER, "Expected target variable name.");
    return {
      kind: "ChangeVariableStmt",
      name: targetToken.value,
      amount: expr,
      isSubtraction: false,
      pos
    };
  }

  private parseSubtract(): ChangeVariableStmt {
    const pos = this.pos();
    const amount = this.parseExpression();
    this.consume(TokenType.FROM, "Expected 'from' in 'subtract <amount> from <var>'.");
    const targetToken = this.consume(TokenType.IDENTIFIER, "Expected target variable name.");
    return {
      kind: "ChangeVariableStmt",
      name: targetToken.value,
      amount,
      isSubtraction: true,
      pos
    };
  }

  private parseDisplay(): DisplayStmt {
    const pos = this.pos();
    const expr = this.parseExpression();
    return {
      kind: "DisplayStmt",
      expr,
      pos
    };
  }

  private parseAsk(): AskStmt {
    const pos = this.pos();
    const prompt = this.parseExpression();
    this.consume(TokenType.INTO, "Expected 'into' in 'ask <prompt> into <variable>'.");
    const target = this.consume(TokenType.IDENTIFIER, "Expected variable name to store user input.");
    return {
      kind: "AskStmt",
      prompt,
      targetVar: target.value,
      pos
    };
  }

  private parseIf(): IfStmt {
    const pos = this.pos();
    const branches: IfBranch[] = [];

    // First branch
    const firstCond = this.parseExpression();
    this.consume(TokenType.THEN, "Expected 'then' after if condition.");
    this.skipNewlines();
    const firstBody = this.parseBlock([TokenType.OTHERWISE, TokenType.END]);
    branches.push({ condition: firstCond, body: firstBody });

    let otherwiseBody: Statement[] | undefined = undefined;

    while (this.match(TokenType.OTHERWISE)) {
      if (this.match(TokenType.IF)) {
        const cond = this.parseExpression();
        this.consume(TokenType.THEN, "Expected 'then' after 'otherwise if' condition.");
        this.skipNewlines();
        const body = this.parseBlock([TokenType.OTHERWISE, TokenType.END]);
        branches.push({ condition: cond, body });
      } else {
        // Plain otherwise block
        this.skipNewlines();
        otherwiseBody = this.parseBlock([TokenType.END]);
        break;
      }
    }

    this.consume(TokenType.END, "Expected 'end if' to close if statement.");
    this.consume(TokenType.IF, "Expected 'if' after 'end'.");

    return {
      kind: "IfStmt",
      branches,
      otherwiseBody,
      pos
    };
  }

  private parseRepeat(): RepeatStmt {
    const pos = this.pos();
    const countExpr = this.parseAdditive();
    this.consume(TokenType.TIMES, "Expected 'times' in 'repeat <count> times'.");
    this.skipNewlines();
    const body = this.parseBlock([TokenType.END]);
    this.consume(TokenType.END, "Expected 'end repeat' to close loop.");
    this.consume(TokenType.REPEAT, "Expected 'repeat' after 'end'.");
    return {
      kind: "RepeatStmt",
      countExpr,
      body,
      pos
    };
  }

  private parseWhile(): WhileStmt {
    const pos = this.pos();
    const condition = this.parseExpression();
    this.consume(TokenType.DO, "Expected 'do' after condition in while loop.");
    this.skipNewlines();
    const body = this.parseBlock([TokenType.END]);
    this.consume(TokenType.END, "Expected 'end while' to close loop.");
    this.consume(TokenType.WHILE, "Expected 'while' after 'end'.");
    return {
      kind: "WhileStmt",
      condition,
      body,
      pos
    };
  }

  private parseForEach(): ForEachStmt {
    const pos = this.pos();
    this.consume(TokenType.EACH, "Expected 'each' in 'for each <var> in <list> do'.");
    const itemToken = this.consume(TokenType.IDENTIFIER, "Expected item variable name.");
    this.consume(TokenType.IN, "Expected 'in' in 'for each <var> in <list> do'.");
    const listExpr = this.parseExpression();
    this.consume(TokenType.DO, "Expected 'do' after list expression in for loop.");
    this.skipNewlines();
    const body = this.parseBlock([TokenType.END]);
    this.consume(TokenType.END, "Expected 'end for' to close loop.");
    this.consume(TokenType.FOR, "Expected 'for' after 'end'.");
    return {
      kind: "ForEachStmt",
      itemVar: itemToken.value,
      listExpr,
      body,
      pos
    };
  }

  private parseCount(): CountStmt {
    const pos = this.pos();
    this.consume(TokenType.FROM, "Expected 'from' in 'count from <start> to <end> ...'.");
    const startExpr = this.parseExpression();
    this.consume(TokenType.TO, "Expected 'to' in 'count from <start> to <end> ...'.");
    const endExpr = this.parseExpression();

    let stepExpr: Expression | undefined = undefined;
    if (this.match(TokenType.BY)) {
      stepExpr = this.parseExpression();
    }

    this.consume(TokenType.AS, "Expected 'as' in 'count ... as <var> do'.");
    const varToken = this.consume(TokenType.IDENTIFIER, "Expected counter variable name.");
    this.consume(TokenType.DO, "Expected 'do' in 'count ... do'.");
    this.skipNewlines();

    const body = this.parseBlock([TokenType.END]);
    this.consume(TokenType.END, "Expected 'end count' to close loop.");
    this.consume(TokenType.COUNT, "Expected 'count' after 'end'.");

    return {
      kind: "CountStmt",
      varName: varToken.value,
      startExpr,
      endExpr,
      stepExpr,
      body,
      pos
    };
  }

  private parseFunctionDef(): FunctionDefStmt {
    const pos = this.pos();
    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected function name.");
    const params: string[] = [];

    if (this.match(TokenType.WITH)) {
      do {
        const paramToken = this.consume(TokenType.IDENTIFIER, "Expected parameter name.");
        params.push(paramToken.value);
      } while (this.match(TokenType.AND));
    }

    this.skipNewlines();
    const body = this.parseBlock([TokenType.END]);
    this.consume(TokenType.END, "Expected 'end function' to close definition.");
    this.consume(TokenType.FUNCTION, "Expected 'function' after 'end'.");

    return {
      kind: "FunctionDefStmt",
      name: nameToken.value,
      params,
      body,
      pos
    };
  }

  private parseReturn(): ReturnStmt {
    const pos = this.pos();
    if (this.isAtEndOfStatement()) {
      return { kind: "ReturnStmt", pos };
    }
    const value = this.parseExpression();
    return {
      kind: "ReturnStmt",
      value,
      pos
    };
  }

  private parseAppend(): AppendToListStmt | WriteFileStmt {
    const pos = this.pos();
    const itemExpr = this.parseExpression();
    this.consume(TokenType.TO, "Expected 'to' in 'append <item> to <list>' or 'append <data> to file <path>'.");

    if (this.match(TokenType.FILE)) {
      const pathExpr = this.parseExpression();
      return {
        kind: "WriteFileStmt",
        dataExpr: itemExpr,
        pathExpr,
        isAppend: true,
        pos
      };
    }

    const listToken = this.consume(TokenType.IDENTIFIER, "Expected list variable name.");
    return {
      kind: "AppendToListStmt",
      itemExpr,
      listVar: listToken.value,
      pos
    };
  }

  private parseRemove(): RemoveFromListStmt {
    const pos = this.pos();
    this.consume(TokenType.ITEM, "Expected 'item' in 'remove item at position <index> from <list>'.");
    this.consume(TokenType.AT, "Expected 'at' in 'remove item at position <index> from <list>'.");
    this.consume(TokenType.POSITION, "Expected 'position' in 'remove item at position <index> from <list>'.");
    const indexExpr = this.parseExpression();
    this.consume(TokenType.FROM, "Expected 'from' in 'remove item at position <index> from <list>'.");
    const listToken = this.consume(TokenType.IDENTIFIER, "Expected list variable name.");
    return {
      kind: "RemoveFromListStmt",
      indexExpr,
      listVar: listToken.value,
      pos
    };
  }

  private parseWriteFile(isAppend: boolean): WriteFileStmt {
    const pos = this.pos();
    const dataExpr = this.parseExpression();
    this.consume(TokenType.TO, "Expected 'to' in 'write <data> to file <path>'.");
    this.consume(TokenType.FILE, "Expected 'file' in 'write <data> to file <path>'.");
    const pathExpr = this.parseExpression();
    return {
      kind: "WriteFileStmt",
      dataExpr,
      pathExpr,
      isAppend,
      pos
    };
  }

  private parseReadFile(): ReadFileStmt {
    const pos = this.pos();
    this.consume(TokenType.FILE, "Expected 'file' in 'read file <path> into <variable>'.");
    const pathExpr = this.parseExpression();
    this.consume(TokenType.INTO, "Expected 'into' in 'read file <path> into <variable>'.");
    const targetToken = this.consume(TokenType.IDENTIFIER, "Expected variable name to store file content.");
    return {
      kind: "ReadFileStmt",
      pathExpr,
      targetVar: targetToken.value,
      pos
    };
  }

  private parseFetchUrl(): FetchUrlStmt {
    const pos = this.pos();
    this.consume(TokenType.URL, "Expected 'url' in 'fetch url <url> into <variable>'.");
    const urlExpr = this.parseExpression();

    let headersExpr: Expression | undefined = undefined;
    if (this.match(TokenType.WITH)) {
      this.consume(TokenType.HEADERS, "Expected 'headers' in 'fetch url <url> with headers <headers> into <var>'.");
      headersExpr = this.parseExpression();
    }

    this.consume(TokenType.INTO, "Expected 'into' in 'fetch url <url> into <variable>'.");
    const targetToken = this.consume(TokenType.IDENTIFIER, "Expected variable name to store response.");
    return {
      kind: "FetchUrlStmt",
      urlExpr,
      headersExpr,
      targetVar: targetToken.value,
      pos
    };
  }

  private parseWait(): WaitStmt {
    const pos = this.pos();
    const durationExpr = this.parseExpression();
    let isSeconds = false;
    if (this.match(TokenType.SECONDS)) {
      isSeconds = true;
    } else if (this.match(TokenType.MILLISECONDS)) {
      isSeconds = false;
    } else {
      throw new Error(`Expected 'milliseconds' or 'seconds' after wait duration at line ${this.peek().line}.`);
    }
    return {
      kind: "WaitStmt",
      durationExpr,
      isSeconds,
      pos
    };
  }

  private parseTryCatch(): TryCatchStmt {
    const pos = this.pos();
    this.skipNewlines();
    const tryBody = this.parseBlock([TokenType.OTHERWISE]);
    this.consume(TokenType.OTHERWISE, "Expected 'otherwise on error <var>' in try block.");
    this.consume(TokenType.ON, "Expected 'on' in 'otherwise on error <var>'.");
    this.consume(TokenType.ERROR, "Expected 'error' in 'otherwise on error <var>'.");
    const errToken = this.consume(TokenType.IDENTIFIER, "Expected error variable name.");
    this.skipNewlines();
    const catchBody = this.parseBlock([TokenType.END]);
    this.consume(TokenType.END, "Expected 'end try' to close try block.");
    this.consume(TokenType.TRY, "Expected 'try' after 'end'.");
    return {
      kind: "TryCatchStmt",
      tryBody,
      errorVar: errToken.value,
      catchBody,
      pos
    };
  }

  private parseStartServer(): Statement {
    const pos = this.pos();
    if (this.match(TokenType.HTTP)) {
      this.consume(TokenType.SERVER, "Expected 'server' after 'http'.");
      this.consume(TokenType.ON, "Expected 'on' after 'server'.");
      this.consume(TokenType.PORT, "Expected 'port' in 'start http server on port <port>'.");
      const portExpr = this.parseComparison();
      this.consume(TokenType.WITH, "Expected 'with' after port.");
      this.consume(TokenType.HANDLER, "Expected 'handler' in 'start http server on port <port> with handler <name>'.");
      const handlerToken = this.consume(TokenType.IDENTIFIER, "Expected handler function name.");
      return {
        kind: "StartHttpServerStmt",
        portExpr,
        handlerName: handlerToken.value,
        pos
      };
    }

    if (this.match(TokenType.WEBSOCKET)) {
      this.consume(TokenType.SERVER, "Expected 'server' after 'websocket'.");
      this.consume(TokenType.ON, "Expected 'on' after 'server'.");
      this.consume(TokenType.PORT, "Expected 'port' in 'start websocket server on port <port>'.");
      const portExpr = this.parseComparison();
      this.consume(TokenType.WITH, "Expected 'with' after port.");

      let onOpenFn: string | undefined;
      let onMessageFn: string | undefined;
      let onCloseFn: string | undefined;

      do {
        this.consume(TokenType.ON, "Expected 'on' before event name (e.g. 'on open', 'on message', 'on close').");
        if (this.match(TokenType.OPEN)) {
          const fn = this.consume(TokenType.IDENTIFIER, "Expected function name for open handler.");
          onOpenFn = fn.value;
        } else if (this.match(TokenType.MESSAGE)) {
          const fn = this.consume(TokenType.IDENTIFIER, "Expected function name for message handler.");
          onMessageFn = fn.value;
        } else if (this.match(TokenType.CLOSE)) {
          const fn = this.consume(TokenType.IDENTIFIER, "Expected function name for close handler.");
          onCloseFn = fn.value;
        } else {
          throw new Error(`Expected 'open', 'message', or 'close' after 'on' in websocket server definition.`);
        }
      } while (this.match(TokenType.AND));

      return {
        kind: "StartWebSocketServerStmt",
        portExpr,
        onOpenFn,
        onMessageFn,
        onCloseFn,
        pos
      };
    }

    if (this.match(TokenType.GRAPHQL)) {
      this.consume(TokenType.SERVER, "Expected 'server' after 'graphql'.");
      this.consume(TokenType.ON, "Expected 'on' after 'server'.");
      this.consume(TokenType.PORT, "Expected 'port' in 'start graphql server on port <port>'.");
      const portExpr = this.parseComparison();
      this.consume(TokenType.WITH, "Expected 'with' after port.");
      this.consume(TokenType.SCHEMA, "Expected 'schema' in 'start graphql server on port <port> with schema <schema> and resolvers <resolvers>'.");
      const schemaExpr = this.parseComparison();
      this.consume(TokenType.AND, "Expected 'and' before resolvers.");
      this.consume(TokenType.RESOLVERS, "Expected 'resolvers' in 'start graphql server ...'.");
      const resolversExpr = this.parseExpression();
      return {
        kind: "StartGraphqlServerStmt",
        portExpr,
        schemaExpr,
        resolversExpr,
        pos
      };
    }

    if (this.match(TokenType.MQTT)) {
      this.consume(TokenType.SERVER, "Expected 'server' after 'mqtt'.");
      this.consume(TokenType.ON, "Expected 'on' after 'server'.");
      this.consume(TokenType.PORT, "Expected 'port' in 'start mqtt server on port <port>'.");
      const portExpr = this.parseComparison();
      this.consume(TokenType.WITH, "Expected 'with' after port.");
      this.consume(TokenType.HANDLER, "Expected 'handler' in 'start mqtt server on port <port> with handler <name>'.");
      const handlerToken = this.consume(TokenType.IDENTIFIER, "Expected handler function name.");
      return {
        kind: "StartMqttServerStmt",
        portExpr,
        handlerName: handlerToken.value,
        pos
      };
    }

    throw new Error(`Expected 'http', 'websocket', 'graphql', or 'mqtt' after 'start'.`);
  }

  private parseSendSocketMessage(): SendSocketMessageStmt {
    const pos = this.pos();
    this.consume(TokenType.MESSAGE, "Expected 'message' in 'send message <msg> to socket <sock>'.");
    const messageExpr = this.parseComparison();
    this.consume(TokenType.TO, "Expected 'to' in 'send message <msg> to socket <sock>'.");
    this.consume(TokenType.SOCKET, "Expected 'socket' in 'send message <msg> to socket <sock>'.");
    const socketExpr = this.parseExpression();
    return {
      kind: "SendSocketMessageStmt",
      messageExpr,
      socketExpr,
      pos
    };
  }

  private parsePublishMqtt(): PublishMqttStmt {
    const pos = this.pos();
    this.consume(TokenType.MQTT, "Expected 'mqtt' in 'publish mqtt topic <topic> with payload <payload>'.");
    this.consume(TokenType.TOPIC, "Expected 'topic' in 'publish mqtt topic <topic> with payload <payload>'.");
    const topicExpr = this.parseComparison();
    this.consume(TokenType.WITH, "Expected 'with' in 'publish mqtt topic <topic> with payload <payload>'.");
    this.consume(TokenType.PAYLOAD, "Expected 'payload' in 'publish mqtt topic <topic> with payload <payload>'.");
    const payloadExpr = this.parseExpression();
    return {
      kind: "PublishMqttStmt",
      topicExpr,
      payloadExpr,
      pos
    };
  }

  private parseSwitch(): SwitchStmt {
    const pos = this.pos();
    const discriminant = this.parseExpression();
    this.skipNewlines();

    const cases: SwitchCase[] = [];

    while (this.match(TokenType.CASE)) {
      const test = this.parseExpression();
      this.skipNewlines();
      const body = this.parseBlock([TokenType.CASE, TokenType.OTHERWISE, TokenType.END]);
      cases.push({ test, body });
      this.skipNewlines();
    }

    // Optional default branch
    if (this.match(TokenType.OTHERWISE)) {
      this.skipNewlines();
      const body = this.parseBlock([TokenType.END]);
      cases.push({ body });
      this.skipNewlines();
    }

    this.consume(TokenType.END, "Expected 'end switch' to close switch statement.");
    this.match(TokenType.SWITCH);

    return {
      kind: "SwitchStmt",
      discriminant,
      cases,
      pos
    };
  }

  private parseClassDef(): ClassDefStmt {
    const pos = this.pos();
    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected class name after 'define class'.");

    let parentClass: string | undefined = undefined;
    if (this.match(TokenType.EXTENDS)) {
      const parentToken = this.consume(
        TokenType.IDENTIFIER,
        "Expected parent class name after 'extends'."
      );
      parentClass = parentToken.value;
    }

    this.skipNewlines();

    const fields: ClassField[] = [];
    const methods: ClassMethod[] = [];

    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.check(TokenType.END)) break;

      // field <name> [as <default>]
      if (this.match(TokenType.FIELD)) {
        const fieldToken = this.consume(TokenType.IDENTIFIER, "Expected field name after 'field'.");
        let defaultValue: Expression | undefined = undefined;
        if (this.match(TokenType.AS)) {
          defaultValue = this.parseExpression();
        }
        fields.push({ name: fieldToken.value, defaultValue });
        this.skipNewlines();
        continue;
      }

      // method <name> with <params> ... end method
      if (this.match(TokenType.METHOD)) {
        const methodToken = this.consume(TokenType.IDENTIFIER, "Expected method name after 'method'.");
        const params: string[] = [];
        if (this.match(TokenType.WITH)) {
          do {
            const paramToken = this.consume(
              TokenType.IDENTIFIER,
              "Expected parameter name in method definition."
            );
            params.push(paramToken.value);
          } while (this.match(TokenType.AND));
        }
        this.skipNewlines();
        const body = this.parseBlock([TokenType.END]);
        this.consume(TokenType.END, "Expected 'end method' to close method definition.");
        this.match(TokenType.METHOD);
        methods.push({ name: methodToken.value, params, body });
        this.skipNewlines();
        continue;
      }

      throw new Error(
        `Syntax Error at line ${this.peek().line}, column ${this.peek().column}: Expected 'field' or 'method' inside class definition.`
      );
    }

    this.consume(TokenType.END, "Expected 'end class' to close class definition.");
    this.match(TokenType.CLASS);

    return {
      kind: "ClassDefStmt",
      name: nameToken.value,
      parentClass,
      fields,
      methods,
      pos
    };
  }

  private parseImport(): ImportStmt {
    const pos = this.pos();

    // import <module> as <alias>
    // import <module> with <name> and <name>
    // import <module>
    const moduleToken = this.consume(TokenType.IDENTIFIER, "Expected module name after 'import'.");
    const module = moduleToken.value;

    let alias: string | undefined = undefined;
    let isNamespace = false;
    const names: string[] = [];

    if (this.match(TokenType.AS)) {
      const aliasToken = this.consume(TokenType.IDENTIFIER, "Expected alias name after 'as'.");
      alias = aliasToken.value;
      isNamespace = true;
    } else if (this.match(TokenType.WITH)) {
      do {
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expected member name in import list.");
        names.push(nameToken.value);
      } while (this.match(TokenType.AND));
    }

    return {
      kind: "ImportStmt",
      module,
      alias,
      isNamespace,
      names,
      pos
    };
  }

  private parseExport(): ExportStmt {
    const pos = this.pos();
    const names: string[] = [];

    // export <name> and <name>  /  export everything
    while (!this.isAtEndOfStatement()) {
      const token = this.peek();
      if (token.type !== TokenType.IDENTIFIER) break;
      names.push(token.value);
      this.advance();
      if (!this.match(TokenType.AND)) break;
    }

    return {
      kind: "ExportStmt",
      names,
      pos
    };
  }


  private parseBlock(stopTokens: TokenType[]): Statement[] {
    const statements: Statement[] = [];
    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (stopTokens.includes(this.peek().type)) {
        break;
      }
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
      this.skipNewlines();
    }
    return statements;
  }

  // --- Expression Parsers ---

  public parseExpression(): Expression {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): Expression {
    let expr = this.parseLogicalAnd();
    while (this.match(TokenType.OR)) {
      const right = this.parseLogicalAnd();
      expr = {
        kind: "BinaryExpr",
        left: expr,
        operator: "or",
        right,
        pos: expr.pos
      };
    }
    return expr;
  }

  private parseLogicalAnd(): Expression {
    let expr = this.parseComparison();
    while (this.match(TokenType.AND)) {
      const right = this.parseComparison();
      expr = {
        kind: "BinaryExpr",
        left: expr,
        operator: "and",
        right,
        pos: expr.pos
      };
    }
    return expr;
  }

  private parseComparison(): Expression {
    let expr = this.parseAdditive();

    while (true) {
      if (this.match(TokenType.IS)) {
        // is equal to, is not equal to, is greater than, is less than, is at least, is at most, is not
        if (this.match(TokenType.EQUAL)) {
          this.consume(TokenType.TO, "Expected 'to' in 'is equal to'.");
          const right = this.parseAdditive();
          expr = { kind: "BinaryExpr", left: expr, operator: "is equal to", right, pos: expr.pos };
        } else if (this.match(TokenType.NOT)) {
          if (this.match(TokenType.EQUAL)) {
            this.consume(TokenType.TO, "Expected 'to' in 'is not equal to'.");
          }
          const right = this.parseAdditive();
          expr = { kind: "BinaryExpr", left: expr, operator: "is not equal to", right, pos: expr.pos };
        } else if (this.match(TokenType.GREATER)) {
          this.consume(TokenType.THAN, "Expected 'than' in 'is greater than'.");
          if (this.match(TokenType.OR)) {
            this.consume(TokenType.EQUAL, "Expected 'equal' in 'is greater than or equal to'.");
            this.consume(TokenType.TO, "Expected 'to' in 'is greater than or equal to'.");
            const right = this.parseAdditive();
            expr = { kind: "BinaryExpr", left: expr, operator: "is at least", right, pos: expr.pos };
          } else {
            const right = this.parseAdditive();
            expr = { kind: "BinaryExpr", left: expr, operator: "is greater than", right, pos: expr.pos };
          }
        } else if (this.match(TokenType.LESS)) {
          this.consume(TokenType.THAN, "Expected 'than' in 'is less than'.");
          if (this.match(TokenType.OR)) {
            this.consume(TokenType.EQUAL, "Expected 'equal' in 'is less than or equal to'.");
            this.consume(TokenType.TO, "Expected 'to' in 'is less than or equal to'.");
            const right = this.parseAdditive();
            expr = { kind: "BinaryExpr", left: expr, operator: "is at most", right, pos: expr.pos };
          } else {
            const right = this.parseAdditive();
            expr = { kind: "BinaryExpr", left: expr, operator: "is less than", right, pos: expr.pos };
          }
        } else if (this.match(TokenType.AT)) {
          if (this.match(TokenType.LEAST)) {
            const right = this.parseAdditive();
            expr = { kind: "BinaryExpr", left: expr, operator: "is at least", right, pos: expr.pos };
          } else if (this.match(TokenType.MOST)) {
            const right = this.parseAdditive();
            expr = { kind: "BinaryExpr", left: expr, operator: "is at most", right, pos: expr.pos };
          } else {
            throw new Error(`Expected 'least' or 'most' after 'at' in comparison at line ${this.peek().line}`);
          }
        } else if (this.match(TokenType.LEAST)) {
          const right = this.parseAdditive();
          expr = { kind: "BinaryExpr", left: expr, operator: "is at least", right, pos: expr.pos };
        } else if (this.match(TokenType.MOST)) {
          const right = this.parseAdditive();
          expr = { kind: "BinaryExpr", left: expr, operator: "is at most", right, pos: expr.pos };
        } else {
          throw new Error(`Unexpected comparison phrase after 'is' at line ${this.peek().line}`);
        }
      } else if (this.match(TokenType.EQUALS)) {
        const right = this.parseAdditive();
        expr = { kind: "BinaryExpr", left: expr, operator: "is equal to", right, pos: expr.pos };
      } else if (this.match(TokenType.CONTAINS)) {
        const right = this.parseAdditive();
        expr = { kind: "BinaryExpr", left: expr, operator: "contains", right, pos: expr.pos };
      } else {
        break;
      }
    }

    return expr;
  }

  private parseAdditive(): Expression {
    let expr = this.parseMultiplicative();

    while (true) {
      if (this.match(TokenType.PLUS)) {
        const right = this.parseMultiplicative();
        expr = { kind: "BinaryExpr", left: expr, operator: "plus", right, pos: expr.pos };
      } else if (this.match(TokenType.MINUS)) {
        const right = this.parseMultiplicative();
        expr = { kind: "BinaryExpr", left: expr, operator: "minus", right, pos: expr.pos };
      } else if (this.match(TokenType.JOINED)) {
        this.consume(TokenType.WITH, "Expected 'with' in '<text> joined with <text>'.");
        const right = this.parseMultiplicative();
        expr = { kind: "BinaryExpr", left: expr, operator: "joined with", right, pos: expr.pos };
      } else {
        break;
      }
    }

    return expr;
  }

  private parseMultiplicative(): Expression {
    let expr = this.parseUnary();

    while (true) {
      if (this.check(TokenType.TIMES)) {
        if (
          this.checkAhead(1, TokenType.NEWLINE) ||
          this.checkAhead(1, TokenType.EOF) ||
          this.checkAhead(1, TokenType.DO)
        ) {
          break;
        }
        this.advance();
        const right = this.parseUnary();
        expr = { kind: "BinaryExpr", left: expr, operator: "times", right, pos: expr.pos };
      } else if (this.match(TokenType.MULTIPLIED)) {
        this.consume(TokenType.BY, "Expected 'by' in 'multiplied by'.");
        const right = this.parseUnary();
        expr = { kind: "BinaryExpr", left: expr, operator: "times", right, pos: expr.pos };
      } else if (this.match(TokenType.DIVIDED)) {
        this.consume(TokenType.BY, "Expected 'by' in 'divided by'.");
        const right = this.parseUnary();
        expr = { kind: "BinaryExpr", left: expr, operator: "divided by", right, pos: expr.pos };
      } else if (this.match(TokenType.MODULO)) {
        const right = this.parseUnary();
        expr = { kind: "BinaryExpr", left: expr, operator: "modulo", right, pos: expr.pos };
      } else {
        break;
      }
    }

    return expr;
  }

  private parseUnary(): Expression {
    const pos = this.pos();

    if (this.match(TokenType.PARSE)) {
      this.consume(TokenType.JSON, "Expected 'json' in 'parse json <expr>'.");
      const jsonExpr = this.parseUnary();
      return { kind: "ParseJsonExpr", jsonExpr, pos };
    }

    if (this.match(TokenType.NOT)) {
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "not", expr, pos };
    }

    if (this.match(TokenType.NEGATIVE)) {
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "negative", expr, pos };
    }

    if (this.match(TokenType.LENGTH)) {
      this.consume(TokenType.OF, "Expected 'of' in 'length of <expr>'.");
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "length of", expr, pos };
    }

    if (this.match(TokenType.UPPERCASE)) {
      this.consume(TokenType.OF, "Expected 'of' in 'uppercase of <expr>'.");
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "uppercase of", expr, pos };
    }

    if (this.match(TokenType.LOWERCASE)) {
      this.consume(TokenType.OF, "Expected 'of' in 'lowercase of <expr>'.");
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "lowercase of", expr, pos };
    }

    if (this.match(TokenType.TRIMMED)) {
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "trimmed", expr, pos };
    }

    if (this.match(TokenType.REVERSED)) {
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "reversed", expr, pos };
    }

    if (this.match(TokenType.SORTED)) {
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "sorted", expr, pos };
    }

    if (this.match(TokenType.KEYS)) {
      this.consume(TokenType.OF, "Expected 'of' in 'keys of <record>'.");
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "keys of", expr, pos };
    }

    if (this.match(TokenType.VALUES)) {
      this.consume(TokenType.OF, "Expected 'of' in 'values of <record>'.");
      const expr = this.parseUnary();
      return { kind: "UnaryExpr", operator: "values of", expr, pos };
    }

    // math square root of <expr>
    if (this.match(TokenType.MATH)) {
      if (this.match(TokenType.SQUARE)) {
        this.consume(TokenType.ROOT, "Expected 'root' in 'math square root of'.");
        this.consume(TokenType.OF, "Expected 'of' in 'math square root of'.");
        const expr = this.parseUnary();
        return { kind: "UnaryExpr", operator: "math square root of", expr, pos };
      }
      if (this.match(TokenType.ABSOLUTE)) {
        this.consume(TokenType.VALUE, "Expected 'value' in 'math absolute value of'.");
        this.consume(TokenType.OF, "Expected 'of' in 'math absolute value of'.");
        const expr = this.parseUnary();
        return { kind: "UnaryExpr", operator: "math absolute value of", expr, pos };
      }
      if (this.match(TokenType.FLOOR)) {
        this.consume(TokenType.OF, "Expected 'of' in 'math floor of'.");
        const expr = this.parseUnary();
        return { kind: "UnaryExpr", operator: "math floor of", expr, pos };
      }
      if (this.match(TokenType.CEIL)) {
        this.consume(TokenType.OF, "Expected 'of' in 'math ceil of'.");
        const expr = this.parseUnary();
        return { kind: "UnaryExpr", operator: "math ceil of", expr, pos };
      }
      if (this.match(TokenType.ROUND)) {
        this.consume(TokenType.OF, "Expected 'of' in 'math round of'.");
        const expr = this.parseUnary();
        return { kind: "UnaryExpr", operator: "math round of", expr, pos };
      }
      if (this.match(TokenType.POWER)) {
        this.consume(TokenType.OF, "Expected 'of' in 'math power of <base> to <exp>'.");
        const base = this.parseExpression();
        this.consume(TokenType.TO, "Expected 'to' in 'math power of <base> to <exp>'.");
        const exponent = this.parseExpression();
        return { kind: "MathPowerExpr", base, exponent, pos };
      }
    }

    // random number between <min> and <max>
    if (this.match(TokenType.RANDOM)) {
      if (!this.match(TokenType.NUMBER_WORD)) {
        if (this.check(TokenType.IDENTIFIER) && this.peek().value.toLowerCase() === "number") {
          this.advance();
        } else {
          throw new Error(`Expected 'number' in 'random number between <min> and <max>'.`);
        }
      }
      this.consume(TokenType.BETWEEN, "Expected 'between' in 'random number between <min> and <max>'.");
      const min = this.parseComparison();
      this.consume(TokenType.AND, "Expected 'and' in 'random number between <min> and <max>'.");
      const max = this.parseComparison();
      return { kind: "RandomBetweenExpr", min, max, pos };
    }

    // file exists <path>
    if (this.match(TokenType.FILE)) {
      this.consume(TokenType.EXISTS, "Expected 'exists' in 'file exists <path>'.");
      const pathExpr = this.parseUnary();
      return { kind: "FileExistsExpr", pathExpr, pos };
    }

    // current timestamp
    if (this.match(TokenType.CURRENT)) {
      this.consume(TokenType.TIMESTAMP, "Expected 'timestamp' in 'current timestamp'.");
      return { kind: "CurrentTimestampExpr", pos };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    const pos = this.pos();

    // Number
    if (this.match(TokenType.NUMBER)) {
      return {
        kind: "NumberLiteral",
        value: parseFloat(this.previous().value),
        pos
      };
    }

    // String
    if (this.match(TokenType.STRING)) {
      return {
        kind: "StringLiteral",
        value: this.previous().value,
        pos
      };
    }

    // Boolean
    if (this.match(TokenType.TRUE) || this.match(TokenType.YES)) {
      return { kind: "BooleanLiteral", value: true, pos };
    }
    if (this.match(TokenType.FALSE) || this.match(TokenType.NO)) {
      return { kind: "BooleanLiteral", value: false, pos };
    }

    // Nothing / None
    if (this.match(TokenType.NOTHING) || this.match(TokenType.NONE)) {
      return { kind: "NothingLiteral", pos };
    }

    // call <fn> with ...
    if (this.match(TokenType.CALL)) {
      return this.parseFunctionCallAfterCallToken();
    }

    // item at position <index> of <list>
    if (this.match(TokenType.ITEM)) {
      this.consume(TokenType.AT, "Expected 'at' in 'item at position <index> of <list>'.");
      this.consume(TokenType.POSITION, "Expected 'position' in 'item at position <index> of <list>'.");
      const indexExpr = this.parseExpression();
      this.consume(TokenType.OF, "Expected 'of' in 'item at position <index> of <list>'.");
      const listExpr = this.parseUnary();
      return {
        kind: "ListItemAccessExpr",
        listExpr,
        indexExpr,
        pos
      };
    }

    // first item of <list>
    if (this.match(TokenType.FIRST)) {
      this.consume(TokenType.ITEM, "Expected 'item' in 'first item of <list>'.");
      this.consume(TokenType.OF, "Expected 'of' in 'first item of <list>'.");
      const listExpr = this.parseUnary();
      return { kind: "FirstItemExpr", listExpr, pos };
    }

    // last item of <list>
    if (this.match(TokenType.LAST)) {
      this.consume(TokenType.ITEM, "Expected 'item' in 'last item of <list>'.");
      this.consume(TokenType.OF, "Expected 'of' in 'last item of <list>'.");
      const listExpr = this.parseUnary();
      return { kind: "LastItemExpr", listExpr, pos };
    }

    // value for key <key> in <record>
    if (this.match(TokenType.VALUE)) {
      this.consume(TokenType.FOR, "Expected 'for' in 'value for key <key> in <record>'.");
      this.consume(TokenType.KEY, "Expected 'key' in 'value for key <key> in <record>'.");
      const keyExpr = this.parseExpression();
      this.consume(TokenType.IN, "Expected 'in' in 'value for key <key> in <record>'.");
      const recordExpr = this.parseUnary();
      return { kind: "RecordAccessExpr", recordExpr, keyExpr, pos };
    }

    // get <key> from <record>
    if (this.match(TokenType.GET)) {
      const keyExpr = this.parseExpression();
      this.consume(TokenType.FROM, "Expected 'from' in 'get <key> from <record>'.");
      const recordExpr = this.parseUnary();
      return { kind: "RecordAccessExpr", recordExpr, keyExpr, pos };
    }

    // split <text> by <delim>
    if (this.match(TokenType.SPLIT)) {
      const stringExpr = this.parseExpression();
      this.consume(TokenType.BY, "Expected 'by' in 'split <text> by <delimiter>'.");
      const delimiterExpr = this.parseExpression();
      return { kind: "SplitExpr", stringExpr, delimiterExpr, pos };
    }

    // empty list / list containing ...
    if (this.match(TokenType.EMPTY)) {
      if (this.match(TokenType.LIST)) {
        return { kind: "ListLiteral", elements: [], pos };
      }
      if (this.match(TokenType.RECORD)) {
        return { kind: "RecordLiteral", entries: [], pos };
      }
      throw new Error(`Expected 'list' or 'record' after 'empty' at line ${this.peek().line}`);
    }

    if (this.match(TokenType.LIST)) {
      if (this.match(TokenType.CONTAINING)) {
        const elements: Expression[] = [];
        do {
          elements.push(this.parseComparison());
        } while (this.match(TokenType.AND) || this.match(TokenType.COMMA));
        return { kind: "ListLiteral", elements, pos };
      }
      if (this.match(TokenType.OF)) {
        const elements: Expression[] = [];
        do {
          elements.push(this.parseComparison());
        } while (this.match(TokenType.AND) || this.match(TokenType.COMMA));
        return { kind: "ListLiteral", elements, pos };
      }
      return { kind: "ListLiteral", elements: [], pos };
    }

    // record with key "a" as 1 and key "b" as 2
    if (this.match(TokenType.RECORD)) {
      this.consume(TokenType.WITH, "Expected 'with' in 'record with key <k> as <v>'.");
      const entries: { key: Expression; value: Expression }[] = [];

      do {
        this.consume(TokenType.KEY, "Expected 'key' in record entry.");
        const key = this.parseComparison();
        this.consume(TokenType.AS, "Expected 'as' after record key.");
        const value = this.parseComparison();
        entries.push({ key, value });
      } while (this.match(TokenType.AND) || this.match(TokenType.COMMA));

      return { kind: "RecordLiteral", entries, pos };
    }

    // Parentheses (expr)
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression.");
      return expr;
    }

    // Identifier or function call shorthand
    if (this.match(TokenType.IDENTIFIER)) {
      const idToken = this.previous();
      // Check if followed by "with" for function call
      if (
        this.check(TokenType.WITH) &&
        !this.checkAhead(1, TokenType.HEADERS) &&
        !this.checkAhead(1, TokenType.KEY)
      ) {
        this.advance();
        const args: Expression[] = [];
        do {
          args.push(this.parseComparison());
        } while (this.match(TokenType.AND));
        return {
          kind: "FunctionCallExpr",
          callee: idToken.value,
          args,
          pos
        };
      }
      return {
        kind: "IdentifierExpr",
        name: idToken.value,
        pos
      };
    }

    throw new Error(
      `Syntax Error at line ${this.peek().line}, column ${this.peek().column}: Unexpected token '${this.peek().value}' (${this.peek().type}).`
    );
  }

  private parseFunctionCallAfterCallToken(): Expression {
    const pos = this.pos();
    const calleeToken = this.consume(TokenType.IDENTIFIER, "Expected function name after 'call'.");
    const args: Expression[] = [];

    if (this.match(TokenType.WITH)) {
      do {
        args.push(this.parseComparison());
      } while (this.match(TokenType.AND));
    }

    return {
      kind: "FunctionCallExpr",
      callee: calleeToken.value,
      args,
      pos
    };
  }

  // --- Helper Methods ---

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkAhead(offset: number, type: TokenType): boolean {
    const idx = this.current + offset;
    if (idx >= this.tokens.length) return false;
    return this.tokens[idx].type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, errorMessage: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(`Syntax Error at line ${token.line}, column ${token.column}: ${errorMessage} (got '${token.value}')`);
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  private isAtEndOfStatement(): boolean {
    return this.check(TokenType.NEWLINE) || this.check(TokenType.EOF);
  }

  private pos(): Position {
    const token = this.previous() ?? this.peek();
    return { line: token.line, column: token.column };
  }
}
