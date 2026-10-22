import { describe, it, expect } from "bun:test";
import { runEntron } from "../src/index";

describe("Entron Plain English Programming Language", () => {
  it("should evaluate plain English arithmetic", async () => {
    const code = `
      define variable x as 10 plus 20 times 2
      define variable y as 50 minus 10 divided by 2
      define variable z as 17 modulo 5
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("number");
    if (result.type === "number") {
      expect(result.value).toBe(2);
    }
  });

  it("should execute conditionals with English comparisons", async () => {
    const code = `
      define variable score as 85
      define variable result as ""
      if score is at least 90 then
        set result to "A"
      otherwise if score is at least 80 then
        set result to "B"
      otherwise
        set result to "C"
      end if
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("nothing");
  });

  it("should run repeat and count loops", async () => {
    const code = `
      define variable total as 0
      count from 1 to 5 as num do
        add num to total
      end count
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("nothing");
  });

  it("should define and call recursive functions", async () => {
    const code = `
      define function factorial with n
        if n is at most 1 then
          return 1
        end if
        define variable prev as n minus 1
        define variable sub as call factorial with prev
        return n times sub
      end function

      define variable answer as call factorial with 5
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("number");
    if (result.type === "number") {
      expect(result.value).toBe(120);
    }
  });

  it("should handle lists and records in plain English", async () => {
    const code = `
      define variable items as list containing "Alpha" and "Beta" and "Gamma"
      append "Delta" to items
      define variable len as length of items
      define variable first_item as first item of items

      define variable user as record with key "name" as "Alice" and key "age" as 30
      set key "score" in user to 100
      define variable user_name as value for key "name" in user
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("string");
    if (result.type === "string") {
      expect(result.value).toBe("Alice");
    }
  });

  it("should support try/otherwise error handling", async () => {
    const code = `
      define variable caught as no
      try
        define variable boom as 10 divided by 0
      otherwise on error err
        set caught to yes
      end try
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("nothing");
  });

  it("should support string operations", async () => {
    const code = `
      define variable text as "  Hello World  "
      define variable clean as trimmed text
      define variable upper as uppercase of clean
      define variable lower as lowercase of clean
      define variable parts as split "a,b,c" by ","
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("list");
    if (result.type === "list") {
      expect(result.value.length).toBe(3);
    }
  });

  it("should start and query a plain English REST API server", async () => {
    const code = `
      define function handleTestApi with req
        return record with key "status" as 200 and key "body" as "Entron REST Test OK"
      end function

      start http server on port 3099 with handler handleTestApi
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("record");
    const resp = await fetch("http://localhost:3099/");
    const text = await resp.text();
    expect(text).toBe("Entron REST Test OK");
  });

  it("should start and query a plain English GraphQL server", async () => {
    const code = `
      define variable testSchema as "type Query { ping: String }"
      define variable testResolvers as record with key "ping" as "pong"

      start graphql server on port 4099 with schema testSchema and resolvers testResolvers
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("record");
    const resp = await fetch("http://localhost:4099/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ ping }" })
    });
    const data = await resp.json();
    expect(data.data.ping).toBe("pong");
  });
});

describe("Switch statements", () => {
  it("should execute the matching case branch", async () => {
    const code = `
      define variable day as 2
      define variable label as ""
      switch day
        case 1
          set label to "Monday"
        case 2
          set label to "Tuesday"
        otherwise
          set label to "Unknown"
      end switch
      label
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("string");
    if (result.type === "string") {
      expect(result.value).toBe("Tuesday");
    }
  });

  it("should execute the otherwise branch when nothing matches", async () => {
    const code = `
      define variable day as 9
      define variable label as ""
      switch day
        case 1
          set label to "Monday"
        case 2
          set label to "Tuesday"
        otherwise
          set label to "Unknown"
      end switch
      label
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("string");
    if (result.type === "string") {
      expect(result.value).toBe("Unknown");
    }
  });

  it("should treat cases strictly (number 2 does not match string \"2\")", async () => {
    const code = `
      define variable grade as 2
      define variable label as ""
      switch grade
        case "2"
          set label to "string case"
        otherwise
          set label to "default case"
      end switch
      label
    `;
    const { result } = await runEntron(code);
    if (result.type === "string") {
      expect(result.value).toBe("default case");
    }
  });

  it("should stop at the first matching case", async () => {
    const code = `
      define variable size as 3
      define variable label as ""
      switch size
        case 1
          set label to "one"
        case 3
          set label to "three"
        case 3
          set label to "another three"
      end switch
      label
    `;
    const { result } = await runEntron(code);
    if (result.type === "string") {
      expect(result.value).toBe("three");
    }
  });

  it("should execute case bodies without falling through", async () => {
    const code = `
      define variable touched as ""
      define variable chosen as 1
      switch chosen
        case 1
          set touched to "first"
        case 1
          set touched to "second"
      end switch
      touched
    `;
    const { result } = await runEntron(code);
    if (result.type === "string") {
      expect(result.value).toBe("first");
    }
  });

  it("should support plain English comparisons in case tests", async () => {
    const code = `
      define variable total as 42
      define variable label as ""
      switch total
        case 40 plus 2
          set label to "forty two"
        otherwise
          set label to "other"
      end switch
      label
    `;
    const { result } = await runEntron(code);
    if (result.type === "string") {
      expect(result.value).toBe("forty two");
    }
  });
});

describe("String interpolation", () => {
  it("should interpolate a variable into a string", async () => {
    const code = `
      define variable name as "Grace"
      "Hello {{ name }}!"
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("string");
    if (result.type === "string") {
      expect(result.value).toBe("Hello Grace!");
    }
  });

  it("should evaluate arithmetic expressions inside placeholders", async () => {
    const code = `
      define variable price as 10
      "Total: {{ price times 3 plus 2 }}"
    `;
    const { result } = await runEntron(code);
    if (result.type === "string") {
      expect(result.value).toBe("Total: 32");
    }
  });

  it("should interpolate multiple placeholders and literal chunks", async () => {
    const code = `
      define variable forename as "Ada"
      define variable surname as "Lovelace"
      "{{ forename }} {{ surname }} ({{ "name" }})"
    `;
    const { result } = await runEntron(code);
    if (result.type === "string") {
      expect(result.value).toBe("Ada Lovelace (name)");
    }
  });

  it("should interpolate inside assignments and function calls", async () => {
    const code = `
      define function greet with who
        return "Hi {{ who }}"
      end function

      define variable unit as "ms"
      define variable sentence as greet with "{{ unit }} delayed"
      sentence
    `;
    const { result } = await runEntron(code);
    if (result.type === "string") {
      expect(result.value).toBe("Hi ms delayed");
    }
  });

  it("should format non-string values in placeholders", async () => {
    const code = `
      define variable items as list containing 1 and 2 and 3
      "count is {{ length of items }}"
    `;
    const { result } = await runEntron(code);
    if (result.type === "string") {
      expect(result.value).toBe("count is 3");
    }
  });

  it("should keep plain strings unaffected (no interpolation markers)", async () => {
    const code = `"nothing to see here"`;
    const { result } = await runEntron(code);
    expect(result.type).toBe("string");
    if (result.type === "string") {
      expect(result.value).toBe("nothing to see here");
    }
  });

  it("should pass an unterminated placeholder through literally", async () => {
    const code = `
      define variable name as "Grace"
      "Hello {{ name"
    `;
    const { result } = await runEntron(code);
    if (result.type === "string") {
      expect(result.value).toBe("Hello {{ name");
    }
  });
});
