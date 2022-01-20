const enum ErrorCode {
  UNKNOWN,
  VOLTAGESNOFIT,
}

class Error {
  msg: string;
  code: ErrorCode;
  constructor(errMsg: string, code: ErrorCode = ErrorCode.UNKNOWN) {
    this.code = code;
    this.msg = errMsg;
  }
}

const isError = (result: any | Error): result is Error => {
  return !!(result as Error)?.msg;
};

type result<T> = [res: T | null, err: Error | null];

const ok = <T>(res: T): result<T> => {
  return [res, null];
};

const err = (msg: string): result<never> => {
  return [null, new Error(msg)];
};

class Result<T> {
  res: T | null;
  err: Error | null;
  constructor(res: T | null = null, err: Error | null = null) {
    this.res = res;
    this.err = err;
  }
  public ok(res: T): result<T> {
    this.res = res;
    return [this.res, this.err];
  }
  public error(msg: string): result<T> {
    this.err = new Error(msg);
    return [this.res, this.err];
  }
}

export { Result, result, Error, ok, err, isError };

/* Usage: 
Three diferent ways to use:

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
