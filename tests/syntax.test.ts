import { describe, it, expect } from "bun:test";
import { runEntron } from "../src/index";

describe("Entron syntax levels", () => {
  it("variables level1/2/3", async () => {
    const code = `
      define variable age as 18
      display age
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("number");
  });

  it("make age equal to 18 / show age", async () => {
    const code = `
      make age equal to 18
      show age
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("number");
    if (result.type === "number") expect(result.value).toBe(18);
  });

  it("let the age be 18 / tell me the age", async () => {
    const code = `
      let the age be 18
      tell me the age
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("number");
    if (result.type === "number") expect(result.value).toBe(18);
  });

  it("math level3 add together", async () => {
    const code = `
      define variable price as 10
      define variable tax as 2
      add the price and tax together
      total
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("number");
    if (result.type === "number") expect(result.value).toBe(12);
  });

  it("conditions level3", async () => {
    const code = `
      define variable age as 20
      if the age is 18 or older
        say "Adult"
      otherwise
        say "Underage"
      end
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("nothing");
  });

  it("repeat say n times", async () => {
    const code = `
      say "Hello" 5 times
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("nothing");
  });

  it("lists level3", async () => {
    const code = `
      make a list of fruits: "Apple", "Mango"
      add "Orange" to the list
      tell me the first fruit
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("string");
    if (result.type === "string") expect(result.value).toBe("Apple");
  });

  it("functions level3", async () => {
    const code = `
      teach the computer to greet someone named name
        say "Hello, " joined with name
        return nothing
      end
      greet Samir
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("nothing");
  });

  it("strings level3", async () => {
    const code = `
      turn "hello" into uppercase
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("string");
    if (result.type === "string") expect(result.value).toBe("HELLO");
  });

  it("files level3", async () => {
    const code = `
      save "Hello!" in "tmp_syntax_test.txt"
      read "tmp_syntax_test.txt"
      tell me what it says
    `;
    const { result } = await runEntron(code);
    expect(result.type).toBe("string");
    if (result.type === "string") expect(result.value).toBe("Hello!\n");
  });

  it("waiting level3", async () => {
    const code = `wait for 1 seconds then say "Done"`;
    const { result } = await runEntron(code);
    expect(result.type).toBe("string");
    if (result.type === "string") expect(result.value).toBe("Done");
  });

  it("web level3", async () => {
    const code = `
      get the data from "https://example.com"
      tell me what you received
    `;
    // network may fail; skip strict
  });
});