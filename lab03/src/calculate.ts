import { MatchResult } from "ohm-js";
import grammar, { ArithmeticActionDict, ArithmeticSemantics } from "./arith.ohm-bundle";

export const arithSemantics: ArithSemantics = grammar.createSemantics() as ArithSemantics;


const arithCalc = {
     Exp: function(e){
        return e.calculate(this.args.params);
    },
    AddExp: function(left, right){
        let result = left.calculate(this.args.params);
        for (let i = 0; i < right.numChildren; i++){
            const rightNode = right.child(i);
            const op = rightNode.child(0);
            const rightExp = rightNode.child(1);
            const rightValue = rightExp.calculate(this.args.params);

            switch (op.sourceString){
                case '+':
                    result += rightValue;
                    break;
                case '-':
                    result -= rightValue;
                    break;
            }
        }
        return result;
    },
     MulExp: function(left, rights) {
        let result = left.calculate(this.args.params);
        
        for (let i = 0; i < rights.numChildren; i++) {
            const rightNode = rights.child(i);
            const op = rightNode.child(0);
            const rightExpr = rightNode.child(1);
            
            const rightValue = rightExpr.calculate(this.args.params);
            
            switch (op.sourceString) {
                case '*':
                    result *= rightValue;
                    break;
                case '/':
                    if (rightValue === 0) {
                        throw new SyntaxError("Division by zero");
                    }
                    result /= rightValue;
                    break;
            }
        }
        return result;
    },
    MulExp_right: function(op, right) {
        return 0;
    },
    AddExp_right: function(op, right) {
        return 0;
    },
    Primary: function(e) {
        return e.calculate(this.args.params);
    },
    Primary_neg: function(_, primary) {
        return -primary.calculate(this.args.params);
    },
    Primary_paren: function(_, expr, __) {
        return expr.calculate(this.args.params);
    },
    number: function(digits) {
        return parseInt(this.sourceString, 10);
    },
    variable: function(_,__) {
        const params = this.args.params;
        const varName = this.sourceString;
        
        if (!params || params[varName] == undefined) {
            return NaN;
        }
        return params[varName];
}

} satisfies ArithmeticActionDict<number | undefined>;


arithSemantics.addOperation<Number>("calculate(params)", arithCalc);


export interface ArithActions {
    calculate(params: {[name:string]:number}): number;
}

export interface ArithSemantics extends ArithmeticSemantics
{
    (match: MatchResult): ArithActions;
}
