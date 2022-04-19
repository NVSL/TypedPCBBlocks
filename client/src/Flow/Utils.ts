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
  getMatDrop(nodeElement: HTMLElement): string | null {
    return nodeElement.getAttribute('dropped-in-mat-key');
  },
  setMatDrop(nodeElement: HTMLElement, matKey: string | null) {
    if (matKey == null) return;
    nodeElement.setAttribute('dropped-in-mat-key', matKey);
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
  getZIndex(ele: HTMLElement): number {
    const eleStyle = window.getComputedStyle(ele);
    const zIndex = eleStyle.getPropertyValue('z-index');
    return parseInt(zIndex);
  },
};
