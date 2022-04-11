import { GraphData, IOData } from './Flow';
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
      if (Utils.getTschKey(ele)) {
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
      const fromTschElement = container.querySelector(`#${id}`);
      let fromTschIOElement;
      let toTscheElement;
      let toTschIOElement;

      switch (inputOutput) {
        case 'INPUT':
          toTscheElement = container.querySelector(
            `#${value.getAttribute('from-node')}`,
          )!;
          toTschIOElement = <HTMLElement>(
            toTscheElement.querySelectorAll(
              `[io-id="${value.getAttribute('from-io')}"]`,
            )[0]
          );
          fromTschIOElement = <HTMLElement>(
            fromTschElement!.querySelectorAll(
              `[io-id="${value.getAttribute('to-io')}"]`,
            )[0]
          );
          break;
        case 'OUTPUT':
          toTscheElement = container.querySelector(
            `#${value.getAttribute('to-node')}`,
          )!;
          toTschIOElement = <HTMLElement>(
            toTscheElement.querySelectorAll(
              `[io-id="${value.getAttribute('to-io')}"]`,
            )[0]
          );
          fromTschIOElement = <HTMLElement>(
            fromTschElement!.querySelectorAll(
              `[io-id="${value.getAttribute('from-io')}"]`,
            )[0]
          );
          break;
      }

      const x =
        toTschIOElement.offsetWidth / 2 +
        (toTschIOElement.getBoundingClientRect().x -
          container.getBoundingClientRect().x) *
          precanvasWitdhZoom;
      const y =
        toTschIOElement.offsetHeight / 2 +
        (toTschIOElement.getBoundingClientRect().y -
          container.getBoundingClientRect().y) *
          precanvasHeightZoom;

      const line_x =
        fromTschIOElement.offsetWidth / 2 +
        (fromTschIOElement.getBoundingClientRect().x -
          container.getBoundingClientRect().x) *
          precanvasWitdhZoom;
      const line_y =
        fromTschIOElement.offsetHeight / 2 +
        (fromTschIOElement.getBoundingClientRect().y -
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
      `[from-node="${id}"]`,
    );
    for (const value of Object.values(elemsOut)) {
      renderSVGLines(id, value, 'OUTPUT');
    }

    // Update Selected Element Inputs
    const elemsIn: NodeListOf<Element> = container.querySelectorAll(
      `[to-node="${id}"]`,
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
    connectionKey: string,
    graphData: GraphData,
    zoom: number,
  ): boolean {
    try {
      // Check if mouse up element or parent contains input or output class.
      if (
        !(
          eleLast.classList.contains('input') ||
          eleLast.classList.contains('output')
        )
      ) {
        eleLast = <HTMLElement>eleLast.parentElement;
        if (
          !(
            eleLast.classList.contains('input') ||
            eleLast.classList.contains('output')
          )
        ) {
          throw 'Mouse end target is not input or output';
        }
      }

      const inputTschElement = Utils.getParentTschElement(eleLast);
      const outputTschElement = Utils.getParentTschElement(eleFirst);

      if (!inputTschElement) throw 'Input tsch element not found';
      if (!outputTschElement) throw 'Output tsch element not found';

      const input_ioKey = Utils.getIOKey(eleLast);
      const output_ioKey = Utils.getIOKey(eleFirst);

      if (!input_ioKey) throw 'Input IO Key not found';
      if (!output_ioKey) throw 'Output IO Key not found';

      const input_ioID = `io-${input_ioKey}`;
      const output_ioID = `io-${output_ioKey}`;

      // Check if it's not the same tsch element
      if (outputTschElement.id === inputTschElement.id) {
        throw 'Cannot connect to same tsch element';
      }

      // Check if connection alredy exists
      if (
        eleContainer.querySelectorAll(
          '.connection.node_in_' +
            outputTschElement.id +
            '.node_out_' +
            outputTschElement.id +
            '.' +
            input_ioID +
            '.' +
            output_ioID,
        ).length !== 0
      ) {
        throw 'Connection alredy exists';
      }

      // Conection doestn't exist save connection
      const input_tschKey = Utils.getTschKey(inputTschElement);
      const output_tschKey = Utils.getTschKey(outputTschElement);

      if (input_tschKey == null) throw 'Input tsch key not found';
      if (output_tschKey === null) throw 'Output tsch key not found';

      const input_tschID = `tsch-${input_tschKey}`;
      const output_tschID = `tsch-${output_tschKey}`;

      const inputIOData: IOData = graphData.data
        .get(input_tschKey)!
        .ios.get(input_ioKey)!;
      const outputIOData: IOData = graphData.data
        .get(output_tschKey)!
        .ios.get(output_ioKey)!;

      // Get Types
      const input_type = inputIOData.type;
      const output_type = outputIOData.type;

      // Check Types
      if (output_type !== input_type) throw 'Type mismatch';

      // Check if IO connection already exists for inputs
      for (const connection of inputIOData.connections) {
        if (
          connection.ioID == outputIOData.ioID &&
          connection.tschID == output_tschID
        ) {
          throw 'IO aready exists';
        }
      }

      // Check if IO connection already exists for inputs
      for (const connection of outputIOData.connections) {
        if (
          connection.ioID == inputIOData.ioID &&
          connection.tschID == input_tschID
        ) {
          throw 'IO aready exists';
        }
      }

      const connectionID = 'connection-' + connectionKey;
      eleConnection.id = connectionID;
      eleConnection.setAttribute('connection-key', connectionKey);
      eleConnection.setAttribute('from-node', outputTschElement.id);
      eleConnection.setAttribute('to-node', inputTschElement.id);
      eleConnection.setAttribute('from-io', output_ioID);
      eleConnection.setAttribute('to-io', input_ioID);

      outputIOData.connections.push({
        connectionID: connectionID,
        connectionKey: connectionKey,
        tschID: input_tschID,
        tschKey: input_tschKey,
        ioID: input_ioID,
        ioKey: input_ioKey,
      });
      inputIOData.connections.push({
        connectionID: connectionID,
        connectionKey: connectionKey,
        tschID: output_tschID,
        tschKey: output_tschKey,
        ioID: output_ioID,
        ioKey: output_ioKey,
      });

      console.log('Connected!');
      console.log('GraphData', graphData.data);

      // Dispatch Connection event

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
