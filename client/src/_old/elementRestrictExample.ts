import interact from 'interactjs';

interface ElementSizes {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginWidth: number;
  marginHeight: number;
  paddinTop: number;
  paddinBottom: number;
  paddinLeft: number;
  paddinRight: number;
  paddingWidth: number;
  paddingHeight: number;
  borderTop: number;
  borderBottom: number;
  borderLeft: number;
  borderRight: number;
  borderWidth: number;
  borderHeight: number;
}

const parentElement = document.getElementById('parent');
interact('.inner').resizable({
  // resize from all edges and corners
  edges: { left: true, right: true, bottom: true, top: true },

  listeners: {
    move(event) {
      // Translate?
      let translate: boolean = false;

      // Position
      const target = event.target;
      let x = parseFloat(target.getAttribute('data-x')) || 0;
      let y = parseFloat(target.getAttribute('data-y')) || 0;

      // Get this sizes
      const child = getSizes(target);

      // Get parent sizes
      const parent = getSizes(parentElement!);

      // console.log(
      //   'child:',
      //   child.width,
      //   child.height,
      //   child.paddingHeight,
      //   child.paddingWidth,
      //   child.borderHeight,
      //   child.borderWidth,
      // );

      // console.log(
      //   'parent:',
      //   parent.width,
      //   parent.height,
      //   parent.paddingHeight,
      //   parent.paddingWidth,
      //   parent.borderHeight,
      //   parent.borderWidth,
      // );

      const childTopExtra = child.borderTop + child.paddinTop;
      const childBottomExtra = child.borderBottom + child.paddinBottom;
      const childLeftExtra = child.borderLeft + child.paddinLeft;
      const childRightExtra = child.borderRight + child.paddinRight;

      // Check for negatives
      if (event.rect.top - childTopExtra <= 0) return;
      if (event.rect.bottom - childBottomExtra <= 0) return;
      if (event.rect.left - childLeftExtra <= 0) return;
      if (event.rect.right - childRightExtra <= 0) return;

      // Restrict sizes
      if (
        event.rect.top - childTopExtra >= parent.top &&
        event.rect.bottom <= parent.bottom - childBottomExtra
      ) {
        target.style.height = event.rect.height + 'px';
        y += event.deltaRect.top;
        target.setAttribute('data-y', y);
        translate = true;
      }
      if (
        event.rect.left - childLeftExtra >= parent.left &&
        event.rect.right <= parent.right - childRightExtra
      ) {
        target.style.width = event.rect.width + 'px';
        x += event.deltaRect.left;
        target.setAttribute('data-x', x);
        translate = true;
      }
      // if (
      //   event.rect.top - childTopExtra >= parent.top &&
      //   event.rect.bottom <= parent.bottom - childBottomExtra
      // ) {
      //   console.log('Changing');
      //   target.style.height = event.rect.height + 'px';
      //   y += event.deltaRect.top;
      //   target.setAttribute('data-y', y);
      // }
      // if (event.rect.bottom < parent.bottom) {
      //   target.style.height = event.rect.height + 'px';
      // }
      // if (
      //   event.rect.height <
      //   parent.height - child.borderHeight - child.paddingHeight
      // ) {
      //   // Update the element's Height
      //   target.style.height = event.rect.height + 'px';
      // }
      // if (
      //   event.rect.width <
      //   parent.width - child.borderWidth - child.paddingWidth
      // ) {
      //   // Update the element's Width
      //   target.style.width = event.rect.width + 'px';
      // }

      if (translate)
        target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

      target.textContent =
        Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height);
    },
  },
});

function getSizes(ele: HTMLElement): ElementSizes {
  const parentRect = ele.getBoundingClientRect();
  const parentStyle = window.getComputedStyle(ele);
  const parentMarginWidth =
    parseFloat(parentStyle.marginLeft) + parseFloat(parentStyle.marginRight);
  const parentMarginHeight =
    parseFloat(parentStyle.marginTop) + parseFloat(parentStyle.marginBottom);
  const parentPaddingWidth =
    parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
  const parentPaddingHeight =
    parseFloat(parentStyle.paddingTop) + parseFloat(parentStyle.paddingBottom);
  const parentBorderWidth =
    parseFloat(parentStyle.borderLeft) + parseFloat(parentStyle.borderRight);
  const parentBorderHeight =
    parseFloat(parentStyle.borderTop) + parseFloat(parentStyle.borderBottom);

  let sizes;
  if (parentStyle.boxSizing === 'border-box') {
    sizes = {
      top: parentRect.top,
      bottom: parentRect.bottom,
      left: parentRect.left,
      right: parentRect.right,
      width: parentRect.width,
      height: parentRect.height,
      marginTop: parseFloat(parentStyle.marginTop),
      marginBottom: parseFloat(parentStyle.marginBottom),
      marginLeft: parseFloat(parentStyle.marginLeft),
      marginRight: parseFloat(parentStyle.marginRight),
      marginWidth: parentMarginWidth,
      marginHeight: parentMarginHeight,
      paddinTop: parseFloat(parentStyle.paddingTop),
      paddinBottom: parseFloat(parentStyle.paddingBottom),
      paddinLeft: parseFloat(parentStyle.paddingLeft),
      paddinRight: parseFloat(parentStyle.paddingRight),
      paddingWidth: parentPaddingWidth,
      paddingHeight: parentPaddingHeight,
      borderTop: parseFloat(parentStyle.borderTop),
      borderBottom: parseFloat(parentStyle.borderBottom),
      borderLeft: parseFloat(parentStyle.borderLeft),
      borderRight: parseFloat(parentStyle.borderRight),
      borderWidth: parentBorderWidth,
      borderHeight: parentBorderHeight,
    };
  } else {
    sizes = {
      top: parentRect.top,
      bottom: parentRect.bottom - parentPaddingHeight - parentBorderHeight,
      left: parentRect.left,
      right: parentRect.right - parentPaddingHeight - parentBorderHeight,
      width: parentRect.width - parentPaddingWidth - parentBorderWidth,
      height: parentRect.height - parentPaddingHeight - parentBorderHeight,
      marginTop: parseFloat(parentStyle.marginTop),
      marginBottom: parseFloat(parentStyle.marginBottom),
      marginLeft: parseFloat(parentStyle.marginLeft),
      marginRight: parseFloat(parentStyle.marginRight),
      marginWidth: parentMarginWidth,
      marginHeight: parentMarginHeight,
      paddinTop: parseFloat(parentStyle.paddingTop),
      paddinBottom: parseFloat(parentStyle.paddingBottom),
      paddinLeft: parseFloat(parentStyle.paddingLeft),
      paddinRight: parseFloat(parentStyle.paddingRight),
      paddingWidth: parentPaddingWidth,
      paddingHeight: parentPaddingHeight,
      borderTop: parseFloat(parentStyle.borderTop),
      borderBottom: parseFloat(parentStyle.borderBottom),
      borderLeft: parseFloat(parentStyle.borderLeft),
      borderRight: parseFloat(parentStyle.borderRight),
      borderWidth: parentBorderWidth,
      borderHeight: parentBorderHeight,
    };
  }

  return sizes;
}
