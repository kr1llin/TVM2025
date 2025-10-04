import { ReversePolishNotationActionDict} from "./rpn.ohm-bundle";

export const rpnCalc = {
    RpnExpr: (expr) => expr.calculate(),
    RpnExprPlus: (a,b,_) => a.calculate() + b.calculate(),
    RpnExprMult: (a,b,_) => a.calculate() * b.calculate(),
    number: (digits) => parseInt(digits.sourceString, 10),
} satisfies ReversePolishNotationActionDict<number>;
