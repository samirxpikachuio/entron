export type Statement =
  | VariableDeclarationStmt
  | AssignmentStmt
  | ChangeVariableStmt
  | DisplayStmt
  | AskStmt
  | IfStmt
  | RepeatStmt
  | WhileStmt
  | ForEachStmt
  | CountStmt
  | BreakStmt
  | ContinueStmt
  | FunctionDefStmt
  | ReturnStmt
  | ExpressionStmt
  | AppendToListStmt
  | RemoveFromListStmt
  | SetRecordKeyStmt
  | WriteFileStmt
  | ReadFileStmt
  | FetchUrlStmt
  | WaitStmt
  | TryCatchStmt
  | StartHttpServerStmt
  | StartWebSocketServerStmt
  | StartGraphqlServerStmt
  | StartMqttServerStmt
  | SendSocketMessageStmt
  | PublishMqttStmt;

export interface Position {
  line: number;
  column: number;
}

export interface BaseNode {
  pos: Position;
}

export interface VariableDeclarationStmt extends BaseNode {
  kind: "VariableDeclarationStmt";
  name: string;
  initializer: Expression;
}

export interface AssignmentStmt extends BaseNode {
  kind: "AssignmentStmt";
  name: string;
  value: Expression;
}

export interface ChangeVariableStmt extends BaseNode {
  kind: "ChangeVariableStmt";
  name: string;
  amount: Expression;
  isSubtraction: boolean;
}

export interface DisplayStmt extends BaseNode {
  kind: "DisplayStmt";
  expr: Expression;
}

export interface AskStmt extends BaseNode {
  kind: "AskStmt";
  prompt: Expression;
  targetVar: string;
}

export interface IfBranch {
  condition: Expression;
  body: Statement[];
}

export interface IfStmt extends BaseNode {
  kind: "IfStmt";
  branches: IfBranch[];
  otherwiseBody?: Statement[];
}

export interface RepeatStmt extends BaseNode {
  kind: "RepeatStmt";
  countExpr: Expression;
  body: Statement[];
}

export interface WhileStmt extends BaseNode {
  kind: "WhileStmt";
  condition: Expression;
  body: Statement[];
}

export interface ForEachStmt extends BaseNode {
  kind: "ForEachStmt";
  itemVar: string;
  listExpr: Expression;
  body: Statement[];
}

export interface CountStmt extends BaseNode {
  kind: "CountStmt";
  varName: string;
  startExpr: Expression;
  endExpr: Expression;
  stepExpr?: Expression;
  body: Statement[];
}

export interface BreakStmt extends BaseNode {
  kind: "BreakStmt";
}

export interface ContinueStmt extends BaseNode {
  kind: "ContinueStmt";
}

export interface FunctionDefStmt extends BaseNode {
  kind: "FunctionDefStmt";
  name: string;
  params: string[];
  body: Statement[];
}

export interface ReturnStmt extends BaseNode {
  kind: "ReturnStmt";
  value?: Expression;
}

export interface ExpressionStmt extends BaseNode {
  kind: "ExpressionStmt";
  expr: Expression;
}

export interface AppendToListStmt extends BaseNode {
  kind: "AppendToListStmt";
  itemExpr: Expression;
  listVar: string;
}

export interface RemoveFromListStmt extends BaseNode {
  kind: "RemoveFromListStmt";
  indexExpr: Expression;
  listVar: string;
}

export interface SetRecordKeyStmt extends BaseNode {
  kind: "SetRecordKeyStmt";
  recordVar: string;
  keyExpr: Expression;
  valueExpr: Expression;
}

export interface WriteFileStmt extends BaseNode {
  kind: "WriteFileStmt";
  dataExpr: Expression;
  pathExpr: Expression;
  isAppend: boolean;
}

export interface ReadFileStmt extends BaseNode {
  kind: "ReadFileStmt";
  pathExpr: Expression;
  targetVar: string;
}

export interface FetchUrlStmt extends BaseNode {
  kind: "FetchUrlStmt";
  urlExpr: Expression;
  targetVar: string;
  headersExpr?: Expression;
}

export interface WaitStmt extends BaseNode {
  kind: "WaitStmt";
  durationExpr: Expression;
  isSeconds: boolean;
}

export interface TryCatchStmt extends BaseNode {
  kind: "TryCatchStmt";
  tryBody: Statement[];
  errorVar: string;
  catchBody: Statement[];
}

export interface StartHttpServerStmt extends BaseNode {
  kind: "StartHttpServerStmt";
  portExpr: Expression;
  handlerName: string;
}

export interface StartWebSocketServerStmt extends BaseNode {
  kind: "StartWebSocketServerStmt";
  portExpr: Expression;
  onOpenFn?: string;
  onMessageFn?: string;
  onCloseFn?: string;
}

export interface StartGraphqlServerStmt extends BaseNode {
  kind: "StartGraphqlServerStmt";
  portExpr: Expression;
  schemaExpr: Expression;
  resolversExpr: Expression;
}

export interface StartMqttServerStmt extends BaseNode {
  kind: "StartMqttServerStmt";
  portExpr: Expression;
  handlerName: string;
}

export interface SendSocketMessageStmt extends BaseNode {
  kind: "SendSocketMessageStmt";
  messageExpr: Expression;
  socketExpr: Expression;
}

export interface PublishMqttStmt extends BaseNode {
  kind: "PublishMqttStmt";
  topicExpr: Expression;
  payloadExpr: Expression;
}

// Expressions
export type Expression =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NothingLiteral
  | IdentifierExpr
  | BinaryExpr
  | UnaryExpr
  | ListLiteral
  | RecordLiteral
  | FunctionCallExpr
  | ListItemAccessExpr
  | FirstItemExpr
  | LastItemExpr
  | RecordAccessExpr
  | SplitExpr
  | MathPowerExpr
  | RandomBetweenExpr
  | FileExistsExpr
  | CurrentTimestampExpr
  | ParseJsonExpr;

export interface ParseJsonExpr extends BaseNode {
  kind: "ParseJsonExpr";
  jsonExpr: Expression;
}

export interface NumberLiteral extends BaseNode {
  kind: "NumberLiteral";
  value: number;
}

export interface StringLiteral extends BaseNode {
  kind: "StringLiteral";
  value: string;
}

export interface BooleanLiteral extends BaseNode {
  kind: "BooleanLiteral";
  value: boolean;
}

export interface NothingLiteral extends BaseNode {
  kind: "NothingLiteral";
}

export interface IdentifierExpr extends BaseNode {
  kind: "IdentifierExpr";
  name: string;
}

export type BinaryOperator =
  | "plus"
  | "minus"
  | "times"
  | "divided by"
  | "modulo"
  | "joined with"
  | "is equal to"
  | "is not equal to"
  | "is greater than"
  | "is less than"
  | "is at least"
  | "is at most"
  | "contains"
  | "and"
  | "or";

export interface BinaryExpr extends BaseNode {
  kind: "BinaryExpr";
  left: Expression;
  operator: BinaryOperator;
  right: Expression;
}

export type UnaryOperator =
  | "not"
  | "negative"
  | "length of"
  | "uppercase of"
  | "lowercase of"
  | "trimmed"
  | "reversed"
  | "sorted"
  | "keys of"
  | "values of"
  | "math square root of"
  | "math absolute value of"
  | "math floor of"
  | "math ceil of"
  | "math round of";

export interface UnaryExpr extends BaseNode {
  kind: "UnaryExpr";
  operator: UnaryOperator;
  expr: Expression;
}

export interface ListLiteral extends BaseNode {
  kind: "ListLiteral";
  elements: Expression[];
}

export interface RecordLiteral extends BaseNode {
  kind: "RecordLiteral";
  entries: { key: Expression; value: Expression }[];
}

export interface FunctionCallExpr extends BaseNode {
  kind: "FunctionCallExpr";
  callee: string;
  args: Expression[];
}

export interface ListItemAccessExpr extends BaseNode {
  kind: "ListItemAccessExpr";
  listExpr: Expression;
  indexExpr: Expression;
}

export interface FirstItemExpr extends BaseNode {
  kind: "FirstItemExpr";
  listExpr: Expression;
}

export interface LastItemExpr extends BaseNode {
  kind: "LastItemExpr";
  listExpr: Expression;
}

export interface RecordAccessExpr extends BaseNode {
  kind: "RecordAccessExpr";
  recordExpr: Expression;
  keyExpr: Expression;
}

export interface SplitExpr extends BaseNode {
  kind: "SplitExpr";
  stringExpr: Expression;
  delimiterExpr: Expression;
}

export interface MathPowerExpr extends BaseNode {
  kind: "MathPowerExpr";
  base: Expression;
  exponent: Expression;
}

export interface RandomBetweenExpr extends BaseNode {
  kind: "RandomBetweenExpr";
  min: Expression;
  max: Expression;
}

export interface FileExistsExpr extends BaseNode {
  kind: "FileExistsExpr";
  pathExpr: Expression;
}

export interface CurrentTimestampExpr extends BaseNode {
  kind: "CurrentTimestampExpr";
}

export interface Program extends BaseNode {
  kind: "Program";
  body: Statement[];
}
