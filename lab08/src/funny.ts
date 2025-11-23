import * as arith from "../../lab04";

export interface Module
{
    type: 'module';
    functions: FunctionDef[]
}
export interface FunctionDef
{
    type: 'fun';
    name: string;
    parameters: ParameterDef[];
    returns: ParameterDef[];
    uses: ParameterDef[];
    body: Statement[];
}

export interface ParameterDef
{
    type: "param";
    name: string;
    dataType: string;
}

export type Statement = AssignStmt | BlockStmt | ConditionalStmt | WhileStmt;

export type AssignStmt = AssignSingle | AssignArray | AssignTuple;

export interface AssignSingle {
    type: 'assignSingle';
    name: string;
    value: arith.Expr;
}

export interface AssignArray {
    type: 'assignArray';
    arrayName: string;
    index: Expr;
    value: Expr;
}

export interface AssignTuple {
    type: 'assignTuple';
    names: string[];
    value: FunctionCallExpr;
}

export interface BlockStmt {
    type: 'block';
    statements: Statement[];
}

export interface ConditionalStmt{
    type: 'if';
    condition: Condition;
    thenBranch: Statement;
    elseBranch?: Statement;
}

export interface WhileStmt{
    type: 'while';
    condition: Condition;
    body: Statement;
    // invariant?
}

export type Condition = 
    | { type: 'true' }
    | { type: 'false' }
    | { type: 'comparison', operator: string, left: Expr, right: Expr }
    | { type: 'not', arg: Condition }
    | { type: 'and', left: Condition, right: Condition }
    | { type: 'or', left: Condition, right: Condition }
    | { type: 'implication', left: Condition, right: Condition }
    | { type: 'paren', arg: Condition };

export type Expr = arith.Expr | FunctionCallExpr | ArrayAccessExpr;

export interface FunctionCallExpr {
    type: 'functionCall';
    name: string;
    args: Expr[];
}

export interface ArrayAccessExpr {
    type: 'arrayAccess';
    arrayname: string;
    index: Expr;
}