import './Node.css';
import './SchemaFlow.css';

// const app = document.querySelector<HTMLDivElement>('#app')!;

// app.innerHTML = `
//   <h1>Hello Vite?</h1>
//   <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
// `;

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

  // Configurable options
  module: string = 'Home';

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

  private click(e) {}

  private dragStart(e) {
    const e_pos_x = e.clientX;
    const e_pos_y = e.clientY;

    console.log(e_pos_x, e_pos_y);
  }

  private dragEnd(e) {}

  // ##### Private Misc

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
