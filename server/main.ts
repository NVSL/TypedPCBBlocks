import { PROPS } from './data/typedDefinitions/PROTOCOL'; // TODO: Add as a package
import * as fs from 'fs';
import Tsch from './tsch';

function loadProtocol(protocol: any, typedJson: any) {
  const loadedProtocol = Object.assign(protocol, typedJson);
  return loadedProtocol;
}

async function makeConnections(
  props: PROPS,
  protocolStr: string,
  typedJsonOne: any,
  typedJsonTwo: any,
) {
  const path = './data/typedDefinitions/';
  const protocol = await import(path + protocolStr);
  console.log(protocol);
  const netOne = loadProtocol(new protocol[protocolStr](props), typedJsonOne);
  const netTwo = loadProtocol(new protocol[protocolStr](props), typedJsonTwo);
  console.log(netOne);
  console.log(netTwo);

  // Connect:
  netOne.connect(netTwo);
}

// Main program
(async () => {
  // Typed NET ONE
  const typedJsonOne = {
    MISO: true,
    MOSI: true,
    SCK: true,
    netVoltage: 3.3,
  };

  // Typed NET TWO
  const typedJsonTwo = {
    MISO: true,
    MOSI: true,
    SCK: true,
    netVoltage: 3.3,
  };

  // Global propagation properties
  const props: PROPS = {
    sourceVoltage: 3.3,
  };

  // Load XML
  const data = fs.readFileSync('data/typedSchematics/atmega328.sch', {
    encoding: 'utf8',
    flag: 'r',
  });

  const tsch = new Tsch();
  tsch.loadXML(data);

  //await makeConnections(props, 'SPI', typedJsonOne, typedJsonTwo);
})();
