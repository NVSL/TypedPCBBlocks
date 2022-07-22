import structuredClone from '@ungap/structured-clone';

export default {
  isMatElement(target: HTMLElement): boolean {
    try {
      return target.getAttribute('mat-key') ? true : false;
    } catch (e) {
      return false;
    }
  },
  getTschKey(nodeElement: HTMLElement): string | null {
    try {
      return nodeElement.getAttribute('tsch-key');
    } catch (e) {
      return null;
    }
  },
  getMatKey(nodeElement: HTMLElement): string | null {
    try {
      return nodeElement.getAttribute('mat-key');
    } catch (e) {
      return null;
    }
  },
  getMatDrop(nodeElement: HTMLElement): string | null {
    try {
      return nodeElement.getAttribute('dropped-in-mat-key');
    } catch (e) {
      return null;
    }
  },
  getMatElement(matKey: string): HTMLElement | null {
    return document.querySelector(`[mat-key="${matKey}"]`);
  },
  setMatDrop(nodeElement: HTMLElement, matKey: string | null) {
    if (matKey == null) return;
    nodeElement.setAttribute('dropped-in-mat-key', matKey);
  },
  getIOKey(nodeElement: HTMLElement): string | null {
    try {
      return nodeElement.getAttribute('io-key');
    } catch (e) {
      return null;
    }
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
  copy(object: JSON): JSON {
    return structuredClone(object);
  },
  mapToJSON(map: Map<any, any>): JSON {
    return this.copy(<JSON>Object.fromEntries(map));
  },
};
