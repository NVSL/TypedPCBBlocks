// Third-party libraries
import interact from 'interactjs';
import { InteractEvent } from '@interactjs/core/InteractEvent';
// Flow libraries and CSS
import SvgConnection from './SvgConnection';
import ContextMenu from './ContextMenu';
import Utils from './Utils';
import Toast from './Toast';
import './Toast.css';
import './SvgConnection.css';
import './ContextMenu.css';
import './Flow.css';

// Context Menus
enum ContextMenus {
  MatTsch = 'MatTsch',
  BlockTsch = 'BlockTsch',
  Connection = 'Connection',
  IOs = 'IOs',
}

// Context Menu Options Slections
enum MenuOptions {
  LayerTop = 'LayerTop',
  LayerUp = 'LayerUp',
  LayerDown = 'LayerDown',
  LayerBottom = 'LayerBottom',
  Left = 'Left',
  Right = 'Right',
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

// Start Position
interface BlockPosition {
  tschSelected: HTMLElement;
  target: HTMLElement;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Drop Event information
interface DropEventInfo {
  dropElement: HTMLElement;
  dropTschKey: string | null;
  dropMatKey: string | null;
  dragElement: HTMLElement;
  dragTschKey: string | null;
  dragMatKey: string | null;
}

// Protocol info
interface Protocol {
  key: string; // name + altname
  name: string; // GPIO, SPI, I2C
  altname: string; // 1,2,WP,RESET
}

// Connect Event information
interface ConnectInfo {
  eleConnection: SVGSVGElement;
  connectionID: string;
  connectionKey: string;
  fromProtocol: Protocol;
  fromData: ConnectionData;
  toProtocol: Protocol;
  toData: ConnectionData;
}
interface ConnectEventInfo {
  fromTschKey: string | null;
  fromMatKey: string | null;
  toTschKey: string | null;
  toMatKey: string | null;
  connectInfo: ConnectInfo;
}

// Connect Info

// Flow variables for context menu processing
interface FlowState {
  htmlContainer: HTMLElement | null;
  tschSelected: HTMLElement | null;
  connectionSelected: HTMLElement | null;
  iosSelecteded: HTMLElement | null;
  graphData: GraphData;
}

// ### Graph Data Interfaces

interface ConnectionData {
  connectionID: string;
  connectionKey: string;
  tschID: string;
  tschKey: string;
  ioID: string;
  ioKey: string;
}

interface IOData {
  ioID: string;
  ioKey: string;
  connections: Array<ConnectionData>;
  protocol: Protocol;
}
type IOs = Map<string, IOData>;

interface NodeData {
  tschID: string;
  tschKey: string;
  class: string;
  html: string;
  ios: IOs;
  pos_x: number;
  pos_y: number;
}

// IFACE: GraphData (Main)
interface GraphData {
  data: Map<string, NodeData>;
}

class Flow {
  // Global
  private _htmlContainer: HTMLElement | null = null;
  private _eleSelected: HTMLElement | null = null;
  private _tschSelected: HTMLElement | null = null;
  private _iosSelected: HTMLElement | null = null;
  private _uiEleMouseDown: UIElement = UIElement.None;
  private _uiEleSelected: UIElement = UIElement.None;
  private _tschNum: number = 0;
  private _matNum: number = 0;
  private _zIndexNum: number = 0;
  private _dragMap: Map<HTMLElement, Array<HTMLElement>> = new Map();

  // Start|End Block Positions for reverting
  private _startEnd: BlockPosition | null = null;

  // SVG
  private _connectionKey: number = 1;
  private _connectionEle: SVGSVGElement | null = null;
  private _connectionSelected: HTMLElement | null = null;

  // Listeners
  private _events: Map<
    string,
    {
      listeners: Array<any>;
    }
  > = new Map();

  // Context Menues
  private _contextMenuSelected: ContextMenus | null = null;

  // Connections Mapping Data
  public graphData: GraphData = { data: new Map() }; // Nodes Object

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

      //this.moveIOLeftRight();

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

      // Remove previous IOs status if any
      if (this._iosSelected) {
        this._iosSelected = null;
      }

      // Get selected tsch if any
      parent = target;
      while (parent) {
        if (parent.classList.contains('tsch')) {
          this._tschSelected = parent;
          break;
        }
        parent = parent.parentElement!;
      }

      // Get selected connection if any
      parent = target;
      while (parent) {
        if (parent.classList.contains('connection')) {
          this._connectionSelected = parent;
          break;
        }
        parent = parent.parentElement!;
      }

      // Get selected IOs if any
      parent = target;
      while (parent) {
        if (
          parent.classList.contains('output') ||
          parent.classList.contains('input')
        ) {
          this._iosSelected = parent;
          break;
        }
        parent = parent.parentElement!;
      }

      // Get UI Element Selected
      switch (this._eleSelected.classList[0]) {
        case 'tschs':
          this._uiEleMouseDown = UIElement.Editor;
          break;
        case 'type':
          // Correct element selection to parent
          this._eleSelected = this._eleSelected.parentElement!;
          switch (this._eleSelected.classList[0]) {
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
      console.log('GraphData', this.graphData.data);

      // Remove context menus
      ContextMenu.Remove();
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
        if (Utils.isMatElement(draggableElement) == false) {
          draggableElement.classList.add('can-drop');
          // draggableElement.textContent = 'Dragged in';
        }
      },
      ondragleave: (event) => {
        const draggableElement = <HTMLElement>event.relatedTarget;
        const dropzoneElement = <HTMLElement>event.target;

        // remove the drop feedback style
        dropzoneElement.classList.remove('can-drop');
        if (Utils.isMatElement(draggableElement) == false) {
          draggableElement.classList.remove('can-drop');
        }
        this.dragarrayRemove(dropzoneElement, draggableElement);

        // Remove drag-in tag and dispatch undropp event
        const draggableElementDropOut = Utils.getMatDrop(draggableElement);
        if (draggableElementDropOut != '') {
          Utils.setMatDrop(draggableElement, '');

          const dropEventInfo: DropEventInfo = {
            dropElement: dropzoneElement,
            dropTschKey: Utils.getTschKey(dropzoneElement),
            dropMatKey: Utils.getMatKey(dropzoneElement),
            dragElement: draggableElement,
            dragTschKey: Utils.getTschKey(draggableElement),
            dragMatKey: Utils.getMatKey(draggableElement),
          };
          this.dispatch('flowUndrop', dropEventInfo);
        }
      },
      ondrop: (event) => {
        const draggableElement = <HTMLElement>event.relatedTarget;
        const dropzoneElement = <HTMLElement>event.target;

        // Get drop element info;
        const dropzoneElementMatKey = Utils.getMatKey(dropzoneElement);
        const draggableElementDropIn = Utils.getMatDrop(draggableElement);
        if (dropzoneElementMatKey != draggableElementDropIn) {
          // Check z-indexes are coherent
          const dropZIndex = Utils.getZIndex(dropzoneElement);
          const dragZIndex = Utils.getZIndex(draggableElement);
          if (dragZIndex > dropZIndex) {
            // Get drop info
            const dropEventInfo: DropEventInfo = {
              dropElement: dropzoneElement,
              dropTschKey: Utils.getTschKey(dropzoneElement),
              dropMatKey: Utils.getMatKey(dropzoneElement),
              dragElement: draggableElement,
              dragTschKey: Utils.getTschKey(draggableElement),
              dragMatKey: Utils.getMatKey(draggableElement),
            };

            // Dispatch new drop event
            this.dispatch('flowDrop', dropEventInfo);
          }
        }
      },
      ondropdeactivate: (event) => {
        // remove active dropzone feedback
        const draggableElement = <HTMLElement>event.relatedTarget;
        const dropzoneElement = <HTMLElement>event.target;

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
            break loop;
          }
          if (parent.classList.contains('blockTsch')) {
            this._contextMenuSelected = ContextMenus.BlockTsch;
            break loop;
          }
        }
        if (parent.classList.contains('connection')) {
          this._contextMenuSelected = ContextMenus.Connection;
          break loop;
        }
        if (
          parent.classList.contains('input') ||
          parent.classList.contains('output')
        ) {
          this._contextMenuSelected = ContextMenus.IOs;
          break loop;
        }
        parent = parent.parentElement!;
      }

      console.log('Context Menu Selected', this._contextMenuSelected);

      switch (this._contextMenuSelected) {
        case ContextMenus.MatTsch:
          ContextMenu.Show('#contextMenuMat', e);
          break;
        case ContextMenus.BlockTsch:
          ContextMenu.Show('#contextMenuBlock', e);
          break;
        case ContextMenus.Connection:
          ContextMenu.Show('#contextMenuConnection', e);
          break;
        case ContextMenus.IOs:
          ContextMenu.Show('#contextMenuIOs', e);
          console.log(this._iosSelected);
          break;
        default:
          return;
      }
    });

    // Context Menu Mat Listener
    this.contextMenuAddListener('#contextMenuMat', ContextMenu.ProcessMat);
    // Context Menu Block Listener
    this.contextMenuAddListener('#contextMenuBlock', ContextMenu.ProcessBlock);
    // Context Menu Connection Listener
    this.contextMenuAddListener(
      '#contextMenuConnection',
      ContextMenu.ProcessConnection,
    );
    // Context Menu Connection Listener
    this.contextMenuAddListener('#contextMenuIOs', ContextMenu.ProcessIOs);
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
        htmlContainer: this._htmlContainer,
        tschSelected: this._tschSelected,
        connectionSelected: this._connectionSelected,
        iosSelecteded: this._iosSelected,
        graphData: this.graphData,
      };
      callback(menuOption, flowState);
      contextMenu.classList.remove('shown');
      if (this._htmlContainer)
        SvgConnection.updateAllNodes(this._htmlContainer, this.zoom);
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
    // Save start position
    const targetPos = this.positionelementGet(<HTMLElement>event.target);
    this._startEnd = {
      tschSelected: this._tschSelected!,
      target: <HTMLElement>event.target,
      startX: targetPos.x,
      startY: targetPos.y,
      endX: 0,
      endY: 0,
    };

    // Start operations
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

            if (Utils.isMatElement(this._tschSelected)) {
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
    // Save end position
    if (this._startEnd) {
      const targetPos = this.positionelementGet(<HTMLElement>event.target);
      this._startEnd.endX = targetPos.x;
      this._startEnd.endY = targetPos.y;
    }

    switch (this._uiEleMouseDown) {
      case UIElement.NodeInput:
      case UIElement.NodeOutput:
        // Get MouseUp Element
        let ele_last = <HTMLElement>(
          document.elementFromPoint(event.clientX, event.clientY)
        );

        if (!this._eleSelected) return;
        if (!ele_last) return;
        if (!this._connectionEle) return;
        if (!this._htmlContainer) return;

        // Try connection
        try {
          const connectInfo = SvgConnection.canConnect(
            this._eleSelected,
            ele_last,
            this._connectionEle,
            this._htmlContainer,
            this._connectionKey.toString(),
            this.graphData,
            this.zoom,
          );
          if (connectInfo != null) {
            this._connectionKey++;

            const fromEle = Utils.getParentTschElement(this._eleSelected);
            const toEle = Utils.getParentTschElement(ele_last);

            if (fromEle == null || toEle == null) return;

            // Struct info
            const connectEventInfo: ConnectEventInfo = {
              fromTschKey: Utils.getTschKey(fromEle),
              fromMatKey: Utils.getMatKey(fromEle),
              toTschKey: Utils.getTschKey(toEle),
              toMatKey: Utils.getMatKey(toEle),
              connectInfo: connectInfo,
            };

            this.dispatch('flowConnect', connectEventInfo);
          }
        } catch (e: any) {
          this.toastError(e.toString());
        }
        break;
    }

    // Enable svg pointer events again
    SvgConnection.enablePointerEvents();
  };

  public connect(connectInfo: ConnectInfo) {
    if (this._htmlContainer == null) return;
    console.log(this.graphData);
    SvgConnection.connect(connectInfo, this.graphData);
    SvgConnection.updateAllNodes(this._htmlContainer, this.zoom);
  }

  public disconnect(connectInfo: ConnectInfo) {
    SvgConnection.disconnect(connectInfo);
  }

  // ### Elements Positioning

  // Reverse position to original position
  public cancelDrop(dropInfo: DropEventInfo) {
    setTimeout(() => {
      if (this._startEnd == null) return;
      if (this._htmlContainer == null) return;

      // Get Start + End Offset
      const xTotalOffset = this._startEnd.startX - this._startEnd.endX;
      const yTotalOffset = this._startEnd.startY - this._startEnd.endY;

      // Revert position

      this.positionelementSetOffset(
        this._startEnd.target,
        xTotalOffset,
        yTotalOffset,
      );

      this.positionelementSetChildsOffset(
        this._startEnd.target,
        xTotalOffset,
        yTotalOffset,
      );

      // // Revert Drop
      // this.dragarrayRemove(dropInfo.dropElement, dropInfo.dragElement);
      // const draggableElementDropOut = Utils.getMatDrop(dropInfo.dragElement);
      // if (draggableElementDropOut != '') {
      //   Utils.setMatDrop(dropInfo.dragElement, '');
      // }

      if (!this._startEnd.tschSelected) return;

      // Update UI
      if (Utils.isMatElement(this._startEnd.tschSelected)) {
        // Is tschMat
        SvgConnection.updateAllNodes(this._htmlContainer, this.zoom);
      } else {
        // Is tschBlock
        // Update Connections
        SvgConnection.updateNode(
          this._htmlContainer,
          this.zoom,
          this._startEnd.tschSelected.id,
        );
      }
    }, 10);
  }

  public enableDrop(dropInfo: DropEventInfo) {
    // Save drop info
    this.dragarraySet(dropInfo.dropElement, dropInfo.dragElement);
    Utils.setMatDrop(dropInfo.dragElement, dropInfo.dropMatKey);
  }

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

      if (Utils.isMatElement(childTarget)) {
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

  public addNode(
    type: 'BlockTsch' | 'MatTsch',
    tschUuid: string | null,
    matUuid: string | null,
    num_in: { [key: number]: { name: string; altname: string } },
    num_out: { [key: number]: { name: string; altname: string } },
    ele_pos_x: number,
    ele_pos_y: number,
    classoverride: string,
    html: string,
  ) {
    // Define tsch key type
    let tschKey;
    let tschID;
    if (tschUuid != null) {
      // Key is a Uuid
      tschKey = tschUuid;
      tschID = `tsch-${tschUuid}`;
    } else {
      // Key is a counter
      tschKey = this._tschNum;
      tschID = `tsch-${tschKey}`;
    }
    this._tschNum++;

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
            id="${tschID}"
            class="tsch blockTsch ${classoverride}"
            tsch-key="${tschKey}"
            dropped-in-mat-key=""
            style="z-index: 45; top: ${ele_pos_x}px; left: ${ele_pos_y}px"
           ></div>`, // Insert as lastChild
        );
        node = <HTMLElement>this._htmlContainer.lastChild;
        break;
      case 'MatTsch':
        // Define mat key type
        let matKey;
        if (matUuid != null) {
          // Key is a Uuid
          matKey = matUuid;
        } else {
          // Key is a counter
          matKey = this._matNum;
        }
        this._matNum++;

        // BLOCK TSCH
        this._htmlContainer.insertAdjacentHTML(
          'beforeend',
          `<div
            id="${tschID}"
            class="tsch matTsch ${classoverride}"
            tsch-key="${tschKey}" mat-key="${matKey}"
            dropped-in-mat-key=""
            style="z-index: ${this._zIndexNum}; top: ${ele_pos_x}px; left: ${ele_pos_y}px"
           ></div>`, // Insert as lastChild
        );
        node = <HTMLElement>this._htmlContainer.lastChild;
        this._zIndexNum++;
        break;
    }

    // SET IOs
    let IOKey: number = 0;
    const IOs: IOs = new Map();

    // ADD INPUTS
    node.insertAdjacentHTML(
      'beforeend',
      `<div class="inputs"></div>`, // Insert as lastChild
    );
    const inputs = <HTMLElement>node.lastChild;
    // Add Node HTML element inputs
    // const json_inputs: jsonInputs = new Map();
    for (const value of Object.values(num_in)) {
      inputs.insertAdjacentHTML(
        'beforeend',
        `<div class="input io-${IOKey}" io-id="io-${IOKey}" io-key="${IOKey}"><div class="type">${value.name}-${value.altname}</div></div>`, // Insert as lastChild
      );
      IOs.set(IOKey.toString(), {
        ioID: `io-${IOKey}`,
        ioKey: IOKey.toString(),
        connections: [],
        protocol: {
          key: value.name + '-' + value.altname,
          name: value.name,
          altname: value.altname,
        },
      });
      IOKey++;
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
    // const json_outputs: jsonOutputs = new Map();
    for (const value of Object.values(num_out)) {
      outputs.insertAdjacentHTML(
        'beforeend',
        `<div class="output io-${IOKey}" io-id="io-${IOKey}" io-key="${IOKey}"><div class="type">${value.name}-${value.altname}</div></div>`, // Insert as lastChild
      );
      IOs.set(IOKey.toString(), {
        ioID: `io-${IOKey}`,
        ioKey: IOKey.toString(),
        connections: [],
        protocol: {
          key: value.name + '-' + value.altname,
          name: value.name,
          altname: value.altname,
        },
      });
      IOKey++;
    }

    // Add Node Data to Connection Data
    const nodeData: NodeData = {
      tschID: tschID,
      tschKey: tschKey.toString(),
      class: classoverride,
      html: html,
      ios: IOs,
      pos_x: ele_pos_x,
      pos_y: ele_pos_y,
    };
    this.graphData.data.set(tschKey.toString(), nodeData);
    // this.dispatch('nodeCreated', newNodeId);

    return tschKey;
  }

  /* Events */
  public on(event: string, callback: Function) {
    // Check if the callback is not a function
    if (typeof callback !== 'function') {
      console.error(
        `The listener callback must be a function, the given type is ${typeof callback}`,
      );
      return;
    }

    // Check if the event is not a string
    if (typeof event !== 'string') {
      console.error(
        `The event name must be a string, the given type is ${typeof event}`,
      );
      return;
    }

    // Check if this event not exists
    let callbackArray = this._events.get(event);
    if (callbackArray === undefined) {
      callbackArray = {
        listeners: new Array(),
      };
      this._events.set(event, callbackArray);
    }

    callbackArray.listeners.push(callback);
  }

  public removeListener(event: string, callback: Function) {
    // Check if this event not exists
    const callbackArray = this._events.get(event);
    if (callbackArray === undefined) {
      console.error(`This event: ${event} does not exist`);
      return;
    }

    callbackArray.listeners = callbackArray.listeners.filter((listener) => {
      return listener.toString() !== callback.toString();
    });
  }

  public dispatch(event: string, details: any) {
    // Check if this event not exists
    const callbackArray = this._events.get(event);
    if (callbackArray === undefined) {
      console.error(`This event: ${event} does not exist`);
      return;
    }

    callbackArray.listeners.forEach((listener) => {
      listener(details);
    });
  }

  // Toast messages
  public toastError(text: string) {
    console.error(text);
    new Toast({
      text: `! ${text}`,
      position: 'top-right',
      autoClose: 5000,
      pauseOnHover: true,
      pauseOnFocusLoss: true,
    });
  }
}

export {
  Flow,
  GraphData,
  IOData,
  FlowState,
  MenuOptions,
  DropEventInfo,
  ConnectEventInfo,
  ConnectInfo,
};
