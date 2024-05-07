import test from "ava";
import { fakeRecursiveFunction } from "./recursion.js";

const factorial: (n: number) => number = fakeRecursiveFunction<number, number>(
  function* (n) {
    if (n === 1) return 1;
    return n * (yield n - 1);
  }
);

const num: (n: number) => number = fakeRecursiveFunction<number, number>(
  function* (n) {
    if (n === 1) return 1;
    return 1 + (yield n - 1);
  }
);

test("factorial", (t) => {
  t.deepEqual(factorial(1), 1);
  t.deepEqual(factorial(2), 2);
  t.deepEqual(factorial(3), 6);
  t.deepEqual(factorial(4), 24);
  t.deepEqual(factorial(5), 120);
  t.deepEqual(factorial(6), 720);
});

test("bypass recursion limit", (t) => {
  t.deepEqual(num(1234567), 1234567);
});
