type ToastPositions =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left';

interface ToastOptions {
  text?: string;
  autoClose?: number | boolean;
  position?: ToastPositions;
  canClose?: boolean;
  showProgress?: boolean;
  pauseOnHover?: boolean;
  pauseOnFocusLoss?: boolean;
}

const DEFAULT_OPTIONS: ToastOptions = {
  text: 'Hello',
  autoClose: 5000,
  position: 'top-right',
  canClose: true,
  showProgress: true,
};

export default class Toast {
  private toastElem: HTMLElement;
  private autoCloseInterval: number = 0;
  private progressInterval: number = 0;
  private timeVisible: number = 0;
  private _autoClose: number | boolean = false;
  private isPaused: boolean = false;
  private removeBinded: EventListener;
  private unpause: EventListener;
  private pause: EventListener;
  private visibilityChange: EventListener;
  private shouldUnPause: boolean = false;

  constructor(options: ToastOptions) {
    this.toastElem = document.createElement('div');
    this.toastElem.classList.add('toast');
    requestAnimationFrame(() => {
      this.toastElem.classList.add('show');
    });
    this.removeBinded = this.remove.bind(this);
    this.unpause = () => (this.isPaused = false);
    this.pause = () => (this.isPaused = true);
    this.visibilityChange = () => {
      this.shouldUnPause = document.visibilityState === 'visible';
    };
    this.update({ ...DEFAULT_OPTIONS, ...options });
  }

  set autoClose(value: number | boolean) {
    this._autoClose = value;
    this.timeVisible = 0;
    if (value === false) return;

    let lastTime: number | null;
    const func = (time: number) => {
      if (this.shouldUnPause) {
        lastTime = null;
        this.shouldUnPause = false;
      }
      if (lastTime == null) {
        lastTime = time;
        this.autoCloseInterval = requestAnimationFrame(func);
        return;
      }
      if (!this.isPaused) {
        this.timeVisible += time - lastTime;
        if (this.timeVisible >= this._autoClose) {
          this.remove();
          return;
        }
      }

      lastTime = time;
      this.autoCloseInterval = requestAnimationFrame(func);
    };

    this.autoCloseInterval = requestAnimationFrame(func);
  }

  set position(value: ToastPositions) {
    const currentContainer = this.toastElem.parentElement;
    const selector = `.toast-container[data-position="${value}"]`;
    const container =
      document.querySelector(selector) || createContainer(value);
    container.append(this.toastElem);
    if (currentContainer == null || currentContainer.hasChildNodes()) return;
    currentContainer.remove();
  }

  set text(value: string) {
    this.toastElem.textContent = value;
  }

  set canClose(value: boolean) {
    this.toastElem.classList.toggle('can-close', value);
    if (value) {
      this.toastElem.addEventListener('click', this.removeBinded);
    } else {
      this.toastElem.removeEventListener('click', this.removeBinded);
    }
  }

  set showProgress(value: boolean) {
    this.toastElem.classList.toggle('toast-progress', value);
    this.toastElem.style.setProperty('--toast-progress', (1).toString());
    if (value) {
      const func = () => {
        if (typeof this._autoClose == 'boolean') return;
        if (!this.isPaused) {
          this.toastElem.style.setProperty(
            '--toast-progress',
            (1 - this.timeVisible / this._autoClose).toString(),
          );
        }
        this.progressInterval = requestAnimationFrame(func);
      };

      this.progressInterval = requestAnimationFrame(func);
    }
  }

  set pauseOnHover(value: boolean) {
    if (value) {
      this.toastElem.addEventListener('mouseover', this.pause);
      this.toastElem.addEventListener('mouseleave', this.unpause);
    } else {
      this.toastElem.removeEventListener('mouseover', this.pause);
      this.toastElem.removeEventListener('mouseleave', this.unpause);
    }
  }

  set pauseOnFocusLoss(value: boolean) {
    if (value) {
      document.addEventListener('visibilitychange', this.visibilityChange);
    } else {
      document.removeEventListener('visibilitychange', this.visibilityChange);
    }
  }

  update(options: ToastOptions) {
    Object.entries(options).forEach(([key, value]) => {
      // @ts-ignore
      this[key] = value;
    });
  }

  remove() {
    cancelAnimationFrame(this.autoCloseInterval);
    cancelAnimationFrame(this.progressInterval);
    const container = this.toastElem.parentElement!;
    this.toastElem.classList.remove('show');
    this.toastElem.addEventListener('transitionend', () => {
      this.toastElem.remove();
      if (container.hasChildNodes()) return;
      container.remove();
    });
  }
}

function createContainer(position: ToastPositions) {
  const container = document.createElement('div');
  container.classList.add('toast-container');
  container.dataset.position = position;
  document.body.append(container);
  return container;
}
