import { DrawFlow } from './Flow';

// TODO: Change NodeNumber and ConnectionNumber to string

export default {
  removeNodeId(
    nodeElement: HTMLElement | null,
    container: HTMLElement,
    drawflow: DrawFlow,
  ) {
    if (!nodeElement) return;

    // Delete Node Connections
    this.removeNodeIdConnections(nodeElement, container, drawflow);

    // Delete Node Block from Storage Object
    const nodeNumber = this.nodeNumber(nodeElement);
    if (nodeNumber !== null) drawflow.drawflow.Home.data.delete(nodeNumber);
    else
      console.error(
        `Node number ${nodeNumber} not found in node element`,
        nodeElement,
      );
    console.log(drawflow.drawflow.Home.data);

    // Delete Node
    nodeElement.remove();

    // console.log(this.drawflow.drawflow.Home.data);
    // Dispatch
    // this.dispatch('nodeRemoved', this.nodeNumber(id);
  },

  removeNodeIdConnections(
    nodeElement: HTMLElement | null,
    container: HTMLElement,
    drawflow: DrawFlow,
  ) {
    if (!nodeElement) return;

    const svgIDs: Array<number> = this.getNodeConnectionsSVGID(
      nodeElement,
      drawflow,
    );
    this.removeNodeConnections(svgIDs, container, drawflow);
  },

  removeNodeConnections(
    svgIDs: Array<number>,
    container: HTMLElement,
    drawflow: DrawFlow,
  ) {
    // Remove connections in UI
    for (const svgID of svgIDs) {
      console.log(svgID);
      const svgEle = container.querySelector(`#connection-${svgID}`);
      if (svgEle) svgEle.remove();
    }
    // Remove connections in Map
    const nodes = drawflow.drawflow.Home.data;
    for (const node of nodes.values()) {
      // ios
      for (const inputs of node.ios.values()) {
        if (inputs.connections.length > 0) {
          const connections = inputs.connections;
          connections.forEach((value, index) => {
            if (svgIDs.includes(value.svgid)) {
              connections.splice(index, 1);
            }
          });
        }
      }
    }
  },

  getNodeConnectionsSVGID(
    nodeElement: HTMLElement,
    drawflow: DrawFlow,
  ): Array<number> {
    const arrayConnections: Array<number> = new Array();
    const nodes = drawflow.drawflow.Home.data;
    const nodeNumber = this.nodeNumber(nodeElement);
    for (const [key, value] of nodes.entries()) {
      if (key == nodeNumber) {
        // input/outpus
        for (const inputs of value.ios.values()) {
          if (inputs.connections.length > 0) {
            const connections = inputs.connections;
            for (const connection of Object.values(connections)) {
              arrayConnections.push(connection.svgid);
            }
          }
        }
      }
    }
    return arrayConnections;
  },
  // TODO: Move to utils
  nodeNumber(nodeElement: HTMLElement): number | null {
    const num = nodeElement.getAttribute('tsch-id');
    if (num !== null) return parseInt(num);
    return null;
  },
  connectionNumber(connectionElement: HTMLElement): number | null {
    const num = connectionElement.getAttribute('connection-id');
    if (num !== null) return parseInt(num);
    return null;
  },
};
