import {  MatchResult } from "ohm-js";
import grammar from "./rpn.ohm-bundle";
import { rpnSemantics } from "./semantics";

export function evaluate(source: string): number
{
    return calculate(parse(source));
}
export function maxStackDepth(source: string): number
{ 
    return calculateMaxStackDepth(parse(source));
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
    return rpnSemantics(expression).calculate();
}

function calculateMaxStackDepth(expression: MatchResult):number
{
    return rpnSemantics(expression).stackDepth.max;
}
