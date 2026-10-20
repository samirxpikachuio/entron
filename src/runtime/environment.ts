import { RuntimeValue, MK_NUMBER, MK_BOOLEAN, MK_NOTHING } from "./values";

export class Environment {
  private parent?: Environment;
  private variables: Map<string, RuntimeValue>;

  constructor(parent?: Environment) {
    this.parent = parent;
    this.variables = new Map();
  }

  public declare(name: string, value: RuntimeValue): RuntimeValue {
    const key = name.toLowerCase();
    this.variables.set(key, value);
    return value;
  }

  public assign(name: string, value: RuntimeValue): RuntimeValue {
    const key = name.toLowerCase();
    const env = this.resolve(key);
    if (!env) {
      // If variable hasn't been declared, declare it in the current scope (dynamic flexibility)
      this.variables.set(key, value);
      return value;
    }
    env.variables.set(key, value);
    return value;
  }

  public lookup(name: string): RuntimeValue {
    const key = name.toLowerCase();
    const env = this.resolve(key);
    if (!env) {
      throw new Error(`Runtime Error: Variable '${name}' is not defined.`);
    }
    return env.variables.get(key)!;
  }

  public has(name: string): boolean {
    const key = name.toLowerCase();
    return this.resolve(key) !== undefined;
  }

  private resolve(key: string): Environment | undefined {
    if (this.variables.has(key)) {
      return this;
    }
    if (this.parent) {
      return this.parent.resolve(key);
    }
    return undefined;
  }

  public static createGlobal(): Environment {
    const env = new Environment();
    // Default dynamic constants
    env.declare("pi", MK_NUMBER(Math.PI));
    env.declare("euler", MK_NUMBER(Math.E));
    env.declare("true", MK_BOOLEAN(true));
    env.declare("false", MK_BOOLEAN(false));
    env.declare("yes", MK_BOOLEAN(true));
    env.declare("no", MK_BOOLEAN(false));
    env.declare("nothing", MK_NOTHING());
    env.declare("none", MK_NOTHING());
    return env;
  }
}
