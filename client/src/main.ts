import axios from 'axios';
import FileSaver from 'file-saver';
import { TschedaFlow } from './TschedaFlow/TschedaFlow';
import './style.css';

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
tschedaFlow.addTypedSchematic('led_smd.sch', 20, 100);
tschedaFlow.addTypedSchematic('led_smd.sch', 20, 380);
tschedaFlow.addTypedSchematic('temperature_sensor.sch', 20, 600);
tschedaFlow.addTypedSchematic('flash.sch', 20, 1000);
tschedaFlow.addTypedSchematic('power5V12V.sch', 100, 400);
tschedaFlow.addTypedSchematic('power5V.sch', 600, 100);
tschedaFlow.addTypedSchematic('power3V3.sch', 800, 100);

// Generate Schematic
document
  .querySelector('#buttonGenerateSchematic')!
  .addEventListener('click', async () => {
    const data = tschedaFlow.generateJSONSchematic();
    console.log(JSON.stringify(data, null, 4));
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
    //         schematic: 'temperature_sensor.sch',
    //         instance: 1,
    //         net: '@VIN_2.7V-5.5V',
    //       },
    //     ],
    //   },
    //   {
    //     type: 'I2C',
    //     wire: 'SDA',
    //     connect: [
    //       {
    //         schematic: 'atmega328.sch',
    //         instance: 1,
    //         net: '#I2C-0.SDA!||#ADC-4!',
    //       },
    //       {
    //         schematic: 'temperature_sensor.sch',
    //         instance: 1,
    //         net: '#I2C-0.SDA',
    //       },
    //     ],
    //   },
    //   {
    //     type: 'I2C',
    //     wire: 'SCL',
    //     connect: [
    //       {
    //         schematic: 'atmega328.sch',
    //         instance: 1,
    //         net: '#I2C-0.SCL!||#ADC-5!',
    //       },
    //       {
    //         schematic: 'temperature_sensor.sch',
    //         instance: 1,
    //         net: '#I2C-0.SCL',
    //       },
    //     ],
    //   },
    //   {
    //     type: 'GPIO',
    //     wire: null,
    //     connect: [
    //       {
    //         schematic: 'temperature_sensor.sch',
    //         instance: 1,
    //         net: '#GPIO-ALERT!',
    //       },
    //       {
    //         schematic: 'atmega328.sch',
    //         instance: 1,
    //         net: '#GPIO-3!',
    //       },
    //     ],
    //   },
    // ];
    if (data == null) return;
    try {
      const serverResult = await server.post('generatePCB', {
        schData: data,
      });
      console.log('Server result', serverResult);
      if (serverResult.data.schematic != null) {
        var file = new File([serverResult.data.schematic], 'merged.sch', {
          type: 'text/plain;charset=utf-8',
        });
        FileSaver.saveAs(file);
      } else {
        console.error('TODO, output file error');
      }
    } catch (e: any) {
      tschedaFlow.displayError(e.toString());
    }
  });

// Print map
document.querySelector('#buttonPrintMap')!.addEventListener('click', () => {
  tschedaFlow.printConnectionMap();
});

// Check DRC
document.querySelector('#buttonCheckDrc')!.addEventListener('click', () => {
  try {
    tschedaFlow.checkDRC();
    console.log('Success no errors');
  } catch (e: any) {
    tschedaFlow.displayError(e.toString());
  }
});
