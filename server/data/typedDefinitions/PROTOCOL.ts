// Protocol Types
type net = boolean;

// Global propagation properties
interface PROPS {
  sourceVoltage: number;
}

// Power variables
class POWER {
  netVoltage: number | null = null;
  sourceVoltage: number | null = null;
  constructor(props: PROPS) {
    this.sourceVoltage = props.sourceVoltage;
  }
}

// PROTOCOL base
interface PROTOCOL<T> {
  connect(net2: T): boolean;
}

export { PROTOCOL, POWER, PROPS, net };
