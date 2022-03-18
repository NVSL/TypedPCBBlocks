import { DrawFlow, nodeIOData } from './Flow';
import Utils from './Utils';

export default {
  draw(container: HTMLElement): SVGSVGElement {
    const svgEle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    // this.connection_ele = connection;
    // Add path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('main-path');
    path.setAttributeNS(null, 'd', '');
    path.setAttributeNS(null, 'marker-start', 'url(#dot)');
    path.setAttributeNS(null, 'marker-end', 'url(#dot)');
    // path.innerHTML = 'a';
    svgEle.classList.add('connection');
    svgEle.appendChild(path);
    container.appendChild(svgEle);

    // var id_output = ele.parentElement.parentElement.id.slice(5);
    // var output_class = ele.classList[1];
    // this.dispatch('connectionStart', {
    //   output_id: id_output,
    //   output_class: output_class,
    // });
    return svgEle;
  },
  update(
    container: HTMLElement,
    startElementPosition: HTMLElement,
    svgConnection: SVGSVGElement,
    zoom: number,
    eX: number,
    eY: number,
  ) {
    let precanvasWitdhZoom =
      container.clientWidth / (container.clientWidth * zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom =
      container.clientHeight / (container.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;
    var path = svgConnection.children[0];

    var line_x =
      startElementPosition.offsetWidth / 2 +
      (startElementPosition.getBoundingClientRect().x -
        container.getBoundingClientRect().x) *
        precanvasWitdhZoom;
    var line_y =
      startElementPosition.offsetHeight / 2 +
      (startElementPosition.getBoundingClientRect().y -
        container.getBoundingClientRect().y) *
        precanvasHeightZoom;

    var x =
      eX * (container.clientWidth / (container.clientWidth * zoom)) -
      container.getBoundingClientRect().x *
        (container.clientWidth / (container.clientWidth * zoom));
    var y =
      eY * (container.clientHeight / (container.clientHeight * zoom)) -
      container.getBoundingClientRect().y *
        (container.clientHeight / (container.clientHeight * zoom));

    const lineCurve = this.createCurvature(
      line_x,
      line_y,
      x,
      y,
      0.5,
      'balanced',
    );
    path.setAttributeNS(null, 'd', lineCurve);
  },
  updateAllNodes(container: HTMLElement, zoom: number) {
    container.childNodes.forEach((child) => {
      const ele = <HTMLElement>child;
      if (ele.getAttribute('tsch-id')) {
        this.updateNode(container, zoom, ele.id);
      }
    });
  },
  // Updates SVG Lines (Connections) for all Node Blocks
  updateNode(container: HTMLElement, zoom: number, id: string) {
    // Set Zooms
    let precanvasWitdhZoom =
      container.clientWidth / (container.clientWidth * zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom =
      container.clientHeight / (container.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;

    const renderSVGLines = (
      id: string,
      value: Element,
      inputOutput: 'INPUT' | 'OUTPUT',
    ) => {
      const elemtsearchId_io = container.querySelector(`#${id}`);
      let id_search;
      let elemtsearchIO;
      let elemtsearchId;
      let elemtsearch;
      switch (inputOutput) {
        case 'INPUT':
          id_search = value.classList[2].replace('node_out_', '');
          elemtsearchId = container.querySelector(`#${id_search}`)!;
          elemtsearch = <HTMLElement>(
            elemtsearchId.querySelectorAll('.' + value.classList[3])[0]
          );
          elemtsearchIO = <HTMLElement>(
            elemtsearchId_io!.querySelectorAll('.' + value.classList[4])[0]
          );
          break;
        case 'OUTPUT':
          id_search = value.classList[1].replace('node_in_', '');
          elemtsearchId = container.querySelector(`#${id_search}`)!;
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
          container.getBoundingClientRect().x) *
          precanvasWitdhZoom;
      const y =
        elemtsearch.offsetHeight / 2 +
        (elemtsearch.getBoundingClientRect().y -
          container.getBoundingClientRect().y) *
          precanvasHeightZoom;

      const line_x =
        elemtsearchIO.offsetWidth / 2 +
        (elemtsearchIO.getBoundingClientRect().x -
          container.getBoundingClientRect().x) *
          precanvasWitdhZoom;
      const line_y =
        elemtsearchIO.offsetHeight / 2 +
        (elemtsearchIO.getBoundingClientRect().y -
          container.getBoundingClientRect().y) *
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
    const elemsOut: NodeListOf<Element> = container.querySelectorAll(
      `.node_out_${id}`,
    );
    for (const value of Object.values(elemsOut)) {
      renderSVGLines(id, value, 'OUTPUT');
    }

    // Update Selected Element Inputs
    const elemsIn: NodeListOf<Element> = container.querySelectorAll(
      `.node_in_${id}`,
    );
    for (const value of Object.values(elemsIn)) {
      renderSVGLines(id, value, 'INPUT');
    }
  },
  createCurvature(
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
      case 'right':
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
      case 'balanced':
      default:
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
    }
  },
  connect(
    eleFirst: HTMLElement,
    eleLast: HTMLElement,
    eleConnection: SVGSVGElement,
    eleContainer: HTMLElement,
    connectionNumber: number,
    connectionMap: DrawFlow,
    zoom: number,
  ): boolean {
    // Check if last element is an input circle connection
    // if (eleLast.classList[0] !== 'input') {
    //   eleConnection.remove();
    //   return false;
    // }

    const input = Utils.getParentTschElement(eleLast);
    const output = Utils.getParentTschElement(eleFirst);

    if (!input) throw 'Input tsch element not found';
    if (!output) throw 'Output tsch element not found';

    const input_id = input.id;
    const input_class = eleLast.classList[1];
    const output_id = output.id;
    const output_class = eleFirst.classList[1];

    try {
      // Check if it's not the same tsch element
      if (output_id === input_id) {
        throw 'Cannot connect to same tsch element';
      }

      // Check if connection alredy exists
      if (
        eleContainer.querySelectorAll(
          '.connection.node_in_' +
            input_id +
            '.node_out_' +
            output_id +
            '.' +
            output_class +
            '.' +
            input_class,
        ).length !== 0
      ) {
        throw 'Connection alredy exists';
      }

      // Conection doestn't exist save connection
      const inputNodeNumber = Utils.getNodeNumber(input);
      const outputNodeNumber = Utils.getNodeNumber(output);

      if (inputNodeNumber == null) throw 'input node id not found';
      if (outputNodeNumber === null) throw 'output node id not found';

      const outputClass: nodeIOData = connectionMap.drawflow.Home.data
        .get(outputNodeNumber)!
        .ios.get(output_class)!;
      const inputClass: nodeIOData = connectionMap.drawflow.Home.data
        .get(inputNodeNumber)!
        .ios.get(input_class)!;

      // Get Types
      const output_type = outputClass.type;
      const input_type = inputClass.type;

      // Get Current Connections number
      const output_current_conections = outputClass.connections.length;
      const output_max_connections = outputClass.max_connections;

      // Check Types
      if (output_type !== input_type) throw 'Type mismatch';

      // Check Max Connections allowed
      if (output_current_conections >= output_max_connections)
        throw 'Max connections reached';

      // Make connection
      eleConnection.id = 'connection-' + connectionNumber;
      eleConnection.setAttribute('connection-id', connectionNumber.toString());
      eleConnection.classList.add('node_in_' + input_id);
      eleConnection.classList.add('node_out_' + output_id);
      eleConnection.classList.add(output_class);
      eleConnection.classList.add(input_class);

      outputClass.connections.push({
        connectionID: connectionNumber,
        tschID: inputNodeNumber,
        ioID: input_class,
      });
      inputClass.connections.push({
        connectionID: connectionNumber,
        tschID: outputNodeNumber,
        ioID: output_class,
      });

      console.log('Connected!');
      console.log('Drawflow', connectionMap.drawflow.Home.data);

      // Update all Nodes to fit connection in circle center
      this.updateAllNodes(eleContainer, zoom);
      return true;
    } catch (e) {
      console.warn(e);
      eleConnection.remove();
      return false;
    }
  },
  disablePointerEvents() {
    const svgElements = <NodeListOf<SVGSVGElement>>(
      document.querySelectorAll('svg')
    );
    svgElements.forEach((svgEle) => {
      svgEle.style.pointerEvents = 'none';
    });
  },
  enablePointerEvents() {
    const svgElements = <NodeListOf<SVGSVGElement>>(
      document.querySelectorAll('svg')
    );
    svgElements.forEach((svgEle) => {
      svgEle.style.pointerEvents = 'all';
    });
  },
};
