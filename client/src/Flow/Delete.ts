import { DrawFlow } from './Flow';
import Utils from './Utils';

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
    const nodeNumber = Utils.getNodeNumber(nodeElement);
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
    connectinIDs: Array<number>,
    container: HTMLElement,
    drawflow: DrawFlow,
  ) {
    // Remove connections in UI
    for (const svgID of connectinIDs) {
      console.log(svgID);
      const svgEle = container.querySelector(`#connection-${svgID}`);
      if (svgEle) svgEle.remove();
    }
    // Remove connections in Map
    const nodes = drawflow.drawflow.Home.data;
    for (const node of nodes.values()) {
      // ios
      for (const ios of node.ios.values()) {
        if (ios.connections.length > 0) {
          const connections = ios.connections;
          connections.forEach((value, index) => {
            if (connectinIDs.includes(value.connectionID)) {
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
    const nodeNumber = Utils.getNodeNumber(nodeElement);
    for (const [key, value] of nodes.entries()) {
      if (key == nodeNumber) {
        // input/outpus
        for (const ios of value.ios.values()) {
          if (ios.connections.length > 0) {
            const connections = ios.connections;
            for (const connection of Object.values(connections)) {
              arrayConnections.push(connection.connectionID);
            }
          }
        }
      }
    }
    return arrayConnections;
  },
};
