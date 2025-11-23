import { Module } from 'module';
import { getBinaryExp, getExprAst, getUnaryExp, parseExpr} from '../../lab04';
import * as ast from './funny';

import grammar, { FunnyActionDict } from './funny.ohm-bundle';

import { IterationNode, MatchResult, NonterminalNode, Semantics, TerminalNode } from 'ohm-js';
import { AssignStmt, Expr, Statement } from './funny';

function makeBinCond(type: string, left: NonterminalNode, right: NonterminalNode): ast.Condition{
    return {
        type: type,
        left: left.parse(),
        right: right.parse()
    } as ast.Condition;
}

export class ValidationError extends Error {
    constructor(message: string, public location?: 
        { line: number, column: number }) {
        super(message);
        this.name = 'ValidationError';
    }

}

export class Warning {
    constructor(public message: string, public location?: 
        { line: number, column: number }) {}
}

export function validateModule(module: ast.Module): {errors: ValidationError[], warnings: Warning[]} {
    const errors: ValidationError[] = [];
    const warnings: Warning[] = [];

    // checking for function name uniqueness
    const functionNames = new Set<string>();
    for (const func of module.functions) {
        if (functionNames.has(func.name)){
            errors.push(new ValidationError('Duplicate function name `${func.name}`'));
        }
        functionNames.add(func.name);
    }
    
    for (const func of module.functions) {
        const results = validateFunction(func, module);
        errors.push(...results.errors);
        warnings.push(...results.warnings);
    }
    
    return {errors, warnings};
}

export function validateFunction(func: ast.FunctionDef, module: ast.Module): {errors: ValidationError[], warnings: Warning[]} {
    const errors: ValidationError[] = [];
    const warnings: Warning[] = [];
    
    const declaredParams = new Set<string>();
    const allVars = new Set<string>();
    
    for (const param of func.parameters) {
        if (declaredParams.has(param.name)) {
            errors.push(new ValidationError(
                `Redeclaration of parameter '${param.name}' in function '${func.name}'`
            ));
        }
        declaredParams.add(param.name);
        allVars.add(param.name);
    }


    for (const retParam of func.returns) {
        if (declaredParams.has(retParam.name)) {
            errors.push(new ValidationError(
                `Redeclaration of return parameter '${retParam.name}' in function '${func.name}'`
            ));
        }
        declaredParams.add(retParam.name);
        allVars.add(retParam.name);
    }
    
    const uses = func.uses || [];
    const usedParams = new Set<string>();
    
    for (const useParam of uses) {
        if (declaredParams.has(useParam.name)) {
            errors.push(new ValidationError(
                `Redeclaration of use parameter '${useParam.name}' in function '${func.name}' (already declared in parameters or returns)`
            ));
        }
        if (usedParams.has(useParam.name)) {
            errors.push(new ValidationError(
                `Duplicate use parameter '${useParam.name}' in function '${func.name}'`
            ));
        }
        usedParams.add(useParam.name);
        allVars.add(useParam.name);
    }
    
    // const allowedVariables = new Set([...declaredParams, ...usedParams]);
    const functionMap = new Map<string, ast.FunctionDef>();
    for (const f of module.functions){
        functionMap.set(f.name, f);
    }
    
    const bodyResult = validateBody(func.body, allVars, func.name, module, functionMap);
    errors.push(...bodyResult.errors);
    warnings.push(...bodyResult.warnings);

    const usedVariables = collectUsedVariables(func.body, func.name);
    checkForUnusedVars(func, usedVariables, warnings);

    return {errors, warnings};
}

function collectUsedVariables(body: ast.Statement[], functionName: string): Set<string> {
    const used = new Set<string>();

    function collectFromStatement(stmt: ast.Statement): void {
        switch (stmt.type) {
            case 'assignSingle':
                used.add(stmt.name);
                collectIdentifiersFromExpression(stmt.value).forEach(elements => used.add(elements));
                break;
                
            case 'assignArray':
                used.add(stmt.arrayName);
                collectIdentifiersFromExpression(stmt.index).forEach(elements => used.add(elements));
                collectIdentifiersFromExpression(stmt.value).forEach(elements => used.add(elements));
                break;
                
            case 'assignTuple':
                for (const name of stmt.names) {
                    used.add(name);
                }
                collectIdentifiersFromExpression(stmt.value).forEach(elements => used.add(elements));
                break;
                
            case 'block':
                for (const blockStmt of stmt.statements) {
                    collectFromStatement(blockStmt);
                }
                break;
                
            case 'if':
                collectFromCondition(stmt.condition);
                collectFromStatement(stmt.thenBranch);
                if (stmt.elseBranch) {
                    collectFromStatement(stmt.elseBranch);
                }
                break;
                
            case 'while':
                collectFromCondition(stmt.condition);
                collectFromStatement(stmt.body);
                break;
        }
    }

    function collectFromCondition(cond: ast.Condition): void {
        if (cond){
        switch (cond.type) {
            case 'comparison':
                collectIdentifiersFromExpression(cond.left).forEach(elements => used.add(elements));
                collectIdentifiersFromExpression(cond.right).forEach(elements => used.add(elements));
                break;
                
            case 'not':
                collectFromCondition(cond.arg);
                break;
                
            case 'and':
            case 'or':
            case 'implication':
                collectFromCondition(cond.left);
                collectFromCondition(cond.right);
                break;
                
            case 'paren':
                collectFromCondition(cond.arg);
                break;
                
            case 'true':
            case 'false':
                break;
        }
    }
}

    for (const stmt of body){
        collectFromStatement(stmt);
    }
    return used;
}

function checkForUnusedVars(func: ast.FunctionDef, usedVariables: Set<string>, warnings: Warning[]): void {
    for (const param of func.parameters) {
        if (!usedVariables.has(param.name)) {
            warnings.push(new Warning(
                `Unused parameter '${param.name}' in function '${func.name}'`
            ));
        }
    }
    
    for (const use of func.uses) {
        if (!usedVariables.has(use.name)) {
            warnings.push(new Warning(
                `Unused local variable '${use.name}' in function '${func.name}'`
            ));
        }
    }
    
    // for ret?
}

function validateBody(
    body: ast.Statement[], 
    allowedVariables: Set<string>, 
    functionName: string,
    module: ast.Module,
    functionMap: Map<string, ast.FunctionDef>
): {errors: ValidationError[], warnings: Warning[]} {
    const errors: ValidationError[] = [];
    const warnings: Warning[] = [];
    
    for (const statement of body) {
        const result = validateStatement(statement, allowedVariables, functionName, module, functionMap);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
    }
    
    return {errors, warnings};
}

function validateStatement(
    statement: ast.Statement, 
    allowedVariables: Set<string>, 
    functionName: string,
    module: ast.Module,
    functionMap: Map<string, ast.FunctionDef>
): {errors: ValidationError[], warnings: Warning[]} {
    const errors: ValidationError[] = [];
    const warnings: Warning[] = [];

    switch (statement.type) {
        case 'assignSingle':
            if (!allowedVariables.has(statement.name)) {
                errors.push(new ValidationError(
                    `Undeclared variable '${statement.name}' in assignment in function '${functionName}'`
                ));
            }
            // errors.push(...validateExpression(statement.value, allowedVariables, functionName, module));
            const exprRes = validateExpression(statement.value, allowedVariables, functionName, module, functionMap);
            errors.push(...exprRes.errors);
            warnings.push(...exprRes.warnings);
            break;
        case 'assignArray':
            if (!allowedVariables.has(statement.arrayName)) {
                errors.push(new ValidationError(
                    `Undeclared array '${statement.arrayName}' in array assignment in function '${functionName}'`
                ));
            }
            const indexResult = validateExpression(statement.index, allowedVariables, functionName, module, functionMap);
            const valueResult = validateExpression(statement.value, allowedVariables, functionName, module, functionMap);
            errors.push(...indexResult.errors, ...valueResult.errors);
            warnings.push(...indexResult.warnings, ...valueResult.warnings);
            break;
        case 'assignTuple':
            for (const name of statement.names) {
                if (!allowedVariables.has(name)) {
                    errors.push(new ValidationError(
                        `Undeclared variable '${name}' in tuple assignment in function '${functionName}'`
                    ));
                }
            }
            const callResult = validateFunctionCall(statement.value, module, functionName, functionMap, statement.names.length);
            errors.push(...callResult.errors);
            warnings.push(...callResult.warnings);
            break;

            
        case 'block':
            const blockResult = validateBody(statement.statements, allowedVariables, functionName, module, functionMap);
            errors.push(...blockResult.errors);
            warnings.push(...blockResult.warnings);
            break;
            
        case 'if':
            const condResult = validateCondition(statement.condition, allowedVariables, functionName, module, functionMap);
            errors.push(...condResult.errors);
            warnings.push(...condResult.warnings);
            
            const thenResult = validateStatement(statement.thenBranch, allowedVariables, functionName, module, functionMap);
            errors.push(...thenResult.errors);
            warnings.push(...thenResult.warnings);
            
            if (statement.elseBranch) {
                const elseResult = validateStatement(statement.elseBranch, allowedVariables, functionName, module, functionMap);
                errors.push(...elseResult.errors);
                warnings.push(...elseResult.warnings);
            }
            break;
            
        case 'while':
            const whileCondResult = validateCondition(statement.condition, allowedVariables, functionName, module, functionMap);
            errors.push(...whileCondResult.errors);
            warnings.push(...whileCondResult.warnings);
            
            const bodyResult = validateStatement(statement.body, allowedVariables, functionName, module, functionMap);
            errors.push(...bodyResult.errors);
            warnings.push(...bodyResult.warnings);
            break;
    }
    
    return { errors, warnings };
}

function validateExpression(
    expr: Expr,
    allowedVariables: Set<string>,
    functionName: string,
    module: ast.Module,
    functionMap: Map<string, ast.FunctionDef>
): { errors: ValidationError[], warnings: Warning[] }  {
    const errors: ValidationError[] = [];
    const warnings: Warning[] = [];
    
    const identifiers = collectIdentifiersFromExpression(expr);
    
    for (const identifier of identifiers) {
        if (!allowedVariables.has(identifier)) {
            errors.push(new ValidationError(
                `Undeclared variable '${identifier}' used in expression in function '${functionName}'`
            ));
        }
    }

    // if (expr.type == 'functionCall'){
    //     errors.push(...validateFunctionCall(expr, module, functionName));

    //     for (const arg of expr.args){
    //         errors.push(...validateExpression(arg, allowedVariables, functionName, module));
    //     }
    // }

    switch(expr.type){
        case 'functionCall':
            const callResult = validateFunctionCall(expr, module, functionName, functionMap, 1);
            errors.push(...callResult.errors);
            warnings.push(...callResult.warnings);
            break;
        case 'arrayAccess':
            if (!allowedVariables.has(expr.arrayname)) {
                errors.push(new ValidationError(
                    `Undeclared array '${expr.arrayname}' in array access in function '${functionName}'`
                ));
            }
            const indexResult = validateExpression(expr.index, allowedVariables, functionName, module, functionMap);
            errors.push(...indexResult.errors);
            warnings.push(...indexResult.warnings);
            break;
        case 'sum':
        case 'sub':
        case 'mul':
        case 'div':
            const leftResult = validateExpression(expr.left, allowedVariables, functionName, module, functionMap);
            const rightResult = validateExpression(expr.right, allowedVariables, functionName, module, functionMap);
            errors.push(...leftResult.errors, ...rightResult.errors);
            warnings.push(...leftResult.warnings, ...rightResult.warnings);
            break;
            
        case 'negative':
        case 'par':
            const argResult = validateExpression(expr.arg, allowedVariables, functionName, module, functionMap);
            errors.push(...argResult.errors);
            warnings.push(...argResult.warnings);
            break;
            
        case 'number':
        case 'variable':
            break;
    }

    
    return {errors, warnings};
}

function validateCondition(
    condition: ast.Condition,
    allowedVariables: Set<string>,
    functionName: string,
    module: ast.Module,
    functionMap: Map<string, ast.FunctionDef>
): { errors: ValidationError[], warnings: Warning[] } {
    const errors: ValidationError[] = [];
    const warnings: Warning[] = [];
    
    if (condition){
    switch (condition.type) {
        case 'comparison':
            const leftResult = validateExpression(condition.left, allowedVariables, functionName, module, functionMap);
            const rightResult = validateExpression(condition.right, allowedVariables, functionName, module, functionMap);
            errors.push(...leftResult.errors, ...rightResult.errors);
            warnings.push(...leftResult.warnings, ...rightResult.warnings);
            break;
            
        case 'not':
            const argResult = validateCondition(condition.arg, allowedVariables, functionName, module, functionMap);
            errors.push(...argResult.errors);
            warnings.push(...argResult.warnings);
            break;
            
        case 'and':
        case 'or':
        case 'implication':
            const leftCondResult = validateCondition(condition.left, allowedVariables, functionName, module, functionMap);
            const rightCondResult = validateCondition(condition.right, allowedVariables, functionName, module, functionMap);
            errors.push(...leftCondResult.errors, ...rightCondResult.errors);
            warnings.push(...leftCondResult.warnings, ...rightCondResult.warnings);
            break;
            
        case 'paren':
            const parenResult = validateCondition(condition.arg, allowedVariables, functionName, module, functionMap);
            errors.push(...parenResult.errors);
            warnings.push(...parenResult.warnings);
            break;
            
        case 'true':
        case 'false':
            break;
    }
}
    
    return { errors, warnings };
}

function validateFunctionCall(call: ast.FunctionCallExpr, module: ast.Module, currentFunction: string, functionMap: Map<string, ast.FunctionDef>, expectedReturns: number):
{errors: ValidationError[], warnings: Warning[]}{
    const errors: ValidationError[] = [];
    const warnings: Warning[] = [];

    // console.log(`Validating function call: ${call.name} with ${call.args.length} arguments in function ${currentFunction}`);

    // const func = module.functions.find(f => f.name == call.name);
    const func = functionMap.get(call.name);
    if (!func){
        errors.push(new ValidationError(
            `Undefined function '${call.name}' called in function '${currentFunction}'`
        ));
        return { errors, warnings };
    }
    if (call.name === 'length') {
        if (call.args.length != 1) {
            errors.push(new ValidationError(
                `Built-in function 'length' expects 1 argument but got ${call.args.length} in function '${currentFunction}'`
            ));
        }
        if (expectedReturns != 1) {
            errors.push(new ValidationError(
                `Built-in function 'length' returns 1 value but expected ${expectedReturns} in function '${currentFunction}'`
            ));
        }
        return { errors, warnings };
    }

    if (call.args.length != func.parameters.length) {
        errors.push(new ValidationError(
            `Function '${call.name}' expects ${func.parameters.length} arguments but got ${call.args.length} in function '${currentFunction}'`
        ));
    }

    if (func.returns.length !== expectedReturns) {
        errors.push(new ValidationError(
            `Function '${call.name}' returns ${func.returns.length} values but expected ${expectedReturns} in function '${currentFunction}'`
        ));
    }

    for (let i = 0; i < call.args.length; i++){
        const arg = call.args[i];
        // console.log(`Argument ${i}: type = ${arg.type}`);

        if (arg.type == 'functionCall'){
            // const argFunc = module.functions.find(f => f.name == arg.name);
            const argFunc = functionMap.get(arg.name);
            if (!argFunc){
                errors.push(new ValidationError(
                    `Undefined function '${arg.name}' called in function '${currentFunction}'`
                ));
            }
            console.log(`Nested function call to ${arg.name}, found: ${!!argFunc}, returns count: ${argFunc?.returns.length}`);
            
            if (argFunc && argFunc.returns.length != 1){
                errors.push(new ValidationError(
                    `Function '${arg.name}' returns ${argFunc.returns.length} values but expected 1 as argument ${i + 1} to '${call.name}' in function '${currentFunction}'`
                ));
            }
        }
    }

    console.log(`Validation errors for ${call.name}: ${errors.length}`);
    return {errors, warnings};
}

function collectIdentifiersFromExpression(expr: Expr): Set<string> {
    const identifiers = new Set<string>();
    
    if (!expr || typeof expr != 'object') {
        return identifiers;
    }
    
    switch(expr.type){
    case 'variable': {
        identifiers.add(expr.name);
        break;
        }
    case 'div': 
    case 'mul':
    case 'sub':
    case 'sum': {
        const leftIds = collectIdentifiersFromExpression(expr.left);
        const rightIds = collectIdentifiersFromExpression(expr.right);
        leftIds.forEach(id => identifiers.add(id));
        rightIds.forEach(id => identifiers.add(id));
        break;
        } 
    case 'negative': 
    case 'par': {
        const operandIds = collectIdentifiersFromExpression(expr.arg);
        operandIds.forEach(id => identifiers.add(id));
        break;
        }
    case 'number':
        break;
    case 'functionCall':{
        for (const arg of expr.args){
            const argIds = collectIdentifiersFromExpression(arg);
            argIds.forEach(id => identifiers.add(id));
        }
        break;
        }
    case 'arrayAccess':
        identifiers.add(expr.arrayname);
        collectIdentifiersFromExpression(expr.index).forEach(id => identifiers.add(id));
    }
    return identifiers;
}

export const getFunnyAst = {
    Module(functions: IterationNode){
        const funcs: any[] = [];
        for (let i = 0; i < functions.numChildren; i++){
            funcs.push(functions.child(i).parse());
        }
        return {
            type: 'module',
            functions: funcs
        } as ast.Module;
    },

    FunctionDef(funcName, _, params, __, ___, retParams, usesPart, body){
        // console.log("Trying to parse FunctionDef (SourceString: " + "funcName = " + funcName.sourceString + ", params = " + params.sourceString + ", retParams = " + retParams.sourceString + ", usesPart = " + usesPart.sourceString + ", body = " + body.sourceString);
        const functionName = funcName.sourceString;

        let parameters: ast.ParameterDef[] = [];
        if (params.numChildren > 0) {
            parameters = params.child(0).parse();
        }
        const returns: ast.ParameterDef[] = retParams.parse();
        let uses: ast.ParameterDef[] = [];

        if (usesPart.numChildren > 0) {
            uses = usesPart.parse();
        }
        const bodyResult: Statement[] = body.parse();

        return {
            type: 'fun',
            name: functionName,
            parameters: parameters,
            returns: returns,
            uses: uses,
            body: bodyResult
        } as ast.FunctionDef;
    },

    Parameters(first, _, rest){
    // console.log("Trying to parse Parameters (SourceString: " + "first = " + first.sourceString + ", resst = " + rest.sourceString);

    const params = [first.parse()];
    params.push(...rest.parse());
    return params;
    },
    // no realisation of int[]
    Parameter(name, _, type){
        return {
            type: 'param',
            name: name.sourceString,
            dataType: type.sourceString
        } as ast.ParameterDef;
    },
    variable(_, __) {
        return {type: 'variable', name: this.sourceString};
    },
    VariableType(e: any){
        return e.sourceString;
    },
    UsesPart(_, parameters){
    // console.log("Trying to parse UsesPart (SourceString: " + "parameters = " + parameters.sourceString);
    if (parameters.numChildren == 0){
        return [];
    }
    return parameters.child(0).parse();
    },
    // Body = BlockStmt | Statement
    Body(body: any){
    // console.log("Trying to parse Body (SourceString: " + "body = " + body.sourceString);
        const result = body.parse();
        if (result.type == 'block'){
            return result.statements;
        }
        else{
            return [result];
        }
    },
    BlockStmt(_, statements: IterationNode,__){
    // console.log("Trying to parse BlockStmt (SourceString: " + "statements = " + statements.sourceString);

        const stmts: ast.Statement[] = [];
        for (let i = 0; i < statements.numChildren; i++){
            stmts.push(statements.child(i).parse());
        }
        return {
            type: 'block',
            statements: stmts
        } as ast.BlockStmt;
    },
    AssignStmt(arg){
        return arg.parse();
    },
    AssignSingle(varName, _, expr, __){
        return {
            type: 'assignSingle',
            name: varName.sourceString,
            value: expr.parse()
        }
    },
    AssignArray(arrayToAccess, _, expr, __){
        const array: ast.ArrayAccessExpr = arrayToAccess.parse();
        return {
            type: 'assignArray',
            arrayName: arrayToAccess.arrayName,
            index: array.index,
            value: expr.parse()
        }
    },
    // what's up with extra iterNode?? 
    AssignTuple(firstName, restNames, restNames2, _, func,__){
        const names = [firstName.sourceString];
        const rest = restNames.parse();
        if (Array.isArray(rest)){
            names.push(...rest);
        }
        return {
            type: 'assignTuple',
            names: names,
            value: func.parse()
        }
    },
    ArrayAccess(name,_,index,__){
        return {
            type:'arrayAccess',
            arrayName: name.sourceString,
            index: index.parse()
        }
    },
    Loop(_,__,condition, ___, body){
        return {
            type: 'while',
            condition: condition.parse(),
            body: body.parse(),
        } as ast.WhileStmt;
    },
    // Conditional = "if" "(" Condition ")" Statement ("else" Statement)?
    Conditional(_, condition, __, ___, thenBranch, elseBranch,____) {
        const elsePart = elseBranch.numChildren > 0 ? elseBranch.child(0).parse() : undefined;
        return {
            type: 'if',
            condition: condition.parse(),
            thenBranch: thenBranch.parse(),
            elseBranch: elsePart
        } as ast.ConditionalStmt;
    },
    Condition(cond){
        return cond.parse();
    },
    Condition_True(_) {
        return {type: 'true'} as ast.Condition;
    },
    Condition_False(_) {
        return {type: 'false'} as ast.Condition;
    },
    Comparison(left, op, right){
        return {
            type: 'comparison',
            operator: op.sourceString,
            left: left.parse(),
            right: right.parse()
        } as ast.Condition;
    },
    Condition_CondAndCond(left, _, right) {
        return makeBinCond('and', left, right);
    },
    Condition_CondOrCond(left, _, right) {
        return makeBinCond('or', left, right);
    },
    Condition_CondImplCond(left,_,right){
        return makeBinCond('implication', left,right);
    },
    Condition_notCond(_, cond) {
        return {
            type: 'not',
            arg: cond.parse()
        } as ast.Condition;
    },
    Condition_ParCondPar(_, cond, __) {
        return {
            type: 'paren',
            arg: cond.parse()
        } as ast.Condition;
    },
    FunctionCall(name, _, argsNode, __){
        // console.log("Trying to parse FunctionCall (SourceString: " + "name = " + name.sourceString + ", argsNode = " + argsNode.sourceString);
        const args: Expr[] = argsNode.parse();
        return {
            type: 'functionCall',
            name: name.sourceString,
            args: args
        } as ast.FunctionCallExpr;
    },
  Arguments(first, _, restIter){
    // console.log("Trying to parse Arguments (SourceString: " + "first = " + first.sourceString + ", restIter = " + restIter.sourceString);
    
    const args = [first.parse()];
    args.push(...restIter.parse());
    return args;
},
    Primary(exp){
        return exp.parse();
    },
    _iter(...children) {
    // console.log("Trying to parse _iter (SourceString: " + "children = " + children.map(child => child.sourceString));

        const results = [];
        for (let i = 0; i < children.length; i++) {
            const parsedChild = children[i].parse();
            if (Array.isArray(parsedChild)) {
                results.push(...parsedChild);
            } else {
                results.push(parsedChild);
            }
        }
        return results;
    },
    _terminal(){},
    Exp(exp){
        return exp.parse();
    },
    AddExp(first, ops, last) {
        return getBinaryExp(first, ops, last, {'+': 'sum', '-': 'sub'});
    },
    MulExp(first, ops, last) {
        return getBinaryExp(first, ops, last, {'*': 'mul', '/': 'div'});
    },
    Neg(_, x) {
        return getUnaryExp(x, 'negative');
    },
    Paren(_, x, __) {
        return getUnaryExp(x, 'par');
    },
    number(_) {
        return {type: 'number', value: parseInt(this.sourceString)};
    },
} satisfies FunnyActionDict<any>;

export const semantics: FunnySemanticsExt = grammar.Funny.createSemantics() as FunnySemanticsExt;
semantics.addOperation("parse()", getFunnyAst);
export interface FunnySemanticsExt extends Semantics
{
    (match: MatchResult): FunnyActionsExt
}
interface FunnyActionsExt 
{
    parse(): ast.Module;
}

export function parseFunny(source: string): ast.Module
{
    const match = grammar.Funny.match(source, "Module");
    if (match.failed()) {
        throw new Error(`Parse error: ${match.message}`);
    }
    
    const module = semantics(match).parse();
    
    const validationResult = validateModule(module);

    if (validationResult.errors.length > 0) {
        const errorMessages = validationResult.errors.map(error => error.message).join('\n');
        throw new ValidationError(`Validation errors:\n${errorMessages}`);
    }

    if (validationResult.warnings.length > 0) {
        const warningMessages = validationResult.warnings.map(warning => warning.message).join('\n');
        console.warn(`Warnings:\n${warningMessages}`);
    }

    return module;
}