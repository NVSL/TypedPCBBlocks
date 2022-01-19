import { PROTOCOL, POWER, net, voltage } from './PROTOCOL';

class I2C extends POWER implements PROTOCOL<I2C> {
  // Nets
  SDA: net = false;
  SCL: net = false;
  // Options
  arch: string | null = null;
  address: string | null = null;
  constructor(sourceVoltage: voltage) {
    super(sourceVoltage);
  }
  public connect(childs: Array<I2C>): boolean {
    const parent = this;

    // ## Connection Constrains:
    for (const child of childs) {
      // The following nets must exist
      if (!(parent.SDA && parent.SCL && child.SDA && child.SCL)) {
        console.error('Missing protocol nets');
        return false;
      }

      // Net voltages must be equal
      if (parent.netVoltage) {
        if (!(parent.netVoltage == child.netVoltage)) {
          console.error('Net voltages are not equal');
          return false;
        }
      } else {
        // Net voltages same as Source voltages. Source voltages must fit
        if (parent.sourceVoltage && child.sourceVoltage) {
          if (!this.voltagesFit(parent.sourceVoltage, child.sourceVoltage)) {
            console.error('Source voltages dont fit');
            return false;
          }
        } else {
          console.error('Source voltage not found');
          return false;
        }
      }

      // Options
      if (parent.arch == null || child.arch == null) {
        console.warn(
          'Unknown I2C master-slave architecture, doing nothing',
          '- parent arch:',
          parent.arch,
          '- child arch:',
          child.arch,
        );
      } else {
        if (!(parent.arch == 'master' && child.arch == 'slave')) {
          console.error(
            'SPI parent and child architecture must be of type master-slave',
            '- parent arch:',
            parent.arch,
            '- child arch:',
            child.arch,
          );
          return false;
        }
      }
    }

    // I2C Addresses must exists for childs
    let i2Caddresses: Array<string> = [];
    for (const child of childs) {
      if (child.address == null) {
        console.error('I2C address must exists');
        return false;
      } else {
        i2Caddresses.push(child.address);
      }
    }

    // I2C addresses must be unique
    const sortedAddr = i2Caddresses.sort();
    for (let i = 0; i < sortedAddr.length; i++) {
      if (sortedAddr[i + 1] != undefined) {
        if (sortedAddr[i] == sortedAddr[i + 1]) {
          console.error(
            `I2C address must be unique, found two ${sortedAddr[i]} addresses`,
          );
          return false;
        }
      }
    }
    // Connected :D
    return true;
  }
}

export { I2C };
