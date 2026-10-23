import type { Environment } from "./environment";
import { RuntimeValue, MK_NUMBER, MK_BOOLEAN, MK_NOTHING, MK_LIST, MK_RECORD, MK_STRING, formatValue } from "./values";
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import axios from "axios";

function asNumber(v: RuntimeValue): number {
  if (v.type === "number") return v.value;
  const n = Number(formatValue(v));
  return Number.isNaN(n) ? 0 : n;
}
function asString(v: RuntimeValue): string { return formatValue(v); }
function asList(v: RuntimeValue): RuntimeValue[] { return v.type === "list" ? [...v.value] : []; }
function asRecord(v: RuntimeValue): Map<string, RuntimeValue> { return v.type === "record" ? new Map(v.value) : new Map(); }
function areEqual(a: RuntimeValue, b: RuntimeValue): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "number" && b.type === "number") return a.value === b.value;
  if (a.type === "string" && b.type === "string") return a.value === b.value;
  if (a.type === "boolean" && b.type === "boolean") return a.value === b.value;
  if (a.type === "nothing" && b.type === "nothing") return true;
  return false;
}
function convertJs(val: any): RuntimeValue {
  if (val === null || val === undefined) return MK_NOTHING();
  if (typeof val === "number") return MK_NUMBER(val);
  if (typeof val === "string") return MK_STRING(val);
  if (typeof val === "boolean") return MK_BOOLEAN(val);
  if (Array.isArray(val)) return MK_LIST(val.map(convertJs));
  if (typeof val === "object") {
    const m = new Map<string, RuntimeValue>();
    for (const k of Object.keys(val)) m.set(k, convertJs(val[k]));
    return MK_RECORD(m);
  }
  return MK_STRING(String(val));
}
function jsify(val: RuntimeValue): any {
  switch (val.type) {
    case "number": return val.value;
    case "string": return val.value;
    case "boolean": return val.value;
    case "nothing": return null;
    case "list": return val.value.map(jsify);
    case "record": { const o: any = {}; for (const [k, v] of val.value) o[k] = jsify(v); return o; }
    default: return formatValue(val);
  }
}

type BuiltinCall = (args: RuntimeValue[]) => RuntimeValue | Promise<RuntimeValue>;
const B: { name: string; call: BuiltinCall }[] = [
  { name: "abs", call: (a) => MK_NUMBER(Math.abs(asNumber(a[0]))) },
  { name: "sqrt", call: (a) => MK_NUMBER(Math.sqrt(asNumber(a[0]))) },
  { name: "pow", call: (a) => MK_NUMBER(Math.pow(asNumber(a[0]), asNumber(a[1]))) },
  { name: "floor", call: (a) => MK_NUMBER(Math.floor(asNumber(a[0]))) },
  { name: "ceil", call: (a) => MK_NUMBER(Math.ceil(asNumber(a[0]))) },
  { name: "round", call: (a) => MK_NUMBER(Math.round(asNumber(a[0]))) },
  { name: "min", call: (a) => MK_NUMBER(Math.min(...a.map(asNumber))) },
  { name: "max", call: (a) => MK_NUMBER(Math.max(...a.map(asNumber))) },
  { name: "random", call: () => MK_NUMBER(Math.random()) },
  { name: "upper", call: (a) => MK_STRING(asString(a[0]).toUpperCase()) },
  { name: "lower", call: (a) => MK_STRING(asString(a[0]).toLowerCase()) },
  { name: "trim", call: (a) => MK_STRING(asString(a[0]).trim()) },
  { name: "split", call: (a) => MK_LIST(asString(a[0]).split(asString(a[1])).map((s) => MK_STRING(s))) },
  { name: "join", call: (a) => MK_STRING(asList(a[0]).map(formatValue).join(asString(a[1] ?? MK_STRING(",")))) },
  { name: "replace", call: (a) => MK_STRING(asString(a[0]).replace(asString(a[1]), asString(a[2]))) },
  { name: "replaceAll", call: (a) => MK_STRING(asString(a[0]).split(asString(a[1])).join(asString(a[2]))) },
  { name: "containsText", call: (a) => MK_BOOLEAN(asString(a[0]).includes(asString(a[1]))) },
  { name: "indexOf", call: (a) => MK_NUMBER(asString(a[0]).indexOf(asString(a[1]))) },
  { name: "substring", call: (a) => MK_STRING(asString(a[0]).substring(asNumber(a[1]), a[2] ? asNumber(a[2]) : undefined)) },
  { name: "startsWith", call: (a) => MK_BOOLEAN(asString(a[0]).startsWith(asString(a[1]))) },
  { name: "endsWith", call: (a) => MK_BOOLEAN(asString(a[0]).endsWith(asString(a[1]))) },

  { name: "charAt", call: (a) => MK_STRING(asString(a[0]).charAt(asNumber(a[1]))) },
  { name: "repeatString", call: (a) => MK_STRING(asString(a[0]).repeat(asNumber(a[1]))) },
  { name: "reverseString", call: (a) => MK_STRING(asString(a[0]).split("").reverse().join("")) },
  { name: "concat", call: (a) => MK_STRING(a.map(asString).join("")) },
  { name: "toNumber", call: (a) => { const n = Number(asString(a[0])); return Number.isNaN(n) ? MK_NOTHING() : MK_NUMBER(n); } },
  { name: "push", call: (a) => { const arr = asList(a[0]); arr.push(a[1]); return MK_LIST(arr); } },
  { name: "pop", call: (a) => { const arr = asList(a[0]); const v = arr.pop(); return v ?? MK_NOTHING(); } },
  { name: "concatLists", call: (a) => MK_LIST([...asList(a[0]), ...asList(a[1])]) },
  { name: "sliceList", call: (a) => MK_LIST(asList(a[0]).slice(asNumber(a[1]), a[2] ? asNumber(a[2]) : undefined)) },
  { name: "listIncludes", call: (a) => MK_BOOLEAN(asList(a[0]).some((x) => areEqual(x, a[1]))) },
  { name: "reverseList", call: (a) => MK_LIST([...asList(a[0])].reverse()) },
  { name: "sortList", call: (a) => MK_LIST([...asList(a[0])].sort((x, y) => {
      if (x.type === "number" && y.type === "number") return x.value - y.value;
      return formatValue(x).localeCompare(formatValue(y));
    })) },
  { name: "uniqueList", call: (a) => {
      const seen = new Set<string>(); const out: RuntimeValue[] = [];
      for (const x of asList(a[0])) { const k = formatValue(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
      return MK_LIST(out);
    } },
  { name: "flattenList", call: (a) => {
      const out: RuntimeValue[] = [];
      const walk = (v: RuntimeValue) => { if (v.type === "list") v.value.forEach(walk); else out.push(v); };
      walk(a[0]); return MK_LIST(out);
    } },
  { name: "sumList", call: (a) => MK_NUMBER(asList(a[0]).reduce((s, x) => s + asNumber(x), 0)) },
  { name: "averageList", call: (a) => { const arr = asList(a[0]); return MK_NUMBER(arr.length ? arr.reduce((s, x) => s + asNumber(x), 0) / arr.length : 0); } },
  { name: "range", call: (a) => {
      const start = asNumber(a[0]); const end = asNumber(a[1]); const step = a[2] ? asNumber(a[2]) : 1;
      const out: RuntimeValue[] = [];
      if (step > 0) for (let i = start; i <= end; i += step) out.push(MK_NUMBER(i));
      else for (let i = start; i >= end; i += step) out.push(MK_NUMBER(i));
      return MK_LIST(out);
    } },
  { name: "firstOf", call: (a) => asList(a[0])[0] ?? MK_NOTHING() },
  { name: "lastOf", call: (a) => { const arr = asList(a[0]); return arr[arr.length - 1] ?? MK_NOTHING(); } },
  { name: "getAt", call: (a) => asList(a[0])[asNumber(a[1])] ?? MK_NOTHING() },

  { name: "recordGet", call: (a) => asRecord(a[0]).get(asString(a[1])) ?? MK_NOTHING() },
  { name: "recordSet", call: (a) => { const m = asRecord(a[0]); m.set(asString(a[1]), a[2]); return MK_RECORD(m); } },
  { name: "recordHas", call: (a) => MK_BOOLEAN(asRecord(a[0]).has(asString(a[1]))) },
  { name: "recordKeys", call: (a) => MK_LIST(Array.from(asRecord(a[0]).keys()).map((k) => MK_STRING(k))) },
  { name: "recordValues", call: (a) => MK_LIST(Array.from(asRecord(a[0]).values())) },
  { name: "typeOf", call: (a) => MK_STRING(a[0].type) },
  { name: "toString", call: (a) => MK_STRING(formatValue(a[0])) },
  { name: "isNumber", call: (a) => MK_BOOLEAN(a[0].type === "number") },
  { name: "isString", call: (a) => MK_BOOLEAN(a[0].type === "string") },
  { name: "isList", call: (a) => MK_BOOLEAN(a[0].type === "list") },
  { name: "isRecord", call: (a) => MK_BOOLEAN(a[0].type === "record") },
  { name: "readFile", call: (a) => MK_STRING(fs.readFileSync(asString(a[0]), "utf-8")) },
  { name: "writeFile", call: (a) => { fs.writeFileSync(asString(a[0]), asString(a[1]), "utf-8"); return MK_BOOLEAN(true); } },
  { name: "appendFile", call: (a) => { fs.appendFileSync(asString(a[0]), asString(a[1]), "utf-8"); return MK_BOOLEAN(true); } },
  { name: "fileExists", call: (a) => MK_BOOLEAN(fs.existsSync(asString(a[0]))) },
  { name: "listDir", call: (a) => MK_LIST(fs.readdirSync(asString(a[0])).map((x) => MK_STRING(x))) },
  { name: "makeDir", call: (a) => { fs.mkdirSync(asString(a[0]), { recursive: true }); return MK_BOOLEAN(true); } },
  { name: "parseJson", call: (a) => { try { return convertJs(JSON.parse(asString(a[0]))); } catch { return MK_NOTHING(); } } },
  { name: "stringifyJson", call: (a) => MK_STRING(JSON.stringify(jsify(a[0]), null, 2)) },
  { name: "now", call: () => MK_NUMBER(Date.now()) },
  { name: "dateString", call: () => MK_STRING(new Date().toISOString().slice(0, 10)) },
  { name: "timeString", call: () => MK_STRING(new Date().toISOString().slice(11, 19)) },
  { name: "sleep", call: async (a) => { await new Promise((r) => setTimeout(r, asNumber(a[0]))); return MK_NOTHING(); } },
  { name: "regexTest", call: (a) => { try { return MK_BOOLEAN(new RegExp(asString(a[1])).test(asString(a[0]))); } catch { return MK_BOOLEAN(false); } } },
  { name: "regexReplace", call: (a) => { try { return MK_STRING(asString(a[0]).replace(new RegExp(asString(a[1]), "g"), asString(a[2]))); } catch { return MK_STRING(asString(a[0])); } } },
  { name: "md5", call: (a) => MK_STRING(crypto.createHash("md5").update(asString(a[0])).digest("hex")) },
  { name: "sha256", call: (a) => MK_STRING(crypto.createHash("sha256").update(asString(a[0])).digest("hex")) },
  { name: "base64Encode", call: (a) => MK_STRING(Buffer.from(asString(a[0])).toString("base64")) },
  { name: "base64Decode", call: (a) => MK_STRING(Buffer.from(asString(a[0]), "base64").toString("utf-8")) },
  { name: "uuid", call: () => MK_STRING(crypto.randomUUID()) },
  { name: "randomString", call: (a) => {
      const n = asNumber(a[0] ?? MK_NUMBER(8)); const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let out = ""; for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
      return MK_STRING(out);
    } },
  { name: "fetchUrl", call: async (a) => {
      try {
        const res = await axios.get(asString(a[0]), { validateStatus: () => true, responseType: "text" });
        const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        const m = new Map<string, RuntimeValue>();
        m.set("status", MK_NUMBER(res.status));
        m.set("body", MK_STRING(text));
        m.set("ok", MK_BOOLEAN(res.status >= 200 && res.status < 300));
        return MK_RECORD(m);
      } catch (e: any) {
        const m = new Map<string, RuntimeValue>();
        m.set("status", MK_NUMBER(0));
        m.set("body", MK_STRING(e?.message ?? String(e)));
        m.set("ok", MK_BOOLEAN(false));
        return MK_RECORD(m);
      }
    } },

  { name: "sin", call: (a) => MK_NUMBER(Math.sin(asNumber(a[0]))) },
  { name: "cos", call: (a) => MK_NUMBER(Math.cos(asNumber(a[0]))) },
  { name: "tan", call: (a) => MK_NUMBER(Math.tan(asNumber(a[0]))) },
  { name: "log10", call: (a) => MK_NUMBER(Math.log10(asNumber(a[0]))) },
  { name: "exp", call: (a) => MK_NUMBER(Math.exp(asNumber(a[0]))) },
  { name: "clamp", call: (a) => MK_NUMBER(Math.min(Math.max(asNumber(a[0]), asNumber(a[1])), asNumber(a[2]))) },
  { name: "factorial", call: (a) => { let n = Math.floor(asNumber(a[0])); let r = 1; for (let i = 2; i <= n; i++) r *= i; return MK_NUMBER(r); } },
  { name: "gcd", call: (a) => { let x = Math.abs(asNumber(a[0])), y = Math.abs(asNumber(a[1])); while (y) { const t = y; y = x % y; x = t; } return MK_NUMBER(x); } },
  { name: "trimStart", call: (a) => MK_STRING(asString(a[0]).trimStart()) },
  { name: "trimEnd", call: (a) => MK_STRING(asString(a[0]).trimEnd()) },
  { name: "lastIndexOf", call: (a) => MK_NUMBER(asString(a[0]).lastIndexOf(asString(a[1]))) },
  { name: "padStart", call: (a) => MK_STRING(asString(a[0]).padStart(asNumber(a[1]), asString(a[2] ?? MK_STRING(" ")))) },
  { name: "padEnd", call: (a) => MK_STRING(asString(a[0]).padEnd(asNumber(a[1]), asString(a[2] ?? MK_STRING(" ")))) },
  { name: "unshift", call: (a) => { const arr = asList(a[0]); arr.unshift(a[1]); return MK_LIST(arr); } },
  { name: "shift", call: (a) => { const arr = asList(a[0]); const v = arr.shift(); return v ?? MK_NOTHING(); } },
  { name: "removeAt", call: (a) => { const arr = asList(a[0]); arr.splice(asNumber(a[1]), 1); return MK_LIST(arr); } },
  { name: "insertAt", call: (a) => { const arr = asList(a[0]); arr.splice(asNumber(a[1]), 0, a[2]); return MK_LIST(arr); } },
  { name: "recordDelete", call: (a) => { const m = asRecord(a[0]); m.delete(asString(a[1])); return MK_RECORD(m); } },
  { name: "recordMerge", call: (a) => { const m = new Map(asRecord(a[0])); for (const [k, v] of asRecord(a[1])) m.set(k, v); return MK_RECORD(m); } },
  { name: "recordSize", call: (a) => MK_NUMBER(asRecord(a[0]).size) },
  { name: "isBoolean", call: (a) => MK_BOOLEAN(a[0].type === "boolean") },
  { name: "isNothing", call: (a) => MK_BOOLEAN(a[0].type === "nothing") },
  { name: "deleteFile", call: (a) => { try { fs.unlinkSync(asString(a[0])); return MK_BOOLEAN(true); } catch { return MK_BOOLEAN(false); } } },
  { name: "copyFile", call: (a) => { fs.copyFileSync(asString(a[0]), asString(a[1])); return MK_BOOLEAN(true); } },
  { name: "moveFile", call: (a) => { fs.renameSync(asString(a[0]), asString(a[1])); return MK_BOOLEAN(true); } },
  { name: "fileSize", call: (a) => MK_NUMBER(fs.statSync(asString(a[0])).size) },
  { name: "regexMatch", call: (a) => { try { const m = asString(a[0]).match(new RegExp(asString(a[1]))); return m ? MK_LIST(m.map((x) => MK_STRING(x))) : MK_NOTHING(); } catch { return MK_NOTHING(); } } },
  { name: "regexSplit", call: (a) => { try { return MK_LIST(asString(a[0]).split(new RegExp(asString(a[1]))).map((x) => MK_STRING(x))); } catch { return MK_LIST([MK_STRING(asString(a[0]))]); } } },
  { name: "lcm", call: (a) => { const x = Math.abs(asNumber(a[0])), y = Math.abs(asNumber(a[1])); let g = x, yy = y; while (yy) { const t = yy; yy = g % yy; g = t; } return MK_NUMBER((x * y) / (g || 1)); } },
  { name: "randomBetween", call: (a) => MK_NUMBER(Math.floor(Math.random() * (asNumber(a[1]) - asNumber(a[0]) + 1)) + asNumber(a[0])) },

];

export function registerBuiltins(env: Environment): void {
  for (const b of B) {
    env.declare(b.name, { type: "builtin", name: b.name, call: b.call } as any);
  }
}
