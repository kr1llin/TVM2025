Funny <: Arithmetic {
    Module = FunctionDef+

    FunctionDef =
        identifier "(" Parameters? ")" 
        "returns" Parameters 
        UsesPart
        Body

    UsesPart = ("uses" Parameters)?
    
    Parameters = Parameter ("," Parameter)*

    Parameter = identifier ":" VariableType

    VariableType = "int" | "int[]"

    Body = BlockStmt | Statement
  
    Statement = AssignStmt | BlockStmt | Conditional | Loop

    AssignStmt = AssignSingle | AssignArray | AssignTuple

    AssignSingle = identifier "=" Exp ";"
    AssignArray = ArrayAccess "=" Exp ";"
    AssignTuple = identifier ("," identifier)+ "=" FunctionCall ";"
  
    BlockStmt = "{" Statement* "}"

    Conditional = "if" "(" Condition ")" Statement ("else" Statement)?

    Loop = "while" "(" Condition ")" Statement

    Condition = "true" -- True
    | "false" -- False
    | Comparison
    | "not" Condition -- notCond
    | Condition "and" Condition --CondAndCond
    | Condition "or" Condition --CondOrCond
    | Condition "->" Condition --CondImplCond
    | "(" Condition ")" -- ParCondPar

    Comparison = Exp "==" Exp
    | Exp "!=" Exp
    | Exp ">=" Exp
    | Exp "<=" Exp
    | Exp ">" Exp
    | Exp "<" Exp
  
    identifier = variable

    FunctionCall = identifier "(" Arguments? ")"
    
    Arguments = Exp ("," Exp)*

    ArrayAccess = identifier "[" Exp "]"

    Primary := FunctionCall | ArrayAccess | Neg | Paren | number | variable

    spaces += comment
    comment = "//" (~("\r" | "\n") any)* ("\r" | "\n")
}
