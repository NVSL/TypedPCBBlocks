import { PROTOCOL, POWER, PROPS, net } from './PROTOCOL';

class SPI extends POWER implements PROTOCOL<SPI> {
  // Nets
  MISO: net = false;
  MOSI: net = false;
  SCK: net = false;
  // Options
  arch: string | null = null;
  constructor(props: PROPS) {
    super(props);
    console.log(props);
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
    console.log('Connected!');
    return true;
  }
}

export { SPI };
