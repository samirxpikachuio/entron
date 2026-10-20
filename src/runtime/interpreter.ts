import {
  Program,
  Statement,
  Expression,
  BinaryExpr,
  UnaryExpr,
  FunctionCallExpr,
  IfStmt,
  WhileStmt,
  ForEachStmt,
  CountStmt,
  RepeatStmt
} from "../parser/ast";
import {
  RuntimeValue,
  MK_NUMBER,
  MK_STRING,
  MK_BOOLEAN,
  MK_NOTHING,
  MK_LIST,
  MK_RECORD,
  formatValue,
  FunctionValue
} from "./values";
import { Environment } from "./environment";
import * as fs from "node:fs";
import * as readline from "node:readline";
import * as net from "node:net";

class ReturnSignal {
  constructor(public value: RuntimeValue) {}
}

class BreakSignal {}
class ContinueSignal {}

export class Interpreter {
  private globalEnv: Environment;
  private activeSockets: Map<string, any> = new Map();
  private activeMqttClients: Set<net.Socket> = new Set();

  constructor(globalEnv?: Environment) {
    this.globalEnv = globalEnv ?? Environment.createGlobal();
  }

  public async run(program: Program): Promise<RuntimeValue> {
    let lastEvaluated: RuntimeValue = MK_NOTHING();

    for (const statement of program.body) {
      lastEvaluated = await this.executeStatement(statement, this.globalEnv);
    }

    return lastEvaluated;
  }

  public async executeStatement(stmt: Statement, env: Environment): Promise<RuntimeValue> {
    switch (stmt.kind) {
      case "VariableDeclarationStmt": {
        const val = await this.evaluateExpression(stmt.initializer, env);
        env.declare(stmt.name, val);
        return val;
      }

      case "AssignmentStmt": {
        const val = await this.evaluateExpression(stmt.value, env);
        env.assign(stmt.name, val);
        return val;
      }

      case "ChangeVariableStmt": {
        const current = env.lookup(stmt.name);
        const amount = await this.evaluateExpression(stmt.amount, env);
        if (current.type !== "number" || amount.type !== "number") {
          throw new Error(
            `Runtime Error at line ${stmt.pos.line}: Cannot change non-number variable '${stmt.name}'.`
          );
        }
        const newVal = stmt.isSubtraction
          ? current.value - amount.value
          : current.value + amount.value;
        const res = MK_NUMBER(newVal);
        env.assign(stmt.name, res);
        return res;
      }

      case "DisplayStmt": {
        const val = await this.evaluateExpression(stmt.expr, env);
        console.log(formatValue(val));
        return val;
      }

      case "AskStmt": {
        const promptVal = await this.evaluateExpression(stmt.prompt, env);
        const promptText = formatValue(promptVal);
        const userInput = await this.promptUser(promptText);
        // Try parsing as number if clean number
        let storedVal: RuntimeValue;
        if (/^-?\d+(\.\d+)?$/.test(userInput.trim())) {
          storedVal = MK_NUMBER(parseFloat(userInput.trim()));
        } else {
          storedVal = MK_STRING(userInput);
        }
        env.assign(stmt.targetVar, storedVal);
        return storedVal;
      }

      case "IfStmt": {
        for (const branch of stmt.branches) {
          const cond = await this.evaluateExpression(branch.condition, env);
          if (this.isTruthy(cond)) {
            const scope = new Environment(env);
            for (const s of branch.body) {
              await this.executeStatement(s, scope);
            }
            return MK_NOTHING();
          }
        }
        if (stmt.otherwiseBody) {
          const scope = new Environment(env);
          for (const s of stmt.otherwiseBody) {
            await this.executeStatement(s, scope);
          }
        }
        return MK_NOTHING();
      }

      case "RepeatStmt": {
        const countVal = await this.evaluateExpression(stmt.countExpr, env);
        if (countVal.type !== "number") {
          throw new Error(`Runtime Error at line ${stmt.pos.line}: Repeat count must be a number.`);
        }
        const times = Math.floor(countVal.value);
        for (let i = 0; i < times; i++) {
          const scope = new Environment(env);
          try {
            for (const s of stmt.body) {
              await this.executeStatement(s, scope);
            }
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (e instanceof ContinueSignal) continue;
            throw e;
          }
        }
        return MK_NOTHING();
      }

      case "WhileStmt": {
        while (this.isTruthy(await this.evaluateExpression(stmt.condition, env))) {
          const scope = new Environment(env);
          try {
            for (const s of stmt.body) {
              await this.executeStatement(s, scope);
            }
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (e instanceof ContinueSignal) continue;
            throw e;
          }
        }
        return MK_NOTHING();
      }

      case "ForEachStmt": {
        const listVal = await this.evaluateExpression(stmt.listExpr, env);
        if (listVal.type !== "list") {
          throw new Error(`Runtime Error at line ${stmt.pos.line}: 'for each' expects a list.`);
        }
        for (const item of listVal.value) {
          const scope = new Environment(env);
          scope.declare(stmt.itemVar, item);
          try {
            for (const s of stmt.body) {
              await this.executeStatement(s, scope);
            }
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (e instanceof ContinueSignal) continue;
            throw e;
          }
        }
        return MK_NOTHING();
      }

      case "CountStmt": {
        const startVal = await this.evaluateExpression(stmt.startExpr, env);
        const endVal = await this.evaluateExpression(stmt.endExpr, env);
        let step = 1;
        if (stmt.stepExpr) {
          const stepVal = await this.evaluateExpression(stmt.stepExpr, env);
          if (stepVal.type === "number") step = stepVal.value;
        }

        if (startVal.type !== "number" || endVal.type !== "number") {
          throw new Error(`Runtime Error at line ${stmt.pos.line}: 'count' bounds must be numbers.`);
        }

        const start = startVal.value;
        const end = endVal.value;

        if (step > 0) {
          for (let i = start; i <= end; i += step) {
            const scope = new Environment(env);
            scope.declare(stmt.varName, MK_NUMBER(i));
            try {
              for (const s of stmt.body) {
                await this.executeStatement(s, scope);
              }
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) continue;
              throw e;
            }
          }
        } else if (step < 0) {
          for (let i = start; i >= end; i += step) {
            const scope = new Environment(env);
            scope.declare(stmt.varName, MK_NUMBER(i));
            try {
              for (const s of stmt.body) {
                await this.executeStatement(s, scope);
              }
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) continue;
              throw e;
            }
          }
        }
        return MK_NOTHING();
      }

      case "BreakStmt":
        throw new BreakSignal();

      case "ContinueStmt":
        throw new ContinueSignal();

      case "FunctionDefStmt": {
        const fn: FunctionValue = {
          type: "function",
          name: stmt.name,
          params: stmt.params,
          body: stmt.body,
          closure: env
        };
        env.declare(stmt.name, fn);
        return fn;
      }

      case "ReturnStmt": {
        const val = stmt.value ? await this.evaluateExpression(stmt.value, env) : MK_NOTHING();
        throw new ReturnSignal(val);
      }

      case "ExpressionStmt":
        return await this.evaluateExpression(stmt.expr, env);

      case "AppendToListStmt": {
        const itemVal = await this.evaluateExpression(stmt.itemExpr, env);
        const listVal = env.lookup(stmt.listVar);
        if (listVal.type !== "list") {
          throw new Error(`Runtime Error at line ${stmt.pos.line}: Variable '${stmt.listVar}' is not a list.`);
        }
        listVal.value.push(itemVal);
        return listVal;
      }

      case "RemoveFromListStmt": {
        const idxVal = await this.evaluateExpression(stmt.indexExpr, env);
        if (idxVal.type !== "number") {
          throw new Error(`Runtime Error: List index must be a number.`);
        }
        const listVal = env.lookup(stmt.listVar);
        if (listVal.type !== "list") {
          throw new Error(`Runtime Error: Variable '${stmt.listVar}' is not a list.`);
        }
        // Entron uses 1-based indexing in plain English, with support for 0-based
        const posIndex = idxVal.value > 0 ? Math.floor(idxVal.value) - 1 : 0;
        if (posIndex >= 0 && posIndex < listVal.value.length) {
          listVal.value.splice(posIndex, 1);
        }
        return listVal;
      }

      case "SetRecordKeyStmt": {
        const keyVal = await this.evaluateExpression(stmt.keyExpr, env);
        const val = await this.evaluateExpression(stmt.valueExpr, env);
        const recVal = env.lookup(stmt.recordVar);
        if (recVal.type !== "record") {
          throw new Error(`Runtime Error: Variable '${stmt.recordVar}' is not a record.`);
        }
        recVal.value.set(formatValue(keyVal), val);
        return val;
      }

      case "WriteFileStmt": {
        const dataVal = await this.evaluateExpression(stmt.dataExpr, env);
        const pathVal = await this.evaluateExpression(stmt.pathExpr, env);
        const text = formatValue(dataVal);
        const filePath = formatValue(pathVal);

        if (stmt.isAppend) {
          fs.appendFileSync(filePath, text + "\n", "utf-8");
        } else {
          fs.writeFileSync(filePath, text + "\n", "utf-8");
        }
        return MK_NOTHING();
      }

      case "ReadFileStmt": {
        const pathVal = await this.evaluateExpression(stmt.pathExpr, env);
        const filePath = formatValue(pathVal);
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: '${filePath}'`);
        }
        const content = fs.readFileSync(filePath, "utf-8");
        const res = MK_STRING(content);
        env.assign(stmt.targetVar, res);
        return res;
      }

      case "FetchUrlStmt": {
        const urlVal = await this.evaluateExpression(stmt.urlExpr, env);
        const urlStr = formatValue(urlVal);

        const init: RequestInit = {
          method: "GET"
        };

        if (stmt.headersExpr) {
          const headersVal = await this.evaluateExpression(stmt.headersExpr, env);
          const headersObj: Record<string, string> = {};
          if (headersVal.type === "record") {
            for (const [k, v] of headersVal.value.entries()) {
              headersObj[k] = formatValue(v);
            }
          }
          init.headers = headersObj;
        }

        const resp = await fetch(urlStr, init);
        const text = await resp.text();
        const res = MK_STRING(text);
        env.assign(stmt.targetVar, res);
        return res;
      }

      case "WaitStmt": {
        const durVal = await this.evaluateExpression(stmt.durationExpr, env);
        if (durVal.type !== "number") {
          throw new Error(`Wait duration must be a number.`);
        }
        const ms = stmt.isSeconds ? durVal.value * 1000 : durVal.value;
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
        return MK_NOTHING();
      }

      case "TryCatchStmt": {
        const tryScope = new Environment(env);
        try {
          for (const s of stmt.tryBody) {
            await this.executeStatement(s, tryScope);
          }
        } catch (e: any) {
          // If return/break/continue signals, rethrow
          if (e instanceof ReturnSignal || e instanceof BreakSignal || e instanceof ContinueSignal) {
            throw e;
          }
          const catchScope = new Environment(env);
          catchScope.declare(stmt.errorVar, MK_STRING(e?.message ?? String(e)));
          for (const s of stmt.catchBody) {
            await this.executeStatement(s, catchScope);
          }
        }
        return MK_NOTHING();
      }

      case "StartHttpServerStmt": {
        const portVal = await this.evaluateExpression(stmt.portExpr, env);
        if (portVal.type !== "number") throw new Error("HTTP server port must be a number.");
        const port = Math.floor(portVal.value);
        const self = this;

        const server = Bun.serve({
          port,
          async fetch(req) {
            const url = new URL(req.url);
            const bodyText = await req.text();
            const reqMap = new Map<string, RuntimeValue>();
            reqMap.set("path", MK_STRING(url.pathname));
            reqMap.set("method", MK_STRING(req.method));
            reqMap.set("query", MK_STRING(url.search));
            reqMap.set("body", MK_STRING(bodyText));

            const reqVal = MK_RECORD(reqMap);
            try {
              const resVal = await self.callFunctionByName(stmt.handlerName, [reqVal], env);
              if (resVal.type === "record") {
                const statusVal = resVal.value.get("status");
                const bodyVal = resVal.value.get("body");
                const typeVal = resVal.value.get("type");

                const status = statusVal && statusVal.type === "number" ? statusVal.value : 200;
                const contentType = typeVal ? formatValue(typeVal) : "text/plain; charset=utf-8";
                const bodyStr = bodyVal ? formatValue(bodyVal) : "";

                return new Response(bodyStr, {
                  status,
                  headers: { "Content-Type": contentType }
                });
              }
              return new Response(formatValue(resVal), {
                status: 200,
                headers: { "Content-Type": "text/plain; charset=utf-8" }
              });
            } catch (err: any) {
              return new Response(`500 Internal Server Error: ${err?.message ?? err}`, { status: 500 });
            }
          }
        });

        console.log(`⚡ [Entron HTTP Server] Running at http://localhost:${server.port}`);
        return MK_RECORD(new Map([
          ["port", MK_NUMBER(server.port)],
          ["type", MK_STRING("http")]
        ]));
      }

      case "StartWebSocketServerStmt": {
        const portVal = await this.evaluateExpression(stmt.portExpr, env);
        if (portVal.type !== "number") throw new Error("WebSocket server port must be a number.");
        const port = Math.floor(portVal.value);
        const self = this;

        let nextId = 1;
        const server = Bun.serve({
          port,
          fetch(req, srv) {
            const url = new URL(req.url);
            if (srv.upgrade(req, { data: { id: "client_" + (nextId++) } })) {
              return;
            }
            return new Response("Entron WebSocket Server Active. Connect via ws://", { status: 200 });
          },
          websocket: {
            async open(ws) {
              const id = (ws.data as any)?.id ?? "client_" + (nextId++);
              self.activeSockets.set(id, ws);
              if (stmt.onOpenFn) {
                await self.callFunctionByName(stmt.onOpenFn, [MK_STRING(id)], env);
              }
            },
            async message(ws, msg) {
              const id = (ws.data as any)?.id ?? "unknown";
              if (stmt.onMessageFn) {
                await self.callFunctionByName(stmt.onMessageFn, [MK_STRING(id), MK_STRING(String(msg))], env);
              }
            },
            async close(ws) {
              const id = (ws.data as any)?.id;
              if (id) self.activeSockets.delete(id);
              if (stmt.onCloseFn) {
                await self.callFunctionByName(stmt.onCloseFn, [MK_STRING(id ?? "")], env);
              }
            }
          }
        });

        console.log(`⚡ [Entron WebSocket Server] Running at ws://localhost:${server.port}`);
        return MK_RECORD(new Map([
          ["port", MK_NUMBER(server.port)],
          ["type", MK_STRING("websocket")]
        ]));
      }

      case "SendSocketMessageStmt": {
        const msgVal = await this.evaluateExpression(stmt.messageExpr, env);
        const sockVal = await this.evaluateExpression(stmt.socketExpr, env);
        const sockId = formatValue(sockVal);
        const ws = this.activeSockets.get(sockId);
        if (ws) {
          ws.send(formatValue(msgVal));
        } else {
          // If socket id not found or broadcast, broadcast to all active sockets
          if (sockId === "all" || sockId === "broadcast") {
            for (const client of this.activeSockets.values()) {
              client.send(formatValue(msgVal));
            }
          }
        }
        return MK_NOTHING();
      }

      case "StartGraphqlServerStmt": {
        const portVal = await this.evaluateExpression(stmt.portExpr, env);
        const schemaVal = await this.evaluateExpression(stmt.schemaExpr, env);
        const resolversVal = await this.evaluateExpression(stmt.resolversExpr, env);
        if (portVal.type !== "number") throw new Error("GraphQL server port must be a number.");
        const port = Math.floor(portVal.value);
        const self = this;

        const server = Bun.serve({
          port,
          async fetch(req) {
            const url = new URL(req.url);
            // If browser visits GET / or /graphql without query, serve interactive GraphQL explorer!
            if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/graphql") && !url.searchParams.has("query")) {
              const html = `<!DOCTYPE html>
<html>
<head><title>Entron GraphQL Explorer</title>
<style>
  body { background: #0f172a; color: #f8fafc; font-family: monospace; padding: 2rem; }
  h1 { color: #38bdf8; }
  textarea { width: 100%; height: 120px; background: #1e293b; color: #a5f3fc; border: 1px solid #475569; padding: 10px; border-radius: 6px; font-family: monospace; }
  button { margin-top: 10px; background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
  pre { background: #1e293b; padding: 1rem; border-radius: 6px; color: #4ade80; }
</style>
</head>
<body>
  <h1>⚡ Entron GraphQL Explorer</h1>
  <p><strong>Active Schema:</strong> ${formatValue(schemaVal)}</p>
  <textarea id="q">{ hello }</textarea><br>
  <button onclick="run()">Execute GraphQL Query</button>
  <h3>Response:</h3>
  <pre id="out">Output will appear here...</pre>
  <script>
    async function run() {
      const q = document.getElementById('q').value;
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      document.getElementById('out').innerText = JSON.stringify(await res.json(), null, 2);
    }
  </script>
</body>
</html>`;
              return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
            }

            let query = "";
            if (req.method === "POST") {
              const body = await req.json().catch(() => ({}));
              query = body.query || "";
            } else {
              query = url.searchParams.get("query") || "";
            }

            // Execute GraphQL fields against resolvers
            const data: Record<string, any> = {};
            if (resolversVal.type === "record") {
              const cleanQ = query.replace(/[{}()]/g, " ").trim();
              const tokens = cleanQ.split(/\s+/).filter(Boolean);
              for (const tok of tokens) {
                if (resolversVal.value.has(tok)) {
                  const resItem = resolversVal.value.get(tok)!;
                  if (resItem.type === "function") {
                    const callRes = await self.callFunctionByName(resItem.name, [], env);
                    data[tok] = formatValue(callRes);
                  } else {
                    data[tok] = resItem.type === "number" ? resItem.value : resItem.type === "boolean" ? resItem.value : formatValue(resItem);
                  }
                }
              }
            }

            return new Response(JSON.stringify({ data }), {
              headers: { "Content-Type": "application/json; charset=utf-8" }
            });
          }
        });

        console.log(`⚡ [Entron GraphQL Server] Running at http://localhost:${server.port}/graphql`);
        return MK_RECORD(new Map([
          ["port", MK_NUMBER(server.port)],
          ["type", MK_STRING("graphql")]
        ]));
      }

      case "StartMqttServerStmt": {
        const portVal = await this.evaluateExpression(stmt.portExpr, env);
        if (portVal.type !== "number") throw new Error("MQTT server port must be a number.");
        const port = Math.floor(portVal.value);
        const self = this;

        const server = net.createServer((socket) => {
          self.activeMqttClients.add(socket);

          socket.on("data", async (data) => {
            if (data.length === 0) return;
            const packetType = data[0] >> 4;

            // MQTT CONNECT (1) -> CONNACK [0x20, 0x02, 0x00, 0x00]
            if (packetType === 1) {
              socket.write(Buffer.from([0x20, 0x02, 0x00, 0x00]));
              return;
            }

            // MQTT PINGREQ (12) -> PINGRESP [0xD0, 0x00]
            if (packetType === 12) {
              socket.write(Buffer.from([0xD0, 0x00]));
              return;
            }

            // MQTT SUBSCRIBE (8) -> SUBACK
            if (packetType === 8) {
              const packetId1 = data.length > 2 ? data[2] : 0x00;
              const packetId2 = data.length > 3 ? data[3] : 0x01;
              socket.write(Buffer.from([0x90, 0x03, packetId1, packetId2, 0x00]));
              return;
            }

            // MQTT PUBLISH (3)
            if (packetType === 3) {
              try {
                const topicLen = (data[2] << 8) | data[3];
                const topic = data.subarray(4, 4 + topicLen).toString("utf-8");
                const payload = data.subarray(4 + topicLen).toString("utf-8");

                await self.callFunctionByName(stmt.handlerName, [MK_STRING(topic), MK_STRING(payload)], env);

                // Broadcast to all other MQTT clients
                for (const client of self.activeMqttClients) {
                  if (client !== socket && !client.destroyed) {
                    client.write(data);
                  }
                }
              } catch (e) {
                // Ignore raw packet error
              }
            }
          });

          socket.on("close", () => {
            self.activeMqttClients.delete(socket);
          });

          socket.on("error", () => {
            self.activeMqttClients.delete(socket);
          });
        });

        server.listen(port, () => {
          console.log(`⚡ [Entron MQTT Broker] Running at mqtt://localhost:${port}`);
        });

        return MK_RECORD(new Map([
          ["port", MK_NUMBER(port)],
          ["type", MK_STRING("mqtt")]
        ]));
      }

      case "PublishMqttStmt": {
        const topicVal = await this.evaluateExpression(stmt.topicExpr, env);
        const payloadVal = await this.evaluateExpression(stmt.payloadExpr, env);
        const topicStr = formatValue(topicVal);
        const payloadStr = formatValue(payloadVal);

        const topicBuf = Buffer.from(topicStr, "utf-8");
        const payloadBuf = Buffer.from(payloadStr, "utf-8");
        const remainingLength = 2 + topicBuf.length + payloadBuf.length;

        const packet = Buffer.concat([
          Buffer.from([0x30, remainingLength]),
          Buffer.from([(topicBuf.length >> 8) & 0xff, topicBuf.length & 0xff]),
          topicBuf,
          payloadBuf
        ]);

        for (const client of this.activeMqttClients) {
          if (!client.destroyed) {
            client.write(packet);
          }
        }
        return MK_NOTHING();
      }
    }
  }

  public async callFunctionByName(name: string, args: RuntimeValue[], env: Environment): Promise<RuntimeValue> {
    const fn = env.lookup(name);
    if (fn.type === "function") {
      const fnScope = new Environment(fn.closure);
      for (let i = 0; i < fn.params.length; i++) {
        const param = fn.params[i];
        const argVal = i < args.length ? args[i] : MK_NOTHING();
        fnScope.declare(param, argVal);
      }
      try {
        for (const s of fn.body) {
          await this.executeStatement(s, fnScope);
        }
      } catch (e) {
        if (e instanceof ReturnSignal) {
          return e.value;
        }
        throw e;
      }
      return MK_NOTHING();
    }
    if (fn.type === "builtin") {
      return await fn.call(args, env);
    }
    throw new Error(`'${name}' is not a callable function.`);
  }

  // --- Expression Evaluator ---

  public async evaluateExpression(expr: Expression, env: Environment): Promise<RuntimeValue> {
    switch (expr.kind) {
      case "NumberLiteral":
        return MK_NUMBER(expr.value);

      case "StringLiteral":
        return MK_STRING(expr.value);

      case "BooleanLiteral":
        return MK_BOOLEAN(expr.value);

      case "NothingLiteral":
        return MK_NOTHING();

      case "IdentifierExpr":
        return env.lookup(expr.name);

      case "BinaryExpr": {
        const left = await this.evaluateExpression(expr.left, env);
        // Short-circuit for 'and' & 'or'
        if (expr.operator === "and") {
          if (!this.isTruthy(left)) return MK_BOOLEAN(false);
          const right = await this.evaluateExpression(expr.right, env);
          return MK_BOOLEAN(this.isTruthy(right));
        }
        if (expr.operator === "or") {
          if (this.isTruthy(left)) return MK_BOOLEAN(true);
          const right = await this.evaluateExpression(expr.right, env);
          return MK_BOOLEAN(this.isTruthy(right));
        }

        const right = await this.evaluateExpression(expr.right, env);
        return this.evaluateBinaryOp(left, expr.operator, right, expr.pos.line);
      }

      case "UnaryExpr": {
        const operand = await this.evaluateExpression(expr.expr, env);
        return this.evaluateUnaryOp(expr.operator, operand, expr.pos.line);
      }

      case "ListLiteral": {
        const elements: RuntimeValue[] = [];
        for (const el of expr.elements) {
          elements.push(await this.evaluateExpression(el, env));
        }
        return MK_LIST(elements);
      }

      case "RecordLiteral": {
        const map = new Map<string, RuntimeValue>();
        for (const entry of expr.entries) {
          const keyVal = await this.evaluateExpression(entry.key, env);
          const valVal = await this.evaluateExpression(entry.value, env);
          map.set(formatValue(keyVal), valVal);
        }
        return MK_RECORD(map);
      }

      case "FunctionCallExpr": {
        const fn = env.lookup(expr.callee);
        const args: RuntimeValue[] = [];
        for (const arg of expr.args) {
          args.push(await this.evaluateExpression(arg, env));
        }

        if (fn.type === "builtin") {
          return await fn.call(args, env);
        }

        if (fn.type === "function") {
          const fnScope = new Environment(fn.closure);
          // Bind arguments to parameters
          for (let i = 0; i < fn.params.length; i++) {
            const param = fn.params[i];
            const argVal = i < args.length ? args[i] : MK_NOTHING();
            fnScope.declare(param, argVal);
          }
          try {
            for (const s of fn.body) {
              await this.executeStatement(s, fnScope);
            }
          } catch (e) {
            if (e instanceof ReturnSignal) {
              return e.value;
            }
            throw e;
          }
          return MK_NOTHING();
        }

        throw new Error(`Runtime Error: '${expr.callee}' is not a callable function.`);
      }

      case "ListItemAccessExpr": {
        const listVal = await this.evaluateExpression(expr.listExpr, env);
        const idxVal = await this.evaluateExpression(expr.indexExpr, env);
        if (listVal.type === "list" && idxVal.type === "number") {
          // 1-based natural English index
          const idx = idxVal.value > 0 ? Math.floor(idxVal.value) - 1 : 0;
          if (idx >= 0 && idx < listVal.value.length) {
            return listVal.value[idx];
          }
          return MK_NOTHING();
        }
        if (listVal.type === "string" && idxVal.type === "number") {
          const idx = idxVal.value > 0 ? Math.floor(idxVal.value) - 1 : 0;
          if (idx >= 0 && idx < listVal.value.length) {
            return MK_STRING(listVal.value[idx]);
          }
          return MK_NOTHING();
        }
        throw new Error(`Cannot access item at position from non-list/string.`);
      }

      case "FirstItemExpr": {
        const listVal = await this.evaluateExpression(expr.listExpr, env);
        if (listVal.type === "list") {
          return listVal.value.length > 0 ? listVal.value[0] : MK_NOTHING();
        }
        if (listVal.type === "string") {
          return listVal.value.length > 0 ? MK_STRING(listVal.value[0]) : MK_NOTHING();
        }
        throw new Error(`Cannot get first item of non-list.`);
      }

      case "LastItemExpr": {
        const listVal = await this.evaluateExpression(expr.listExpr, env);
        if (listVal.type === "list") {
          return listVal.value.length > 0 ? listVal.value[listVal.value.length - 1] : MK_NOTHING();
        }
        if (listVal.type === "string") {
          return listVal.value.length > 0 ? MK_STRING(listVal.value[listVal.value.length - 1]) : MK_NOTHING();
        }
        throw new Error(`Cannot get last item of non-list.`);
      }

      case "RecordAccessExpr": {
        const recVal = await this.evaluateExpression(expr.recordExpr, env);
        const keyVal = await this.evaluateExpression(expr.keyExpr, env);
        if (recVal.type === "record") {
          const keyStr = formatValue(keyVal);
          return recVal.value.get(keyStr) ?? MK_NOTHING();
        }
        throw new Error(`Cannot get key from non-record.`);
      }

      case "SplitExpr": {
        const strVal = await this.evaluateExpression(expr.stringExpr, env);
        const delimVal = await this.evaluateExpression(expr.delimiterExpr, env);
        const fullStr = formatValue(strVal);
        const delim = formatValue(delimVal);
        const parts = fullStr.split(delim).map((s) => MK_STRING(s));
        return MK_LIST(parts);
      }

      case "MathPowerExpr": {
        const b = await this.evaluateExpression(expr.base, env);
        const e = await this.evaluateExpression(expr.exponent, env);
        if (b.type === "number" && e.type === "number") {
          return MK_NUMBER(Math.pow(b.value, e.value));
        }
        throw new Error(`Power base and exponent must be numbers.`);
      }

      case "RandomBetweenExpr": {
        const minVal = await this.evaluateExpression(expr.min, env);
        const maxVal = await this.evaluateExpression(expr.max, env);
        if (minVal.type === "number" && maxVal.type === "number") {
          const min = Math.ceil(minVal.value);
          const max = Math.floor(maxVal.value);
          const rand = Math.floor(Math.random() * (max - min + 1)) + min;
          return MK_NUMBER(rand);
        }
        throw new Error(`Random bounds must be numbers.`);
      }

      case "FileExistsExpr": {
        const pathVal = await this.evaluateExpression(expr.pathExpr, env);
        return MK_BOOLEAN(fs.existsSync(formatValue(pathVal)));
      }

      case "CurrentTimestampExpr":
        return MK_NUMBER(Date.now());

      case "ParseJsonExpr": {
        const strVal = await this.evaluateExpression(expr.jsonExpr, env);
        const jsonStr = formatValue(strVal);
        try {
          const parsed = JSON.parse(jsonStr);
          return this.convertJsToEntronValue(parsed);
        } catch (e: any) {
          throw new Error(`Failed to parse JSON: ${e?.message ?? e}`);
        }
      }
    }
  }

  private convertJsToEntronValue(val: any): RuntimeValue {
    if (val === null || val === undefined) {
      return MK_NOTHING();
    }
    if (typeof val === "number") {
      return MK_NUMBER(val);
    }
    if (typeof val === "boolean") {
      return MK_BOOLEAN(val);
    }
    if (typeof val === "string") {
      return MK_STRING(val);
    }
    if (Array.isArray(val)) {
      return MK_LIST(val.map((el) => this.convertJsToEntronValue(el)));
    }
    if (typeof val === "object") {
      const map = new Map<string, RuntimeValue>();
      for (const k of Object.keys(val)) {
        map.set(k, this.convertJsToEntronValue(val[k]));
      }
      return MK_RECORD(map);
    }
    return MK_STRING(String(val));
  }

  private evaluateBinaryOp(
    left: RuntimeValue,
    op: string,
    right: RuntimeValue,
    line: number
  ): RuntimeValue {
    switch (op) {
      case "plus": {
        if (left.type === "number" && right.type === "number") {
          return MK_NUMBER(left.value + right.value);
        }
        // String concatenation fallback
        return MK_STRING(formatValue(left) + formatValue(right));
      }

      case "minus": {
        if (left.type === "number" && right.type === "number") {
          return MK_NUMBER(left.value - right.value);
        }
        throw new Error(`Runtime Error at line ${line}: 'minus' requires numbers.`);
      }

      case "times": {
        if (left.type === "number" && right.type === "number") {
          return MK_NUMBER(left.value * right.value);
        }
        if (left.type === "string" && right.type === "number") {
          return MK_STRING(left.value.repeat(Math.max(0, Math.floor(right.value))));
        }
        throw new Error(`Runtime Error at line ${line}: 'times' requires numbers or string and number.`);
      }

      case "divided by": {
        if (left.type === "number" && right.type === "number") {
          if (right.value === 0) {
            throw new Error(`Runtime Error at line ${line}: Division by zero.`);
          }
          return MK_NUMBER(left.value / right.value);
        }
        throw new Error(`Runtime Error at line ${line}: 'divided by' requires numbers.`);
      }

      case "modulo": {
        if (left.type === "number" && right.type === "number") {
          return MK_NUMBER(left.value % right.value);
        }
        throw new Error(`Runtime Error at line ${line}: 'modulo' requires numbers.`);
      }

      case "joined with": {
        return MK_STRING(formatValue(left) + formatValue(right));
      }

      case "is equal to": {
        return MK_BOOLEAN(this.areValuesEqual(left, right));
      }

      case "is not equal to": {
        return MK_BOOLEAN(!this.areValuesEqual(left, right));
      }

      case "is greater than": {
        if (left.type === "number" && right.type === "number") {
          return MK_BOOLEAN(left.value > right.value);
        }
        if (left.type === "string" && right.type === "string") {
          return MK_BOOLEAN(left.value > right.value);
        }
        return MK_BOOLEAN(false);
      }

      case "is less than": {
        if (left.type === "number" && right.type === "number") {
          return MK_BOOLEAN(left.value < right.value);
        }
        if (left.type === "string" && right.type === "string") {
          return MK_BOOLEAN(left.value < right.value);
        }
        return MK_BOOLEAN(false);
      }

      case "is at least": {
        if (left.type === "number" && right.type === "number") {
          return MK_BOOLEAN(left.value >= right.value);
        }
        if (left.type === "string" && right.type === "string") {
          return MK_BOOLEAN(left.value >= right.value);
        }
        return MK_BOOLEAN(false);
      }

      case "is at most": {
        if (left.type === "number" && right.type === "number") {
          return MK_BOOLEAN(left.value <= right.value);
        }
        if (left.type === "string" && right.type === "string") {
          return MK_BOOLEAN(left.value <= right.value);
        }
        return MK_BOOLEAN(false);
      }

      case "contains": {
        if (left.type === "string") {
          return MK_BOOLEAN(left.value.includes(formatValue(right)));
        }
        if (left.type === "list") {
          const match = left.value.some((el) => this.areValuesEqual(el, right));
          return MK_BOOLEAN(match);
        }
        if (left.type === "record") {
          return MK_BOOLEAN(left.value.has(formatValue(right)));
        }
        return MK_BOOLEAN(false);
      }

      default:
        throw new Error(`Unsupported binary operator '${op}' at line ${line}`);
    }
  }

  private evaluateUnaryOp(op: string, operand: RuntimeValue, line: number): RuntimeValue {
    switch (op) {
      case "not":
        return MK_BOOLEAN(!this.isTruthy(operand));

      case "negative":
        if (operand.type === "number") {
          return MK_NUMBER(-operand.value);
        }
        throw new Error(`'negative' operator requires a number.`);

      case "length of":
        if (operand.type === "string") return MK_NUMBER(operand.value.length);
        if (operand.type === "list") return MK_NUMBER(operand.value.length);
        if (operand.type === "record") return MK_NUMBER(operand.value.size);
        throw new Error(`Cannot get length of non-sequence type.`);

      case "uppercase of":
        return MK_STRING(formatValue(operand).toUpperCase());

      case "lowercase of":
        return MK_STRING(formatValue(operand).toLowerCase());

      case "trimmed":
        return MK_STRING(formatValue(operand).trim());

      case "reversed":
        if (operand.type === "list") {
          return MK_LIST([...operand.value].reverse());
        }
        if (operand.type === "string") {
          return MK_STRING(operand.value.split("").reverse().join(""));
        }
        throw new Error(`'reversed' requires a list or string.`);

      case "sorted":
        if (operand.type === "list") {
          const sorted = [...operand.value].sort((a, b) => {
            if (a.type === "number" && b.type === "number") return a.value - b.value;
            return formatValue(a).localeCompare(formatValue(b));
          });
          return MK_LIST(sorted);
        }
        throw new Error(`'sorted' requires a list.`);

      case "keys of":
        if (operand.type === "record") {
          const keys = Array.from(operand.value.keys()).map((k) => MK_STRING(k));
          return MK_LIST(keys);
        }
        throw new Error(`'keys of' requires a record.`);

      case "values of":
        if (operand.type === "record") {
          const vals = Array.from(operand.value.values());
          return MK_LIST(vals);
        }
        throw new Error(`'values of' requires a record.`);

      case "math square root of":
        if (operand.type === "number") return MK_NUMBER(Math.sqrt(operand.value));
        throw new Error(`math square root requires a number.`);

      case "math absolute value of":
        if (operand.type === "number") return MK_NUMBER(Math.abs(operand.value));
        throw new Error(`math absolute value requires a number.`);

      case "math floor of":
        if (operand.type === "number") return MK_NUMBER(Math.floor(operand.value));
        throw new Error(`math floor requires a number.`);

      case "math ceil of":
        if (operand.type === "number") return MK_NUMBER(Math.ceil(operand.value));
        throw new Error(`math ceil requires a number.`);

      case "math round of":
        if (operand.type === "number") return MK_NUMBER(Math.round(operand.value));
        throw new Error(`math round requires a number.`);

      default:
        throw new Error(`Unsupported unary operator '${op}'`);
    }
  }

  private isTruthy(val: RuntimeValue): boolean {
    if (val.type === "boolean") return val.value;
    if (val.type === "nothing") return false;
    if (val.type === "number") return val.value !== 0;
    if (val.type === "string") return val.value.length > 0;
    if (val.type === "list") return val.value.length > 0;
    return true;
  }

  private areValuesEqual(a: RuntimeValue, b: RuntimeValue): boolean {
    if (a.type !== b.type) return false;
    if (a.type === "number" && b.type === "number") return a.value === b.value;
    if (a.type === "string" && b.type === "string") return a.value === b.value;
    if (a.type === "boolean" && b.type === "boolean") return a.value === b.value;
    if (a.type === "nothing" && b.type === "nothing") return true;
    if (a.type === "list" && b.type === "list") {
      if (a.value.length !== b.value.length) return false;
      return a.value.every((el, i) => this.areValuesEqual(el, b.value[i]));
    }
    return false;
  }

  private promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise((resolve) => {
      rl.question(question + " ", (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
}
