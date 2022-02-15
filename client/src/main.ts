import interact from 'interactjs';
import './SchemaFlow/Interact.css';

/* The dragging code for '.draggable' from the demo above
 * applies to this demo as well so it doesn't have to be repeated. */

// enable draggables to be dropped into this
interact('.dropzone').dropzone({
  // only accept elements matching this CSS selector
  accept: '#yes-drop',
  // Require a 75% element overlap for a drop to be possible
  overlap: 0.75,

  // listen for drop related events:

  ondropactivate: function (event) {
    // add active dropzone feedback
    event.target.classList.add('drop-active');
  },
  ondragenter: function (event) {
    var draggableElement = event.relatedTarget;
    var dropzoneElement = event.target;

    // feedback the possibility of a drop
    dropzoneElement.classList.add('drop-target');
    draggableElement.classList.add('can-drop');
    draggableElement.textContent = 'Dragged in';
  },
  ondragleave: function (event) {
    // remove the drop feedback style
    event.target.classList.remove('drop-target');
    event.relatedTarget.classList.remove('can-drop');
    event.relatedTarget.textContent = 'Dragged out';
  },
  ondrop: function (event) {
    event.relatedTarget.textContent = 'Dropped';
  },
  ondropdeactivate: function (event) {
    // remove active dropzone feedback
    event.target.classList.remove('drop-active');
    event.target.classList.remove('drop-target');
  },
});

interact('.drag-drop').draggable({
  inertia: true,
  modifiers: [
    interact.modifiers.restrictRect({
      restriction: 'parent',
      endOnly: true,
    }),
  ],
  autoScroll: true,
  // dragMoveListener from the dragging demo above
  listeners: { move: dragMoveListener },
});

function dragMoveListener(event: any) {
  var target = event.target;
  // keep the dragged position in the data-x/data-y attributes
  var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
  var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

  // translate the element
  target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

  // update the posiion attributes
  target.setAttribute('data-x', x);
  target.setAttribute('data-y', y);
}

// import './style.css';
// Tsch EDA
// import { Tscheda, TschedaDebug } from 'tscheda';
// Schema Flow
// import SchemaFlow from './SchemaFlow/SchemaFlow';

// var id = <HTMLElement>document.getElementById('app');
// const editor = new SchemaFlow(id);
// editor.start();

// var computeModule = `
//       <div>
//         <div class="title-box"><i class="fas fa-code"></i> Compute Module</div>
//         <div class="box">
//           <textarea df-template></textarea>
//         </div>
//       </div>
//       `;
// var matModule = `
//       <div>
//         <div class="title-box"><i class="fas fa-code"></i> Mat Module</div>
//         <div class="box">
//           <textarea df-template></textarea>
//         </div>
//       </div>
//       `;
// editor.addNode(
//   'computeModule',
//   { 1: 'GPIO' },
//   {
//     1: { name: 'I2C', max: 4 },
//     2: { name: 'GPIO', max: 2 },
//     3: { name: 'SPI', max: 1 },
//     4: { name: 'UART', max: 1 },
//   }, // 1:[type, max_connections]
//   100,
//   10,
//   'computeModule',
//   { template: 'Schematic here!' },
//   computeModule,
// );
// editor.addNode(
//   'computeModule2',
//   { 1: 'GPIO' },
//   {
//     1: { name: 'I2C', max: 4 },
//     2: { name: 'GPIO', max: 2 },
//     3: { name: 'SPI', max: 1 },
//     4: { name: 'UART', max: 1 },
//   }, // 1:[type, max_connections]
//   450,
//   10,
//   'computeModule',
//   { template: 'Schematic here!' },
//   computeModule,
// );

// editor.addMat(
//   'Mat1',
//   { 1: 'GPIO' },
//   {
//     1: { name: 'I2C', max: 4 },
//     2: { name: 'GPIO', max: 2 },
//     3: { name: 'SPI', max: 1 },
//     4: { name: 'UART', max: 1 },
//   }, // 1:[type, max_connections]
//   450,
//   300,
//   'mat',
//   { template: 'Schematic here!' },
//   matModule,
// );

// async function readURLFile(path: string) {
//   let text = '';
//   const respionse = await fetch(new Request(path));
//   if (!respionse.ok) throw new Error(respionse.statusText);
//   text = await respionse.text();
//   return text;
// }

// async function eagelFile(
//   filename: string,
// ): Promise<{ data: string; filename: string }> {
//   const tschPath = '../data/typedSchematics/';
//   const data = await readURLFile(tschPath + filename);
//   return { data: data, filename: filename };
// }

// async function led(): Promise<void> {
//   console.log('\n--- LED DESIGN');
//   try {
//     const tscheda = new Tscheda('http://localhost:3000/data/typedConstraints/');
//     const atmega328 = await tscheda.use(await eagelFile('atmega328.sch'));
//     const led = await tscheda.use(await eagelFile('led_smd.sch'));
//     const power5V12V = await tscheda.use(await eagelFile('power5V12V.sch'));
//     const power5V = await tscheda.use(await eagelFile('power5V.sch'));

//     const Mat5V12V = tscheda.newMat(power5V12V);
//     const Mat5V = tscheda.newMat(power5V);

//     tscheda.addMat('root', Mat5V12V);
//     tscheda.addMat(Mat5V12V, Mat5V);

//     tscheda.addTsch(Mat5V, atmega328);
//     tscheda.addTsch(Mat5V, led);

//     await tscheda.connect({ uuid: atmega328, protocol: 'GPIO-9' }, [
//       { uuid: led, protocol: 'GPIO-0' },
//     ]);

//     tscheda.printConnectionMap();

//     tscheda.drc();

//     const jsonData = tscheda.generateJson();
//     console.log('JSON OUTPUT', jsonData);
//   } catch (e) {
//     throw e;
//   }

//   return;
// }

// (async () => {
//   TschedaDebug.enable(true, 1);
//   await led();
//   /* TODO:
//   - Start UI
//   */
// })();
