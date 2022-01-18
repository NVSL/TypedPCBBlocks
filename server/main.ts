import * as fs from 'fs';
import { tschEDA } from './tscheda';
import debug from './logger';

function eagelFile(filename: string): { data: string; filename: string } {
  const tschPath = 'data/typedSchematics/';
  const data = fs.readFileSync(tschPath + filename, {
    encoding: 'utf8',
  });
  return { data: data, filename: filename };
}

function outputFile(jsonData: string, filename: string) {
  const outputPath = `output/${filename}`;
  // Delete file if exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }
  // Write file
  fs.writeFileSync(outputPath, jsonData);
}

// ### DESIGNS ###

// Simple flash
async function flash(): Promise<void> {
  console.log('\n--- FLASH DESIGN');
  const tscheda = new tschEDA('./data/typedConstraints/');
  const atmega328 = await tscheda.use(eagelFile('atmega328.sch'));
  const flash = await tscheda.use(eagelFile('flash.sch'));
  const power5V12V = await tscheda.use(eagelFile('power5V12V.sch'));
  const power5V = await tscheda.use(eagelFile('power5V.sch'));

  const Mat5V12V = tscheda.newMat(power5V12V);
  const Mat5V = tscheda.newMat(power5V);

  tscheda.addMat('root', Mat5V12V);
  tscheda.addMat(Mat5V12V, Mat5V);

  tscheda.addTsch(Mat5V, atmega328);
  tscheda.addTsch(Mat5V, flash);

  await tscheda.connect({ uuid: atmega328, protocol: 'SPI-0' }, [
    { uuid: flash, protocol: 'SPI-0' },
  ]);

  console.log('@ Connection MAP');
  for (const [key, val] of tscheda.connections.entries()) {
    console.log(key, '|', val);
  }

  const jsonData = tscheda.generateJson();
  outputFile(jsonData, 'tscheda_flash.json');

  return;
}

// Two flash
async function twoFlash(): Promise<void> {
  console.log('\n--- TWO FLASH DESIGN');
  const tscheda = new tschEDA('./data/typedConstraints/');
  const atmega328 = await tscheda.use(eagelFile('atmega328.sch'));
  const flash = await tscheda.use(eagelFile('flash.sch'));
  const flash2 = await tscheda.use(eagelFile('flash.sch'));
  const power5V12V = await tscheda.use(eagelFile('power5V12V.sch'));
  const power5V = await tscheda.use(eagelFile('power5V.sch'));

  const Mat5V12V = tscheda.newMat(power5V12V);
  const Mat5V = tscheda.newMat(power5V);

  tscheda.addMat('root', Mat5V12V);
  tscheda.addMat(Mat5V12V, Mat5V);

  tscheda.addTsch(Mat5V, atmega328);
  tscheda.addTsch(Mat5V, flash);
  tscheda.addTsch(Mat5V, flash2);

  await tscheda.connect({ uuid: atmega328, protocol: 'SPI-0' }, [
    { uuid: flash, protocol: 'SPI-0' },
    { uuid: flash2, protocol: 'SPI-0' },
  ]);

  console.log('@ Connection MAP');
  for (const [key, val] of tscheda.connections.entries()) {
    console.log(key, '|', val);
  }

  const jsonData = tscheda.generateJson();
  outputFile(jsonData, 'tscheda_twoFlash.json');

  return;
}

// Simple led
async function led(): Promise<void> {
  console.log('\n--- LED DESIGN');
  const tscheda = new tschEDA('./data/typedConstraints/');
  const atmega328 = await tscheda.use(eagelFile('atmega328.sch'));
  const led = await tscheda.use(eagelFile('led_smd.sch'));
  const power5V12V = await tscheda.use(eagelFile('power5V12V.sch'));
  const power5V = await tscheda.use(eagelFile('power5V.sch'));

  const Mat5V12V = tscheda.newMat(power5V12V);
  const Mat5V = tscheda.newMat(power5V);

  tscheda.addMat('root', Mat5V12V);
  tscheda.addMat(Mat5V12V, Mat5V);

  tscheda.addTsch(Mat5V, atmega328);
  tscheda.addTsch(Mat5V, led);

  await tscheda.connect({ uuid: atmega328, protocol: 'GPIO-9' }, [
    { uuid: led, protocol: 'GPIO-0' },
  ]);

  console.log('@ Connection MAP');
  for (const [key, val] of tscheda.connections.entries()) {
    console.log(key, '|', val);
  }

  const jsonData = tscheda.generateJson();
  outputFile(jsonData, 'tscheda_led.json');

  return;
}

// Main program
(async () => {
  debug.enable(true, 1);
  await flash();
  await twoFlash();
  await led();
})();

// TODO NEXT:
// -- Add better error handling
// -- Try more designs (Add I2C)
// -- Add I2C constrains
// -- Add optional and forced connections plus a checker
// -- Add connection headers
