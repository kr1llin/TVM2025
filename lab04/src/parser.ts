import { MatchResult } from 'ohm-js';
import { arithGrammar, ArithmeticActionDict, ArithmeticSemantics, SyntaxError } from '../../lab03';
import { Expr } from './ast';

// const createBinaryOp = (left: any, rights:any) => {
//      let result = left.parse();
//         for (const right of rights.parse()){
//             result = {
//                 type: 'binaryOp',
//                 operator: right[0],
//                 left: result,
//                 right: right[1]
//             };
//         }
//         return result;
// }

export const getExprAst: ArithmeticActionDict<Expr> = {
    Exp(e) {
        return e.parse();
    },
    AddExp(left, rights){
        let result = left.parse();
        const n = rights.children.length;
        for (let i = 0; i < n; i++){
            const right = rights.child(i).parse();
            result = {
                type: 'binaryExp',
                operator: right.operator,
                left: result,
                right: right.right,
            }
        }
        return result;
    },
    AddExp_right(op, right){
            return {
            type: 'binaryExp',
            operator: op.sourceString as '+' | '-',
            left: { type: 'number', value: 0 },
            right: right.parse()
        };
    },
    MulExp (left, rights) {
        let result = left.parse();
        const n = rights.children.length;
        for (let i = 0; i < n; i++){
            const right = rights.child(i).parse();
            result = {
                type: 'binaryExp',
                operator: right.operator,
                left: result,
                right: right.right,
            }
        }
        return result;
    },
    MulExp_right(op, right){
            return {
            type: 'binaryExp',
            operator: op.sourceString as '*' | '/',
            left: { type: 'number', value: 0 },
            right: right.parse()
        };
    },
    number(num:any){
        return {
            type: 'number',
            value: parseInt(num.sourceString, 10) 
        }
    },
    variable(first, rest){
        const firstLet = first.sourceString;
        const addition = rest ? rest.sourceString : '';
        const varName = firstLet + addition;
        return {
            type: 'variable',
            name: varName
        }
    },
    Primary_neg(_, e){
        return {
            type: 'negative',
            value: e.parse(),
        }
    },
    Primary_paren(_,e,__){
        return {
            type: 'par',
            value: e.parse(),
        }
    }
}

export const semantics = arithGrammar.createSemantics();
semantics.addOperation("parse()", getExprAst);

export interface ArithSemanticsExt extends ArithmeticSemantics
{
    (match: MatchResult): ArithActionsExt
}

export interface ArithActionsExt 
{
    parse(): Expr
}
export function parseExpr(source: string): Expr
{
    const match = arithGrammar.match(source);
    if (match.succeeded()){
        const adapter = semantics(match);
        return adapter.parse();
    }
    else {
        throw new SyntaxError(match.message);
    }
}



    
