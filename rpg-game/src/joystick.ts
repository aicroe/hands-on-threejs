export interface JoyStickOptions {
  onMove: (forward: number, turn: number) => void;
  maxRadius?: number;
}

export class JoyStick {
  private domElement: HTMLDivElement;
  private origin: { left: number, top: number };
  private maxRadius: number;
  private maxRadiusSquared: number;
  private onMove: (forward: number, turn: number) => void;
  private offset?: { x: number, y: number };

  constructor(options: JoyStickOptions) {
    const circle = document.createElement('div');
    circle.style.cssText = `
      position: absolute;
      bottom: 45px;
      width: 80px;
      height: 80px;
      background: rgba(126, 126, 126, 0.5);
      border: #fff solid medium;
      border-radius: 50%;
      left: 50%;
      transform: translateX(-50%);
    `;

    const thumb = document.createElement('div');
    thumb.style.cssText = `
      position: absolute;
      left: 20px;
      top: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #fff;
    `;

    circle.appendChild(thumb);
    document.body.appendChild(circle);

    this.domElement = thumb;
    this.maxRadius = options.maxRadius || 40;
    this.maxRadiusSquared = this.maxRadius * this.maxRadius;
    this.onMove = options.onMove;
    this.origin = { left: this.domElement.offsetLeft, top: this.domElement.offsetTop };

    if (this.domElement !== undefined) {
      if ('ontouchstart' in window) {
        this.domElement.addEventListener('touchstart', (evt) => this.tap(evt));
      } else {
        this.domElement.addEventListener('mousedown', (evt) => this.tap(evt));
      }
    }
  }

  getMousePosition(evt: (MouseEvent & { targetTouches?: undefined }) | TouchEvent) {
    let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
    let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
    return { x: clientX, y: clientY };
  }

  tap(evt: MouseEvent | TouchEvent) {
    evt = evt || window.event;
    // get the mouse cursor position at startup:
    this.offset = this.getMousePosition(evt);
    if ('ontouchstart' in window) {
      document.ontouchmove = (evt) => this.move(evt);
      document.ontouchend = (evt) => this.up(evt);
    } else {
      document.onmousemove = (evt) => this.move(evt);
      document.onmouseup = (evt) => this.up(evt);
    }
  }

  move(evt: (MouseEvent & { targetTouches?: undefined }) | TouchEvent) {
    evt = evt || window.event;
    const mouse = this.getMousePosition(evt);
    // calculate the new cursor position:
    let left = mouse.x - this.offset!.x;
    let top = mouse.y - this.offset!.y;
    //this.offset = mouse;

    const sqMag = left * left + top * top;
    if (sqMag > this.maxRadiusSquared) {
      //Only use sqrt if essential
      const magnitude = Math.sqrt(sqMag);
      left /= magnitude;
      top /= magnitude;
      left *= this.maxRadius;
      top *= this.maxRadius;
    }

    // set the element's new position:
    this.domElement.style.top = `${top + this.domElement.clientHeight / 2}px`;
    this.domElement.style.left = `${left + this.domElement.clientWidth / 2}px`;

    const forward = -(top - this.origin.top + this.domElement.clientHeight / 2) / this.maxRadius;
    const turn = (left - this.origin.left + this.domElement.clientWidth / 2) / this.maxRadius;

    if (this.onMove !== undefined) {
      this.onMove(forward, turn);
    }
  }

  up(evt: MouseEvent | TouchEvent) {
    if ('ontouchstart' in window) {
      document.ontouchmove = null;
      document.ontouchend = null;
    } else {
      document.onmousemove = null;
      document.onmouseup = null;
    }
    this.domElement.style.top = `${this.origin.top}px`;
    this.domElement.style.left = `${this.origin.left}px`;

    this.onMove(0, 0);
  }
}
