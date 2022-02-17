import interact from 'interactjs';
import './SchemaFlow/Interact.css';

/* The dragging code for '.draggable' from the demo above
 * applies to this demo as well so it doesn't have to be repeated. */

interface ElementSizes {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginWidth: number;
  marginHeight: number;
  paddinTop: number;
  paddinBottom: number;
  paddinLeft: number;
  paddinRight: number;
  paddingWidth: number;
  paddingHeight: number;
  borderTop: number;
  borderBottom: number;
  borderLeft: number;
  borderRight: number;
  borderWidth: number;
  borderHeight: number;
}

var parentElement = document.getElementById('outer-dropzone');
const InteractEle = interact('.inner');

InteractEle.resizable({
  // resize from all edges and corners
  edges: { left: true, right: true, bottom: true, top: true },

  listeners: {
    move(event) {
      // Translate?
      let translate: boolean = false;

      // Position
      const target = event.target;
      let x = parseFloat(target.getAttribute('data-x')) || 0;
      let y = parseFloat(target.getAttribute('data-y')) || 0;

      // Get this sizes
      const child = getSizes(target);

      // Get parent sizes
      const parent = getSizes(parentElement!);

      // console.log(
      //   'child:',
      //   child.width,
      //   child.height,
      //   child.paddingHeight,
      //   child.paddingWidth,
      //   child.borderHeight,
      //   child.borderWidth,
      // );

      // console.log(
      //   'parent:',
      //   parent.width,
      //   parent.height,
      //   parent.paddingHeight,
      //   parent.paddingWidth,
      //   parent.borderHeight,
      //   parent.borderWidth,
      // );

      const childTopExtra = child.borderTop + child.paddinTop;
      const childBottomExtra = child.borderBottom + child.paddinBottom;
      const childLeftExtra = child.borderLeft + child.paddinLeft;
      const childRightExtra = child.borderRight + child.paddinRight;

      // Check for negatives
      if (event.rect.top - childTopExtra <= 0) return;
      if (event.rect.bottom - childBottomExtra <= 0) return;
      if (event.rect.left - childLeftExtra <= 0) return;
      if (event.rect.right - childRightExtra <= 0) return;

      // Restrict sizes
      if (
        event.rect.top - childTopExtra >= parent.top &&
        event.rect.bottom <= parent.bottom - childBottomExtra
      ) {
        target.style.height = event.rect.height + 'px';
        y += event.deltaRect.top;
        target.setAttribute('data-y', y);
        translate = true;
      }
      if (
        event.rect.left - childLeftExtra >= parent.left &&
        event.rect.right <= parent.right - childRightExtra
      ) {
        target.style.width = event.rect.width + 'px';
        x += event.deltaRect.left;
        target.setAttribute('data-x', x);
        translate = true;
      }
      // if (
      //   event.rect.top - childTopExtra >= parent.top &&
      //   event.rect.bottom <= parent.bottom - childBottomExtra
      // ) {
      //   console.log('Changing');
      //   target.style.height = event.rect.height + 'px';
      //   y += event.deltaRect.top;
      //   target.setAttribute('data-y', y);
      // }
      // if (event.rect.bottom < parent.bottom) {
      //   target.style.height = event.rect.height + 'px';
      // }
      // if (
      //   event.rect.height <
      //   parent.height - child.borderHeight - child.paddingHeight
      // ) {
      //   // Update the element's Height
      //   target.style.height = event.rect.height + 'px';
      // }
      // if (
      //   event.rect.width <
      //   parent.width - child.borderWidth - child.paddingWidth
      // ) {
      //   // Update the element's Width
      //   target.style.width = event.rect.width + 'px';
      // }

      if (translate)
        target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

      target.textContent =
        Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height);
    },
  },
});

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
    //event.target.classList.remove('drop-active');
    event.target.classList.remove('drop-target');
  },
});

function getSizes(ele: HTMLElement): ElementSizes {
  const parentRect = ele.getBoundingClientRect();
  const parentStyle = window.getComputedStyle(ele);
  const parentMarginWidth =
    parseFloat(parentStyle.marginLeft) + parseFloat(parentStyle.marginRight);
  const parentMarginHeight =
    parseFloat(parentStyle.marginTop) + parseFloat(parentStyle.marginBottom);
  const parentPaddingWidth =
    parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
  const parentPaddingHeight =
    parseFloat(parentStyle.paddingTop) + parseFloat(parentStyle.paddingBottom);
  const parentBorderWidth =
    parseFloat(parentStyle.borderLeft) + parseFloat(parentStyle.borderRight);
  const parentBorderHeight =
    parseFloat(parentStyle.borderTop) + parseFloat(parentStyle.borderBottom);

  let sizes;
  if (parentStyle.boxSizing === 'border-box') {
    sizes = {
      top: parentRect.top,
      bottom: parentRect.bottom,
      left: parentRect.left,
      right: parentRect.right,
      width: parentRect.width,
      height: parentRect.height,
      marginTop: parseFloat(parentStyle.marginTop),
      marginBottom: parseFloat(parentStyle.marginBottom),
      marginLeft: parseFloat(parentStyle.marginLeft),
      marginRight: parseFloat(parentStyle.marginRight),
      marginWidth: parentMarginWidth,
      marginHeight: parentMarginHeight,
      paddinTop: parseFloat(parentStyle.paddingTop),
      paddinBottom: parseFloat(parentStyle.paddingBottom),
      paddinLeft: parseFloat(parentStyle.paddingLeft),
      paddinRight: parseFloat(parentStyle.paddingRight),
      paddingWidth: parentPaddingWidth,
      paddingHeight: parentPaddingHeight,
      borderTop: parseFloat(parentStyle.borderTop),
      borderBottom: parseFloat(parentStyle.borderBottom),
      borderLeft: parseFloat(parentStyle.borderLeft),
      borderRight: parseFloat(parentStyle.borderRight),
      borderWidth: parentBorderWidth,
      borderHeight: parentBorderHeight,
    };
  } else {
    sizes = {
      top: parentRect.top,
      bottom: parentRect.bottom - parentPaddingHeight - parentBorderHeight,
      left: parentRect.left,
      right: parentRect.right - parentPaddingHeight - parentBorderHeight,
      width: parentRect.width - parentPaddingWidth - parentBorderWidth,
      height: parentRect.height - parentPaddingHeight - parentBorderHeight,
      marginTop: parseFloat(parentStyle.marginTop),
      marginBottom: parseFloat(parentStyle.marginBottom),
      marginLeft: parseFloat(parentStyle.marginLeft),
      marginRight: parseFloat(parentStyle.marginRight),
      marginWidth: parentMarginWidth,
      marginHeight: parentMarginHeight,
      paddinTop: parseFloat(parentStyle.paddingTop),
      paddinBottom: parseFloat(parentStyle.paddingBottom),
      paddinLeft: parseFloat(parentStyle.paddingLeft),
      paddinRight: parseFloat(parentStyle.paddingRight),
      paddingWidth: parentPaddingWidth,
      paddingHeight: parentPaddingHeight,
      borderTop: parseFloat(parentStyle.borderTop),
      borderBottom: parseFloat(parentStyle.borderBottom),
      borderLeft: parseFloat(parentStyle.borderLeft),
      borderRight: parseFloat(parentStyle.borderRight),
      borderWidth: parentBorderWidth,
      borderHeight: parentBorderHeight,
    };
  }

  return sizes;
}

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
