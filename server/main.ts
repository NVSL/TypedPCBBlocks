import * as fs from 'fs';
import { tschEDA } from './tscheda';

function eagelFile(filename: string): { data: string; filename: string } {
  const tschPath = 'data/typedSchematics/';
  const data = fs.readFileSync(tschPath + filename, {
    encoding: 'utf8',
  });
  return { data: data, filename: filename };
}

function outputFile(jsonData: string) {
  const outputPath = 'output/tscheda.json';
  // Delete file if exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }
  // Write file
  fs.writeFileSync(outputPath, jsonData);
}

// Main program
(async () => {
  const tscheda = new tschEDA();

  const atmega328 = await tscheda.use(eagelFile('atmega328.sch'));
  const flash = await tscheda.use(eagelFile('flash.sch'));
  const power5V12V = await tscheda.use(eagelFile('power5V12V.sch'));
  const power5V = await tscheda.use(eagelFile('power5V.sch'));
  const power3V3 = await tscheda.use(eagelFile('power3V3.sch'));

  const Mat5V12V = tscheda.newMat(power5V12V);
  const Mat5V = tscheda.newMat(power5V);
  const Mat3V3 = tscheda.newMat(power3V3);

  tscheda.addMat('root', Mat5V12V);
  tscheda.addMat(Mat5V12V, Mat3V3);
  tscheda.addMat(Mat5V12V, Mat5V);

  tscheda.addTsch(Mat5V, atmega328);
  tscheda.addTsch(Mat5V, flash);
  console.log(tscheda.tschs);

  await tscheda.connect({ uuid: atmega328, protocol: 'SPI-0' }, [
    { uuid: flash, protocol: 'SPI-0' },
  ]);

  console.log(tscheda.connections);
  const jsonData = tscheda.generateJson();
  // console.log(jsonData);
  outputFile(jsonData);
})();

// TODO NEXT:
// -- Add better error handling
// -- Try more designs (Tre LED with no VIN)
// -- Add I2C constrains
// -- Clean code
// -- Add multiple designs?
