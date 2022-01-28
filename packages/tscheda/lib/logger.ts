class Debug {
  activate: boolean = false;
  level: number = 1;
  constructor(activate) {
    this.activate = activate;
  }
  log(verboseLevel: number, message?: any, ...optionalParams: any[]) {
    if (this.activate) {
      if (this.level >= verboseLevel) console.log(message, ...optionalParams);
    }
  }
  enable(enable: boolean, verboseLevel: number = 1) {
    this.activate = enable;
    this.level = verboseLevel;
  }
}

const debug = new Debug(false);

export default debug;
