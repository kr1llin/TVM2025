import {  MatchResult } from "ohm-js";
import { addMulSemantics } from "./calculate";
import grammar from "./addmul.ohm-bundle";

export function evaluate(content: string): number
{
    return calculate(parse(content));
}
export class SyntaxError extends Error
{
}

function parse(content: string): MatchResult
{
    const match = grammar.match(content);

    if (match.succeeded()){
        return match;
    } else {
        throw new SyntaxError(match.message);
    }
}

function calculate(expression: MatchResult):number
{
    return addMulSemantics(expression).calculate();
}
