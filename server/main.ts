import { PROPS } from './data/typedDefinitions/PROTOCOL'; // TODO: Add as a package
import * as fs from 'fs';
import { tsch } from './tsch';
import { powerMat } from './tscheda';

interface tschPair {
  protocolKey: string;
  typedSchematic: tsch;
}

function loadConstrains(protocol: any, typedJson: any) {
  const loadedProtocol = Object.assign(protocol, typedJson);
  return loadedProtocol;
}

async function makeConnections(
  props: PROPS,
  tschParent: tschPair,
  tschChilds: tschPair[],
) {
  const path = './data/typedDefinitions/';
  // Checks
  if (tschChilds.length < 1) {
    console.error('Typed Schematic child list must be greater than one');
    return;
  }

  // Get protocol name from protocol-altname, returns SPI, I2C, etc
  const protocolKeysList = [tschParent.protocolKey].concat(
    tschChilds.map((e) => {
      return e.protocolKey;
    }),
  );
  const protocolName = tsch.getProtocolName(protocolKeysList);
  if (protocolName == null) {
    console.error('Protoco Name could nor be defined from');
    return;
  }

  try {
    // Dynamically import protcol class
    const protocolClass = await import(path + protocolName);
    console.log(protocolClass);

    // Load tsch Parent Class
    const tschClassParent: typeof protocolClass = loadConstrains(
      new protocolClass[protocolName](props),
      tschParent.typedSchematic.getVars(tschParent.protocolKey),
    );
    console.log('PARENT >> \n', tschClassParent);

    // Load tsch Childs Class
    const tschClassChilds: typeof protocolClass = [];
    for (const tschChild of tschChilds) {
      const tschClass = loadConstrains(
        new protocolClass[protocolName](props),
        tschChild.typedSchematic.getVars(tschChild.protocolKey),
      );
      tschClassChilds.push(tschClass);
      console.log('CHILD >> \n', tschClass);
    }

    // Connect:
    tschClassParent.connect(tschClassChilds);
  } catch (e) {
    console.error(e);
  }
}

// Main program
(async () => {
  // Global propagation properties
  const props: PROPS = {
    sourceVoltage: 3.3,
  };

  const tschPath = 'data/typedSchematics/';

  const typedATMEGA328 = new tsch();
  await typedATMEGA328.loadTsch(
    fs.readFileSync(tschPath + 'atmega328.sch', {
      encoding: 'utf8',
    }),
  );
  console.log(typedATMEGA328.getTsch());
  console.log(typedATMEGA328.getVars('SPI-0'));

  const typedFlashOne = new tsch();
  await typedFlashOne.loadTsch(
    fs.readFileSync(tschPath + 'flash.sch', {
      encoding: 'utf8',
    }),
  );
  console.log(typedFlashOne.getTsch());
  console.log(typedFlashOne.getVars('SPI-0'));

  // await makeConnections(
  //   props,
  //   { protocolKey: 'SPI-0', typedSchematic: typedATMEGA328 },
  //   [{ protocolKey: 'SPI-0', typedSchematic: typedFlashOne }],
  // );

  const power = new powerMat();
  const MatOne = power.newMat();
  console.log('ROOT ID:', MatOne.uuid);
  const MatTwo = power.newMat();
  const MatThree = power.newMat();
  const MatFour = power.newMat();
  power.addMat('root', MatOne);
  power.addMat(MatOne.uuid, MatTwo);
  power.addMat(MatOne.uuid, MatThree);
  power.addMat(MatTwo.uuid, MatFour);

  console.log(power.matsTree);
  console.log(power.matsMap);
})();
