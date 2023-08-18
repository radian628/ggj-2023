export function fakeRecursiveFunction<Args, ReturnType>(
  callback: (args: Args) => Generator<Args, ReturnType, ReturnType>
) {
  return function (args: Args): ReturnType {
    const evaluated: ReturnType[] = [];
    const stack: Generator<Args, ReturnType, ReturnType>[] = [callback(args)];
    while (stack.length > 0) {
      let last = stack[stack.length - 1];
      let val = last.next(
        ...(evaluated.length > 0 ? [evaluated.pop() as ReturnType] : [])
      );
      if (val.done) {
        evaluated.push(val.value);
        stack.pop();
      } else {
        stack.push(callback(val.value));
      }
    }
    return evaluated.pop() as ReturnType;
  };
}
