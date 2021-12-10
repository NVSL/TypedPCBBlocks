import * as fs from 'fs';
import { tschEDA } from './tscheda';

function eagelFile(fileName: string): string {
  const tschPath = 'data/typedSchematics/';
  const eagleFile = fs.readFileSync(tschPath + fileName, {
    encoding: 'utf8',
  });
  return eagleFile;
}

// Main program
(async () => {
  const tscheda = new tschEDA();

  const atmega328 = await tscheda.use(eagelFile('atmega328.sch'));
  const flash = await tscheda.use(eagelFile('flash.sch'));
  const power5V12V = await tscheda.use(eagelFile('power5V12V.sch'));
  const power5V = await tscheda.use(eagelFile('power5V.sch'));
  const power3V3 = await tscheda.use(eagelFile('power3V3.sch'));

  const MatOne = tscheda.newMat(power5V12V);
  const MatTwo = tscheda.newMat(power5V);
  const MatThree = tscheda.newMat(power3V3);

  tscheda.addMat('root', MatOne!);
  tscheda.addMat(MatOne!.uuid, MatThree!);
  tscheda.addMat(MatOne!.uuid, MatTwo!);

  // console.log('TREE', tscheda.matsTree);
  // console.log('MAP', tscheda.matsMap);
  // console.log('-----------');
  tscheda.addTschToMat(MatTwo!.uuid, atmega328);
  tscheda.addTschToMat(MatTwo!.uuid, flash);
  console.log(MatTwo?.tschMap);

  await tscheda.connect(
    {
      sourceVoltage: 3.3,
    },
    { uuid: atmega328, protocol: 'SPI-0' },
    [{ uuid: flash, protocol: 'SPI-0' }],
  );

  console.log(tscheda.connections);
})();
