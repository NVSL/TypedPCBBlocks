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
    const nodeKey = Utils.getTschKey(nodeElement);
    if (nodeKey !== null) drawflow.drawflow.Home.data.delete(nodeKey);
    else
      console.error(
        `Node number ${nodeKey} not found in node element`,
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

    const connectionKeys: Array<string> = this.getNodeConnectionsKeys(
      nodeElement,
      drawflow,
    );
    this.removeNodeConnections(connectionKeys, container, drawflow);
  },

  removeNodeConnections(
    connectinKeys: Array<string>,
    container: HTMLElement,
    drawflow: DrawFlow,
  ) {
    // Remove connections in UI
    for (const connectionKey of connectinKeys) {
      console.log(connectionKey);
      const svgEle = container.querySelector(`#connection-${connectionKey}`);
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
            if (connectinKeys.includes(value.connectionID)) {
              connections.splice(index, 1);
            }
          });
        }
      }
    }
  },

  getNodeConnectionsKeys(
    nodeElement: HTMLElement,
    drawflow: DrawFlow,
  ): Array<string> {
    const arrayConnections: Array<string> = new Array();
    const nodes = drawflow.drawflow.Home.data;
    const nodeNumber = Utils.getTschKey(nodeElement);
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
