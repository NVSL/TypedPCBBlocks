import './Node.css';
import './SchemaFlow.css';

// const app = document.querySelector<HTMLDivElement>('#app')!;

// app.innerHTML = `
//   <h1>Hello Vite?</h1>
//   <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
// `;

// ENUM: Click selections
enum Selected {
  None = 'None',
  NodeBlock = 'NodeBlock',
  NodeOutput = 'NodeOutput',
  Connection = 'Connection',
  Editor = 'Editor',
}

type NodeID = number;

// IFACE: jsonInputs
interface jsonInputsData {
  connections: Array<any>;
  type: string;
}
type jsonInputs = Map<string, jsonInputsData>;

// IFACE: jsonOutputs
interface jsonOutputsData {
  connections: Array<any>;
  type: string;
  max_connections: number;
}
type jsonOutputs = Map<string, jsonOutputsData>;

// IFACE: Data
interface Data {
  id: number;
  name: string;
  data: Object; // For HTML variables, Not used
  class: string;
  html: string;
  typenode: boolean; // For HTML types (e.g., Vue) not used
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

export default class SchemaFlow {
  // HTML
  container: HTMLElement; // User HTML
  precanvas: HTMLElement | null = null; // Nodes HTML Container

  // Schema Flow
  drawflow: DrawFlow = { drawflow: { Home: { data: new Map() } } }; // Nodes Object
  nodeId: number = 1; // Nodes ID
  ele_selected: HTMLElement | null = null;

  // Click and Position
  selected: Selected = Selected.None;
  pos_x = 0;
  pos_x_start = 0;
  pos_y = 0;
  pos_y_start = 0;
  canvas_x = 0;
  canvas_y = 0;

  // SVG
  connection_ele: SVGSVGElement | null = null;

  // Configurable options
  module: string = 'Home';
  zoom = 1;
  zoom_max = 1.6;
  zoom_min = 0.5;
  zoom_value = 0.1;
  zoom_last_value = 1;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public start() {
    // Add canvas to container HML
    this.container.classList.add('parent-drawflow');
    this.container.tabIndex = 0;
    this.precanvas = document.createElement('div');
    this.precanvas.classList.add('drawflow');
    this.container.appendChild(this.precanvas);

    /* Mouse Actions */

    this.container.addEventListener('mousedown', this.click.bind(this));
    this.container.addEventListener('mousemove', this.dragStart.bind(this));
    this.container.addEventListener('mouseup', this.dragEnd.bind(this));
  }

  public addNode(
    name: string,
    num_in: { [key: number]: string },
    num_out: { [key: number]: { name: string; max: number } },
    ele_pos_x: number,
    ele_pos_y: number,
    classoverride: string,
    data: Object,
    html: string,
    typenode = false,
  ) {
    // Set node ID
    var newNodeId: NodeID = this.nodeId; // Replace to use uuid -> this.getUuid();
    this.nodeId++;

    // Create Node HTML element
    const parent = document.createElement('div');
    parent.classList.add('parent-node');
    const node = document.createElement('div');
    node.innerHTML = '';
    node.setAttribute('id', 'node-' + newNodeId);
    node.classList.add('drawflow-node');
    if (classoverride != '') {
      node.classList.add(classoverride);
    }

    // Add Node HTML element input group
    const inputs = document.createElement('div');
    inputs.classList.add('inputs');

    // Add Node HTML element inputs
    const json_inputs: jsonInputs = new Map();
    for (const [key, value] of Object.entries(num_in)) {
      const input = document.createElement('div');
      input.classList.add('input');
      input.classList.add('input_' + key);
      json_inputs.set('input_' + key, { connections: [], type: value }); // TODO: Change type to inputName
      const type = document.createElement('div');
      type.innerHTML = value;
      type.classList.add('type');
      input.appendChild(type);
      inputs.appendChild(input);
    }

    // Add Node HTML element ouput group
    const outputs = document.createElement('div');
    outputs.classList.add('outputs');

    // Add Node HTML element outputs
    const json_outputs: jsonOutputs = new Map();
    console.log('OUTPUT NUM:', Object.keys(num_out).length);
    for (const [key, value] of Object.entries(num_out)) {
      let iface_type = value.name;
      let iface_max_connections = value.max;
      const output = document.createElement('div');
      output.classList.add('output');
      output.classList.add('output_' + key);
      json_outputs.set('output_' + key, {
        connections: [],
        type: iface_type,
        max_connections: iface_max_connections,
      });
      const type = document.createElement('div'); // TODO: Change type to outputName
      type.innerHTML = iface_type;
      type.classList.add('type');
      output.appendChild(type);
      outputs.appendChild(output);
    }
    console.log('JSON OUTPUTS:', json_outputs);
    /* TODO: Figure out how do listeners get called to know the connections. */
    /* Then add connection types, they add CSS type in the input and output */
    /* I can maybe add connection type using  { connections: [], type: "I2C" }*/

    // Add Node HTML Content
    const content = document.createElement('div');
    content.classList.add('drawflow_content_node');
    content.innerHTML = html;

    node.appendChild(inputs);
    node.appendChild(content);
    node.appendChild(outputs);
    node.style.top = ele_pos_y + 'px';
    node.style.left = ele_pos_x + 'px';
    parent.appendChild(node);
    if (this.precanvas) {
      this.precanvas.appendChild(parent);
      var nodeData: Data = {
        id: newNodeId,
        name: name,
        data: data,
        class: classoverride,
        html: html,
        typenode: typenode,
        inputs: json_inputs,
        outputs: json_outputs,
        pos_x: ele_pos_x,
        pos_y: ele_pos_y,
      };
      this.drawflow.drawflow.Home.data.set(newNodeId, nodeData);
      // this.dispatch('nodeCreated', newNodeId);
    }

    return newNodeId;
  }

  // ##### Private Mouse Actions

  private click(e: MouseEvent) {
    // Remove previous selection if any
    if (this.ele_selected) {
      this.ele_selected.classList.remove('selected');
    }

    // Dispatch unselected messages from previous selection
    switch (this.selected) {
      case Selected.NodeBlock:
        // this.dispatch('nodeUnselected', true);
        break;
    }

    // Get New Target
    const target: HTMLElement | null = <HTMLElement>e.target;
    if (!target) return;
    if (target.closest('.drawflow_content_node') != null) {
      this.ele_selected = target.closest(
        '.drawflow_content_node',
      )!.parentElement;
    } else {
      this.ele_selected = target;
    }
    if (!this.ele_selected) return;

    // Get Selected Element
    switch (this.ele_selected.classList[0]) {
      case 'drawflow-node':
        console.log('Node Selected');
        this.selected = Selected.NodeBlock;
        this.ele_selected.classList.add('selected');
        break;
      case 'drawflow':
      case 'parent-drawflow':
        console.log('Editor Selected');
        this.selected = Selected.Editor;
        break;
      case 'output':
        console.log('Output Selected');
        this.selected = Selected.NodeOutput;
        this.drawConnection(target);
        // TODO: Draw connection
        break;
    }

    // Get Position
    this.pos_x = e.clientX;
    this.pos_x_start = e.clientX;
    this.pos_y = e.clientY;
    this.pos_y_start = e.clientY;

    // Dispatch Click
    // this.dispatch('click', e);
  }

  private dragStart(e: MouseEvent) {
    const e_pos_x = e.clientX;
    const e_pos_y = e.clientY;

    if (!this.precanvas) return;
    if (!this.ele_selected) return;

    // Move Selected Element
    let x,
      y = 0;
    switch (this.selected) {
      case Selected.NodeBlock:
        // Move Node Block
        x =
          ((this.pos_x - e_pos_x) * this.precanvas.clientWidth) /
          (this.precanvas.clientWidth * this.zoom);
        y =
          ((this.pos_y - e_pos_y) * this.precanvas.clientHeight) /
          (this.precanvas.clientHeight * this.zoom);
        this.pos_x = e_pos_x;
        this.pos_y = e_pos_y;

        this.ele_selected.style.top = this.ele_selected.offsetTop - y + 'px';
        this.ele_selected.style.left = this.ele_selected.offsetLeft - x + 'px';

        // Save Node Block position
        const nodeBlock = this.drawflow.drawflow.Home.data.get(
          this.nodeNumber(this.ele_selected.id),
        );
        if (nodeBlock) {
          nodeBlock.pos_x = this.ele_selected.offsetLeft - x;
          nodeBlock.pos_y = this.ele_selected.offsetTop - y;
        }

        // Update Connections
        this.updateConnectionNodes(this.ele_selected.id);
        break;
      case Selected.Editor:
        // Move Editor
        x = this.canvas_x + -(this.pos_x - e_pos_x);
        y = this.canvas_y + -(this.pos_y - e_pos_y);

        // this.dispatch('translate', { x: x, y: y });
        this.precanvas.style.transform =
          'translate(' + x + 'px, ' + y + 'px) scale(' + this.zoom + ')';
        break;
      case Selected.NodeOutput:
        // Update SVG Connection
        this.updateConnection(e_pos_x, e_pos_y);
        break;
    }
  }

  private dragEnd(e: MouseEvent) {
    const e_pos_x = e.clientX;
    const e_pos_y = e.clientY;
    const ele_last = (<HTMLElement>e.target).parentElement;

    switch (this.selected) {
      case Selected.NodeBlock:
        if (this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
          // this.dispatch('nodeMoved', this.nodeNumber(this.ele_selected.id));
        }
        break;
      case Selected.Editor:
        this.canvas_x = this.canvas_x + -(this.pos_x - e_pos_x);
        this.canvas_y = this.canvas_y + -(this.pos_y - e_pos_y);
        break;
      case Selected.NodeOutput:
        if (!ele_last) return;
        if (!this.ele_selected) return;
        if (!this.connection_ele) return;
        console.log('try');
        if (ele_last.classList[0] === 'input') {
          const input_id = ele_last.parentElement!.parentElement!.id;
          const input_class = ele_last.classList[1];
          const output_id = this.ele_selected.parentElement!.parentElement!.id;
          const output_class = this.ele_selected.classList[1];
          if (output_id !== input_id) {
            if (
              this.container.querySelectorAll(
                '.connection.node_in_' +
                  input_id +
                  '.node_out_' +
                  output_id +
                  '.' +
                  output_class +
                  '.' +
                  input_class,
              ).length === 0
            ) {
              console.log('Drag End | Connection no exists save connection');

              // Conection no exist save connection

              const inputNodeNumber = this.nodeNumber(input_id);
              const outputNodeNumber = this.nodeNumber(output_id);

              const outputClass = this.drawflow.drawflow.Home.data
                .get(outputNodeNumber)!
                .outputs.get(output_class)!;
              const inputClass = this.drawflow.drawflow.Home.data
                .get(inputNodeNumber)!
                .inputs.get(input_class)!;

              // Get Types
              const output_type = outputClass.type;
              const input_type = inputClass.type;

              // Get Current Connections number
              const output_current_conections = outputClass.connections.length;
              const output_max_connections = outputClass.max_connections;

              // Check Types
              if (output_type === input_type) {
                console.log('Drag End | Output type == input type');
                // Check max connections
                if (output_current_conections < output_max_connections) {
                  console.log('Make connection');
                  // Make connection
                  this.connection_ele.classList.add('node_in_' + input_id);
                  this.connection_ele.classList.add('node_out_' + output_id);
                  this.connection_ele.classList.add(output_class);
                  this.connection_ele.classList.add(input_class);

                  outputClass.connections.push({
                    node: inputNodeNumber,
                    output: input_class,
                  });
                  inputClass.connections.push({
                    node: outputNodeNumber,
                    input: output_class,
                  });
                  // this.updateConnectionNodes('node-' + outputNodeNumber);
                  // this.updateConnectionNodes('node-' + inputNodeNumber);
                  // this.dispatch('connectionCreated', {
                  //   output_id: outputNodeNumber,
                  //   input_id: inputNodeNumber,
                  //   output_class: output_class,
                  //   input_class: input_class,
                  // });
                } else {
                  console.warn('Max connections reached');
                  // this.dispatch('connectionCancel', true);
                  this.connection_ele.remove();
                }
              } else {
                // Cancel connection (type mismatch)
                console.warn('Type mismatch');
                // this.dispatch('connectionCancel', true);
                this.connection_ele.remove();
              }
            }
          } else {
            // Cancel connection
            // this.dispatch('connectionCancel', true);
            if (this.connection_ele) this.connection_ele.remove();
          }
        } else {
          // Cancel connection
          // this.dispatch('connectionCancel', true);
          if (this.connection_ele) this.connection_ele.remove();
        }
        break;
    }

    this.selected = Selected.None;
  }

  // ##### Private SVG manipulation

  private drawConnection(ele: HTMLElement) {
    this.connection_ele = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    // this.connection_ele = connection;
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('main-path');
    path.setAttributeNS(null, 'd', '');
    // path.innerHTML = 'a';
    this.connection_ele.classList.add('connection');
    this.connection_ele.appendChild(path);
    if (this.precanvas) this.precanvas.appendChild(this.connection_ele);
    // var id_output = ele.parentElement.parentElement.id.slice(5);
    // var output_class = ele.classList[1];
    // this.dispatch('connectionStart', {
    //   output_id: id_output,
    //   output_class: output_class,
    // });
  }

  // Updates SVG Line (Connections) while forming a new connection
  private updateConnection(eX: number, eY: number) {
    if (!this.precanvas) return;
    if (!this.connection_ele) return;
    if (!this.ele_selected) return;

    let precanvasWitdhZoom =
      this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom =
      this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;
    var path = this.connection_ele.children[0];

    var line_x =
      this.ele_selected.offsetWidth / 2 +
      (this.ele_selected.getBoundingClientRect().x -
        this.precanvas.getBoundingClientRect().x) *
        precanvasWitdhZoom;
    var line_y =
      this.ele_selected.offsetHeight / 2 +
      (this.ele_selected.getBoundingClientRect().y -
        this.precanvas.getBoundingClientRect().y) *
        precanvasHeightZoom;

    var x =
      eX *
        (this.precanvas.clientWidth /
          (this.precanvas.clientWidth * this.zoom)) -
      this.precanvas.getBoundingClientRect().x *
        (this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom));
    var y =
      eY *
        (this.precanvas.clientHeight /
          (this.precanvas.clientHeight * this.zoom)) -
      this.precanvas.getBoundingClientRect().y *
        (this.precanvas.clientHeight /
          (this.precanvas.clientHeight * this.zoom));

    const lineCurve = this.createCurvature(
      line_x,
      line_y,
      x,
      y,
      0.5,
      'openclose',
    );
    console.log('Line Curve', lineCurve);
    path.setAttributeNS(null, 'd', lineCurve);
  }

  // Updates SVG Lines (Connections) for all Node Blocks
  private updateConnectionNodes(id: string) {
    if (!this.precanvas) return;
    // Set Zooms
    let precanvasWitdhZoom =
      this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom =
      this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;

    const renderSVGLines = (
      id: string,
      value: Element,
      inputOutput: 'INPUT' | 'OUTPUT',
    ) => {
      if (!this.precanvas) return;
      const elemtsearchId_io = this.container.querySelector(`#${id}`);
      let id_search;
      let elemtsearchIO;
      let elemtsearchId;
      let elemtsearch;
      switch (inputOutput) {
        case 'INPUT':
          id_search = value.classList[2].replace('node_out_', '');
          elemtsearchId = this.container.querySelector(`#${id_search}`)!;
          elemtsearch = <HTMLElement>(
            elemtsearchId.querySelectorAll('.' + value.classList[3])[0]
          );
          elemtsearchIO = <HTMLElement>(
            elemtsearchId_io!.querySelectorAll('.' + value.classList[4])[0]
          );
          break;
        case 'OUTPUT':
          id_search = value.classList[1].replace('node_in_', '');
          elemtsearchId = this.container.querySelector(`#${id_search}`)!;
          elemtsearch = <HTMLElement>(
            elemtsearchId.querySelectorAll('.' + value.classList[4])[0]
          );
          elemtsearchIO = <HTMLElement>(
            elemtsearchId_io!.querySelectorAll('.' + value.classList[3])[0]
          );
          break;
      }

      const x =
        elemtsearch.offsetWidth / 2 +
        (elemtsearch.getBoundingClientRect().x -
          this.precanvas.getBoundingClientRect().x) *
          precanvasWitdhZoom;
      const y =
        elemtsearch.offsetHeight / 2 +
        (elemtsearch.getBoundingClientRect().y -
          this.precanvas.getBoundingClientRect().y) *
          precanvasHeightZoom;

      const line_x =
        elemtsearchIO.offsetWidth / 2 +
        (elemtsearchIO.getBoundingClientRect().x -
          this.precanvas.getBoundingClientRect().x) *
          precanvasWitdhZoom;
      const line_y =
        elemtsearchIO.offsetHeight / 2 +
        (elemtsearchIO.getBoundingClientRect().y -
          this.precanvas.getBoundingClientRect().y) *
          precanvasHeightZoom;

      let lineCurve;
      switch (inputOutput) {
        case 'INPUT':
          lineCurve = this.createCurvature(
            x,
            y,
            line_x,
            line_y,
            0.5,
            'openclose',
          );
          break;
        case 'OUTPUT':
          lineCurve = this.createCurvature(
            line_x,
            line_y,
            x,
            y,
            0.5,
            'openclose',
          );
          break;
      }

      value.children[0].setAttributeNS(null, 'd', lineCurve);
    };

    // Update Selected Element Outputs
    const elemsOut: NodeListOf<Element> = this.container.querySelectorAll(
      `.node_out_${id}`,
    );
    for (const value of Object.values(elemsOut)) {
      renderSVGLines(id, value, 'OUTPUT');
    }

    // Update Selected Element Inputs
    const elemsIn: NodeListOf<Element> = this.container.querySelectorAll(
      `.node_in_${id}`,
    );
    for (const value of Object.values(elemsIn)) {
      renderSVGLines(id, value, 'INPUT');
    }
  }

  private createCurvature(
    start_pos_x: number,
    start_pos_y: number,
    end_pos_x: number,
    end_pos_y: number,
    curvature_value: number,
    type: string,
  ) {
    const line_x = start_pos_x;
    const line_y = start_pos_y;
    const x = end_pos_x;
    const y = end_pos_y;
    const curvature = curvature_value;
    //type openclose open close other
    let hx1,
      hx2 = 0;
    switch (type) {
      case 'open':
        if (start_pos_x >= end_pos_x) {
          hx1 = line_x + Math.abs(x - line_x) * curvature;
          hx2 = x - Math.abs(x - line_x) * (curvature * -1);
        } else {
          hx1 = line_x + Math.abs(x - line_x) * curvature;
          hx2 = x - Math.abs(x - line_x) * curvature;
        }
        return (
          ' M ' +
          line_x +
          ' ' +
          line_y +
          ' C ' +
          hx1 +
          ' ' +
          line_y +
          ' ' +
          hx2 +
          ' ' +
          y +
          ' ' +
          x +
          '  ' +
          y
        );
      case 'close':
        if (start_pos_x >= end_pos_x) {
          hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
          hx2 = x - Math.abs(x - line_x) * curvature;
        } else {
          hx1 = line_x + Math.abs(x - line_x) * curvature;
          hx2 = x - Math.abs(x - line_x) * curvature;
        }
        return (
          ' M ' +
          line_x +
          ' ' +
          line_y +
          ' C ' +
          hx1 +
          ' ' +
          line_y +
          ' ' +
          hx2 +
          ' ' +
          y +
          ' ' +
          x +
          '  ' +
          y
        );
      case 'other':
        if (start_pos_x >= end_pos_x) {
          hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
          hx2 = x - Math.abs(x - line_x) * (curvature * -1);
        } else {
          hx1 = line_x + Math.abs(x - line_x) * curvature;
          hx2 = x - Math.abs(x - line_x) * curvature;
        }
        return (
          ' M ' +
          line_x +
          ' ' +
          line_y +
          ' C ' +
          hx1 +
          ' ' +
          line_y +
          ' ' +
          hx2 +
          ' ' +
          y +
          ' ' +
          x +
          '  ' +
          y
        );
      default:
        hx1 = line_x + Math.abs(x - line_x) * curvature;
        hx2 = x - Math.abs(x - line_x) * curvature;
        return (
          ' M ' +
          line_x +
          ' ' +
          line_y +
          ' C ' +
          hx1 +
          ' ' +
          line_y +
          ' ' +
          hx2 +
          ' ' +
          y +
          ' ' +
          x +
          '  ' +
          y
        );
    }
  }

  // ##### Private Utils

  private nodeNumber(id: string): number {
    const number = parseInt(id.slice(5));
    return number;
  }

  private load() {}

  // private getUuid() {
  //   // http://www.ietf.org/rfc/rfc4122.txt
  //   var s = [];
  //   var hexDigits = '0123456789abcdef';
  //   for (var i = 0; i < 36; i++) {
  //     s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  //   }
  //   s[14] = '4'; // bits 12-15 of the time_hi_and_version field to 0010
  //   s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
  //   s[8] = s[13] = s[18] = s[23] = '-';

  //   var uuid = s.join('');
  //   return uuid;
  // }
}

/* TODO: Continue impplementing click/dragStart/dragEnd   */
