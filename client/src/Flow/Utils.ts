export default {
  isMatElement(target: HTMLElement): boolean {
    return target.getAttribute('mat-key') ? true : false;
  },
  getTschKey(nodeElement: HTMLElement): string | null {
    return nodeElement.getAttribute('tsch-key');
  },
  getMatKey(nodeElement: HTMLElement): string | null {
    return nodeElement.getAttribute('mat-key');
  },
  getIOKey(nodeElement: HTMLElement): string | null {
    return nodeElement.getAttribute('io-key');
  },
  getConnectionKey(connectionElement: HTMLElement): string | null {
    return connectionElement.getAttribute('connection-key');
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
