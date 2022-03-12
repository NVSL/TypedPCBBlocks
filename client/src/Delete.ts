export default {
  removeNodeId(id: string) {
    // Delete Node Connections
    this.removeNodeIdConnections(id);
    // Delete Node Block from UI
    const nodeElement: HTMLElement | null = <HTMLElement>(
      this.container.querySelector(`#${id}`)
    );
    if (nodeElement) nodeElement.remove();
    // Delete Node Block from Storage Object
    // console.log(this.drawflow.drawflow.Home.data);
    this.drawflow.drawflow.Home.data.delete(this.nodeNumber(id));
    // console.log(this.drawflow.drawflow.Home.data);
    // Dispatch
    // this.dispatch('nodeRemoved', this.nodeNumber(id);
  },

  removeNodeIdConnections(id: string) {
    const svgIDs: Array<string> = this.getNodeConnectionsSVGID(id);
    this.removeNodeConnections(svgIDs);
  },

  removeNodeConnections(svgIDs: Array<string>) {
    // Remove connections in UI
    for (const svgID of svgIDs) {
      console.log(svgID);
      const svgEle = this.container.querySelector(`#${svgID}`);
      if (svgEle) svgEle.remove();
    }
    // Remove connections in Map
    const nodes = this.drawflow.drawflow.Home.data;
    console.log('Nodes:', nodes);
    for (const node of nodes.values()) {
      for (const inputs of node.inputs.values()) {
        if (inputs.connections.length > 0) {
          const connections = inputs.connections;
          connections.forEach((value, index) => {
            if (svgIDs.includes(value.svgid)) {
              connections.splice(index, 1);
            }
          });
        }
      }
      // outputs
      for (const outputs of node.outputs.values()) {
        if (outputs.connections.length > 0) {
          const connections = outputs.connections;
          connections.forEach((value, index) => {
            if (svgIDs.includes(value.svgid)) {
              connections.splice(index, 1);
            }
          });
        }
      }
    }
  },

  getNodeConnectionsSVGID(id: string): Array<string> {
    const arrayConnections: Array<string> = new Array();
    const nodes = this.drawflow.drawflow.Home.data;
    const nodeNumber = this.nodeNumber(id);
    for (const [key, value] of nodes.entries()) {
      if (key == nodeNumber) {
        // inputs
        for (const inputs of value.inputs.values()) {
          if (inputs.connections.length > 0) {
            const connections = inputs.connections;
            for (const connection of Object.values(connections)) {
              arrayConnections.push(connection.svgid);
            }
          }
        }
        // outputs
        for (const outputs of value.outputs.values()) {
          if (outputs.connections.length > 0) {
            const connections = outputs.connections;
            for (const connection of Object.values(connections)) {
              arrayConnections.push(connection.svgid);
            }
          }
        }
      }
    }
    return arrayConnections;
  },
};
