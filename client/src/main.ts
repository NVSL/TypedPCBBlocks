import interact from 'interactjs';
import './SchemaFlow/Interact.css';
import './SchemaFlow/ContextMenu.css';
/*
TODO: 
Define: All mats will have a outer (information) and inner (droppable) zone. This will be good for distingushing between mats.
Define: Mat's drop zones should be paralel (zone one | zone two)
--->>>>> No!!!: Make it simple, mats over dragable and resizable mats, period. If there are more show a modal.
- Restrict resizing when having two or more inner blocks. 
- Differientate between parent and inner (droppable) zone, parent should be able to be dragged
---->>>> 
// TODO: 1 - Add buttons to add mats and nodes. 
         2 - Add right click buttons to change z-index.
*/

/* The dragging code for '.draggable' from the demo above
 * applies to this demo as well so it doesn't have to be repeated. */

// Global
let _ele_selected: HTMLElement | null = null;

enum MenuOption {
  LayerTop = 'LayerTop',
  LayerUp = 'LayerUp',
  LayerDown = 'LayerDown',
  LayerBottom = 'LayerBottom',
  Delete = 'Delete',
}

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

// interact('.inner').resizable({
//   // resize from all edges and corners
//   edges: { left: true, right: true, bottom: true, top: true },

//   listeners: {
//     move(event) {
//       // Translate?
//       let translate: boolean = false;

//       // Position
//       const target = event.target;
//       let x = parseFloat(target.getAttribute('data-x')) || 0;
//       let y = parseFloat(target.getAttribute('data-y')) || 0;

//       // Get this sizes
//       const child = getSizes(target);

//       // Get parent sizes
//       const parent = getSizes(parentElement!);

//       // console.log(
//       //   'child:',
//       //   child.width,
//       //   child.height,
//       //   child.paddingHeight,
//       //   child.paddingWidth,
//       //   child.borderHeight,
//       //   child.borderWidth,
//       // );

//       // console.log(
//       //   'parent:',
//       //   parent.width,
//       //   parent.height,
//       //   parent.paddingHeight,
//       //   parent.paddingWidth,
//       //   parent.borderHeight,
//       //   parent.borderWidth,
//       // );

//       const childTopExtra = child.borderTop + child.paddinTop;
//       const childBottomExtra = child.borderBottom + child.paddinBottom;
//       const childLeftExtra = child.borderLeft + child.paddinLeft;
//       const childRightExtra = child.borderRight + child.paddinRight;

//       // Check for negatives
//       if (event.rect.top - childTopExtra <= 0) return;
//       if (event.rect.bottom - childBottomExtra <= 0) return;
//       if (event.rect.left - childLeftExtra <= 0) return;
//       if (event.rect.right - childRightExtra <= 0) return;

//       // Restrict sizes
//       if (
//         event.rect.top - childTopExtra >= parent.top &&
//         event.rect.bottom <= parent.bottom - childBottomExtra
//       ) {
//         target.style.height = event.rect.height + 'px';
//         y += event.deltaRect.top;
//         target.setAttribute('data-y', y);
//         translate = true;
//       }
//       if (
//         event.rect.left - childLeftExtra >= parent.left &&
//         event.rect.right <= parent.right - childRightExtra
//       ) {
//         target.style.width = event.rect.width + 'px';
//         x += event.deltaRect.left;
//         target.setAttribute('data-x', x);
//         translate = true;
//       }
//       // if (
//       //   event.rect.top - childTopExtra >= parent.top &&
//       //   event.rect.bottom <= parent.bottom - childBottomExtra
//       // ) {
//       //   console.log('Changing');
//       //   target.style.height = event.rect.height + 'px';
//       //   y += event.deltaRect.top;
//       //   target.setAttribute('data-y', y);
//       // }
//       // if (event.rect.bottom < parent.bottom) {
//       //   target.style.height = event.rect.height + 'px';
//       // }
//       // if (
//       //   event.rect.height <
//       //   parent.height - child.borderHeight - child.paddingHeight
//       // ) {
//       //   // Update the element's Height
//       //   target.style.height = event.rect.height + 'px';
//       // }
//       // if (
//       //   event.rect.width <
//       //   parent.width - child.borderWidth - child.paddingWidth
//       // ) {
//       //   // Update the element's Width
//       //   target.style.width = event.rect.width + 'px';
//       // }

//       if (translate)
//         target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

//       target.textContent =
//         Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height);
//     },
//   },
// });

interact('.mat')
  .resizable({
    // resize from all edges and corners
    edges: { left: false, right: true, bottom: true, top: false },

    listeners: {
      move(event) {
        var target = event.target;
        target.style.width = event.rect.width + 'px';
        target.style.height = event.rect.height + 'px';
      },
    },
    modifiers: [
      // minimum size
      interact.modifiers.restrictSize({
        min: { width: 100, height: 50 },
      }),
    ],

    inertia: true,
  })
  .draggable({
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true,
      }),
    ],
    onmove: dragMoveListener,
    onstart: onStartListener,
  });

interact('.dropzone').dropzone({
  // only accept elements matching this CSS selector
  accept: '.drag-drop, .mat',
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
  onmove: dragMoveListener,
  onstart: onStartListener,
});

// ### UI Interface

let tschEle = 0;

// Button AddMat
document.querySelector('#addMat')!.addEventListener('click', () => {
  console.log('Hello World');
  const matsEle = <HTMLElement>document.querySelector('#tschs')!;
  matsEle.insertAdjacentHTML(
    'beforeend',
    `<div id="tsch-${tschEle}" class="mat outer dropzone drop-active" tsch-ele=${tschEle} style="z-index: ${tschEle}">
          MAT${tschEle}
        </div>`,
  );
  tschEle++;
});

// Button AddTsch
document.querySelector('#addTsch')!.addEventListener('click', () => {
  console.log('Hello World');
  const matsEle = <HTMLElement>document.querySelector('#tschs')!;
  matsEle.insertAdjacentHTML(
    'beforeend',
    `<div id="tsch-${tschEle}" class="drag-drop" tsch-ele=${tschEle} style="z-index: ${tschEle}">TSCH</div>`,
  );
  tschEle++;
});

// General Click
document.addEventListener('click', (e) => {
  // Remove context menu
  const target = <HTMLElement>e.target;
  const contextMenu = <HTMLElement>document.querySelector('#contextMenu');
  contextMenu.classList.remove('shown');
  if (target.id.includes('tsch')) {
    _ele_selected = target;
  }
});

// Show Contextmenu
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const contextMenu = <HTMLElement>document.querySelector('#contextMenu');
  const posX =
    e.clientX + 150 > document.documentElement.clientWidth
      ? e.clientX - 150
      : e.clientX;
  const posY =
    e.clientY + 140 + 55 > document.documentElement.clientHeight
      ? e.clientY - 140
      : e.clientY;
  contextMenu.style.top = posY + 'px';
  contextMenu.style.left = posX + 'px';
  contextMenu.classList.add('shown');
});

// Contextmenu click
document.querySelector('#contextMenu')!.addEventListener('click', (e) => {
  const target = <HTMLElement>e.target;
  const contextMenu = <HTMLElement>document.querySelector('#contextMenu')!;
  const menuOption = <MenuOption | undefined>target.getAttribute('menu-option');
  if (!menuOption) return;
  console.log(menuOption);
  processMenuOption(menuOption);
  contextMenu.classList.remove('shown');
});

// ### Context Menu Functions

function processMenuOption(option: MenuOption) {
  const tschElements = <HTMLElement>document.querySelector('#tschs')!;
  const zIndexesArray: Array<{
    ele: HTMLElement;
    tschEle: string;
    zIndex: number;
  }> = new Array();

  // Get element to move
  let eleToMove: string | null = null;
  if (_ele_selected) {
    eleToMove = _ele_selected.getAttribute('tsch-ele');
    console.log('eleToMove', eleToMove);
  } else {
    return;
  }

  if (!eleToMove) {
    return;
  }

  // Fill zIndex Array
  tschElements.childNodes.forEach((child) => {
    const childEle = <HTMLElement>child;
    const matStyle = window.getComputedStyle(childEle);
    const tschEle = childEle.getAttribute('tsch-ele')!;
    const zIndex = matStyle.getPropertyValue('z-index');
    zIndexesArray.push({
      ele: childEle,
      tschEle: tschEle,
      zIndex: parseFloat(zIndex),
    });
  });

  console.log('Before', zIndexesArray);

  // Sort
  zIndexesArray.sort((a, b) =>
    a.zIndex > b.zIndex ? 1 : b.zIndex > a.zIndex ? -1 : 0,
  );

  switch (option) {
    case MenuOption.LayerTop:
      let minusOne: boolean = false;
      const lastEle = { ...zIndexesArray[zIndexesArray.length - 1] };
      console.log(lastEle.tschEle);
      if (eleToMove != lastEle.tschEle) {
        for (const ele of zIndexesArray) {
          if (minusOne) {
            ele.zIndex -= 1;
          }
          if (ele.tschEle == eleToMove) {
            ele.zIndex = lastEle.zIndex;
            minusOne = true;
          }
        }
      }
      break;
    case MenuOption.LayerUp:
      for (const [index, value] of zIndexesArray.entries()) {
        if (value.tschEle == eleToMove) {
          const nextEle = zIndexesArray[index + 1];
          if (nextEle) {
            // Swap +1
            const tmp = value.zIndex;
            value.zIndex = nextEle.zIndex;
            nextEle.zIndex = tmp;
          }
        }
      }
      break;
    case MenuOption.LayerDown:
      for (const [index, value] of zIndexesArray.entries()) {
        if (value.tschEle == eleToMove) {
          const prevEle = zIndexesArray[index - 1];
          if (prevEle) {
            // Swap +1
            const tmp = value.zIndex;
            value.zIndex = prevEle.zIndex;
            prevEle.zIndex = tmp;
          }
        }
      }
      break;
    case MenuOption.LayerBottom:
      let plusOne: boolean = true;
      const firstEle = { ...zIndexesArray[0] };
      console.log(firstEle.tschEle);
      if (eleToMove != firstEle.tschEle) {
        for (const ele of zIndexesArray) {
          if (ele.tschEle == eleToMove) {
            ele.zIndex = firstEle.zIndex;
            console.log(ele.zIndex, firstEle.zIndex);
            plusOne = false;
          }
          if (plusOne) {
            ele.zIndex += 1;
          }
        }
      }
      break;
    case MenuOption.Delete:
      break;
  }

  // Apply Changes
  console.log('After', zIndexesArray);
  for (const ele of zIndexesArray) {
    ele.ele.style.zIndex = ele.zIndex.toString();
  }
}

function moveElementLayerUp(
  eleToMove: HTMLElement,
  eleList: NodeListOf<Element>,
) {}

function onStartListener(event: any) {
  // var target = event.target;
  // target.parentNode.appendChild(target);
  // TODO: Use z-indexes
}

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
