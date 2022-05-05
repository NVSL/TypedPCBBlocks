import { GraphData, ConnectionData, DeleteEventInfo } from './Flow';
import Utils from './Utils';

// TODO: Change NodeNumber and ConnectionNumber to string

export default {
  getNodeToDeleteInfo(
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

    // Delete Node Connections
    const toDeleteConnections = this.getConnectionsToRemove(
      nodeElement,
      container,
      graphData,
    );
    if (toDeleteConnections == null) {
      console.error(`Delete Connections for ${tschKey} is null`);
      return null;
    }

    const deleteEventInfo: DeleteEventInfo = {
      toDeleteType: Utils.isMatElement(nodeElement) ? 'matTsch' : 'blockTsch',
      toDeleteTsch: {
        key: tschKey,
        element: nodeElement,
      },
      toDeleteConnections: toDeleteConnections,
    };

    return deleteEventInfo;
  },

  getConnectionsToRemove(
    nodeElement: HTMLElement | null,
    container: HTMLElement,
    graphData: GraphData,
  ): Array<ConnectionData> | null {
    if (!nodeElement) return null;

    const connections: Array<ConnectionData> = this.getNodeConnections(
      nodeElement,
      graphData,
    );

    // Get to remove node connections - false flag
    const connectionToRemoveIDs = connections.map((c) => c.connectionID);
    const connectionsToRemove = this.removeNodeConnections(
      connectionToRemoveIDs,
      container,
      graphData,
      false,
    );

    return connectionsToRemove;
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

  remove(
    graphData: GraphData,
    container: HTMLElement,
    deleteEventInfo: DeleteEventInfo,
  ) {
    console.log('BEFORE DELETE:', Utils.mapToJSON(graphData.data));

    switch (deleteEventInfo.toDeleteType) {
      case 'matTsch':
      case 'blockTsch':
        {
          if (deleteEventInfo.toDeleteTsch == null) {
            throw 'Error Deleting Tsch, toDeleteTsch is null';
          }

          // Delete Node Connections Data and HTML Elements
          const connectionToRemoveIDs = deleteEventInfo.toDeleteConnections.map(
            (c) => c.connectionID,
          );
          this.removeNodeConnections(
            connectionToRemoveIDs,
            container,
            graphData,
            true,
          );

          // Delete Node Data
          graphData.data.delete(deleteEventInfo.toDeleteTsch.key);

          // Delete Node HTML Element
          deleteEventInfo.toDeleteTsch.element.remove();
        }
        break;
      case 'connection':
        {
          // Delete Connections Data and HTML Elements
          const connectionToRemoveIDs = deleteEventInfo.toDeleteConnections.map(
            (c) => c.connectionID,
          );
          this.removeNodeConnections(
            connectionToRemoveIDs,
            container,
            graphData,
            true,
          );
        }
        break;
    }

    console.log('AFTER DELETE:', Utils.mapToJSON(graphData.data));
  },

  removeNodeConnections(
    connectionIDs: Array<string>,
    container: HTMLElement,
    graphData: GraphData,
    remove: boolean,
  ): Array<ConnectionData> {
    // Save removed connectons
    const removedConnections: Map<string, ConnectionData> = new Map();

    // Remove connections in UI
    for (const connectionID of connectionIDs) {
      if (remove) {
        console.log('Removing connection ', connectionID);
        const svgEle = container.querySelector(`#${connectionID}`);
        if (svgEle) svgEle.remove();
      }
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
              if (remove) connections.splice(index, 1);
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
};
