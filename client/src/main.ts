import axios from 'axios';
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
    // tschedaFlow.generateJSONSchematic();
    const data = {
      lal: 'fun',
    };
    let genRes = await server.post('generatePCB', {
      schData: data,
    });
    console.log(genRes);
  });

// Print map
document.querySelector('#buttonPrintMap')!.addEventListener('click', () => {
  tschedaFlow.printConnectionMap();
});

// Check DRC
document.querySelector('#buttonCheckDrc')!.addEventListener('click', () => {
  tschedaFlow.checkDRC();
});

// import { Flow } from './Flow/Flow';
// // ### UI Interface

// const container = <HTMLElement>document.querySelector('#tschs');
// const flow = new Flow(container);

// // Button AddMat
// document.querySelector('#addMatTsch')!.addEventListener('click', () => {
//   // flow.addMatTsch();
// });

// // Button AddTsch
// document.querySelector('#addBlockTsch')!.addEventListener('click', () => {
//   // flow.addBlockTsch();
// });

// // Add Node
// var computeModule = `
//       <div>
//         <div class="title-box"><i class="fas fa-code"></i> Compute Module</div>
//       </div>
//       `;
// flow.addNode(
//   'BlockTsch',
//   { 1: { name: 'GPIO', max: 2 } },
//   {
//     1: { name: 'GPIO', max: 2 },
//     2: { name: 'I2C', max: 2 },
//     3: { name: 'SPI', max: 2 },
//     4: { name: 'UART', max: 2 },
//   }, // 1:[type, max_connections]
//   100,
//   100,
//   'computeModule',
//   computeModule,
// );

// var pheripherial = `
//       <div>
//         <div class="title-box"><i class="fas fa-code"></i> Pheripherial</div>
//       </div>
//       `;
// flow.addNode(
//   'BlockTsch',
//   {
//     1: { name: 'GPIO', max: 2 },
//     2: { name: 'I2C', max: 2 },
//     3: { name: 'SPI', max: 2 },
//     4: { name: 'UART', max: 2 },
//   }, // 1:[type, max_connections]
//   {},
//   100,
//   500,
//   'pheripherial',
//   pheripherial,
// );

// const matModule5V = `
//       <div>
//         <div class="title-box"><i class="fas fa-code"></i>MAT 5V</div>
//       </div>
//       `;
// flow.addNode(
//   'MatTsch',
//   { 1: { name: 'I2C', max: 2 } },
//   { 1: { name: 'GPIO', max: 2 } }, // 1:[type, max_connections]
//   500,
//   100,
//   '',
//   matModule5V,
// );

// const matModule3V3 = `
//       <div>
//         <div class="title-box"><i class="fas fa-code"></i>MAT 3.3V</div>
//       </div>
//       `;
// flow.addNode(
//   'MatTsch',
//   {},
//   {}, // 1:[type, max_connections]
//   300,
//   100,
//   '',
//   matModule3V3,
// );
