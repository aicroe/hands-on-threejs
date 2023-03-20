export type SFXAudioType = 'mp3' | 'wav' | 'aif' | 'ogg';

export interface SFXOptions {
  context: AudioContext;
  src: Partial<Record<SFXAudioType, string>>;
  loop?: boolean;
  fadeDuration?: number;
  autoplay?: boolean;
  volume: number;
}

export class SFX {
  private context: AudioContext;
  private gainNode: GainNode;
  private _loop: boolean;
  private _volume: number;
  private fadeDuration: number;
  private autoplay: boolean;
  private buffer: AudioBuffer | null;
  private source?: AudioBufferSourceNode;
  private url?: string;

  constructor(options: SFXOptions) {
    this.context = options.context;
    this._loop = options.loop ?? false;
    this._volume = options.volume ?? 1.0;
    this.gainNode = this.context.createGain();
    this.gainNode.gain.setValueAtTime(this._volume, this.context.currentTime);
    this.gainNode.connect(this.context.destination);
    this.fadeDuration = options.fadeDuration ?? 0.5;
    this.autoplay = options.autoplay ?? false;
    this.buffer = null;

    let codec: SFXAudioType | undefined;
    for (let prop in options.src) {
      if (SFX.supportsAudioType(prop as SFXAudioType)) {
        codec = prop as SFXAudioType;
        break;
      }
    }

    if (codec !== undefined) {
      this.url = options.src[codec]!;
      this.load(this.url);
    } else {
      console.warn('Browser does not support any of the supplied audio files');
    }
  }

  static supportsAudioType(type: SFXAudioType) {
    // Allow user to create shortcuts, i.e. just 'mp3'
    const formats = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      aif: 'audio/x-aiff',
      ogg: 'audio/ogg'
    };

    const audio = document.createElement('audio');
    return audio.canPlayType(formats[type] || type);
  }

  load(url: string) {
    // Load buffer asynchronously
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = () => {
      // Asynchronously decode the audio file data in request.response
      this.context.decodeAudioData(
        request.response,
        (buffer) => {
          if (!buffer) {
            console.error('error decoding file data: ' + this.url);
            return;
          }

          this.buffer = buffer;
          if (this.autoplay) {
            this.play();
          }
        },
        (error) => {
          console.error('decodeAudioData error', error);
        }
      );
    }

    request.onerror = () => {
      console.error('SFX Loader: XHR error');
    }

    request.send();
  }

  set loop(value: boolean) {
    this._loop = value;
    if (this.source !== undefined) {
      this.source.loop = value;
    }
  }

  play() {
    if (this.buffer === null) {
      return;
    }

    if (this.source !== undefined) {
      this.source.stop();
    }
    this.source = this.context.createBufferSource();
    this.source.loop = this._loop;
    this.source.buffer = this.buffer;
    this.source.connect(this.gainNode);
    this.source.start(0);
  }

  set volume(value: number) {
    this._volume = value;
    this.gainNode.gain.setTargetAtTime(value, this.context.currentTime + this.fadeDuration, 0);
  }

  pause() {
    if (this.source === undefined) {
      return;
    }

    this.source.stop();
  }

  stop() {
    if (this.source == undefined) {
      return;
    }

    this.source.stop();
    delete this.source;
  }
}
