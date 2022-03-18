import { GraphData } from './Flow';
import Utils from './Utils';

// TODO: Change NodeNumber and ConnectionNumber to string

export default {
  removeNodeId(
    nodeElement: HTMLElement | null,
    container: HTMLElement,
    graphData: GraphData,
  ) {
    if (!nodeElement) return;

    // Delete Node Connections
    this.removeNodeIdConnections(nodeElement, container, graphData);

    // Delete Node Block from Storage Object
    const nodeKey = Utils.getTschKey(nodeElement);
    if (nodeKey !== null) graphData.data.delete(nodeKey);
    else
      console.error(
        `Node number ${nodeKey} not found in node element`,
        nodeElement,
      );
    console.log(graphData.data);

    // Delete Node
    nodeElement.remove();

    // console.log(this.drawflow.drawflow.Home.data);
    // Dispatch
    // this.dispatch('nodeRemoved', this.nodeNumber(id);
  },

  removeNodeIdConnections(
    nodeElement: HTMLElement | null,
    container: HTMLElement,
    graphData: GraphData,
  ) {
    if (!nodeElement) return;

    const connectionIDs: Array<string> = this.getNodeConnectionsIDs(
      nodeElement,
      graphData,
    );
    console.log('Connections IDs', connectionIDs);
    this.removeNodeConnections(connectionIDs, container, graphData);
  },

  removeNodeConnections(
    connectionIDs: Array<string>,
    container: HTMLElement,
    graphData: GraphData,
  ) {
    // Remove connections in UI
    for (const connectionID of connectionIDs) {
      console.log('Removing connection ', connectionID);
      const svgEle = container.querySelector(`#${connectionID}`);
      if (svgEle) svgEle.remove();
    }
    // Remove connections in Map
    const nodes = graphData.data;
    for (const node of nodes.values()) {
      // ios
      for (const ios of node.ios.values()) {
        if (ios.connections.length > 0) {
          const connections = ios.connections;
          connections.forEach((value, index) => {
            if (connectionIDs.includes(value.connectionID)) {
              connections.splice(index, 1);
            }
          });
        }
      }
    }
  },

  getNodeConnectionsIDs(
    nodeElement: HTMLElement,
    graphData: GraphData,
  ): Array<string> {
    const arrayConnections: Array<string> = new Array();
    const nodes = graphData.data;
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
