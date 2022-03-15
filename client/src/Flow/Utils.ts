export default {
  utilIsMatElement(target: HTMLElement): boolean {
    return target.getAttribute('mat-id') ? true : false;
  },
};
