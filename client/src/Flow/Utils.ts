export default {
  utilIsMatElement(target: HTMLElement): boolean {
    return target.getAttribute('mat-id') ? true : false;
  },
  getNodeNumber(nodeElement: HTMLElement): number | null {
    const num = nodeElement.getAttribute('tsch-id');
    if (num !== null) return parseInt(num);
    return null;
  },
  getConnectionNumber(connectionElement: HTMLElement): number | null {
    const num = connectionElement.getAttribute('connection-id');
    if (num !== null) return parseInt(num);
    return null;
  },
  getParentTschElement(ele: HTMLElement): HTMLElement | null {
    let parent = ele;
    while (parent) {
      if (parent.classList.contains('tsch')) {
        return parent;
      }
      parent = parent.parentElement!;
    }
    return null;
  },
};
