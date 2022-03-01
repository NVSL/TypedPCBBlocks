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

enum MenuOptions {
  LayerTop = 'LayerTop',
  LayerUp = 'LayerUp',
  LayerDown = 'LayerDown',
  LayerBottom = 'LayerBottom',
  Delete = 'Delete',
}

class Flow {
  // Global
  private _htmlContainerTag: string = '';
  private _ele_selected: HTMLElement | null = null;
  private _tschId: number = 0;
  private _matId: number = 0;
  private _dragMap: Map<HTMLElement, Array<HTMLElement>> = new Map();

  constructor(htmlContainerTag: string) {
    // Set html container tag (e.g. #tschs, #container, .container)
    this._htmlContainerTag = htmlContainerTag;

    // Start Listeners
    this.listenerGeneralClick();
    this.listenerMatTsch();
    this.listenerBlockTsch();
    this.listenerContextMenu();
  }

  // ### Listeners

  private listenerGeneralClick() {
    // General Click
    document.addEventListener('click', (e: MouseEvent) => {
      // Set default target selected
      const target = <HTMLElement>e.target;
      if (target.id.includes('tsch')) {
        this._ele_selected = target;
      }

      // Remove context menu
      this.contextMenuRemove();
    });
  }

  private listenerMatTsch() {
    // Make Mat Tschs resizable
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
        onmove: this.dragMove,
        onstart: this.dragStart,
        onend: this.dragEnd,
      });

    // Make Mat Tschs dropable
    interact('.matTsch').dropzone({
      // only accept elements matching this CSS selector
      accept: '.blockTsch, .matTsch',
      // Require a 75% element overlap for a drop to be possible
      overlap: 0.75,

      // listen for drop related events:
      ondropactivate: (event) => {
        // add active dropzone feedback
      },
      ondragenter: (event) => {
        const draggableElement = <HTMLElement>event.relatedTarget;
        const dropzoneElement = <HTMLElement>event.target;

        // feedback the possibility of a drop
        dropzoneElement.classList.add('can-drop');
        if (this.utilIsMatElement(draggableElement) == false) {
          draggableElement.classList.add('can-drop');
          draggableElement.textContent = 'Dragged in';
        }
      },
      ondragleave: (event) => {
        const draggableElement = <HTMLElement>event.relatedTarget;
        const dropzoneElement = <HTMLElement>event.target;

        // remove the drop feedback style
        dropzoneElement.classList.remove('can-drop');
        if (this.utilIsMatElement(draggableElement) == false) {
          draggableElement.classList.remove('can-drop');
          draggableElement.textContent = 'Dragged out';
        }
        this.dragarrayRemove(dropzoneElement, draggableElement);
      },
      ondrop: (event) => {
        const draggableElement = <HTMLElement>event.relatedTarget;
        const dropzoneElement = <HTMLElement>event.target;
        draggableElement.textContent = 'Dropped in ' + event.target.id;
        this.dragarraySet(dropzoneElement, draggableElement);
      },
      ondropdeactivate: (event) => {
        // remove active dropzone feedback
        const draggableElement = event.relatedTarget;
        const dropzoneElement = event.target;

        dropzoneElement.classList.remove('can-drop');
        draggableElement.classList.remove('can-drop');
      },
    });
  }
  private listenerBlockTsch() {
    // Make Block Tsch draggable
    interact('.blockTsch').draggable({
      inertia: true,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: true,
        }),
      ],
      autoScroll: true,
      onmove: this.dragMove,
      onstart: this.dragStart,
      onend: this.dragEnd,
    });
  }

  private listenerContextMenu() {
    // Show Contextmenu
    document.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      // Set default target selected
      const target = <HTMLElement>e.target;
      if (target.id.includes('tsch')) {
        this._ele_selected = target;
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
      const menuOption = <MenuOptions | undefined>(
        target.getAttribute('menu-option')
      );
      if (!menuOption) return;
      this.contextMenuProcessOptions(menuOption);
      contextMenu.classList.remove('shown');
    });
  }

  // ### Drag Listeners

  // TODO: For merging see if keep this or re-implement the dragging

  private dragStart = (event: InteractEvent) => {
    // console.log('Drag Start' );
  };

  private dragMove = (event: InteractEvent) => {
    const target = <HTMLElement>event.target;
    this.positionelementSetOffset(target, event.dx, event.dy);
    this.positionelementSetChildsOffset(target, event.dx, event.dy);
  };

  private dragEnd = (event: InteractEvent) => {
    // console.log('Drag End');
  };

  // ### Elements Positioning

  // Move target element by an offset
  private positionelementSetOffset(
    target: HTMLElement,
    dx: number,
    dy: number,
  ) {
    // Get target positon
    const pos: { x: number; y: number } = this.positionelementGet(target);
    // Add mouse offset
    pos.x += dx;
    pos.y += dy;
    // Set new positon
    this.positionelementSet(target, pos.x, pos.y);
  }

  // Move target element childs by an offset
  private positionelementSetChildsOffset(
    target: HTMLElement,
    dx: number,
    dy: number,
  ) {
    for (const childTarget of this.dragarrayGet(target)) {
      // Get childTarget positon
      const pos: { x: number; y: number } =
        this.positionelementGet(childTarget);
      // Add mouse offset
      pos.x += dx;
      pos.y += dy;
      // Set new positon
      this.positionelementSet(childTarget, pos.x, pos.y);

      if (this.utilIsMatElement(childTarget)) {
        // If Mat, recursively modify positions
        this.positionelementSetChildsOffset(childTarget, dx, dy);
      }
    }
  }

  // Move target element to a x&y postion
  private positionelementSet(target: HTMLElement, x: number, y: number) {
    // translate the element
    target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

    // Update the posiion attributes
    target.setAttribute('data-x', x.toString());
    target.setAttribute('data-y', y.toString());
  }

  // Get target element x&y postion
  private positionelementGet(target: HTMLElement): { x: number; y: number } {
    const x = parseFloat(target.getAttribute('data-x')!) || 0;
    const y = parseFloat(target.getAttribute('data-y')!) || 0;
    return { x: x, y: y };
  }

  // ### Set/Remove Drag Array

  private dragarraySet(target: HTMLElement, value: HTMLElement) {
    let elementsArray = this._dragMap.get(target);
    if (elementsArray) {
      if (!elementsArray.includes(value)) elementsArray.push(value);
    } else {
      elementsArray = new Array();
      elementsArray.push(value);
    }
    this._dragMap.set(target, elementsArray);
  }

  private dragarrayGet(target: HTMLElement): Array<HTMLElement> {
    const elementsArray = this._dragMap.get(target);
    return elementsArray ? elementsArray : [];
  }

  private dragarrayRemove(target: HTMLElement, value: HTMLElement) {
    let elementsArray = this._dragMap.get(target);
    if (elementsArray) {
      if (elementsArray.includes(value)) {
        const index = elementsArray.indexOf(value);
        elementsArray.splice(index, 1);
      }
    }
  }

  // ### Utils

  private utilIsMatElement(target: HTMLElement): boolean {
    return target.getAttribute('mat-id') ? true : false;
  }

  // ### Context Menu

  private contextMenuRemove() {
    const contextMenu = <HTMLElement>document.querySelector('#contextMenu');
    contextMenu.classList.remove('shown');
  }

  // Contextmenu process options
  private contextMenuProcessOptions(option: MenuOptions) {
    const tschElements = <HTMLElement>document.querySelector('#tschs')!;
    const zIndexesArray: Array<{
      ele: HTMLElement;
      tschId: string;
      zIndex: number;
    }> = new Array();

    // Get element to move
    let eleToMove: string | null = null;
    if (this._ele_selected) {
      eleToMove = this._ele_selected.getAttribute('tsch-id');
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
      case MenuOptions.LayerTop:
        let minusOne: boolean = false;
        const lastEle = { ...zIndexesArray[zIndexesArray.length - 1] };
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
      case MenuOptions.LayerUp:
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
      case MenuOptions.LayerDown:
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
      case MenuOptions.LayerBottom:
        let plusOne: boolean = true;
        const firstEle = { ...zIndexesArray[0] };
        if (eleToMove != firstEle.tschId) {
          for (const ele of zIndexesArray) {
            // If eleToMove swap with first, the rest +1
            if (ele.tschId == eleToMove) {
              ele.zIndex = firstEle.zIndex;
              plusOne = false;
            }
            if (plusOne) {
              ele.zIndex += 1;
            }
          }
        }
        break;
      case MenuOptions.Delete:
        break;
    }

    // Apply zIndex Changes
    for (const ele of zIndexesArray) {
      ele.ele.style.zIndex = ele.zIndex.toString();
    }
  }

  // ### User Methods
  // TODO: Add container ID
  public addMatTsch() {
    const matsEle = <HTMLElement>(
      document.querySelector(this._htmlContainerTag)!
    );
    matsEle.insertAdjacentHTML(
      'beforeend',
      `<div id="tsch-${this._tschId}" class="tsch matTsch" tsch-id="${this._tschId}" mat-id="${this._matId}" style="z-index: ${this._tschId}">
          MAT${this._matId}
        </div>`,
    );
    this._tschId++;
    this._matId++;
  }

  public addBlockTsch() {
    const matsEle = <HTMLElement>(
      document.querySelector(this._htmlContainerTag)!
    );
    matsEle.insertAdjacentHTML(
      'beforeend',
      `<div id="tsch-${this._tschId}" class="tsch blockTsch" tsch-id="${this._tschId}" style="z-index: ${this._tschId}">TSCH</div>`,
    );
    this._tschId++;
  }
}

// ### UI Interface

const flow = new Flow('#tschs');

// Button AddMat
document.querySelector('#addMatTsch')!.addEventListener('click', () => {
  flow.addMatTsch();
});

// Button AddTsch
document.querySelector('#addBlockTsch')!.addEventListener('click', () => {
  flow.addBlockTsch();
});
