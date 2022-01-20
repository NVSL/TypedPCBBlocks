declare const enum ErrorCode {
    UNKNOWN = 0,
    VOLTAGESNOFIT = 1
}
declare class Error {
    msg: string;
    code: ErrorCode;
    constructor(errMsg: string, code?: ErrorCode);
}
declare const isError: (result: any | Error) => result is Error;
declare type result<T> = [res: T | null, err: Error | null];
declare const ok: <T>(res: T) => result<T>;
declare const err: (msg: string) => result<never>;
declare class Result<T> {
    res: T | null;
    err: Error | null;
    constructor(res?: T | null, err?: Error | null);
    ok(res: T): result<T>;
    error(msg: string): result<T>;
}
export { Result, result, Error, ok, err, isError };
