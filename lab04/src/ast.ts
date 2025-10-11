export type Expr = binaryExpNode | numberNode | variableNode | negNode | par;

export type expType = binaryExp | unOpType | 'number' | 'variable';
export type binaryExp = 'binaryExp';
export type unOpType = 'negative' | 'par';

export interface binaryExpNode {
    type:'binaryExp';
    operator: '+' | '-' | '*' | '/';
    left: Expr;
    right: Expr;
}

export interface numberNode {
    type: 'number';
    value: number;
}

export interface variableNode {
  type: 'variable';
  name: string;
}

export interface negNode {
    type: 'negative';
    value: Expr;
}

export interface par {
    type: 'par';
    value: Expr;
}