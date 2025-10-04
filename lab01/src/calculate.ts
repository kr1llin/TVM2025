import { Dict, MatchResult, Semantics } from "ohm-js";
import grammar, { AddMulActionDict } from "./addmul.ohm-bundle";

export const addMulSemantics: AddMulSemantics = grammar.createSemantics() as AddMulSemantics;


const addMulCalc = {
    Exp: (expr) => expr.calculate(),
    PlusExp: (expr) => expr.calculate(),
    MulExp: (expr) => expr.calculate(),
    Plus: (a,_,b) => a.calculate() + b.calculate(),
    Mul: (a,_,b) => a.calculate() * b.calculate(),
    Factor: (expr) => expr.calculate(),
    Par: (__, expr, _) => expr.calculate(),
    number: (digits) => {
        const numStr = digits.sourceString;
        return parseInt(numStr, 10);
    },

} satisfies AddMulActionDict<number>

addMulSemantics.addOperation<Number>("calculate()", addMulCalc);

interface AddMulDict  extends Dict {
    calculate(): number;
}

interface AddMulSemantics extends Semantics
{
    (match: MatchResult): AddMulDict;
}
