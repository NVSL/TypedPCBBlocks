import axios from 'axios';
import FileSaver from 'file-saver';
import { TschedaFlow } from './TschedaFlow/TschedaFlow';
import './style.css';
import 'bulma/css/bulma.min.css';

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
const editor = <HTMLElement>document.querySelector('#tschs');
const tschedaFlow = new TschedaFlow(
  editor,
  'http://localhost:3000/data/typedConstraints/',
);

// ADD TYPED SCHEMATICS TO UI
// tschedaFlow.addTypedSchematic('atmega328.sch', 100, 100);
// tschedaFlow.addTypedSchematic('led_smd.sch', 20, 100);
// tschedaFlow.addTypedSchematic('led_smd.sch', 20, 380);
// tschedaFlow.addTypedSchematic('temperature_sensor.sch', 516, 238);
// tschedaFlow.addTypedSchematic('flash.sch', 20, 1000);
// tschedaFlow.addTypedSchematic('power5V12V.sch', 100, 400);
// tschedaFlow.addTypedSchematic('power5V.sch', 400, 100);
// tschedaFlow.addTypedSchematic('power3V3.sch', 400, 100);

// // Generate Schematic
// document
//   .querySelector('#buttonGenerateSchematic')!
//   .addEventListener('click', async () => {
//     const data = tschedaFlow.generateJSONSchematic();
//     console.log(JSON.stringify(data, null, 4));
//     // const data = [
//     //   {
//     //     type: 'VOUT',
//     //     wire: null,
//     //     connect: [
//     //       {
//     //         schematic: 'power5V12V.sch',
//     //         instance: 1,
//     //         net: '@VOUT_5V-12V',
//     //       },
//     //       {
//     //         schematic: 'power5V.sch',
//     //         instance: 1,
//     //         net: '@VIN_5V-15V',
//     //       },
//     //     ],
//     //   },
//     //   {
//     //     type: 'VOUT',
//     //     wire: null,
//     //     connect: [
//     //       {
//     //         schematic: 'power5V.sch',
//     //         instance: 1,
//     //         net: '@VOUT_5V',
//     //       },
//     //       {
//     //         schematic: 'temperature_sensor.sch',
//     //         instance: 1,
//     //         net: '@VIN_2.7V-5.5V',
//     //       },
//     //     ],
//     //   },
//     //   {
//     //     type: 'I2C',
//     //     wire: 'SDA',
//     //     connect: [
//     //       {
//     //         schematic: 'atmega328.sch',
//     //         instance: 1,
//     //         net: '#I2C-0.SDA!||#ADC-4!',
//     //       },
//     //       {
//     //         schematic: 'temperature_sensor.sch',
//     //         instance: 1,
//     //         net: '#I2C-0.SDA',
//     //       },
//     //     ],
//     //   },
//     //   {
//     //     type: 'I2C',
//     //     wire: 'SCL',
//     //     connect: [
//     //       {
//     //         schematic: 'atmega328.sch',
//     //         instance: 1,
//     //         net: '#I2C-0.SCL!||#ADC-5!',
//     //       },
//     //       {
//     //         schematic: 'temperature_sensor.sch',
//     //         instance: 1,
//     //         net: '#I2C-0.SCL',
//     //       },
//     //     ],
//     //   },
//     //   {
//     //     type: 'GPIO',
//     //     wire: null,
//     //     connect: [
//     //       {
//     //         schematic: 'temperature_sensor.sch',
//     //         instance: 1,
//     //         net: '#GPIO-ALERT!',
//     //       },
//     //       {
//     //         schematic: 'atmega328.sch',
//     //         instance: 1,
//     //         net: '#GPIO-3!',
//     //       },
//     //     ],
//     //   },
//     // ];
//     if (data == null) return;
//     try {
//       const serverResult = await server.post('generatePCB', {
//         schData: data,
//       });
//       console.log('Server result', serverResult);
//       if (serverResult.data.schematic != null) {
//         var file = new File([serverResult.data.schematic], 'merged.sch', {
//           type: 'text/plain;charset=utf-8',
//         });
//         FileSaver.saveAs(file);
//       } else {
//         console.error('TODO, output file error');
//       }
//     } catch (e: any) {
//       tschedaFlow.displayError(e.toString());
//     }
//   });

// // Print map
// document.querySelector('#buttonPrintMap')!.addEventListener('click', () => {
//   tschedaFlow.printConnectionMap();
// });

// // Check DRC
// document.querySelector('#buttonCheckDrc')!.addEventListener('click', () => {
//   try {
//     tschedaFlow.checkDRC();
//     console.log('Success no errors');
//   } catch (e: any) {
//     tschedaFlow.displayError(e.toString());
//   }
// });

// ## SIDE PANEL

const panelTabs = document.querySelector('#panelTabs')!.children;

Object.entries(panelTabs).map((tab) => {
  const tabElement = tab[1];

  tabElement.addEventListener('click', (e) => {
    const ele = <HTMLElement>e.target;
    const eleTabName = ele.getAttribute('data-block');
    // Clean previous Element
    const previousEle = document.querySelector('#panelTabs .is-active')!;
    previousEle.classList.remove('is-active'); // Remove tab active
    const previousTabName = previousEle.getAttribute('data-block')!;
    (<HTMLElement>(
      document.querySelector(`[data-box="${previousTabName}"]`)
    ))!.style.display = 'none'; // Hide box
    // Set new is-active
    ele.classList.add('is-active');
    (<HTMLElement>(
      document.querySelector(`[data-box="${eleTabName}"]`)
    ))!.style.display = 'inherit'; // Hide box
    // (<HTMLElement>(
    //   document.querySelector(`[data-box="${eleTabName}"]`)
    // ))!.style.transition = '';
    // (<HTMLElement>(
    //   document.querySelector(`[data-box="${eleTabName}"]`)
    // ))!.style.transition = 'opacity 1s ease-in';
  });
  // Here, object = Array[index, object] (object is the
  // HTML element object). This means that the actual element
  // is stored in object[1], not object. Do whatever you need
  // with it here. In this case we attach a click event:
  // object[1].addEventListener('click', function () {
  //   // Output innerHTML of the clicked element
  //   console.log(
  //     'Hello ' + this + ' (' + this.innerHTML + ') from map method...',
  //   );
  // });
});

// ## DRAG/DROP SCHEMATIC ELEMENTS

var dragElements = document.getElementsByClassName('drag-blocks');
for (let i = 0; i < dragElements.length; i++) {
  dragElements[i].addEventListener('dragstart', dragBlock, false);
  dragElements[i].addEventListener('dragend', dropBlock, false);
}

function dragBlock(e: any) {
  console.log('Drag Start', e.target);
}

function dropBlock(e: any) {
  const dragElement = <HTMLElement>e.target;
  let dropElement = <HTMLElement | null>(
    document.elementFromPoint(e.clientX, e.clientY)
  ); // AKA editor

  // Search for tschs, else null. No need for while loop.
  if (dropElement) dropElement = dropElement.closest('#tschs');
  if (dropElement == null) return;

  // Get schematic file name
  const figureElement = dragElement.closest('.drag-blocks');
  if (figureElement == null) return;

  const schematicFile = figureElement.getAttribute('data-schematic');

  if (schematicFile == null) {
    console.log('Error, schematic file data attribute not found');
  } else {
    // Drop element TODO: Select correct element.
    const editor = document.querySelector('#tschs')!.getBoundingClientRect();
    tschedaFlow.addTypedSchematic(
      schematicFile,
      e.clientY - editor.top,
      e.clientX - editor.left,
    ); // FIXME:  Coordinates are flipped but works better, future?
  }
}

document.addEventListener('click', (e) => {
  const editor = document.querySelector('#tschs')!.getBoundingClientRect();
  console.log('Click', e.clientX, e.clientY);
  console.log('Editor', editor.left, editor.top);
  console.log('Rest', e.clientX - editor.left, e.clientY - editor.top);
});

// document.querySelector('#buttonCheckDrc')!.addEventListener('click', () => {
//   try {
//     tschedaFlow.checkDRC();
//     console.log('Success no errors');
//   } catch (e: any) {
//     tschedaFlow.displayError(e.toString());
//   }
// });

// (<HTMLElement>document.querySelector('#sidePanel')!).style.display = 'none';
document.querySelector('#burgerButton')!.addEventListener('click', () => {
  const sidePanel = document.querySelector('#sidePanel')!;
  const isOpen = sidePanel.toggleAttribute('open');
  if (isOpen == true) {
    (<HTMLElement>document.querySelector('#sidePanel')!).style.display =
      'initial';
  }
  sidePanel.addEventListener(
    'transitionend',
    () => {
      console.log('Transition End');
      if (isOpen == false) {
        (<HTMLElement>document.querySelector('#sidePanel')!).style.display =
          'none';
      }
    },
    { once: true },
  );
});
