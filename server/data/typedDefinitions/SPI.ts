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

    return true;

    // // ## Connection Constrains:

    // // The following nets must exist
    // if (
    //   !(
    //     netOne.MISO &&
    //     netOne.MOSI &&
    //     netOne.SCK &&
    //     netTwo.MISO &&
    //     netTwo.MOSI &&
    //     netTwo.SCK
    //   )
    // ) {
    //   console.error('Invalid nets');
    //   return false;
    // }

    // // Net voltages must be equal
    // if (!(netOne.netVoltage == netTwo.netVoltage)) {
    //   console.error('Net voltages are not equal');
    //   return false;
    // }

    // // Add constrains
    // console.log('Connected!');
    // return true;
  }
}

export { SPI };
