import init, {
  greet,
  init_elc,
  test_compile_lc,
} from "./elc/extensible_lambda_calculus.js";

import { render } from "solid-js/web";

function num(x: number): string {
  function helper(x: number): string {
    if (x == 0) return "x";
    if (x == 1) return "f x";
    return `f (${helper(x - 1)})`;
  }

  return `(\\f x.${helper(x)})`;
}

console.log(num(3));

const oldCode = `

true := \\ t f. t
false := \\ t f. f

and := \\ p q. p q p
or := \\ p q. p p q
not := \\p.p false true
if_else := \\p a b.p a b

succ := \\ m f x . f (m f x)
add := \\ m n f x . n f (m f x)
pred := \\ n f x.n (\\ g h. h (g f)) (\\u.x) (\\u.u)
sub := \\ m n. n pred m

is_zero := \\n.n (\\x. false) true

eq := \\a b. and (is_zero (sub a b)) (is_zero (sub b a))

0 := \\f x. x
1 := succ 0
2 := succ 1
3 := succ 2

some := \\x s n. s x
none := \\s n. n

unwrap_or := \\x y. (x (\\z. z) y)

nil := \\n c. n
cons := \\h t n c. c h t
head := \\l. l none (\\x y. some x)

is64 := \\x. (if_else (eq ${num(
  64
)} (unwrap_or (head x) 0)) (\\a b c. c) (\\a b c. a))


out_old := unwrap_or (head (cons 3 2)) 0

~readerDELIM
  is64
DELIM
  \\x. 3
DELIM

out := (add @) @

`;

const fastSubTest = `
  true := \\ t f. t
  false := \\ t f. f
  
  and := \\ p q. p q p
  or := \\ p q. p p q
  not := \\p.p false true
  if_else := \\p a b.p a b

  0 := \\f x. x
  fix := \\f. (\\x. x x) (\\x. f (x x))
  pair := \\x y p. p x y
  zeros := fix (pair 0)
  succ := \\n f x. f (n f x)
  add := \\m n f x. m f (n f x)

  head := \\h t. h
  tail := \\h t. t

  sub := \\n m. m (\\s. s tail) (n (\\s. pair (succ (s head)) s) zeros) head
  
  is_zero := \\n.n (\\x. false) true

  eq := \\a b. (and (is_zero (sub a b)) (is_zero (sub b a)))
  
  some := \\x s n. s x
  none := \\s n. n

  unwrap_or := \\x y. (x (\\z. z) y)

  nil := \\n c. n
  cons := \\h t n c. c h t
  list_head := \\l. l none (\\x y. some x)

  is64 := \\x. (if_else (eq ${num(
    64
  )} (unwrap_or (list_head x) 0)) (\\a b c. c) (\\a b c. a))

  num1 := ${num(2)}
  num2 := ${num(4)}

  out := (\\a b. (sub b a)) num1 num2
`;

init().then(() => {
  init_elc();
  test_compile_lc(fastSubTest);
});

render(() => <p>test</p>, document.body);

//Reader code:
/*

~readerDELIM
  is64
DELIM
  \\x. 3
DELIM

*/

/*

single element list: \\n c. c head tail

true := \ t f. t
false := \ t f. f

and := \ p q. p q p

and true true
= \ p q. p q p \t f. t \t f. t
= ((\t f. t \t f. t) \t f. t)
= ((\ f. \t f. t) \t f. t)
= (\t f. t)

and true true
= \p q. p q p \t f. t \t f. t
= \q.  \t f. t  q  \t f. t  \t f. t
= \q.  \f. q \t f. t \t f. t
= \q. q  \t f. t
= \t f. t

and true true
= \p q. p q p \t f. t \t f. t
= \q.  ((\t f. t  q)  \t f. t)  \t f. t
= \q.  ((\f. q) \t f. t) \t f. t
= (\f. \t2 f2. t2)  \t f. t 
= \t2 f2. t2

*/
