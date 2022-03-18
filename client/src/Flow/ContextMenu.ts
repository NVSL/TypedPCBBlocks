import { FlowState, MenuOptions } from './Flow';
import Delete from './Delete';
import Utils from './Utils';

export default {
  Show(tag: string, e: MouseEvent) {
    const contextMenu = <HTMLElement>document.querySelector(tag);

    if (!contextMenu) return;

    // Position Context Menu
    const posX =
      e.clientX + 150 > document.documentElement.clientWidth
        ? e.clientX - 150
        : e.clientX;
    const posY =
      e.clientY + 140 + 55 > document.documentElement.clientHeight
        ? e.clientY - 140
        : e.clientY;
    contextMenu.style.top = posY + 'px';
    contextMenu.style.left = posX + 'px';
    contextMenu.classList.add('shown');
  },

  Remove() {
    let contextMenu;
    contextMenu = <HTMLElement>document.querySelector('#contextMenuMat');
    if (contextMenu) contextMenu.classList.remove('shown');
    contextMenu = <HTMLElement>document.querySelector('#contextMenuBlock');
    if (contextMenu) contextMenu.classList.remove('shown');
    contextMenu = <HTMLElement>document.querySelector('#contextMenuConnection');
    if (contextMenu) contextMenu.classList.remove('shown');
  },

  // Contextmenu process Mat options
  ProcessMat: (option: MenuOptions, flowState: FlowState) => {
    const tschElements = <HTMLElement>document.querySelector('#tschs')!;
    const zIndexesArray: Array<{
      ele: HTMLElement;
      tschId: string;
      zIndex: number;
    }> = new Array();

    if (!flowState.tschSelected) return;

    // Layers options is only available for Mats
    if (!Utils.utilIsMatElement(flowState.tschSelected)) return;

    // Get element to move
    let eleToMove: string | null = null;
    if (flowState.tschSelected) {
      eleToMove = flowState.tschSelected.getAttribute('tsch-id');
    } else {
      return;
    }

    if (!eleToMove) {
      return;
    }

    // Fill zIndex Array with current tsch elements (Only Mat Elements)
    tschElements.childNodes.forEach((child) => {
      const childEle = <HTMLElement>child;
      if (Utils.utilIsMatElement(childEle)) {
        const matStyle = window.getComputedStyle(childEle);
        const tschId = childEle.getAttribute('tsch-id');
        if (tschId) {
          const zIndex = matStyle.getPropertyValue('z-index');
          zIndexesArray.push({
            ele: childEle,
            tschId: tschId,
            zIndex: parseFloat(zIndex),
          });
        }
      }
    });

    // Sort zIndex Array
    zIndexesArray.sort((a, b) =>
      a.zIndex > b.zIndex ? 1 : b.zIndex > a.zIndex ? -1 : 0,
    );

    // Update zIndex depending of option
    switch (option) {
      case MenuOptions.LayerTop:
        let minusOne: boolean = false;
        const lastEle = { ...zIndexesArray[zIndexesArray.length - 1] };
        if (eleToMove != lastEle.tschId) {
          for (const ele of zIndexesArray) {
            // If eleToMove swap with last, the rest -1
            if (minusOne) {
              ele.zIndex -= 1;
            }
            if (ele.tschId == eleToMove) {
              ele.zIndex = lastEle.zIndex;
              minusOne = true;
            }
          }
        }
        break;
      case MenuOptions.LayerUp:
        for (const [index, value] of zIndexesArray.entries()) {
          if (value.tschId == eleToMove) {
            // Swap with next element
            const nextEle = zIndexesArray[index + 1];
            if (nextEle) {
              const tmp = value.zIndex;
              value.zIndex = nextEle.zIndex;
              nextEle.zIndex = tmp;
            }
          }
        }
        break;
      case MenuOptions.LayerDown:
        for (const [index, value] of zIndexesArray.entries()) {
          if (value.tschId == eleToMove) {
            // Swap with previous element
            const prevEle = zIndexesArray[index - 1];
            if (prevEle) {
              const tmp = value.zIndex;
              value.zIndex = prevEle.zIndex;
              prevEle.zIndex = tmp;
            }
          }
        }
        break;
      case MenuOptions.LayerBottom:
        let plusOne: boolean = true;
        const firstEle = { ...zIndexesArray[0] };
        if (eleToMove != firstEle.tschId) {
          for (const ele of zIndexesArray) {
            // If eleToMove swap with first, the rest +1
            if (ele.tschId == eleToMove) {
              ele.zIndex = firstEle.zIndex;
              plusOne = false;
            }
            if (plusOne) {
              ele.zIndex += 1;
            }
          }
        }
        break;
      case MenuOptions.Delete:
        console.log('Delete click', flowState.tschSelected);
        if (!flowState.tschSelected) return;
        if (!flowState.htmlContainer) return;
        Delete.removeNodeId(
          flowState.tschSelected,
          flowState.htmlContainer,
          flowState.drawflow,
        );
        break;
    }

    // Apply zIndex Changes
    for (const ele of zIndexesArray) {
      ele.ele.style.zIndex = ele.zIndex.toString();
    }
  },

  ProcessBlock: (option: MenuOptions, flowState: FlowState) => {
    console.log('Block Context Click', option);
    switch (option) {
      case MenuOptions.Delete:
        console.log('Delete click', flowState.tschSelected);
        if (!flowState.tschSelected) return;
        if (!flowState.htmlContainer) return;
        Delete.removeNodeId(
          flowState.tschSelected,
          flowState.htmlContainer,
          flowState.drawflow,
        );
        break;
    }
  },

  ProcessConnection: (option: MenuOptions, flowState: FlowState) => {
    console.log('Connection Context Click', option);
    switch (option) {
      case MenuOptions.Delete:
        console.log('Delete click', flowState.connectionSelected);
        if (!flowState.htmlContainer) return;
        if (!flowState.connectionSelected) return;
        // Get connection id
        const connectionNum = Utils.getConnectionNumber(
          flowState.connectionSelected,
        );
        if (!connectionNum) {
          console.error(
            'Connection number not found in element',
            flowState.connectionSelected,
          );
          return;
        }
        // Delete connection
        Delete.removeNodeConnections(
          [connectionNum],
          flowState.htmlContainer,
          flowState.drawflow,
        );
        break;
    }
  },
};
