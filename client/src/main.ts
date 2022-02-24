import interact from 'interactjs';
import './SchemaFlow/Interact.css';
import './SchemaFlow/ContextMenu.css';

/* The dragging code for '.draggable' from the demo above
 * applies to this demo as well so it doesn't have to be repeated? */
/*
1. Try implementing this inside a class to see how to eficiently merge
2. Start Merging
*/

// Global
let _ele_selected: HTMLElement | null = null;
let _tschNum: number = 0;

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
    var draggableElement = event.relatedTarget;
    var dropzoneElement = event.target;

    // feedback the possibility of a drop
    dropzoneElement.classList.add('is-dropped');
    draggableElement.classList.add('can-drop');
    draggableElement.textContent = 'Dragged in';
  },
  ondragleave: function (event) {
    // remove the drop feedback style
    event.target.classList.remove('is-dropped');
    event.relatedTarget.classList.remove('can-drop');
    event.relatedTarget.textContent = 'Dragged out';
  },
  ondrop: function (event) {
    event.relatedTarget.textContent = 'Dropped in ' + event.target.id;
  },
  ondropdeactivate: function (event) {
    // remove active dropzone feedback
    event.target.classList.remove('is-dropped');
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

function dragMove(event: any) {
  var target = event.target;

  // keep the dragged position in the data-x/data-y attributes
  var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
  var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

  // translate the element
  target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

  // Update the posiion attributes
  target.setAttribute('data-x', x);
  target.setAttribute('data-y', y);
}

function dragEnd(event: any) {
  // console.log('Drag End');
}

// ### UI Interface

// Button AddMat
document.querySelector('#addMat')!.addEventListener('click', () => {
  const matsEle = <HTMLElement>document.querySelector('#tschs')!;
  matsEle.insertAdjacentHTML(
    'beforeend',
    `<div id="tsch-${_tschNum}" class="tsch matTsch" tsch-ele=${_tschNum} style="z-index: ${_tschNum}">
          MAT${_tschNum}
        </div>`,
  );
  _tschNum++;
});

// Button AddTsch
document.querySelector('#addTsch')!.addEventListener('click', () => {
  const matsEle = <HTMLElement>document.querySelector('#tschs')!;
  matsEle.insertAdjacentHTML(
    'beforeend',
    `<div id="tsch-${_tschNum}" class="tsch blockTsch" tsch-ele=${_tschNum} style="z-index: ${_tschNum}">TSCH</div>`,
  );
  _tschNum++;
});

// ### Context Menu

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

// Contextmenu process options
function processMenuOption(option: MenuOption) {
  const tschElements = <HTMLElement>document.querySelector('#tschs')!;
  const zIndexesArray: Array<{
    ele: HTMLElement;
    tschNum: string;
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

  // Fill zIndex Array with current tsch elements
  tschElements.childNodes.forEach((child) => {
    const childEle = <HTMLElement>child;
    const matStyle = window.getComputedStyle(childEle);
    const tschNum = childEle.getAttribute('tsch-ele')!;
    const zIndex = matStyle.getPropertyValue('z-index');
    zIndexesArray.push({
      ele: childEle,
      tschNum: tschNum,
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
      console.log(lastEle.tschNum);
      if (eleToMove != lastEle.tschNum) {
        for (const ele of zIndexesArray) {
          // If eleToMove swap with last, the rest -1
          if (minusOne) {
            ele.zIndex -= 1;
          }
          if (ele.tschNum == eleToMove) {
            ele.zIndex = lastEle.zIndex;
            minusOne = true;
          }
        }
      }
      break;
    case MenuOption.LayerUp:
      for (const [index, value] of zIndexesArray.entries()) {
        if (value.tschNum == eleToMove) {
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
        if (value.tschNum == eleToMove) {
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
      console.log(firstEle.tschNum);
      if (eleToMove != firstEle.tschNum) {
        for (const ele of zIndexesArray) {
          // If eleToMove swap with first, the rest +1
          if (ele.tschNum == eleToMove) {
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
