import { describe, it, expect } from "bun:test";
import { runEntron } from "../src/index";

async function run(code: string) {
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("call ")) {
      lines[i] = "define variable tmp as " + t;
    }
  }
  const last = lines[lines.length - 1].trim();
  if (last.startsWith("define variable tmp as call ")) {
    // keep last as result
  }
  return (await runEntron(lines.join("\n"))).result;
}

describe("Builtins", () => {
  const cases: { name: string; code: string; type: string; value?: any; length?: number }[] = [
    { name: "abs", code: "call abs with negative 5", type: "number", value: 5 },
    { name: "sqrt", code: "call sqrt with 16", type: "number", value: 4 },
    { name: "pow", code: "call pow with 2 and 3", type: "number", value: 8 },
    { name: "floor", code: "define variable result as math floor of 2.9", type: "number", value: 2 },
    { name: "ceil", code: "define variable result as math ceil of 2.1", type: "number", value: 3 },
    { name: "round", code: "define variable result as math round of 2.5", type: "number", value: 3 },
    { name: "min", code: "call min with 5 and 2 and 9", type: "number", value: 2 },
    { name: "max", code: "call max with 5 and 2 and 9", type: "number", value: 9 },
    { name: "sin", code: "call sin with 0", type: "number", value: 0 },
    { name: "cos", code: "call cos with 0", type: "number", value: 1 },
    { name: "tan", code: "call tan with 0", type: "number", value: 0 },
    { name: "log10", code: "call log10 with 100", type: "number", value: 2 },
    { name: "exp", code: "call exp with 0", type: "number", value: 1 },
    { name: "clamp", code: "call clamp with 10 and 0 and 5", type: "number", value: 5 },
    { name: "factorial", code: "call factorial with 5", type: "number", value: 120 },
    { name: "gcd", code: "call gcd with 12 and 8", type: "number", value: 4 },
    { name: "lcm", code: "call lcm with 4 and 6", type: "number", value: 12 },
    { name: "upper", code: 'call upper with "hi"', type: "string", value: "HI" },
    { name: "lower", code: 'call lower with "HI"', type: "string", value: "hi" },
    { name: "trim", code: 'call trim with "  hi  "', type: "string", value: "hi" },
    { name: "trimStart", code: 'call trimStart with "  hi"', type: "string", value: "hi" },
    { name: "trimEnd", code: 'call trimEnd with "hi  "', type: "string", value: "hi" },
    { name: "split", code: 'define variable result as split "a,b" by ","', type: "list", length: 2 },
    { name: "join", code: 'define variable xs as list containing "a" and "b"\ncall join with xs and ","', type: "string", value: "a,b" },
    { name: "replace", code: 'call replace with "abc" and "b" and "X"', type: "string", value: "aXc" },
    { name: "replaceAll", code: 'call replaceAll with "a-b-c" and "-" and "_"', type: "string", value: "a_b_c" },
    { name: "containsText", code: 'call containsText with "hello" and "ell"', type: "boolean", value: true },
    { name: "indexOf", code: 'call indexOf with "hello" and "l"', type: "number", value: 2 },
    { name: "lastIndexOf", code: 'call lastIndexOf with "hello" and "l"', type: "number", value: 3 },
    { name: "substring", code: 'call substring with "hello" and 1 and 3', type: "string", value: "el" },
    { name: "startsWith", code: 'call startsWith with "hello" and "he"', type: "boolean", value: true },
    { name: "push", code: 'define variable xs as list containing 1\ncall push with xs and 2', type: "list", length: 2 },
    { name: "pop", code: 'define variable xs as list containing 1 and 2\ncall pop with xs', type: "number", value: 2 },
    { name: "concatLists", code: 'define variable a as list containing 1\ndefine variable b as list containing 2\ncall concatLists with a and b', type: "list", length: 2 },
    { name: "sliceList", code: 'define variable xs as list containing 1 and 2 and 3\ncall sliceList with xs and 1 and 3', type: "list", length: 2 },
    { name: "listIncludes", code: 'define variable xs as list containing 1 and 2\ncall listIncludes with xs and 2', type: "boolean", value: true },
    { name: "reverseList", code: 'define variable xs as list containing 1 and 2 and 3\ncall reverseList with xs', type: "list" },
    { name: "sortList", code: 'define variable xs as list containing 3 and 1 and 2\ncall sortList with xs', type: "list" },
    { name: "uniqueList", code: 'define variable xs as list containing 1 and 1 and 2\ncall uniqueList with xs', type: "list", length: 2 },
    { name: "flattenList", code: 'define variable xs as list containing (list containing 1 and 2) and 3\ncall flattenList with xs', type: "list", length: 3 },
    { name: "sumList", code: 'define variable xs as list containing 1 and 2 and 3\ncall sumList with xs', type: "number", value: 6 },
    { name: "averageList", code: 'define variable xs as list containing 2 and 4\ncall averageList with xs', type: "number", value: 3 },
    { name: "range", code: "call range with 1 and 3", type: "list", length: 3 },
    { name: "firstOf", code: 'define variable xs as list containing 7 and 8\ncall firstOf with xs', type: "number", value: 7 },
    { name: "lastOf", code: 'define variable xs as list containing 7 and 8\ncall lastOf with xs', type: "number", value: 8 },
    { name: "getAt", code: 'define variable xs as list containing 7 and 8\ncall getAt with xs and 1', type: "number", value: 8 },
    { name: "recordGet", code: 'define variable r as record with key "a" as 5\ncall recordGet with r and "a"', type: "number", value: 5 },
    { name: "recordSet", code: 'define variable r as record with key "a" as 5\ncall recordSet with r and "b" and 6', type: "record" },
    { name: "recordHas", code: 'define variable r as record with key "a" as 5\ncall recordHas with r and "a"', type: "boolean", value: true },
    { name: "recordKeys", code: 'define variable r as record with key "a" as 5\ncall recordKeys with r', type: "list", length: 1 },
    { name: "recordValues", code: 'define variable r as record with key "a" as 5\ncall recordValues with r', type: "list", length: 1 },
    { name: "recordDelete", code: 'define variable r as record with key "a" as 5\ncall recordDelete with r and "a"', type: "record" },
    { name: "recordMerge", code: 'define variable a as record with key "x" as 1\ndefine variable b as record with key "y" as 2\ncall recordMerge with a and b', type: "record" },
    { name: "recordSize", code: 'define variable r as record with key "a" as 5\ncall recordSize with r', type: "number", value: 1 },
    { name: "typeOf", code: 'call typeOf with 5', type: "string", value: "number" },
    { name: "toString", code: "call toString with 5", type: "string", value: "5" },
    { name: "isNumber", code: "call isNumber with 5", type: "boolean", value: true },
    { name: "isString", code: 'call isString with "x"', type: "boolean", value: true },
    { name: "isList", code: 'define variable xs as list containing 1\ncall isList with xs', type: "boolean", value: true },
    { name: "isRecord", code: 'define variable r as record with key "a" as 1\ncall isRecord with r', type: "boolean", value: true },
    { name: "isBoolean", code: "call isBoolean with yes", type: "boolean", value: true },
    { name: "isNothing", code: "call isNothing with nothing", type: "boolean", value: true },
    { name: "padStart", code: 'call padStart with "5" and 3 and "0"', type: "string", value: "005" },
    { name: "padEnd", code: 'call padEnd with "5" and 3 and "0"', type: "string", value: "500" },
    { name: "unshift", code: 'define variable xs as list containing 2\ncall unshift with xs and 1', type: "list", length: 2 },
    { name: "shift", code: 'define variable xs as list containing 1 and 2\ncall shift with xs', type: "number", value: 1 },
    { name: "removeAt", code: 'define variable xs as list containing 1 and 2 and 3\ncall removeAt with xs and 1', type: "list", length: 2 },
    { name: "insertAt", code: 'define variable xs as list containing 1 and 3\ncall insertAt with xs and 1 and 2', type: "list", length: 3 },
    { name: "randomBetween", code: "call randomBetween with 1 and 1", type: "number", value: 1 },
    { name: "randomString", code: "call randomString with 4", type: "string" },
    { name: "uuid", code: "call uuid with 0", type: "string" },
    { name: "now", code: "call now with 0", type: "number" },
    { name: "dateString", code: "call dateString with 0", type: "string" },
    { name: "timeString", code: "call timeString with 0", type: "string" },
    { name: "endsWith", code: 'call endsWith with "hello" and "lo"', type: "boolean", value: true },
    { name: "charAt", code: 'call charAt with "hello" and 1', type: "string", value: "e" },
    { name: "repeatString", code: 'call repeatString with "ab" and 2', type: "string", value: "abab" },
    { name: "reverseString", code: 'call reverseString with "abc"', type: "string", value: "cba" },
    { name: "concat", code: 'call concat with "a" and "b" and "c"', type: "string", value: "abc" },
    { name: "toNumber", code: 'call toNumber with "42"', type: "number", value: 42 },
    { name: "regexTest", code: 'call regexTest with "abc123" and "123"', type: "boolean", value: true },
    { name: "regexReplace", code: 'call regexReplace with "a1b2" and "1" and "X"', type: "string", value: "aXb2" },
    { name: "regexMatch", code: 'call regexMatch with "abc123" and "123"', type: "list" },
    { name: "regexSplit", code: 'call regexSplit with "a,b;c" and ","', type: "list", length: 2 },
    { name: "md5", code: 'call md5 with "abc"', type: "string", value: "900150983cd24fb0d6963f7d28e17f72" },
    { name: "sha256", code: 'call sha256 with "abc"', type: "string" },
    { name: "base64Encode", code: 'call base64Encode with "abc"', type: "string", value: "YWJj" },
    { name: "base64Decode", code: 'call base64Decode with "YWJj"', type: "string", value: "abc" },
    { name: "parseJson", code: 'call parseJson with "42"', type: "number", value: 42 },
    { name: "stringifyJson", code: 'define variable r as record with key "a" as 1\ncall stringifyJson with r', type: "string" },
    { name: "fileExists", code: 'call fileExists with "package.json"', type: "boolean", value: true },
    { name: "listDir", code: 'call listDir with "."', type: "list" },
    { name: "makeDir", code: 'call makeDir with "tmp_test_dir"', type: "boolean", value: true },
    { name: "deleteFile", code: 'call writeFile with "tmp_delete.txt" and "x"\ncall deleteFile with "tmp_delete.txt"', type: "boolean", value: true },
    { name: "copyFile", code: 'call writeFile with "tmp_src.txt" and "x"\ncall copyFile with "tmp_src.txt" and "tmp_dst.txt"', type: "boolean", value: true },
    { name: "moveFile", code: 'call writeFile with "tmp_move_src.txt" and "x"\ncall moveFile with "tmp_move_src.txt" and "tmp_move_dst.txt"', type: "boolean", value: true },
    { name: "fileSize", code: 'call writeFile with "tmp_size.txt" and "hello"\ncall fileSize with "tmp_size.txt"', type: "number", value: 5 },
    { name: "readFile", code: 'call writeFile with "tmp_read.txt" and "hello"\ncall readFile with "tmp_read.txt"', type: "string", value: "hello" },
    { name: "writeFile", code: 'call writeFile with "tmp_write.txt" and "hello"', type: "boolean", value: true },
    { name: "appendFile", code: 'call writeFile with "tmp_append.txt" and "a"\ncall appendFile with "tmp_append.txt" and "b"', type: "boolean", value: true },
    { name: "fetchUrl", code: 'call fetchUrl with "not a url"', type: "record" },
  ];

  for (const c of cases) {
    it(c.name, async () => {
      const r = await run(c.code);
      expect(r.type).toBe(c.type);
      if (c.value !== undefined && (r.type === "number" || r.type === "string" || r.type === "boolean")) {
        expect((r as any).value).toBe(c.value);
      }
      if (c.length !== undefined && r.type === "list") {
        expect((r as any).value.length).toBe(c.length);
      }
    });
  }
});
