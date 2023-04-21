
use std::{rc::Rc, collections::{HashMap, HashSet}, cell::RefCell, borrow::{Borrow, BorrowMut}, fmt::Display};

use regex::Regex;

use wasm_bindgen::prelude::*;

use lazy_static::lazy_static;

#[wasm_bindgen]
extern {
    pub fn alert(s: &str);

    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}

#[derive(Debug, Clone)]
pub enum LCExpr {
    Lambda(u32, Rc<LCExpr>),
    Pair(Rc<LCExpr>, Rc<LCExpr>),
    Variable(u32)
}

impl Display for LCExpr {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LCExpr::Lambda(varname, body) => 
                write!(f, "\\{}. ({})", varname, body),
            LCExpr::Pair(var1, var2) => write!(f, "({} {})", var1, var2),
            LCExpr::Variable(varname) => write!(f, "{}", varname)
        }
    }
}

#[derive(Debug, Clone)]
pub struct LCReader {
    matcher: Rc<LCExpr>,
    compiler: Rc<LCExpr>
}

#[derive(Debug)]
pub struct LCContext {
    readers: Vec<LCReader>,
    assignments: HashMap<String, Rc<LCExpr>>,
    var_counter: u32,
}

pub trait LCContextCounter {
    fn new_var(&mut self) -> u32;
}

impl LCContextCounter for LCContext {
    fn new_var(&mut self) -> u32 {
        self.var_counter += 1;
        self.var_counter - 1
    }
}

pub trait TokenStream<T> {
    fn consume(&self) -> Option<&T>;
    fn peek(&self) -> Option<&T>;
    fn rewind(&self) -> bool;
}

#[derive(Clone)]
pub enum LCTokenType { Reader(LCReader), Default }

#[derive(Clone, Copy)]
pub enum LCTokenCategory {
    Paren, Lambda, LambdaDot, Variable, Other
}

pub struct LCTokenStream<'a> {
    pos: RefCell<usize>,
    substrings: Vec<(&'a str, LCTokenType, LCTokenCategory)>
}

impl<'a> TokenStream<(&'a str, LCTokenType, LCTokenCategory)> for LCTokenStream<'a> {
    fn consume(&self) -> Option<&(&'a str, LCTokenType, LCTokenCategory)> {
        let elem = self.substrings.get(self.pos.clone().into_inner());
        self.pos.replace_with(|&mut x| x + 1);
        elem
    } 
    fn peek(&self) -> Option<&(&'a str, LCTokenType, LCTokenCategory)> {
        self.substrings.get(self.pos.clone().into_inner())
    }
    fn rewind(&self) -> bool {
        let rewound = self.pos.clone().into_inner() != 0;
        if self.pos.clone().into_inner() > 0 {
            self.pos.replace_with(|&mut x| x - 1);
        }
        rewound
    }
}

pub fn rename_variables(
    expr: Rc<LCExpr>, 
    ctx: &mut LCContext, 
    replacements: &mut HashMap<u32, Rc<Lazy<Rc<LCExpr>, Rc<LCExpr>>>>
) -> Rc<LCExpr> {
    fn helper(expr: Rc<LCExpr>, ctx: &mut LCContext, map: &HashMap<u32, u32>, replacements: &mut HashMap<u32, Rc<Lazy<Rc<LCExpr>, Rc<LCExpr>>>>) -> Rc<LCExpr> {
        match expr.as_ref() {
            LCExpr::Lambda(var, body) => {
                let new_var = ctx.new_var();
                // match replacements.get(var) {
                //     Some(expr) => { replacements.insert(new_var, expr.clone());},
                //     _ => {}
                // };
                LCExpr::Lambda(new_var, helper(body.to_owned(), ctx, &{
                    let mut map_copy = map.clone();
                    map_copy.insert(*var, new_var);
                    map_copy
                }, replacements)).into()
            },
            LCExpr::Pair(expr1, expr2) => LCExpr::Pair(
                helper(expr1.to_owned(), ctx, map, replacements),
                helper(expr2.to_owned(), ctx, map, replacements)
            ).into(),
            LCExpr::Variable(var) => LCExpr::Variable(*map.get(&var).unwrap_or(&var)).into()
        }
    }
    helper(expr, ctx, &HashMap::new(), replacements)
}

pub fn lc_as_bool(input: &LCExpr) -> Option<bool> {
    match input {
        LCExpr::Lambda(true_var, body) => match body.as_ref() {
            LCExpr::Lambda(false_var, body2) => match body2.as_ref() {
                LCExpr::Variable(var) => 
                    if *var == *true_var { Some(true) } 
                    else if *var == *false_var { Some(false) }
                    else { None },
                _ => None
            },
            _ => None
        },
        _ => None
    }
}

pub fn lc_as_int_enum(input: &LCExpr) -> Option<usize> {
    let mut variables: HashMap<u32, usize> = HashMap::new();
    fn lc_as_int_enum_helper (input: &LCExpr, variables: &mut HashMap<u32, usize>) -> Option<usize> {
        match input {
            LCExpr::Lambda(variant, body) => {
                variables.insert(*variant, variables.len());
                lc_as_int_enum_helper(body.as_ref(), variables)
            },
            LCExpr::Variable(var) => variables.get(&var).map_or(None, |x| Some(x.to_owned())),
            _ => None
        }
    }
    lc_as_int_enum_helper(&input, &mut variables)
}

pub fn int_to_lc_expr(input: u32, var_counter: &mut u32) -> Rc<LCExpr> {
    *var_counter += 1;
    let var1 = *var_counter;
    *var_counter += 1;
    let var2 = *var_counter;

    fn helper(input: u32, var1: u32, var2: u32, var_counter: &mut u32) -> Rc<LCExpr> {
        match input {
            0 => LCExpr::Variable(var2).into(),
            _ => LCExpr::Pair(LCExpr::Variable(var1).into(), helper(input - 1, var1, var2, var_counter)).into()
        }
    }

    LCExpr::Lambda(var1, 
        LCExpr::Lambda(var2, helper(input, var1, var2, var_counter)).into()
    ).into()
}

pub fn int_arr_to_lc_expr(input: &mut dyn Iterator<Item = u32>, var_counter: &mut u32) -> Rc<LCExpr> {
    fn helper(input: &mut dyn Iterator<Item = u32>, var_counter: &mut u32) -> Rc<LCExpr> {    
        *var_counter += 1;
        let nil_var = *var_counter;
        *var_counter += 1;
        let pair_var = *var_counter;
        LCExpr::Lambda(nil_var,
            LCExpr::Lambda(pair_var, 
                match input.next() {
                    Some(x) => {
                        LCExpr::Pair(
                            LCExpr::Pair(
                                LCExpr::Variable(pair_var).into(),
                                int_to_lc_expr(x, var_counter)
                            ).into(),
                            helper(input, var_counter)
                        ).into()
                    }
                    None => {
                        LCExpr::Variable(nil_var).into()
                    }
                }
            ).into()
        ).into()
    }
    helper(input, var_counter)
}

pub fn tokenize_lc_str<'a>(input: &'a str, statements: &mut LCContext) -> Result<LCTokenStream<'a>, String> {
    lazy_static! {
        static ref REGEXES: [(Regex, Option<LCTokenCategory>); 5] = [
            (Regex::new(r"^\\").unwrap(), Some(LCTokenCategory::Lambda)),
            (Regex::new(r"^\.").unwrap(), Some(LCTokenCategory::LambdaDot)),
            (Regex::new(r"^\w+").unwrap(), Some(LCTokenCategory::Variable)),
            (Regex::new(r"^(\(|\))").unwrap(), Some(LCTokenCategory::Paren)),
            (Regex::new(r"^\s+").unwrap(), None)
        ];
    }

    log(format!("tokenize input: {}", input).as_str());

    let mut tokens: Vec<(&'a str, LCTokenType, LCTokenCategory)> = Vec::new();

    let mut position = 0;
    while position < input.len() {

        let mut should_continue = false;

        for reader in &statements.readers.clone() {
            let mut match_state = 1u32;
            let mut match_length = 1usize;
            while match_state == 1u32 {

                if position + match_length >= input.len() {break;}

                let expr = LCExpr::Pair(
                    reader.matcher.to_owned(),
                    int_arr_to_lc_expr(
                        &mut input[position..position + match_length].chars().into_iter()
                        .map(|x| x as u32).into_iter()
                        , &mut statements.var_counter)
                );
                match lc_as_int_enum(eval_lc(expr.into(), statements).borrow()) {
                    Some(x) => match_state = x as u32,
                    None => return Err(format!("Reader returned unexpected value."))
                }
                if match_state > 2 {
                    return Err(format!("Reader returned a value of an n-tuple which is too large!"))
                }
                match_length += 1;
            }

            if match_state == 2 {
                log("MATCH FOUND");
                tokens.push((&input[position..position + match_length], LCTokenType::Reader(LCReader { 
                    matcher: reader.matcher.clone(), compiler: reader.compiler.clone()
                }), LCTokenCategory::Other));
                position += match_length;
                should_continue = true;
                break;
            }
        }

        if should_continue { continue }

        for (regexp, token_cat) in REGEXES.iter() {
            let rgx_match = regexp.find(&input[position..]);
            // matches regular syntax
            match rgx_match {
                Some(found) => {
                    let str = found.as_str();
                    log(format!("token: {}, position: {}", str, position).as_str());
                    match token_cat {
                        Some(cat) => 
                        tokens.push((str, LCTokenType::Default, *cat)),
                        None => {}
                    }
                    position += str.len();
                    should_continue = true;
                    break;
                },
                None => {}
            }
        }

        if should_continue { continue }

        return Err(format!("Syntax error at position {}.", position));
    }
    Ok(LCTokenStream { pos: 0.into(), substrings: tokens })
}

pub fn needs_replacement(input: Rc<LCExpr>, bound_vars: &HashSet<u32>) -> bool {
    fn helper(input: Rc<LCExpr>, bound_vars: &HashSet<u32>) -> bool {
        match input.borrow() {
            LCExpr::Pair(expr1, expr2) => {
                if helper(expr1.clone(), bound_vars) { return true }
                helper(expr2.clone(), bound_vars)
            }
            LCExpr::Lambda(var, expr) => {
                if bound_vars.contains(var) { return true }
                helper(expr.clone(), bound_vars)
            }
            LCExpr::Variable(var) => bound_vars.contains(var)
        }
    }

    helper(input, &bound_vars)
}

#[derive(Clone)]
pub enum Lazy<T, U> {
    Unevaluated(T),
    Evaluated(U)
}

pub fn eval_lc(input: Rc<LCExpr>, ctx: &mut LCContext) -> Rc<LCExpr> {
    let mut done = false;
    fn eval_variable(
        var: &u32, 
        repl: &Rc<Lazy<Rc<LCExpr>, Rc<LCExpr>>>,
        ctx: &mut LCContext, 
        replacements: &mut HashMap<u32, Rc<Lazy<Rc<LCExpr>, Rc<LCExpr>>>>, 
        bound_variables: &HashSet<u32>,
        done: &mut bool
    ) -> Rc<LCExpr> {
        *done = false;
        match repl.as_ref() {
            Lazy::Unevaluated(expr) => {
                let eval_expr = helper(if true || needs_replacement(expr.clone(), bound_variables)
                    { rename_variables(expr.clone(), ctx, replacements) }
                    else {expr.clone()},
                    ctx, replacements, bound_variables, done                
                );
                replacements.insert(*var, Lazy::Evaluated(eval_expr.clone()).into());
                eval_expr
            },
            Lazy::Evaluated(expr) => if true || needs_replacement(expr.clone(), bound_variables)
                { rename_variables(expr.clone(), ctx, replacements)} else {expr.clone()}
        }
    };
    fn try_eval_if_variable(
        expr: &Rc<LCExpr>,
        ctx: &mut LCContext, 
        replacements: &mut HashMap<u32, Rc<Lazy<Rc<LCExpr>, Rc<LCExpr>>>>, 
        bound_variables: &HashSet<u32>,
        done: &mut bool
    ) -> Option<Rc<LCExpr>> {
        match expr.as_ref() {
            LCExpr::Variable(var) => {
                let var_replacement = replacements.get(&var)
                    .map(|x| x.clone());
                match var_replacement {
                    Some(repl) => Some(eval_variable(var, &repl, ctx, replacements, bound_variables, done)),
                    None => None
                }
            },
            _ => None
        }
    }
    fn helper(
        input: Rc<LCExpr>, 
        ctx: &mut LCContext, 
        replacements: &mut HashMap<u32, Rc<Lazy<Rc<LCExpr>, Rc<LCExpr>>>>, 
        bound_variables: &HashSet<u32>,
        done: &mut bool
    ) -> Rc<LCExpr> {
        match input.borrow() {
            LCExpr::Pair(expr1, expr2) => match expr1.borrow() {
                LCExpr::Lambda(var, body) => {
                    *done = false;
                    let argument = expr2.clone();
                    let mut lazy_arg = Lazy::Unevaluated(argument);
                    replacements.insert(*var, Rc::new(lazy_arg));
                    let new_expr = helper(body.clone(), ctx, replacements, bound_variables, done);
                    new_expr
                },
                LCExpr::Variable(var) => {
                    match try_eval_if_variable(expr1, ctx, replacements, bound_variables, done) {
                        Some(new_expr1) => helper(LCExpr::Pair(
                            new_expr1,
                            expr2.clone()
                        ).into(), ctx, replacements, bound_variables, done),
                        None => LCExpr::Pair(
                            expr1.clone(),
                            try_eval_if_variable(expr2, ctx, replacements, bound_variables, done)
                                .unwrap_or(helper(expr2.clone(), ctx, replacements, bound_variables, done))
                        ).into()
                    }
                }
                _ => LCExpr::Pair(
                    helper(expr1.clone(), ctx, replacements, bound_variables, done),
                    helper(expr2.clone(), ctx, replacements, bound_variables, done),
                ).into()
            },
            LCExpr::Lambda(var, expr2) => 
                LCExpr::Lambda(*var, helper(expr2.clone(), ctx, replacements, &{
                    let mut new_bound_variables = bound_variables.clone();
                    new_bound_variables.insert(*var);
                    new_bound_variables
                }, done).into()).into(),
            LCExpr::Variable(var) => input
        }
    }
    let mut expr = input;
    let mut replacements: HashMap<u32, Rc<Lazy<Rc<LCExpr>, Rc<LCExpr>>>> = HashMap::new();
    while !done {
        done = true;
        log(format!("Result intermediary: {}", expr).as_str());
        for var_index in vec![307, 367, 368] {
            replacements.get(&var_index).map(|x| {
                match x.as_ref() {
                    Lazy::Unevaluated(e) => 
                    log(format!("{} unevaluated: {}", var_index, e).as_str()),
                    Lazy::Evaluated(e) => 
                    log(format!("{} evaluated: {}", var_index, e).as_str()),
                }
            });
        }
        expr = helper(expr, ctx, &mut replacements, &HashSet::new(), &mut done);
        match expr.as_ref() {
            LCExpr::Variable(var) => done = false,
            _ => {}
        }
        expr = try_eval_if_variable(&expr, ctx, &mut replacements, &HashSet::new(), &mut done)
            .unwrap_or(expr);

    }
    expr
}

pub fn parse_handle_readers(
    _token_stream: &LCTokenStream, 
    init_token: &(&str, LCTokenType, LCTokenCategory), 
    ctx: &mut LCContext,
    _var_bindings: &HashMap<&str, u32>
) -> Option<Rc<LCExpr>> {
    match &init_token.1 {
        LCTokenType::Reader(reader) => Some(eval_lc(LCExpr::Pair(
            reader.compiler.clone(),
            int_arr_to_lc_expr(&mut init_token.0.chars()
                .map(|x| x as u32).into_iter(), &mut ctx.var_counter)
                .into()
        ).into(), ctx).into()),
        _ => None
    }
}


pub fn parse_lookup_variable(
    init_token: &(&str, LCTokenType, LCTokenCategory), 
    ctx: &mut LCContext,
    var_bindings: &HashMap<&str, u32>
) -> Option<Result<Rc<LCExpr>, String>> {
    match ctx.assignments.get(init_token.0) {
        Some(root_expr) => Some(Ok(rename_variables(root_expr.clone(), ctx, &mut HashMap::new()))),
        None => match var_bindings.get(init_token.0) {
            Some(var_index) => Some(Ok(LCExpr::Variable(*var_index).into())),
            None => Some(Ok(LCExpr::Variable(0).into()))
            //None => Some(Err(format!("Variable '{}' does not exist.", init_token.0)))
        }
    }
}

pub fn parse_lambda(
    token_stream: &LCTokenStream, 
    _init_token: &(&str, LCTokenType, LCTokenCategory), 
    ctx: &mut LCContext,
    var_bindings: &HashMap<&str, u32>,
    binding_power: u32
) -> Option<Result<Rc<LCExpr>, String>> {
    
    let mut vars: Vec<&str> = Vec::new();

    loop {
        match token_stream.consume() {
            Some(token) => {
                match token.2 {
                    LCTokenCategory::Variable => vars.push(token.0),
                    LCTokenCategory::LambdaDot => {
                        break
                    },
                    _ => return Some(Err("Expected a '.' or a variable.".to_owned()))
                }
            }
            None => return Some(Err("Unexpected end of input 5.".to_owned()))
        }
    }

    let mut var_indices: Vec<u32> = Vec::new();

    let new_var_bindings = {
        let mut new_var_bindings_temp = var_bindings.clone();
        for var in vars {
            let index = ctx.new_var();
            var_indices.push(index);
            new_var_bindings_temp.insert(var, index);
        }
        new_var_bindings_temp
    };

    fn helper(var_indices: &[u32], inner_expr: Rc<LCExpr>) -> Rc<LCExpr> {
        match var_indices {
            [head, tail @ ..] => {
                LCExpr::Lambda(*head, helper(tail, inner_expr)).into()
            },
            _ => {
                inner_expr
            } 
        }
    }

    Some(Ok(helper(
        &var_indices,
        match parse_lc_expr(token_stream, binding_power, ctx, &new_var_bindings) {
            Ok(x) => x,
            Err(x) => return Some(Err(x))
        }
    )))
}

pub fn parse_paren(
    token_stream: &LCTokenStream, 
    init_token: &(&str, LCTokenType, LCTokenCategory), 
    ctx: &mut LCContext,
    var_bindings: &HashMap<&str, u32>,
    binding_power: u32
) -> Option<Result<Rc<LCExpr>, String>>  {
    if init_token.0 == ")" {return None}
    let inner_expr = Some(parse_lc_expr(token_stream, binding_power, ctx, var_bindings));
    match token_stream.consume() {
        Some(token) => {
            if token.0 != ")" {
                return Some(Err(format!("Expected ')', got '{}'", token.0).to_owned())) 
            }
            return inner_expr;       
        },
        None => return Some(Err("Unexpected end of input 3.".to_owned()))
    }
}

pub fn init_parselet(
    token_stream: &LCTokenStream, 
    init_token: &(&str, LCTokenType, LCTokenCategory), 
    ctx: &mut LCContext,
    var_bindings: &HashMap<&str, u32>
) -> Option<Result<Rc<LCExpr>, String>> {
    match parse_handle_readers(token_stream, init_token, ctx, var_bindings) {
        Some(expr) => Some(Ok(expr)),
        None => match init_token.2 {
            LCTokenCategory::Lambda => {
                parse_lambda(token_stream, init_token, ctx, var_bindings, 0)
            },
            LCTokenCategory::Paren => parse_paren(token_stream, init_token, ctx, var_bindings, 0),
            LCTokenCategory::Variable => parse_lookup_variable(init_token, ctx, var_bindings),
            _ => None
        } 
    }
    
}

pub fn get_binding_power(token: &(&str, LCTokenType, LCTokenCategory)) -> u32 {
    match token {
        (_, _, LCTokenCategory::Variable) => 1,
        (")", _, LCTokenCategory::Paren) => 0,
        _ => 1
    }
}

pub fn consequent_parselet(
    token_stream: &LCTokenStream, 
    prev_node: &Rc<LCExpr>, 
    init_token: &(&str, LCTokenType, LCTokenCategory), 
    ctx: &mut LCContext,
    var_bindings: &HashMap<&str, u32>
) -> Option<Result<Rc<LCExpr>, String>> {
    match parse_handle_readers(token_stream, init_token, ctx, var_bindings) {
        Some(expr) => Some(Ok(expr)),
        None => match match init_token.2 {
            LCTokenCategory::Lambda => parse_lambda(token_stream, init_token, ctx, var_bindings, 0),
            LCTokenCategory::Variable => parse_lookup_variable(init_token, ctx, var_bindings),
            LCTokenCategory::Paren => parse_paren(token_stream, init_token, ctx, var_bindings, 0),
            _ => None
        }? {
            Ok(x) => Some(Ok(LCExpr::Pair(prev_node.clone(), x).into())),
            Err(x) => Some(Err(x))
        }
    }
}



pub fn parse_lc_expr(token_stream: &LCTokenStream, binding_power: u32, ctx: &mut LCContext, var_bindings: &HashMap<&str, u32>) -> Result<Rc<LCExpr>, String> {
    let init_token = token_stream.consume()
        .ok_or(format!("Unexpected end of input 1."))?.clone();

    log(format!("Init token {}", init_token.0).as_str());

    let mut left_node = init_parselet(token_stream, &init_token, ctx, var_bindings)
        .ok_or(format!("Unexpected token '{}'", init_token.0))??;

    loop {
        match token_stream.peek() {
            Some(_) => {},
            None => return Ok(left_node)
        }
    
        let next_token = token_stream.peek()
            .ok_or(format!("Unexpected end of input 2."))?.clone();

            log(format!("Next token {}", next_token.0).as_str());

        if get_binding_power(&next_token) <= binding_power {break;}

        log(format!("binding power correct").as_str());

        token_stream.consume();
        match consequent_parselet(token_stream, &left_node, &next_token, ctx, var_bindings) {
            Some(expr) => {
                left_node = expr?;
            },
            None => {
                token_stream.rewind();
                break
            }
        }
    }

    Ok(left_node)
}

pub fn compile_lc_expr(input: &str, statements: &mut LCContext) -> Result<Rc<LCExpr>, String> {
    let token_stream = tokenize_lc_str(input, statements)?;
    parse_lc_expr(&token_stream, 0, statements, &HashMap::new())
}

pub fn compile_lc(input: &str) -> Result<Rc<LCExpr>, String> {
    lazy_static! {
        static ref READER_DELIM_FINDER: Regex = Regex::new(r"^\w+")
        .expect("Bad reader delim regex!");
        static ref ASSIGNMENT: Regex = Regex::new(r"\w+\W*:=")
            .expect("Bad assignment regex!");
        static ref SPLIT_AT_READER: Regex = Regex::new(r"\s~reader")
        .expect("Bad regex!");
        static ref ASSIGNMENT_VARNAME: Regex = Regex::new(r"\w+")
            .expect("Bad assignment varname regex!");
    }

    let mut ctx: LCContext = LCContext {
        readers: Vec::new(),
        assignments: HashMap::new(),
        var_counter: 1
    };

    let reader_split = SPLIT_AT_READER
        .split(input);

    let mut first = true;

    for str in reader_split {
        let delim = if first { None } else { READER_DELIM_FINDER.find(str) };
        first = false;
        let mut non_reader_str;

        match delim {
            Some(m) => {
                let srcs: Vec<&str> = str.splitn(4, m.as_str())
                    .collect();

                if srcs.len() < 4 { return Err("Unexpected end of input 4.".into())}

                non_reader_str = srcs[3];

                let new_reader = LCReader { 
                    matcher: compile_lc_expr(srcs[1], &mut ctx)?.into(), 
                    compiler: compile_lc_expr(srcs[2],&mut ctx)?.into() 
                };

                ctx.readers.push(new_reader);

            },
            None => {
                non_reader_str = str;
            }
        }

        let mut matches: Vec<_> = ASSIGNMENT.find_iter(non_reader_str)
            .map(|s| (
                ASSIGNMENT_VARNAME.find(s.as_str()).unwrap().as_str(),
                s.start(),
                s.end()
            ))
            .collect();

        matches.push(("", non_reader_str.len(), non_reader_str.len()));

        let mut assignment_expressions = Vec::<(&str, usize, usize)>::new();

        for (start, end) 
            in matches[..matches.len()-1].iter().zip(matches[1..].iter()) {

            assignment_expressions.push((start.0, start.2, end.1));
        }
        

        for (varname, start, end) in assignment_expressions {
            let rhs = &non_reader_str[start..end];
            let assignment_expr = compile_lc_expr(&rhs, &mut ctx)?;
            //let evaluated_assignment_expr = eval_lc(assignment_expr, &mut ctx);
            ctx.assignments.insert(
                varname.to_owned(),
                assignment_expr
            );
        }
    }

    ctx.assignments.get("out").cloned()
        .ok_or("Output is produced through a variable named 'out', but no such variable exists.".to_owned())
        .map(|x| eval_lc(x, &mut ctx))
}

#[wasm_bindgen]
pub fn init_elc() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn test_compile_lc(input: &str) {
    match compile_lc(input) {
        Ok(ast) =>
        log(format!("Result: {}", ast).as_str()),
        Err(str) => log(format!("Err: {}", str).as_str())
    }
}