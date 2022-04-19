import axios from 'axios';
import FileSaver from 'file-saver';
import { TschedaFlow } from './TschedaFlow/TschedaFlow';

// Set server and axios
let SERVER_URL;
let WEBSITE_URL;
if (process.env.NODE_ENV === 'production') {
  // Set Production variables
  WEBSITE_URL = 'https://appliancizer.com/';
  SERVER_URL = 'https://appliancizer.com/api/';
} else {
  // Set Develpmnet variables
  WEBSITE_URL = 'http://localhost:3000/';
  SERVER_URL = 'http://localhost:4000/api/';
}
// Server URL
const server = axios.create({
  baseURL: SERVER_URL,
});

/*
 - Start integration with Tsch Lib

Left aside 
  - The Mats need a way to specify or add mutiple output voltages 
  - The Connections need a way to add weights or someting so they don't overlap the nodes
*/

// INIT TSCHEDA
const container = <HTMLElement>document.querySelector('#tschs');
const tschedaFlow = new TschedaFlow(
  container,
  'http://localhost:3000/data/typedConstraints/',
);

// ADD TYPED SCHEMATICS TO UI
tschedaFlow.addTypedSchematic('atmega328.sch', 100, 100);
tschedaFlow.addTypedSchematic('led_smd.sch', 100, 600);
tschedaFlow.addTypedSchematic('temperature_sensor.sch', 200, 600);
tschedaFlow.addTypedSchematic('flash.sch', 300, 600);
tschedaFlow.addTypedSchematic('power5V12V.sch', 400, 600);
tschedaFlow.addTypedSchematic('power5V.sch', 600, 600);

// Generate Schematic
document
  .querySelector('#buttonGenerateSchematic')!
  .addEventListener('click', async () => {
    const data = tschedaFlow.generateJSONSchematic();
    // const data = [
    //   {
    //     type: 'VOUT',
    //     wire: null,
    //     connect: [
    //       {
    //         schematic: 'power5V12V.sch',
    //         instance: 1,
    //         net: '@VOUT_5V-12V',
    //       },
    //       {
    //         schematic: 'power5V.sch',
    //         instance: 1,
    //         net: '@VIN_5V-15V',
    //       },
    //     ],
    //   },
    //   {
    //     type: 'VOUT',
    //     wire: null,
    //     connect: [
    //       {
    //         schematic: 'power5V.sch',
    //         instance: 1,
    //         net: '@VOUT_5V',
    //       },
    //       {
    //         schematic: 'flash.sch',
    //         instance: 1,
    //         net: '@VIN_5V',
    //       },
    //     ],
    //   },
    //   {
    //     type: 'SPI',
    //     wire: 'MOSI',
    //     connect: [
    //       {
    //         schematic: 'atmega328.sch',
    //         instance: 1,
    //         net: '#SPI-0.MOSI!||#GPIO-11!',
    //       },
    //       {
    //         schematic: 'flash.sch',
    //         instance: 1,
    //         net: '#SPI.MOSI',
    //       },
    //     ],
    //   },
    //   {
    //     type: 'SPI',
    //     wire: 'MISO',
    //     connect: [
    //       {
    //         schematic: 'atmega328.sch',
    //         instance: 1,
    //         net: '#SPI-0.MISO!||#GPIO-12!',
    //       },
    //       {
    //         schematic: 'flash.sch',
    //         instance: 1,
    //         net: '#SPI.MISO',
    //       },
    //     ],
    //   },
    //   {
    //     type: 'SPI',
    //     wire: 'SCK',
    //     connect: [
    //       {
    //         schematic: 'atmega328.sch',
    //         instance: 1,
    //         net: '#SPI-0.SCK!||#GPIO-13!',
    //       },
    //       {
    //         schematic: 'flash.sch',
    //         instance: 1,
    //         net: '#SPI.SCK',
    //       },
    //     ],
    //   },
    //   {
    //     type: 'GPIO',
    //     wire: null,
    //     connect: [
    //       {
    //         schematic: 'atmega328.sch',
    //         instance: 1,
    //         net: '#GPIO-4!',
    //       },
    //       {
    //         schematic: 'flash.sch',
    //         instance: 1,
    //         net: '#GPIO-CS',
    //       },
    //     ],
    //   },
    // ];
    const serverResult = await server.post('generatePCB', {
      schData: data,
    });
    console.log(serverResult);
    if (serverResult.data.schematic != null) {
      var file = new File([serverResult.data.schematic], 'merged.sch', {
        type: 'text/plain;charset=utf-8',
      });
      FileSaver.saveAs(file);
    } else {
      console.error('TODO, output file error');
    }
  });

// Print map
document.querySelector('#buttonPrintMap')!.addEventListener('click', () => {
  tschedaFlow.printConnectionMap();
});

// Check DRC
document.querySelector('#buttonCheckDrc')!.addEventListener('click', () => {
  tschedaFlow.checkDRC();
});
