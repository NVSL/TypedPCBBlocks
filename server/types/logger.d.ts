declare class Debug {
    activate: boolean;
    level: number;
    constructor(activate: any);
    log(verboseLevel: number, message?: any, ...optionalParams: any[]): void;
    enable(enable: boolean, verboseLevel?: number): void;
}
declare const debug: Debug;
export default debug;
