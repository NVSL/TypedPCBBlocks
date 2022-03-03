import interact from 'interactjs';
import { InteractEvent } from '@interactjs/core/InteractEvent';
import './SchemaFlow/Interact.css';
import './SchemaFlow/ContextMenu.css';

/*
2. Start Merging
 - TODO: Simplify CSS and HTML (replace drowflow-node by blockTsch as well as in the code)
 - You should be able to drag and drop the node into the mat as well as interact with contextMenu 
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
  private _htmlContainer: HTMLElement | null = null;
  private _eleSelected: HTMLElement | null = null;
  private _tschSelected: HTMLElement | null = null;
  private _tschId: number = 0;
  private _matId: number = 0;
  private _dragMap: Map<HTMLElement, Array<HTMLElement>> = new Map();

  constructor(htmlContainer: HTMLElement | null) {
    // Set html container tag (e.g. #tschs, #container, .container)
    this._htmlContainer = htmlContainer;
    if (!this._htmlContainer) {
      console.error('HTML Container Element not found');
      return;
    }

    // Add canvas to container HML
    // TODO: remove drawflow precanvas and leave only parent?
    this._htmlContainer.classList.add('tschs');
    this._htmlContainer.tabIndex = 0;

    // Start Listeners
    this.listenerGeneralClick();
    this.listenerMatTsch();
    this.listenerBlockTsch();
    this.listenerContextMenu();
  }

  // ### Listeners

  private listenerGeneralClick() {
    // // General Click
    // document.addEventListener('click', (e: MouseEvent) => {
    //   // Set default target selected
    //   const target = <HTMLElement>e.target;
    //   this._eleSelected = target;
    //   if (target.id.includes('tsch')) {
    //     this._tschSelected = target;
    //   }
    //   console.log(this._eleSelected);

    //   // Remove context menu
    //   this.contextMenuRemove();
    // });

    // General MouseDown
    document.addEventListener('mousedown', (e: MouseEvent) => {
      // Set default target selected
      const target = <HTMLElement>e.target;
      this._eleSelected = target;
      let parent = target;

      // Check if it's context menu element click
      let contextMenu: boolean = false;
      parent = target;
      while (parent) {
        if (parent.classList.contains('context-menu')) {
          contextMenu = true;
        }
        parent = parent.parentElement!;
      }

      // if context menu don't unselect tsch, return
      if (contextMenu) {
        return;
      }

      // Select tsch selected if any
      this._tschSelected = null;
      parent = target;
      while (parent) {
        if (parent.classList.contains('tsch')) {
          this._tschSelected = parent;
        }
        parent = parent.parentElement!;
      }

      console.log('ELE', this._eleSelected, 'TSCH', this._tschSelected);

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
          // draggableElement.textContent = 'Dragged in';
        }
      },
      ondragleave: (event) => {
        const draggableElement = <HTMLElement>event.relatedTarget;
        const dropzoneElement = <HTMLElement>event.target;

        // remove the drop feedback style
        dropzoneElement.classList.remove('can-drop');
        if (this.utilIsMatElement(draggableElement) == false) {
          draggableElement.classList.remove('can-drop');
          // draggableElement.textContent = 'Dragged out';
        }
        this.dragarrayRemove(dropzoneElement, draggableElement);
      },
      ondrop: (event) => {
        const draggableElement = <HTMLElement>event.relatedTarget;
        const dropzoneElement = <HTMLElement>event.target;
        // draggableElement.textContent = 'Dropped in ' + event.target.id;
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
      let showContextMenu: boolean = false;

      // Set default target selected, if child search until top
      const target = <HTMLElement>e.target;
      let parent = target;
      while (parent) {
        if (parent.classList.contains('tsch')) {
          showContextMenu = true;
        }
        parent = parent.parentElement!;
      }

      if (showContextMenu) {
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
      }
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

  private dragStart = (event: InteractEvent) => {
    console.log('Drag Start', event);
  };

  private dragMove = (event: InteractEvent) => {
    const target = <HTMLElement>event.target;

    if (this._eleSelected!.classList.contains('output')) {
      console.log('Do nothing'); // TODO: Add net somehow here.
      return;
    }

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
    if (this._tschSelected) {
      eleToMove = this._tschSelected.getAttribute('tsch-id');
      console.log('ELE TO MOVE', this._tschSelected);
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
    if (!this._htmlContainer) {
      console.error('HTML Container Element not found');
      return;
    }

    this._htmlContainer.insertAdjacentHTML(
      'beforeend',
      `<div id="tsch-${this._tschId}" class="tsch matTsch" tsch-id="${this._tschId}" mat-id="${this._matId}" style="z-index: ${this._tschId}">
          MAT${this._matId}
        </div>`,
    );
    this._tschId++;
    this._matId++;
  }

  public addBlockTsch() {
    if (!this._htmlContainer) {
      console.error('HTML Container Element not found');
      return;
    }
    this._htmlContainer.insertAdjacentHTML(
      'beforeend',
      `<div id="tsch-${this._tschId}" class="tsch blockTsch" tsch-id="${this._tschId}" style="z-index: ${this._tschId}">TSCH</div>`,
    );
    this._tschId++;
  }

  public addNode(
    type: 'BlockTsch' | 'MatTsch',
    num_in: { [key: number]: string },
    num_out: { [key: number]: { name: string; max: number } },
    ele_pos_x: number,
    ele_pos_y: number,
    classoverride: string,
    html: string,
  ) {
    // var newNodeId: NodeID = this.nodeId; // Replace to use uuid -> this.getUuid();
    // this.nodeId++;

    if (!this._htmlContainer) {
      console.error('HTML container not found');
      return;
    }

    let node: HTMLElement;
    switch (type) {
      case 'BlockTsch':
        // BLOCK TSCH
        this._htmlContainer.insertAdjacentHTML(
          'beforeend',
          `<div
            id="tsch-${this._tschId}"
            class="tsch blockTsch ${classoverride}"
            tsch-id="${this._tschId}"
            style="z-index: ${this._tschId}; top: ${ele_pos_x}px; left: ${ele_pos_y}px"
           ></div>`, // Insert as lastChild
        );
        node = <HTMLElement>this._htmlContainer.lastChild;
        this._tschId++;
        break;
      case 'MatTsch':
        // BLOCK TSCH
        this._htmlContainer.insertAdjacentHTML(
          'beforeend',
          `<div
            id="tsch-${this._tschId}"
            class="tsch matTsch ${classoverride}"
            tsch-id="${this._tschId}" mat-id="${this._matId}"
            style="z-index: ${this._tschId}; top: ${ele_pos_x}px; left: ${ele_pos_y}px"
           ></div>`, // Insert as lastChild
        );
        node = <HTMLElement>this._htmlContainer.lastChild;
        this._matId++;
        break;
    }

    // ADD INPUTS
    node.insertAdjacentHTML(
      'beforeend',
      `<div class="inputs"></div>`, // Insert as lastChild
    );
    const inputs = <HTMLElement>node.lastChild;

    // Add Node HTML element inputs
    //const json_inputs: jsonInputs = new Map();
    for (const [key, value] of Object.entries(num_in)) {
      inputs.insertAdjacentHTML(
        'beforeend',
        `<div class="input input_${key}"><div class="type">${value}</div></div>`, // Insert as lastChild
      );
    }

    // ADD CONTENT
    node.insertAdjacentHTML(
      'beforeend',
      `<div class="content">${html}</div>`, // Insert as lastChild
    );

    // ADD OUTPUTS
    node.insertAdjacentHTML(
      'beforeend',
      `<div class="outputs"></div>`, // Insert as lastChild
    );
    const outputs = <HTMLElement>node.lastChild;

    // Add Node HTML element outputs
    //const json_outputs: jsonOutputs = new Map();
    for (const [key, value] of Object.entries(num_out)) {
      // json_outputs.set('output_' + key, {
      //   connections: [],
      //   type: value.name,
      //   max_connections: value.max,
      // });
      outputs.insertAdjacentHTML(
        'beforeend',
        `<div class="output output_${key}"><div class="type">${value.name}</div></div>`, // Insert as lastChild
      );
    }
    // console.log('JSON OUTPUTS:', json_outputs);
    /* TODO: Figure out how do listeners get called to know the connections. */
    /* Then add connection types, they add CSS type in the input and output */
    /* I can maybe add connection type using  { connections: [], type: "I2C" }*/

    // Add Node Data

    // var nodeData: Data = {
    //   id: newNodeId,
    //   name: name,
    //   data: data,
    //   class: classoverride,
    //   html: html,
    //   typenode: typenode,
    //   inputs: json_inputs,
    //   outputs: json_outputs,
    //   pos_x: ele_pos_x,
    //   pos_y: ele_pos_y,
    // };
    // this.drawflow.drawflow.Home.data.set(newNodeId, nodeData);
    // this.dispatch('nodeCreated', newNodeId);

    switch (type) {
      case 'BlockTsch':
        return this._tschId;
      case 'MatTsch':
        return this._matId;
    }
  }
}

// ### UI Interface

const container = <HTMLElement>document.querySelector('#tschs');
const flow = new Flow(container);

// Button AddMat
document.querySelector('#addMatTsch')!.addEventListener('click', () => {
  flow.addMatTsch();
});

// Button AddTsch
document.querySelector('#addBlockTsch')!.addEventListener('click', () => {
  flow.addBlockTsch();
});

// Add Node
var computeModule = `
      <div>
        <div class="title-box"><i class="fas fa-code"></i> Compute Module</div>
      </div>
      `;
flow.addNode(
  'BlockTsch',
  { 1: 'GPIO' },
  {
    1: { name: 'GPIO', max: 2 },
    2: { name: 'GPIO', max: 2 },
    3: { name: 'SPI', max: 2 },
    4: { name: 'UART', max: 2 },
  }, // 1:[type, max_connections]
  50,
  50,
  'computeModule',
  computeModule,
);

var matModule = `
      <div>
        <div class="title-box"><i class="fas fa-code"></i>MAT</div>
      </div>
      `;
flow.addNode(
  'MatTsch',
  { 1: 'GPIO' },
  {
    1: { name: 'GPIO', max: 2 },
    2: { name: 'GPIO', max: 2 },
    3: { name: 'SPI', max: 2 },
    4: { name: 'UART', max: 2 },
  }, // 1:[type, max_connections]
  50,
  50,
  '',
  matModule,
);
