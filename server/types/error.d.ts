declare const enum ErrorCode {
    UnknownError = "UnknownError",
    ParseError = "ParseError",
    NewMatError = "NewMatError",
    AddMatError = "AddMatError",
    AddTschError = "AddTschError",
    ConnectError = "ConnectError",
    GenerateError = "GenerateError"
}
declare class tschedaError extends Error {
    constructor(name: ErrorCode, message: string);
}
declare const isError: (result: any | tschedaError) => result is tschedaError;
declare type result<T> = [res: T | null, err: string | null];
declare const ok: <T>(res: T) => result<T>;
declare const error: (msg: string) => result<never>;
declare class Result<T> {
    res: T | null;
    err: string | null;
    constructor(res?: T | null, err?: string | null);
    ok(res: T): result<T>;
    error(msg: string): result<T>;
}
export { Result, result, ok, error, isError, tschedaError, ErrorCode };
