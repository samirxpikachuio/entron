import { Lexer } from "./lexer/lexer";
import { Parser } from "./parser/parser";
import { Interpreter } from "./runtime/interpreter";
import { Environment } from "./runtime/environment";
import { RuntimeValue, formatValue } from "./runtime/values";

export { Lexer } from "./lexer/lexer";
export { Parser } from "./parser/parser";
export { Interpreter } from "./runtime/interpreter";
export { Environment } from "./runtime/environment";
export * from "./runtime/values";
export * from "./parser/ast";
export * from "./lexer/token";

export async function runEntron(
  source: string,
  env?: Environment
): Promise<{ result: RuntimeValue; output: string }> {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const program = parser.parse();
  const interpreter = new Interpreter(env);
  const result = await interpreter.run(program);
  return {
    result,
    output: formatValue(result)
  };
}
