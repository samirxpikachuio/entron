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
