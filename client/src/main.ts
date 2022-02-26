import interact from 'interactjs';
import { InteractEvent } from '@interactjs/core/InteractEvent';
import './SchemaFlow/Interact.css';
import './SchemaFlow/ContextMenu.css';

/* The dragging code for '.draggable' from the demo above
 * applies to this demo as well so it doesn't have to be repeated? */
/*
1. Try implementing this inside a class to see how to eficiently merge
2. Start Merging
*/

class Flow {
  constructor() {
    this.start();
  }

  private start() {}
}

// Global
let _ele_selected: HTMLElement | null = null;
let _tschId: number = 0;
let _matId: number = 0;
let dragMap: Map<HTMLElement, Array<HTMLElement>> = new Map();

enum MenuOption {
  LayerTop = 'LayerTop',
  LayerUp = 'LayerUp',
  LayerDown = 'LayerDown',
  LayerBottom = 'LayerBottom',
  Delete = 'Delete',
}

interact('.matTsch')
  .resizable({
    // Resize only left|bottom
    edges: { left: false, right: true, bottom: true, top: false },

    listeners: {
      move(event) {
        // Move elment
        var target = event.target;
        target.style.width = event.rect.width + 'px';
        target.style.height = event.rect.height + 'px';
      },
    },
    modifiers: [
      // Minimum size
      interact.modifiers.restrictSize({
        min: { width: 100, height: 50 },
      }),
    ],
    inertia: true,
  })
  .draggable({
    modifiers: [
      // Restrict to parent view
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true,
      }),
    ],
    inertia: true,
    onmove: dragMove,
    onstart: dragStart,
    onend: dragEnd,
  });

interact('.matTsch').dropzone({
  // only accept elements matching this CSS selector
  accept: '.blockTsch, .matTsch',
  // Require a 75% element overlap for a drop to be possible
  overlap: 0.75,

  // listen for drop related events:
  ondropactivate: function (event) {
    // add active dropzone feedback
  },
  ondragenter: function (event) {
    const draggableElement = <HTMLElement>event.relatedTarget;
    const dropzoneElement = <HTMLElement>event.target;

    console.log('IsMat', isElementMat(draggableElement));

    // feedback the possibility of a drop
    dropzoneElement.classList.add('can-drop');
    if (isElementMat(draggableElement) == false) {
      draggableElement.classList.add('can-drop');
      draggableElement.textContent = 'Dragged in';
    }
  },
  ondragleave: function (event) {
    const draggableElement = <HTMLElement>event.relatedTarget;
    const dropzoneElement = <HTMLElement>event.target;

    // remove the drop feedback style
    dropzoneElement.classList.remove('can-drop');
    if (isElementMat(draggableElement) == false) {
      draggableElement.classList.remove('can-drop');
      draggableElement.textContent = 'Dragged out';
    }
    removeDragArray(dropzoneElement, draggableElement);
    console.log('Leave', getDragArray(dropzoneElement));
  },
  ondrop: function (event) {
    const draggableElement = <HTMLElement>event.relatedTarget;
    const dropzoneElement = <HTMLElement>event.target;
    draggableElement.textContent = 'Dropped in ' + event.target.id;
    setDragArray(dropzoneElement, draggableElement);
  },
  ondropdeactivate: function (event) {
    // remove active dropzone feedback
    const draggableElement = event.relatedTarget;
    const dropzoneElement = event.target;

    dropzoneElement.classList.remove('can-drop');
    draggableElement.classList.remove('can-drop');
  },
});

interact('.blockTsch').draggable({
  inertia: true,
  modifiers: [
    interact.modifiers.restrictRect({
      restriction: 'parent',
      endOnly: true,
    }),
  ],
  autoScroll: true,
  onmove: dragMove,
  onstart: dragStart,
  onend: dragEnd,
});

// ### Drag Listeners

// TODO: For merging see if keep this or re-implement the dragging

function dragStart(event: any) {
  // console.log('Drag Start');
}

function dragMove(event: InteractEvent) {
  var target = <HTMLElement>event.target;
  setElementOffset(target, event.dx, event.dy);
  setChildElementsOffset(target, event.dx, event.dy);
}

function dragEnd(event: any) {
  // console.log('Drag End');
}

// ### Set/Remove Drag Array

function setDragArray(target: HTMLElement, value: HTMLElement) {
  let elementsArray = dragMap.get(target);
  if (elementsArray) {
    if (!elementsArray.includes(value)) elementsArray.push(value);
    else console.log('Already in mat');
  } else {
    elementsArray = new Array();
    elementsArray.push(value);
  }
  dragMap.set(target, elementsArray);
  console.log(elementsArray);
}

function getDragArray(target: HTMLElement): Array<HTMLElement> {
  const elementsArray = dragMap.get(target);
  return elementsArray ? elementsArray : [];
}

function removeDragArray(target: HTMLElement, value: HTMLElement) {
  let elementsArray = dragMap.get(target);
  if (elementsArray) {
    if (elementsArray.includes(value)) {
      const index = elementsArray.indexOf(value);
      elementsArray.splice(index, 1);
    }
  }
}

function isElementMat(target: HTMLElement): boolean {
  return target.getAttribute('mat-id') ? true : false;
}

// ### Set/Get Element Position

function setElementOffset(target: HTMLElement, dx: number, dy: number) {
  // Get target positon
  const pos: { x: number; y: number } = getElementPositon(target);
  // Add mouse offset
  pos.x += dx;
  pos.y += dy;
  // Set new positon
  setElementPosition(target, pos.x, pos.y);
}

function setChildElementsOffset(target: HTMLElement, dx: number, dy: number) {
  for (const childTarget of getDragArray(target)) {
    // Get childTarget positon
    const pos: { x: number; y: number } = getElementPositon(childTarget);
    // Add mouse offset
    pos.x += dx;
    pos.y += dy;
    // Set new positon
    setElementPosition(childTarget, pos.x, pos.y);

    if (isElementMat(childTarget)) {
      // If Mat, recursively modify positions
      setChildElementsOffset(childTarget, dx, dy);
    }
  }
}

function setElementPosition(target: HTMLElement, x: number, y: number) {
  // translate the element
  target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

  // Update the posiion attributes
  target.setAttribute('data-x', x.toString());
  target.setAttribute('data-y', y.toString());
}

function getElementPositon(target: HTMLElement): { x: number; y: number } {
  const x = parseFloat(target.getAttribute('data-x')!) || 0;
  const y = parseFloat(target.getAttribute('data-y')!) || 0;
  return { x: x, y: y };
}

// ### UI Interface

// Button AddMat
document.querySelector('#addMat')!.addEventListener('click', () => {
  const matsEle = <HTMLElement>document.querySelector('#tschs')!;
  matsEle.insertAdjacentHTML(
    'beforeend',
    `<div id="tsch-${_tschId}" class="tsch matTsch" tsch-id="${_tschId}" mat-id="${_matId}" style="z-index: ${_tschId}">
          MAT${_matId}
        </div>`,
  );
  _tschId++;
  _matId++;
});

// Button AddTsch
document.querySelector('#addTsch')!.addEventListener('click', () => {
  const matsEle = <HTMLElement>document.querySelector('#tschs')!;
  matsEle.insertAdjacentHTML(
    'beforeend',
    `<div id="tsch-${_tschId}" class="tsch blockTsch" tsch-id="${_tschId}" style="z-index: ${_tschId}">TSCH</div>`,
  );
  _tschId++;
});

// ### Context Menu

// General Click
document.addEventListener('click', (e) => {
  // Remove context menu
  const target = <HTMLElement>e.target;
  const contextMenu = <HTMLElement>document.querySelector('#contextMenu');
  contextMenu.classList.remove('shown');
  // Set default target selected
  if (target.id.includes('tsch')) {
    _ele_selected = target;
  }
});

// Show Contextmenu
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  // Set default target selected
  const target = <HTMLElement>e.target;
  if (target.id.includes('tsch')) {
    _ele_selected = target;
  }
  // Open context menu
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

// Contextmenu process options
function processMenuOption(option: MenuOption) {
  const tschElements = <HTMLElement>document.querySelector('#tschs')!;
  const zIndexesArray: Array<{
    ele: HTMLElement;
    tschId: string;
    zIndex: number;
  }> = new Array();

  // Get element to move
  let eleToMove: string | null = null;
  if (_ele_selected) {
    eleToMove = _ele_selected.getAttribute('tsch-id');
    console.log('eleToMove', eleToMove);
  } else {
    return;
  }

  if (!eleToMove) {
    return;
  }

  // Fill zIndex Array with current tsch elements
  tschElements.childNodes.forEach((child) => {
    const childEle = <HTMLElement>child;
    const matStyle = window.getComputedStyle(childEle);
    const tschId = childEle.getAttribute('tsch-id')!;
    const zIndex = matStyle.getPropertyValue('z-index');
    zIndexesArray.push({
      ele: childEle,
      tschId: tschId,
      zIndex: parseFloat(zIndex),
    });
  });

  // Sort zIndex Array
  zIndexesArray.sort((a, b) =>
    a.zIndex > b.zIndex ? 1 : b.zIndex > a.zIndex ? -1 : 0,
  );

  // Update zIndex depending of option
  switch (option) {
    case MenuOption.LayerTop:
      let minusOne: boolean = false;
      const lastEle = { ...zIndexesArray[zIndexesArray.length - 1] };
      console.log(lastEle.tschId);
      if (eleToMove != lastEle.tschId) {
        for (const ele of zIndexesArray) {
          // If eleToMove swap with last, the rest -1
          if (minusOne) {
            ele.zIndex -= 1;
          }
          if (ele.tschId == eleToMove) {
            ele.zIndex = lastEle.zIndex;
            minusOne = true;
          }
        }
      }
      break;
    case MenuOption.LayerUp:
      for (const [index, value] of zIndexesArray.entries()) {
        if (value.tschId == eleToMove) {
          // Swap with next element
          const nextEle = zIndexesArray[index + 1];
          if (nextEle) {
            const tmp = value.zIndex;
            value.zIndex = nextEle.zIndex;
            nextEle.zIndex = tmp;
          }
        }
      }
      break;
    case MenuOption.LayerDown:
      for (const [index, value] of zIndexesArray.entries()) {
        if (value.tschId == eleToMove) {
          // Swap with previous element
          const prevEle = zIndexesArray[index - 1];
          if (prevEle) {
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
      console.log(firstEle.tschId);
      if (eleToMove != firstEle.tschId) {
        for (const ele of zIndexesArray) {
          // If eleToMove swap with first, the rest +1
          if (ele.tschId == eleToMove) {
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

  // Apply zIndex Changes
  for (const ele of zIndexesArray) {
    ele.ele.style.zIndex = ele.zIndex.toString();
  }
}
