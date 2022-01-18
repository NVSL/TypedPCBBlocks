import { PROTOCOL, POWER, net, voltage } from './PROTOCOL';

class SPI extends POWER implements PROTOCOL<SPI> {
  // Nets
  MISO: net = false;
  MOSI: net = false;
  SCK: net = false;
  // Options
  arch: string | null = null;
  constructor(sourceVoltage: voltage) {
    super(sourceVoltage);
  }
  public connect(childs: Array<SPI>): boolean {
    const parent = this;

    // ## Connection Constrains:
    for (const child of childs) {
      // The following nets must exist
      if (
        !(
          parent.MISO &&
          parent.MOSI &&
          parent.SCK &&
          child.MISO &&
          child.MOSI &&
          child.SCK
        )
      ) {
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
          'Unknown SPI master-slave architecture, doing nothing',
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

    // Connected :D
    return true;
  }
}

export { SPI };
