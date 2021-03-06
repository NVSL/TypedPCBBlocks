import { DeleteEventInfo, FlowState, MenuOptions } from './Flow';
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
    contextMenu = <HTMLElement>document.querySelector('#contextMenuIOs');
    if (contextMenu) contextMenu.classList.remove('shown');
  },

  // Contextmenu process Mat options
  ProcessMat: (option: MenuOptions, flowState: FlowState) => {
    const tschElements = <HTMLElement>document.querySelector('#tschs')!;
    const zIndexesArray: Array<{
      ele: HTMLElement;
      tschKey: string;
      zIndex: number;
    }> = new Array();

    if (!flowState.tschSelected) return;

    // Layers options is only available for Mats
    if (!Utils.isMatElement(flowState.tschSelected)) return;

    // Get element to move
    let eleToMove: string | null = null;
    if (flowState.tschSelected) {
      eleToMove = flowState.tschSelected.getAttribute('tsch-key');
    } else {
      return;
    }

    if (!eleToMove) {
      return;
    }

    // Fill zIndex Array with current tsch elements (Only Mat Elements)
    tschElements.childNodes.forEach((child) => {
      const childEle = <HTMLElement>child;
      if (Utils.isMatElement(childEle)) {
        const matStyle = window.getComputedStyle(childEle);
        const tschKey = childEle.getAttribute('tsch-key');
        if (tschKey) {
          const zIndex = matStyle.getPropertyValue('z-index');
          zIndexesArray.push({
            ele: childEle,
            tschKey: tschKey,
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
        if (eleToMove != lastEle.tschKey) {
          for (const ele of zIndexesArray) {
            // If eleToMove swap with last, the rest -1
            if (minusOne) {
              ele.zIndex -= 1;
            }
            if (ele.tschKey == eleToMove) {
              ele.zIndex = lastEle.zIndex;
              minusOne = true;
            }
          }
        }
        break;
      case MenuOptions.LayerUp:
        for (const [index, value] of zIndexesArray.entries()) {
          if (value.tschKey == eleToMove) {
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
          if (value.tschKey == eleToMove) {
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
        if (eleToMove != firstEle.tschKey) {
          for (const ele of zIndexesArray) {
            // If eleToMove swap with first, the rest +1
            if (ele.tschKey == eleToMove) {
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
        flowState;
        const deleteEventInfo = Delete.getNodeToDeleteInfo(
          flowState.tschSelected,
          flowState.htmlContainer,
          flowState.graphData,
        );
        if (deleteEventInfo) {
          flowState.flow.dispatch('flowDelete', deleteEventInfo);
        }
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
        const deleteEventInfo = Delete.getNodeToDeleteInfo(
          flowState.tschSelected,
          flowState.htmlContainer,
          flowState.graphData,
        );
        if (deleteEventInfo) {
          flowState.flow.dispatch('flowDelete', deleteEventInfo);
        }
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
        // Delete connection
        const connectionsToRemove = Delete.removeNodeConnections(
          [flowState.connectionSelected.id],
          flowState.htmlContainer,
          flowState.graphData,
          false,
        );
        if (connectionsToRemove.length != 0) {
          const deleteEventInfo: DeleteEventInfo = {
            toDeleteType: 'connection',
            toDeleteTsch: null,
            toDeleteConnections: connectionsToRemove,
          };
          flowState.flow.dispatch('flowDelete', deleteEventInfo);
        } else {
          console.error(
            `Connection ${flowState.connectionSelected.id} was not removed`,
          );
        }
        break;
    }
  },

  ProcessIOs: (option: MenuOptions, flowState: FlowState) => {
    console.log('Connection Context Click', option);

    const tschKey = Utils.getTschKey(flowState.tschSelected!);

    if (!tschKey) {
      console.error('While processing context menu Tsch Key not found');
      return;
    }

    if (!flowState.iosSelecteded) {
      console.error('IOs element selection not found');
      return;
    }

    let ioType: 'block-input' | 'block-output' | null;
    if (flowState.iosSelecteded.classList.contains('block-input')) {
      ioType = 'block-input';
    } else if (flowState.iosSelecteded.classList.contains('block-output')) {
      ioType = 'block-output';
    } else {
      ioType = null;
    }

    if (!ioType) {
      console.error('IO type could not be defined');
      return;
    }

    switch (option) {
      case MenuOptions.Left:
        if (ioType == 'block-input') return;
        const inputs = document.querySelector(
          `[tsch-key="${tschKey}"] .block-inputs`,
        );
        if (!inputs) {
          console.error('Inputs block not found');
          return;
        }
        flowState.iosSelecteded.classList.remove('block-output');
        const classNameLeftTmp = flowState.iosSelecteded.className;
        flowState.iosSelecteded.className = '';
        flowState.iosSelecteded.classList.add('block-input'); // Add at classList[0]
        flowState.iosSelecteded.className += ' ' + classNameLeftTmp; // Restore prev classList
        inputs.appendChild(flowState.iosSelecteded);
        break;
      case MenuOptions.Right:
        console.log('Menu right', ioType);
        if (ioType == 'block-output') return;
        const outputs = document.querySelector(
          `[tsch-key="${tschKey}"] .block-outputs`,
        );
        if (!outputs) {
          console.error('Outputs block not found');
          return;
        }
        const classListTmp1 = flowState.iosSelecteded.classList;
        const className1 = flowState.iosSelecteded.className;
        console.log('Class List', classListTmp1);
        console.log('Class Name', className1);
        flowState.iosSelecteded.classList.remove('block-input');
        const classNameRightTmp = flowState.iosSelecteded.className;
        flowState.iosSelecteded.className = '';
        flowState.iosSelecteded.classList.add('block-output'); // Add at classList[0]
        flowState.iosSelecteded.className += ' ' + classNameRightTmp; // Restore prev classList
        outputs.appendChild(flowState.iosSelecteded);
        break;
    }
  },
};

// private moveIOLeftRight() {
//   const ele = document.querySelector(`[tsch-key="0"] [io-key="0"]`);
//   const outputs = document.querySelector(`[tsch-key="0"] .outputs`);
//   console.log(ele);
//   console.log(outputs);
//   ele?.classList.remove('input');
//   ele?.classList.add('output');
//   outputs?.appendChild(ele!);
// }
