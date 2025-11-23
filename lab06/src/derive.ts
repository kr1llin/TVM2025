import { binaryExp, binaryExpNode, Expr, Neg, Num, OperationType, types} from "../../lab04";

const bin = (l: Expr, r: Expr, op: OperationType): binaryExp => ({type: types[op], operator: op, left: l, right: r})
const neg = (e: Expr): Expr => ({type: 'negative', arg: e});
const num = (n: number): Expr => ({type: 'number', value: n});

export function derive(e: Expr, varName: string): Expr
{
    makeSimple(dx(e, varName));
    return makeSimple(dx(e, varName));
}

function dx(e: Expr, x: string): Expr{
    console.log(e.type);
    switch(e.type){
        case 'sum':
        case 'div':
        case 'mul':
        case 'sub':
            const a = e.left;
            const b = e.right;
            const da = dx(a, x);
            const db = dx(b,x);

            switch(e.operator){
                case '*': return bin(bin(da,b,'*'), bin(a,db,'*'), '+');
                case '/': return bin(bin(bin(da,b,'*'), bin(a,db,'*'), '-'), bin(b,b,'*'),'/');
                case '+': return bin(da,db,'+');
                case '-': return bin(da,db,'-');
            }
        case 'negative':
            return neg(dx(e.arg, x));
        case 'number':
            return num(0);
        case 'variable':
            return (e.name == x)? num(1) : num(0);
        case 'par':
            return dx(e.arg, x);
    }
}

function makeSimple(e: Expr): Expr {
    switch (e.type){
        case 'div':
        case 'mul':
        case 'sum':
        case 'sub':
            let a = makeSimple(e.left);
            let b = makeSimple(e.right);

            if (a.type == 'number' && b.type == 'number'){
                switch(e.operator){
                    case '*' : return num(a.value * b.value);
                    case '/' : return num(a.value / b.value);
                    case '+' : return num(a.value + b.value);
                    case '-' : return num(a.value - b.value);
                }
            }
            switch(e.operator) {
                case '*': 
                    if (isZero(a) || isZero(b)) return num(0);
                    if (a.type == 'negative' && b.type == 'negative') {
                        return bin(makeSimple(a.arg), makeSimple(b.arg), '*');
                    }
                    if (isOne(a)) return b;
                    if (isOne(b)) return a;
                    return bin(a,b,'*');
                case '/':
                    if (b.type == 'mul' || 'sum' || 'sub' || 'div'){
                        b = {type: 'par', arg: b};
                    }
                    
                    if (isOne(b)) return a;
                    if (isZero(a)) return num(0);
                    if (a.type == 'negative') {
                        if(b.type == 'negative') {
                            return bin(makeSimple(a.arg), makeSimple(b.arg), '/');
                        }
                        return neg(bin(a.arg, b, '/'));
                    }
                    if(b.type == 'negative') {
                        return neg(bin(a, b.arg, '/'));
                    }
                    if (a.type == 'number' && a.value < 0){
                        a.value = -a.value;
                        return neg(bin(a, b, '/'));
                    }
                    return bin(a,b,'/');
                case '+':
                    if (isZero(a)) return b;
                    if (isZero(b)) return a;
                    if (a.type == 'negative' && b.type == 'negative') {
                        return neg(bin(makeSimple(a.arg), makeSimple(b.arg), '+'));
                    }
                    return bin(a,b,'+');
                case '-':
                    if (isZero(a)) return (b.type == 'negative')? b.arg : neg(b);
                    if (isZero(b)) return a;
                    if (a.type == 'negative' && b.type == 'negative') {
                        return bin(makeSimple(b.arg), makeSimple(a.arg), '-');
                    }
                    return bin(a,b,'-');
            }
        case 'negative':
            let n: Neg = e as Neg;
            const innerExpr = makeSimple(n.arg);
            if (innerExpr.type == 'number') {
                return { type: 'number', value: (innerExpr.value == 0)? 0 : -innerExpr.value };
            }
            if (innerExpr.type == 'negative') {
                return innerExpr.arg;
            }
            return neg(innerExpr); 
        case 'number':
            return e;
        case 'variable':
            return e;
        case 'par':
            const simplifiedInner = makeSimple(e.arg);
            if (simplifiedInner.type == 'number' || simplifiedInner.type == 'variable') {
                return simplifiedInner;
            }
            return { type: 'par', arg: simplifiedInner };
        default:
            throw new Error("Meh");
    }
}

function isZero(e: Expr): boolean {
    return (e.type == 'number' && e.value == 0);
}

function isOne(e: Expr): boolean  {
    return (e.type == 'number' && e.value == 1);
}
