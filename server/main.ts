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

  // Load ATMEGA328
  const typedATMEGA328 = new tsch();
  await typedATMEGA328.loadTsch(
    fs.readFileSync(tschPath + 'atmega328.sch', {
      encoding: 'utf8',
    }),
  );
  // console.log(typedATMEGA328.getTsch());
  // console.log(typedATMEGA328.getVars('SPI-0'));

  // Load FLASH
  const typedFlashOne = new tsch();
  await typedFlashOne.loadTsch(
    fs.readFileSync(tschPath + 'flash.sch', {
      encoding: 'utf8',
    }),
  );
  // console.log(typedFlashOne.getTsch());
  // console.log(typedFlashOne.getVars('SPI-0'));

  // Load Power 5V12V
  const typedPowerConnector = new tsch();
  await typedPowerConnector.loadTsch(
    fs.readFileSync(tschPath + 'power5V12V.sch', {
      encoding: 'utf8',
    }),
  );
  console.log(typedPowerConnector.getTsch());
  console.log(typedPowerConnector.outputsPower);
  console.log(typedPowerConnector.getVars('VIN-0'));
  console.log(typedPowerConnector.getVars('VOUT-0'));

  // Load Power 5V
  const typedPower5V = new tsch();
  await typedPower5V.loadTsch(
    fs.readFileSync(tschPath + 'power5V.sch', {
      encoding: 'utf8',
    }),
  );
  console.log(typedPower5V.getTsch());
  console.log(typedPower5V.outputsPower);
  console.log(typedPower5V.getVars('VIN-0'));
  console.log(typedPower5V.getVars('VOUT-0'));

  // Load Power 3.3V
  const typedPower3V3 = new tsch();
  await typedPower3V3.loadTsch(
    fs.readFileSync(tschPath + 'power3V3.sch', {
      encoding: 'utf8',
    }),
  );
  console.log(typedPower3V3.getTsch());
  console.log(typedPower3V3.outputsPower);
  console.log(typedPower3V3.getVars('VIN-0'));
  console.log(typedPower3V3.getVars('VOUT-0'));

  // await makeConnections(
  //   props,
  //   { protocolKey: 'SPI-0', typedSchematic: typedATMEGA328 },
  //   [{ protocolKey: 'SPI-0', typedSchematic: typedFlashOne }],
  // );

  // // Power mats
  // TODO: Add power tsch's to powerMats structure
  const power = new powerMat();
  // const MatOne = power.newMat();
  // console.log('ROOT ID:', MatOne.uuid);
  // const MatTwo = power.newMat();
  // const MatThree = power.newMat();
  // const MatFour = power.newMat();
  // power.addMat('root', MatOne);
  // power.addMat(MatOne.uuid, MatTwo);
  // power.addMat(MatOne.uuid, MatThree);
  // power.addMat(MatTwo.uuid, MatFour);

  // console.log(power.matsTree);
  // console.log(power.matsMap);
})();
