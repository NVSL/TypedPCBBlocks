const enum ErrorCode {
  UnknownError = 'UnknownError',
  ParseError = 'ParseError',
  NewMatError = 'NewMatError',
  AddMatError = 'AddMatError',
  AddTschError = 'AddTschError',
  ConnectError = 'ConnectError',
  DRCError = 'DRCError',
  GenerateError = 'GenerateError',
}

class TschedaError extends Error {
  constructor(name: ErrorCode, message: string) {
    super(message);
    super.name = name;
  }
}

const isError = (result: any | TschedaError): result is TschedaError => {
  return !!(result as TschedaError)?.message;
};

type result<T> = [res: T | null, err: string | null];
const ok = <T>(res: T): result<T> => {
  return [res, null];
};
const error = (msg: string): result<never> => {
  return [null, msg];
};

class Result<T> {
  res: T | null;
  err: string | null;
  constructor(res: T | null = null, err: string | null = null) {
    this.res = res;
    this.err = err;
  }
  public ok(res: T): result<T> {
    this.res = res;
    return [this.res, this.err];
  }
  public error(msg: string): result<T> {
    this.err = msg;
    return [this.res, this.err];
  }
}

export { Result, result, ok, error, isError, TschedaError, ErrorCode };

/* Usage: 
Four diferent ways to use:

0. 
function test0(): boolean {
  // Uses standar Error Class
  throw new tschedaError(ErrorCode.UNKNOWN, 'An error');
}

1.
function test1(): boolean | Error {
  // return true
  return new Error('An error');
}

2.
function test2(): result<boolean> {
  // return ok(true);
  return err('An error');
}

3.
function test3(): result<boolean> {
  const result = new Result<boolean>();
  // return result.ok(true);
  return result.error('An error');
}
*/
