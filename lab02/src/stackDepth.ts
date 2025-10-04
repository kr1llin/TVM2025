import { ReversePolishNotationActionDict } from "./rpn.ohm-bundle";
const rpnBinStackDepth = (a: any,b: any,_: any) => {
        const left = a.stackDepth;
        const right = b.stackDepth;
        const max = Math.max(left.max, left.out + right.max);
        const out = left.out + right.out - 1;
        return {max, out};
    };

export const rpnStackDepth = {
    RpnExpr: (expr) => expr.stackDepth,
    RpnExprPlus: rpnBinStackDepth,
    RpnExprMult: rpnBinStackDepth,
    number: (_) => ({max: 1, out: 1}),
} satisfies ReversePolishNotationActionDict<StackDepth>;
export type StackDepth = {max: number, out: number};
