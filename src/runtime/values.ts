import { Statement } from "../parser/ast";
import { Environment } from "./environment";

export type ValueType =
  | "number"
  | "string"
  | "boolean"
  | "nothing"
  | "list"
  | "record"
  | "function"
  | "builtin";

export interface NumberValue {
  type: "number";
  value: number;
}

export interface StringValue {
  type: "string";
  value: string;
}

export interface BooleanValue {
  type: "boolean";
  value: boolean;
}

export interface NothingValue {
  type: "nothing";
  value: null;
}

export interface ListValue {
  type: "list";
  value: RuntimeValue[];
}

export interface RecordValue {
  type: "record";
  value: Map<string, RuntimeValue>;
}

export interface FunctionValue {
  type: "function";
  name: string;
  params: string[];
  body: Statement[];
  closure: Environment;
}

export interface BuiltinFunctionValue {
  type: "builtin";
  name: string;
  call: (args: RuntimeValue[], env: Environment) => Promise<RuntimeValue> | RuntimeValue;
}

export type RuntimeValue =
  | NumberValue
  | StringValue
  | BooleanValue
  | NothingValue
  | ListValue
  | RecordValue
  | FunctionValue
  | BuiltinFunctionValue;

export function MK_NUMBER(n: number): NumberValue {
  return { type: "number", value: n };
}

export function MK_STRING(s: string): StringValue {
  return { type: "string", value: s };
}

export function MK_BOOLEAN(b: boolean): BooleanValue {
  return { type: "boolean", value: b };
}

export function MK_NOTHING(): NothingValue {
  return { type: "nothing", value: null };
}

export function MK_LIST(elements: RuntimeValue[] = []): ListValue {
  return { type: "list", value: elements };
}

export function MK_RECORD(entries: Map<string, RuntimeValue> = new Map()): RecordValue {
  return { type: "record", value: entries };
}

export function formatValue(val: RuntimeValue): string {
  switch (val.type) {
    case "number":
      return String(val.value);
    case "string":
      return val.value;
    case "boolean":
      return val.value ? "true" : "false";
    case "nothing":
      return "nothing";
    case "list":
      return `[ ${val.value.map(formatValue).join(", ")} ]`;
    case "record": {
      const items: string[] = [];
      for (const [k, v] of val.value.entries()) {
        items.push(`${k}: ${formatValue(v)}`);
      }
      return `{ ${items.join(", ")} }`;
    }
    case "function":
      return `<function ${val.name}>`;
    case "builtin":
      return `<built-in ${val.name}>`;
  }
}
