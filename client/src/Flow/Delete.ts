import { stringify } from 'relaxed-json';
import { GraphData, ConnectionData, DeleteEventInfo } from './Flow';
import Utils from './Utils';

// TODO: Change NodeNumber and ConnectionNumber to string

export default {
  removeNodeId(
    nodeElement: HTMLElement | null,
    container: HTMLElement,
    graphData: GraphData,
  ): DeleteEventInfo | null {
    if (!nodeElement) return null;

    // Delete Node Block from Storage Object
    const tschKey = Utils.getTschKey(nodeElement);
    if (tschKey == null) {
      console.error(
        `Node number ${tschKey} not found in tsch element`,
        nodeElement,
      );
      return null;
    }

    console.log('Delete node key:', tschKey);
    console.log('Delete node key info', graphData.data.get(tschKey)?.ios);
    console.log(graphData.data);

    // Delete Node Connections
    const deleteConnections = this.removeNodeIdConnections(
      nodeElement,
      container,
      graphData,
    );
    if (deleteConnections == null) {
      console.error(`Delete Connections for ${tschKey} is null`);
      return null;
    }

    const deleteEventInfo: DeleteEventInfo = {
      deleteType: 'tsch',
      deleteTschKey: tschKey,
      deleteConnections: deleteConnections,
    };

    // Delete Node Data
    graphData.data.delete(tschKey);

    // Delete Node
    nodeElement.remove();

    console.log(graphData.data);

    return deleteEventInfo;
  },

  removeNodeIdConnections(
    nodeElement: HTMLElement | null,
    container: HTMLElement,
    graphData: GraphData,
  ): Array<ConnectionData> | null {
    if (!nodeElement) return null;

    const connectionsToRemove: Array<ConnectionData> = this.getNodeConnections(
      nodeElement,
      graphData,
    );

    console.log('Connections to Delete:', connectionsToRemove);

    // Substract only connections to remove IDs
    const connectionToRemoveIDs = connectionsToRemove.map(
      (c) => c.connectionID,
    );
    const connectionsRemoved = this.removeNodeConnections(
      connectionToRemoveIDs,
      container,
      graphData,
    );

    console.log('Deleted Connections:', connectionsToRemove);
    return connectionsRemoved;
  },

  removeNodeConnections(
    connectionIDs: Array<string>,
    container: HTMLElement,
    graphData: GraphData,
  ): Array<ConnectionData> {
    // Save removed connectons
    const removedConnections: Map<string, ConnectionData> = new Map();

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
              removedConnections.set(value.connectionID, value);
            }
          });
        }
      }
    }

    // Output removed connections
    const connections: Array<ConnectionData> = new Array();
    for (const conns of removedConnections.values()) {
      connections.push(conns);
    }
    return connections;
  },

  getNodeConnections(
    nodeElement: HTMLElement,
    graphData: GraphData,
  ): Array<ConnectionData> {
    const arrayConnections: Array<ConnectionData> = new Array();
    const nodes = graphData.data;
    const nodeNumber = Utils.getTschKey(nodeElement);
    for (const [key, value] of nodes.entries()) {
      if (key == nodeNumber) {
        // input/outpus
        for (const ios of value.ios.values()) {
          if (ios.connections.length > 0) {
            const connections = ios.connections;
            for (const connection of Object.values(connections)) {
              arrayConnections.push(connection);
            }
          }
        }
      }
    }
    return arrayConnections;
  },
};
