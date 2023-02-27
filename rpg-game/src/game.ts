// import * as CANNON from 'cannon';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import { createDummyEnvironment } from './create-dummy-environment';
import { JoyStick } from './joystick';
import { Player, PlayerAnimation, PlayerCamera } from './player';
import { Preloader } from './preloader';
import { SFX } from './sfx';

export enum GameMode {
  NONE = 'none',
  PRELOAD = 'preload',
  INITIALIZING = 'initializing',
  CREATING_LEVEL = 'creating_level',
  ACTIVE = 'active',
  GAME_OVER = 'game_over'
}

export class Game {
  private mode = GameMode.NONE;

  private clock: THREE.Clock;
  private container: HTMLDivElement;
  private player: Player = {};
  // private stats?: Stats;
  private camera?: THREE.PerspectiveCamera;
  private camerasOrder: PlayerCamera[] = [];
  private scene?: THREE.Scene;
  private renderer?: THREE.WebGLRenderer;
  private cellSize = 16;
  private interactive = false;
  private levelIndex = 0;
  private _hints = 0;
  private score = 0;
  private debug = false;
  private debugPhysics = false;
  private cameraFade = 0.05;
  private environmentProxy?: THREE.Object3D;
  private messages = {
    text: [
      'Welcome to LostTreasure',
      'GOOD LUCK!'
    ],
    index: 0
  };
  private assetsPath = 'public/';
  private anims: PlayerAnimation[];
  private mouse?: THREE.Vector2;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.height = '100%';
    document.body.appendChild(this.container);

    this.clock = new THREE.Clock();

    this.mode = GameMode.PRELOAD;
    this.anims = [
      PlayerAnimation.GATHER_OBJECTS,
      PlayerAnimation.LOOK_AROUND,
      PlayerAnimation.PUSH_BUTTON,
      PlayerAnimation.RUN,
      PlayerAnimation.STUMBLE_BACKWARDS,
    ];

    this.configureCameraButton();

    const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
    new Preloader({
      assets: this.anims.map((anim) => `${this.assetsPath}fbx/${anim}.fbx`),
      oncomplete: () => {
        this.init();
        this.animate();
      },
    });
  }

  private init(): void {
    this.mode = GameMode.INITIALIZING;

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0a0a0);
    this.scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);

    {
      const light = new THREE.HemisphereLight(0xffffff, 0x444444);
      light.position.set(0, 200, 0);
      this.scene.add(light);
    }

    {
      const light = new THREE.DirectionalLight(0xffffff);
      light.position.set(0, 200, 100);
      light.castShadow = true;
      light.shadow.camera.top = 180;
      light.shadow.camera.bottom = -100;
      light.shadow.camera.left = -120;
      light.shadow.camera.right = 120;
      this.scene.add(light);
    }

    // ground
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const grid = new THREE.GridHelper(2000, 40, 0x000000, 0x000000);
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.opacity = 0.2;
    gridMaterial.transparent = true;
    this.scene.add(grid);

    // model
    const loader = new FBXLoader();
    loader.load(`${this.assetsPath}fbx/girl-walk.fbx`, (object) => {
      const mixer = new THREE.AnimationMixer(object);
      this.player.mixer = mixer;
      this.player.root = mixer.getRoot();

      object.name = 'Character';
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.scene!.add(object);
      this.player.object = object;
      this.player.walk = object.animations[0];

      new JoyStick({
        onMove: this.handleJoystickPlayerMove,
      });
      this.createCameras();
      this.loadNextAnim(loader);
      this.createDummyEnvironment();
    });

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.onWindowResize();
    }, false);

    // stats
    if (this.debug) {
      // this.stats = new Stats();
      // this.container.appendChild(this.stats.dom);
    }
  }

  private initSfx() {
    const context = new AudioContext();
    new SFX({
      context,
      src: { mp3: `${this.assetsPath}sfx/gliss.mp3`, ogg: `${this.assetsPath}sfx/gliss.ogg` },
      loop: false,
      volume: 0.3
    });
  }

  private configureCameraButton(): void {
    const btn = document.createElement('button')!;
    btn.style.cssText = `
      padding: 4px 8px;
      position: absolute;
      cursor: pointer;
      right: 20px;
      bottom: 20px;
      background: rgba(126, 126, 126, 0.5);
      font-size: 30px;
      border-radius: 50%;
      border: #444 solid medium;
    `
    btn.innerHTML = '📷';
    btn.addEventListener('click', () => this.switchCamera());
    document.body.appendChild(btn);
  }

  private switchCamera(fade = 0.05): void {
    if (!this.player.cameras) {
      return;
    }

    const [activeCameraName] = Object
      .entries(this.player.cameras)
      .find(([, camera]) => camera === this.player.cameras?.active)!;
    const activeCameraIndex = this.camerasOrder.findIndex(
      (cameraName) => cameraName === activeCameraName,
    );
    const nextCameraIndex = (activeCameraIndex + 1) % this.camerasOrder.length;
    this.setActiveCamera(this.player.cameras[this.camerasOrder[nextCameraIndex]]!);
    this.cameraFade = fade;
  }

  private handleJoystickPlayerMove = (forward: number, turn: number) => {
    turn = -turn; // Flip direction
    if (forward > 0) {
      if (this.player.action !== PlayerAnimation.WALK) {
        this.setAction(PlayerAnimation.WALK);
      }
    } else {
      if (this.player.action === PlayerAnimation.WALK) {
        this.setAction(PlayerAnimation.LOOK_AROUND);
      }
    }
    if (forward === 0 && turn === 0) {
      delete this.player.move;
    } else {
      this.player.move = { forward, turn };
    }
  }

  private createCameras(): void {
    const front = new THREE.Object3D();
    front.position.set(112, 100, 200);
    front.parent = this.player.object!;

    const back = new THREE.Object3D();
    back.position.set(0, 100, -250);
    back.parent = this.player.object!;

    const wide = new THREE.Object3D();
    wide.position.set(178, 139, 465);
    wide.parent = this.player.object!;

    const overhead = new THREE.Object3D();
    overhead.position.set(0, 400, 0);
    overhead.parent = this.player.object!;

    const collect = new THREE.Object3D();
    collect.position.set(40, 82, 94);
    collect.parent = this.player.object!;

    this.player.cameras = { front, back, wide, overhead, collect };
    this.setActiveCamera(this.player.cameras.wide!);
    this.cameraFade = 0.1;
    this.camerasOrder = [
      PlayerCamera.FRONT,
      PlayerCamera.BACK,
      PlayerCamera.WIDE,
      PlayerCamera.OVERHEAD,
      PlayerCamera.COLLECT
    ];

    setTimeout(() => {
      this.setActiveCamera(this.player.cameras!.back!);
    }, 2000);
  }

  private setActiveCamera(object: THREE.Object3D): void {
    this.player.cameras!.active = object;
  }

  private loadNextAnim(loader: FBXLoader): void {
    let anim = this.anims.pop()!;
    loader.load(`${this.assetsPath}fbx/${anim}.fbx`, (object) => {
      this.player[anim] = object.animations[0];
      if (this.anims.length > 0) {
        this.loadNextAnim(loader);
      } else {
        this.anims = [];
        this.setAction(PlayerAnimation.LOOK_AROUND);
        this.mode = GameMode.ACTIVE;
      }
    });
  }

  // createCannonTrimesh(geometry) {
  //   if (!geometry.isBufferGeometry) return null;

  //   const posAttr = geometry.attributes.position;
  //   const vertices = geometry.attributes.position.array;
  //   let indices = [];
  //   for (let i = 0; i < posAttr.count; i++) indices.push(i);

  //   return new CANNON.Trimesh(vertices, indices);
  // }

  private getMousePosition(clientX: number, clientY: number): THREE.Vector2 {
    const pos = new THREE.Vector2();
    pos.x = (clientX / this.renderer!.domElement.clientWidth) * 2 - 1;
    pos.y = -(clientY / this.renderer!.domElement.clientHeight) * 2 + 1;
    return pos;
  }

  private tap(evt: (MouseEvent & { targetTouches?: undefined }) | TouchEvent): void {
    if (!this.interactive) return;

    let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
    let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;

    this.mouse = this.getMousePosition(clientX, clientY);

    //const rayCaster = new THREE.Raycaster();
    //rayCaster.setFromCamera(mouse, this.camera);
  }

  // move(evt) {

  // }

  // up(evt) {

  // }

  private showMessage(msg: string, fontSize = 20, onOK: () => void): void {
    const txt = document.getElementById('message_text')!;
    txt.innerHTML = msg;
    txt.style.fontSize = fontSize + 'px';
    const btn = document.getElementById('message_ok')!;
    const panel = document.getElementById('message')!;
    if (onOK != null) {
      btn.onclick = () => {
        panel.style.display = 'none';
        onOK();
      }
    } else {
      btn.onclick = () => {
        panel.style.display = 'none';
      }
    }
    panel.style.display = 'flex';
  }

  private loadJSON(name: string, callback: (response: string) => void): void {
    const xobj = new XMLHttpRequest();
    xobj.overrideMimeType('application/json');
    xobj.open('GET', `${name}.json`, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = () => {
      if (xobj.readyState === 4 && xobj.status === 200) {
        // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
        callback(xobj.responseText);
      }
    };
    xobj.send(null);
  }

  private onWindowResize = () => {
    if (!this.camera || !this.renderer) {
      return;
    }

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private setAction(name: PlayerAnimation): void {
    if (!this.player.mixer || this.player.action === name) {
      return;
    }

    if (this.player.action) {
      const runningAction = this.player.mixer.existingAction(this.player[this.player.action]!);
      if (runningAction?.isRunning()) {
        runningAction.fadeOut(0.5);
      }
    }

    const anim = this.player[name];
    const action = this.player.mixer.clipAction(anim!, this.player.root);
    const lastActionWasGatherObjs = this.player.action === PlayerAnimation.GATHER_OBJECTS;

    if (lastActionWasGatherObjs) {
      this.player.mixer.removeEventListener('finished', this.gatherObjectsFinished);
    }
    if (name === PlayerAnimation.GATHER_OBJECTS) {
      action.loop = THREE.LoopOnce;
      action.clampWhenFinished = true;
      this.player.mixer.addEventListener('finished', this.gatherObjectsFinished);
    }

    this.player.action = name;
    if (lastActionWasGatherObjs) {
      this.player.mixer.stopAllAction();
      action.reset().play();
    } else {
      action.reset().fadeIn(0.5).play();
    }
  }

  private gatherObjectsFinished = () => {
    this.setAction(PlayerAnimation.LOOK_AROUND);
  }

  private movePlayer(delta: number): void {
    if (!this.player.object || !this.environmentProxy) {
      return;
    }

    const pos = this.player.object.position.clone();
    pos.y += 60;
    const direction = this.player.object.getWorldDirection(new THREE.Vector3());
    const raycaster = new THREE.Raycaster(pos, direction);
    let blocked = false;

    for (const box of this.environmentProxy.children) {
      const intersect = raycaster.intersectObject(box);
      if (intersect.length > 0) {
        if (intersect[0].distance < 50) {
          blocked = true;
          break;
        }
      }
    }

    if (!blocked && this.player.move!.forward > 0) {
      this.player.object.translateZ(delta * 100);
    }

    //cast left
    {
      direction.set(-1, 0, 0);
      direction.applyMatrix4(this.player.object.matrix);
      direction.normalize();
      const raycaster = new THREE.Raycaster(pos, direction);

      for (const box of this.environmentProxy.children) {
        const intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
          if (intersect[0].distance < 80) {
            this.player.object.translateX(-(intersect[0].distance - 80));
            break;
          }
        }
      }
    }

    //cast right
    {
      direction.set(1, 0, 0);
      direction.applyMatrix4(this.player.object.matrix);
      direction.normalize();
      const raycaster = new THREE.Raycaster(pos, direction);

      for (const box of this.environmentProxy.children) {
        const intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
          if (intersect[0].distance < 80) {
            this.player.object.translateX(intersect[0].distance - 80);
            break;
          }
        }
      }
    }
  }

  private animate(): void {
    const delta = this.clock.getDelta();
    requestAnimationFrame(() => this.animate());

    if (this.player.mixer !== undefined && this.mode === GameMode.ACTIVE) {
      this.player.mixer.update(delta)
    }

    if (this.player.move !== undefined) {
      this.movePlayer(delta)
      this.player.object!.rotateY(this.player.move.turn * delta);
    }

    if (this.player.cameras !== undefined && this.player.cameras.active !== undefined) {
      this.camera!.position.lerp(this.player.cameras.active.getWorldPosition(new THREE.Vector3()), this.cameraFade);
      const pos = this.player.object!.position.clone();
      pos.y += 60;
      this.camera!.lookAt(pos);
    }

    this.renderer!.render(this.scene!, this.camera!);

    // if (this.stats != undefined) this.stats.update();
  }

  private createDummyEnvironment(): void {
    const env = createDummyEnvironment();
    this.scene!.add(env);
    this.environmentProxy = env;
  }
}
