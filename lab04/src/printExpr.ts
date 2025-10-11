import { binaryExpNode, Expr, expType } from "./ast";

function getExpInPar(e: Expr) : Expr {
    return e.type == 'par' ? getExpInPar(e.value) : e;
}

function isSum(e: Expr) : boolean {
    return e.type == 'binaryExp' && e.operator == '+';
}

function isSub(e: Expr) : boolean {
    return e.type == 'binaryExp' && e.operator == '-';
}

function isMul(e: Expr) : boolean {
    return e.type == 'binaryExp' && e.operator == '*';
}

function isDiv(e: Expr) : boolean {
    return e.type == 'binaryExp' && e.operator == '/';
}

function getOp(e: Expr) : string {
    switch (e.type){
        case 'binaryExp':
            return e.operator;
    }
    return '';
}

function printBinOp(e: binaryExpNode) : string {
    return printExpr(e.left, getOp(e), 'l') + ' ' + getOp(e) + ' ' + printExpr(e.right, getOp(e), 'r');
}

export function printExpr(e: Expr, op?: string, assoc?: 'l' | 'r'): string
{
    switch(e.type){
        case 'par':
            if (op == '*' && (isSum(getExpInPar(e)) || isSub(getExpInPar(e)))
                || op == '-' && assoc == 'r' && (isSum(getExpInPar(e)) || isSub(getExpInPar(e)))
                || op == '/' && (isMul(getExpInPar(e)) || isDiv(getExpInPar(e)))
                )
                return '(' + printExpr(e.value, getOp(e)) + ')';
            return printExpr(e.value, getOp(e));
        case 'negative':
            return '-' + printExpr(e.value, getOp(e));
        case 'number':
            return e.value.toString();
        case 'variable':
            return e.name;
        case 'binaryExp':
            return printBinOp(e);
    }
    return '';
}
