// Third-party libraries
import interact from 'interactjs';
import { InteractEvent } from '@interactjs/core/InteractEvent';
// Flow libraries and CSS
import SvgConnection from './SvgConnection';
import ContextMenu from './ContextMenu';
import Utils from './Utils';
import './SvgConnection.css';
import './ContextMenu.css';
import './Flow.css';

/*
2. Start Merging
 - After that implement Path Delete and Node Delete
 - Add different context menu for mat and block tschs
 - Refactor (missing changing contextMenu.contextMenu func to ContextMenu.func)
 - Add a context menu for input and outputs to move them left/right
 - See how to deal with connections overlaping blocks, maybe add weights to connections? 
 - Start integration with Tsch Lib
*/

// Context Menus
enum ContextMenus {
  MatTsch = 'MatTsch',
  BlockTsch = 'BlockTsch',
  Connection = 'Connection',
}

// Context Menu Options Slections
enum MenuOptions {
  LayerTop = 'LayerTop',
  LayerUp = 'LayerUp',
  LayerDown = 'LayerDown',
  LayerBottom = 'LayerBottom',
  Delete = 'Delete',
}

// Element Selections
enum UIElement {
  None = 'None',
  NodeBlock = 'NodeBlock',
  NodeOutput = 'NodeOutput',
  NodeInput = 'NodeInput',
  NodeConnection = 'NodeConnection',
  Connection = 'Connection',
  Editor = 'Editor',
}

// Flow variables for context menu processing
interface FlowState {
  tschSelected: HTMLElement | null;
  connectionSelected: HTMLElement | null;
  htmlContainer: HTMLElement | null;
  drawflow: DrawFlow;
}

// Connections Mapping Data
type NodeID = number;

interface ConnectionOutput {
  svgid: number;
  node: number;
  output: string;
}

interface ConnectionInput {
  svgid: number;
  node: number;
  input: string;
}

// IFACE: jsonInputs
interface jsonInputsData {
  connections: Array<ConnectionInput>;
  type: string;
}
type jsonInputs = Map<string, jsonInputsData>;

// IFACE: jsonOutputs
interface jsonOutputsData {
  connections: Array<ConnectionOutput>;
  type: string;
  max_connections: number;
}
type jsonOutputs = Map<string, jsonOutputsData>;

// IFACE: Data
interface Data {
  id: number;
  class: string;
  html: string;
  inputs: jsonInputs;
  outputs: jsonOutputs;
  pos_x: number;
  pos_y: number;
}

// IFACE: DrawFlow (Main)
interface DrawFlow {
  drawflow: {
    Home: {
      data: Map<NodeID, Data>;
    };
  };
}

class Flow {
  // Global
  private _htmlContainer: HTMLElement | null = null;
  private _eleSelected: HTMLElement | null = null;
  private _tschSelected: HTMLElement | null = null;
  private _uiEleMouseDown: UIElement = UIElement.None;
  private _uiEleSelected: UIElement = UIElement.None;
  private _tschId: number = 0;
  private _matId: number = 0;
  private _dragMap: Map<HTMLElement, Array<HTMLElement>> = new Map();

  // SVG
  private _connectionID: number = 1;
  private _connectionEle: SVGSVGElement | null = null;
  private _connectionSelected: HTMLElement | null = null;

  // Context Menues
  private _contextMenuSelected: ContextMenus | null = null;

  // Connections Mapping Data
  public drawflow: DrawFlow = { drawflow: { Home: { data: new Map() } } }; // Nodes Object

  // Configurable options
  public module: string = 'Home';
  public zoom = 1;
  public zoom_max = 1.6;
  public zoom_min = 0.5;
  public zoom_value = 0.1;
  public zoom_last_value = 1;

  constructor(htmlContainer: HTMLElement | null) {
    // Set html container tag (e.g. #tschs, #container, .container)
    this._htmlContainer = htmlContainer;
    if (!this._htmlContainer) {
      console.error('HTML Container Element not found');
      return;
    }

    // Add canvas to container HTML
    // TODO: remove drawflow precanvas and leave only parent?
    this._htmlContainer.classList.add('tschs');
    this._htmlContainer.tabIndex = 0;

    // Append svg defs
    this._htmlContainer.insertAdjacentHTML(
      'beforeend',
      `<svg id="svgdefs" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
            <!-- simple dot marker definition -->
            <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5">
              <circle class="connectionCircle" cx="5" cy="5" r="3"></circle>
            </marker>
          </defs>
        </svg>`, // Insert as lastChild
    );

    window.addEventListener('DOMContentLoaded', () => {
      console.log('listener');
      // Start Listeners
      this.listenerGeneralClick();
      this.listenerMatTsch();
      this.listenerBlockTsch();
      this.listenerContextMenu();
    });
  }

  // ### Listeners

  private listenerGeneralClick() {
    // General MouseDown
    document.addEventListener('mousedown', (e: MouseEvent) => {
      // Get default target selection
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

      // if context menu click ignore and return
      if (contextMenu) {
        return;
      }

      // Remove previous tsch (mat or block) selection if any
      if (this._tschSelected) {
        this._tschSelected.classList.remove('selected');
        this._tschSelected = null;
      }

      // Remove previous connection selection if any
      if (this._connectionSelected) {
        this._connectionSelected.children[0].classList.remove('selected');
        this._connectionSelected = null;
      }

      // Get selected tsch if any
      parent = target;
      while (parent) {
        if (parent.classList.contains('tsch')) {
          this._tschSelected = parent;
        }
        if (parent.classList.contains('connection')) {
          this._connectionSelected = parent;
        }
        parent = parent.parentElement!;
      }

      // Get UI Element Selected
      switch (this._eleSelected.classList[0]) {
        case 'tschs':
          this._uiEleMouseDown = UIElement.Editor;
          break;
        case 'type':
          switch (this._eleSelected.parentElement!.classList[0]) {
            case 'input':
              this._uiEleMouseDown = UIElement.NodeInput;
              break;
            case 'output':
              this._uiEleMouseDown = UIElement.NodeOutput;
              break;
          }
          break;
        case 'input':
          this._uiEleMouseDown = UIElement.NodeInput;
          break;
        case 'output':
          this._uiEleMouseDown = UIElement.NodeOutput;
          break;
        case 'main-path':
          this._uiEleMouseDown = UIElement.NodeConnection;
          if (this._connectionSelected) {
            this._connectionSelected.children[0].classList.add('selected');
          }
          break;
        default:
          // If parent is a tsch then selection is NodeBlock
          if (this._tschSelected) {
            this._uiEleMouseDown = UIElement.NodeBlock;
            this._tschSelected.classList.add('selected');
          }
          break;
      }

      this._uiEleSelected = this._uiEleMouseDown;

      console.log('UI Ele Selected: ', this._uiEleSelected);

      // Remove context menus
      ContextMenu.contextMenusRemove();
    });
  }

  private listenerMatTsch() {
    // Make Mat Tschs resizable
    interact('.matTsch')
      .resizable({
        // Resize only left|bottom
        edges: { left: false, right: true, bottom: true, top: false },
        modifiers: [
          // Minimum size
          interact.modifiers.restrictSize({
            min: { width: 100, height: 50 },
          }),
        ],
        inertia: true,
        onstart: this.resizeStart,
        onmove: this.resizeMove,
        onend: this.resizeEnd,
      })
      .draggable({
        modifiers: [
          // Restrict to parent view
          // NOTE: This causes dragging svg to not be moved and getting bad X,Y
          // interact.modifiers.restrictRect({
          //   restriction: 'parent',
          //   endOnly: true,
          // }),
        ],
        inertia: true,
        onstart: this.dragStart,
        onmove: this.dragMove,
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
        if (Utils.utilIsMatElement(draggableElement) == false) {
          draggableElement.classList.add('can-drop');
          // draggableElement.textContent = 'Dragged in';
        }
      },
      ondragleave: (event) => {
        const draggableElement = <HTMLElement>event.relatedTarget;
        const dropzoneElement = <HTMLElement>event.target;

        // remove the drop feedback style
        dropzoneElement.classList.remove('can-drop');
        if (Utils.utilIsMatElement(draggableElement) == false) {
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
        // NOTE: This causes dragging svg to not be moved and getting bad X,Y
        // interact.modifiers.restrictRect({
        //   restriction: 'parent',
        //   endOnly: true,
        // }),
      ],
      autoScroll: true,
      onstart: this.dragStart,
      onmove: this.dragMove,
      onend: this.dragEnd,
    });
  }

  private listenerContextMenu() {
    // Show Contextmenu
    document.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      this._contextMenuSelected = null;

      // Set default target selected, if child search until top
      const target = <HTMLElement>e.target;
      let parent = target;
      loop: while (parent) {
        if (parent.classList.contains('tsch')) {
          if (parent.classList.contains('matTsch')) {
            this._contextMenuSelected = ContextMenus.MatTsch;
          }
          if (parent.classList.contains('blockTsch')) {
            this._contextMenuSelected = ContextMenus.BlockTsch;
          }
        }
        if (parent.classList.contains('connection')) {
          this._contextMenuSelected = ContextMenus.Connection;
        }
        parent = parent.parentElement!;
      }

      console.log('Context Menu Selected', this._contextMenuSelected);

      switch (this._contextMenuSelected) {
        case ContextMenus.MatTsch:
          ContextMenu.contextMenuShow('#contextMenuMat', e);
          break;
        case ContextMenus.BlockTsch:
          ContextMenu.contextMenuShow('#contextMenuBlock', e);
          break;
        case ContextMenus.Connection:
          ContextMenu.contextMenuShow('#contextMenuConnection', e);
          break;
        default:
          return;
      }
    });

    // Context Menu Mat Listener
    this.contextMenuAddListener(
      '#contextMenuMat',
      ContextMenu.contextMenuProcessMat,
    );
    // Context Menu Block Listener
    this.contextMenuAddListener(
      '#contextMenuBlock',
      ContextMenu.contextMenuProcessBlock,
    );
    // Context Menu Connection Listener
    this.contextMenuAddListener(
      '#contextMenuConnection',
      ContextMenu.contextMenuProcessConnection,
    );
  }

  private contextMenuAddListener(tag: string, callback: Function) {
    document.querySelector(tag)!.addEventListener('click', (e) => {
      const target = <HTMLElement>e.target;
      const contextMenu = <HTMLElement>document.querySelector(tag)!;
      const menuOption = <MenuOptions | undefined>(
        target.getAttribute('menu-option')
      );
      if (!menuOption) return;
      const flowState: FlowState = {
        tschSelected: this._tschSelected,
        connectionSelected: this._connectionSelected,
        htmlContainer: this._htmlContainer,
        drawflow: this.drawflow,
      };
      callback(menuOption, flowState);
      contextMenu.classList.remove('shown');
    });
  }

  // ### Drag Listeners

  private dragStart = (event: InteractEvent) => {
    this.mouseStart(event, 'drag');
  };

  private dragMove = (event: InteractEvent) => {
    this.mouseMove(event, 'drag');
  };

  private dragEnd = (event: InteractEvent) => {
    this.mouseEnd(event, 'drag');
  };

  private resizeStart = (event: InteractEvent) => {
    this.mouseStart(event, 'resize');
  };

  private resizeMove = (event: InteractEvent) => {
    this.mouseMove(event, 'resize');
  };

  private resizeEnd = (event: InteractEvent) => {
    this.mouseEnd(event, 'resize');
  };

  // ### Mouse Operations

  private mouseStart = (event: InteractEvent, eventType: 'drag' | 'resize') => {
    switch (this._uiEleMouseDown) {
      case UIElement.NodeInput:
      case UIElement.NodeOutput:
        if (!this._htmlContainer) return;
        this._connectionEle = SvgConnection.draw(this._htmlContainer);
        break;
    }

    // Disable svg tag pointers to get correct element below mouse
    SvgConnection.disablePointerEvents();
  };

  private mouseMove = (event: InteractEvent, eventType: 'drag' | 'resize') => {
    const target = <HTMLElement>event.target;

    if (!this._eleSelected) return;
    if (!this._htmlContainer) return;

    switch (this._uiEleMouseDown) {
      case UIElement.NodeInput:
      case UIElement.NodeOutput:
        if (!this._connectionEle) return;
        SvgConnection.update(
          this._htmlContainer,
          this._eleSelected,
          this._connectionEle,
          this.zoom,
          event.clientX,
          event.clientY,
        );
        break;
      case UIElement.NodeBlock:
        switch (eventType) {
          case 'drag':
            this.positionelementSetOffset(target, event.dx, event.dy);
            this.positionelementSetChildsOffset(target, event.dx, event.dy);

            if (!this._tschSelected) return;

            if (Utils.utilIsMatElement(this._tschSelected)) {
              // Is tschMat
              SvgConnection.updateAllNodes(this._htmlContainer, this.zoom);
            } else {
              // Is tschBlock
              // Update Connections
              SvgConnection.updateNode(
                this._htmlContainer,
                this.zoom,
                this._tschSelected.id,
              );
            }
            break;
          case 'resize':
            // Resize Mat Tsch
            target.style.width = event.rect.width + 'px';
            target.style.height = event.rect.height + 'px';
            // Update node connections
            if (this._htmlContainer)
              SvgConnection.updateAllNodes(this._htmlContainer, this.zoom);
            break;
        }
        break;
    }
  };

  private mouseEnd = (event: InteractEvent, eventType: 'drag' | 'resize') => {
    switch (this._uiEleMouseDown) {
      case UIElement.NodeOutput:
        // Get MouseUp Element
        const ele_last = (<HTMLElement>(
          document.elementFromPoint(event.clientX, event.clientY)
        )).parentElement;
        if (!this._eleSelected) return;
        if (!ele_last) return;
        if (!this._connectionEle) return;
        if (!this._htmlContainer) return;
        const conected = SvgConnection.connect(
          this._eleSelected,
          ele_last,
          this._connectionEle,
          this._htmlContainer,
          this._connectionID,
          this.drawflow,
          this.zoom,
        );
        if (conected) {
          this._connectionID++;
        }
        break;
    }

    // Enable svg pointer events again
    SvgConnection.enablePointerEvents();
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

      if (Utils.utilIsMatElement(childTarget)) {
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
    const nodeId = this._tschId;
    this._tschId++;

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
            id="tsch-${nodeId}"
            class="tsch blockTsch ${classoverride}"
            tsch-id="${nodeId}"
            style="z-index: 45; top: ${ele_pos_x}px; left: ${ele_pos_y}px"
           ></div>`, // Insert as lastChild
        );
        node = <HTMLElement>this._htmlContainer.lastChild;
        break;
      case 'MatTsch':
        // BLOCK TSCH
        this._htmlContainer.insertAdjacentHTML(
          'beforeend',
          `<div
            id="tsch-${nodeId}"
            class="tsch matTsch ${classoverride}"
            tsch-id="${nodeId}" mat-id="${this._matId}"
            style="z-index: ${nodeId}; top: ${ele_pos_x}px; left: ${ele_pos_y}px"
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
    const json_inputs: jsonInputs = new Map();
    for (const [key, value] of Object.entries(num_in)) {
      inputs.insertAdjacentHTML(
        'beforeend',
        `<div class="input input_${key}"><div class="type">${value}</div></div>`, // Insert as lastChild
      );
      json_inputs.set('input_' + key, { connections: [], type: value });
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
    const json_outputs: jsonOutputs = new Map();
    for (const [key, value] of Object.entries(num_out)) {
      outputs.insertAdjacentHTML(
        'beforeend',
        `<div class="output output_${key}"><div class="type">${value.name}</div></div>`, // Insert as lastChild
      );
      json_outputs.set('output_' + key, {
        connections: [],
        type: value.name,
        max_connections: value.max,
      });
    }

    // Add Node Data to Connection Data
    const nodeData: Data = {
      id: nodeId,
      class: classoverride,
      html: html,
      inputs: json_inputs,
      outputs: json_outputs,
      pos_x: ele_pos_x,
      pos_y: ele_pos_y,
    };
    this.drawflow.drawflow.Home.data.set(nodeId, nodeData);
    // this.dispatch('nodeCreated', newNodeId);

    return nodeId;
  }
}

export {
  Flow,
  DrawFlow,
  jsonOutputsData,
  jsonInputsData,
  FlowState,
  MenuOptions,
};