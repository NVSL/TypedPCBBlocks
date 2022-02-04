class _TschedaDebug {
  activate: boolean = false;
  level: number = 1;
  constructor(activate) {
    this.activate = activate;
  }
  log(verboseLevel: number, message?: any, ...optionalParams: any[]) {
    if (this.activate) {
      if (this.level >= verboseLevel) {
        //console.log('\x1b[36m%s\x1b[0m', 'I am cyan');
        console.log(message, ...optionalParams);
      }
    }
  }
  enable(enable: boolean, verboseLevel: number = 1) {
    this.activate = enable;
    this.level = verboseLevel;
  }
}

const TschedaDebug = new _TschedaDebug(false);

export default TschedaDebug;
