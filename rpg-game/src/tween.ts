import { Easing, EasingType } from './easing';

export class Tween {
  private currentTime: number;
  private finished: boolean;
  private easing: Easing;

  constructor(
    private target: THREE.Vector3,
    private channel: 'x' | 'y' | 'z',
    private endValue: number,
    private duration: number,
    private oncomplete: (tween: Tween) => void,
    easingType: EasingType = 'inOutQuad',
  ) {
    this.currentTime = 0;
    this.finished = false;
    this.easing = new Easing(target[channel], endValue, duration, 0, easingType);
  }

  update(delta: number): void {
    if (this.finished) {
      return;
    }

    this.currentTime += delta;
    if (this.currentTime >= this.duration) {
      this.target[this.channel] = this.endValue;
      if (this.oncomplete) {
        this.oncomplete(this);
      }
      this.finished = true;
    } else {
      this.target[this.channel] = this.easing.value(this.currentTime);
    }
  }
}
