import { PROTOCOL, POWER, PROPS, net } from './PROTOCOL';

class SPI extends POWER implements PROTOCOL<SPI> {
  MISO: net = false;
  MOSI: net = false;
  SCK: net = false;
  constructor(props: PROPS) {
    super(props);
    console.log(props);
  }
  public connect(childs: Array<SPI>): boolean {
    const parent = this;

    console.log(childs);

    // // ## Connection Constrains:
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
    }

    // Connected :D
    console.log('Connected!');
    return true;
  }
}

export { SPI };
