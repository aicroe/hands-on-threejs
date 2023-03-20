import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import Stats from 'three/examples/jsm/libs/stats.module';

import { GameSFX, GameSFXManager } from './game-sfx-manager';
import { JoyStick } from './joystick';
import { Player, PlayerAction, PlayerCamera } from './player';
import { Preloader } from './preloader';
import { SFX } from './sfx';
import { Tween } from './tween';

export enum GameMode {
  NONE = 'none',
  PRELOAD = 'preload',
  INITIALIZING = 'initializing',
  CREATING_LEVEL = 'creating_level',
  ACTIVE = 'active',
  GAME_OVER = 'game_over'
}

interface GameDoors {
  trigger: THREE.Object3D;
  proxy: THREE.Object3D[];
  doors: THREE.Object3D[];
}

export class Game {
  private mode = GameMode.NONE;

  private clock: THREE.Clock;
  private container: HTMLDivElement;
  private player: Player = {};
  private stats?: Stats;
  private camera?: THREE.PerspectiveCamera;
  private camerasOrder: PlayerCamera[] = [];
  private scene?: THREE.Scene;
  private renderer?: THREE.WebGLRenderer;
  private cameraFade = 0.05;
  private environmentProxy?: THREE.Object3D;
  private mute = false;
  private collect: THREE.Object3D[] = [];
  private fans: THREE.Object3D[] = [];
  private assetsPath = 'public/';
  private animations: PlayerAction[];
  private sfxManager?: GameSFXManager;
  private tweens: Tween[] = [];
  private doors: GameDoors[] = [];
  private cameraTarget?: { position: THREE.Vector3, target: THREE.Vector3 };
  private actionButton?: HTMLButtonElement;
  private onAction?: {
    action: PlayerAction,
    mode: 'open-doors' | 'collect'
    index: number;
    src?: string;
  };
  private collected?: number[];

  constructor(private debug: boolean = false) {
    this.configureCameraButton();
    this.configureOverlay();
    this.configureBriefcase();
    this.configureActionButton();
    this.configureSfxButton();

    this.container = document.createElement('div');
    this.container.style.height = '100%';
    document.body.appendChild(this.container);

    this.clock = new THREE.Clock();

    this.mode = GameMode.PRELOAD;
    this.animations = [
      PlayerAction.ASCEND_STAIRS,
      PlayerAction.GATHER_OBJECTS,
      PlayerAction.LOOK_AROUND,
      PlayerAction.PUSH_BUTTON,
      PlayerAction.RUN,
      PlayerAction.STUMBLE_BACKWARDS,
    ];

    const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
    new Preloader({
      assets: [
        `${this.assetsPath}sfx/gliss.${sfxExt}`,
        `${this.assetsPath}sfx/factory.${sfxExt}`,
        `${this.assetsPath}sfx/button.${sfxExt}`,
        `${this.assetsPath}sfx/door.${sfxExt}`,
        `${this.assetsPath}sfx/fan.${sfxExt}`,
        `${this.assetsPath}fbx/environment.fbx`,
        `${this.assetsPath}fbx/girl-walk.fbx`,
        `${this.assetsPath}fbx/usb.fbx`,
        ...this.animations.map((anim) => `${this.assetsPath}fbx/${anim}.fbx`),
      ],
      oncomplete: () => {
        this.init();
        this.animate();
      },
    });
  }

  private init(): void {
    this.mode = GameMode.INITIALIZING;

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);

    const sceneColor = 0x605050;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(sceneColor);
    this.scene.fog = new THREE.Fog(sceneColor, 500, 1500);

    {
      const light = new THREE.HemisphereLight(0xffffff, 0x444444);
      light.position.set(0, 200, 0);
      this.scene.add(light);
    }

    {
      const light = new THREE.DirectionalLight(0xffffff);
      light.position.set(0, 200, 100);
      light.castShadow = true;
      light.shadow.mapSize.width = 2048;
      light.shadow.mapSize.height = 2048;
      light.shadow.camera.top = 3000;
      light.shadow.camera.bottom = -3000;
      light.shadow.camera.left = -3000;
      light.shadow.camera.right = 3000;
      light.shadow.camera.far = 3000;
      this.scene.add(light);
    }

    // model
    const loader = new FBXLoader();
    loader.load(`${this.assetsPath}fbx/girl-walk.fbx`, (object) => {
      const mixer = new THREE.AnimationMixer(object);
      this.player.mixer = mixer;
      this.player.root = mixer.getRoot();

      this.player.mixer.addEventListener('finished', () => {
        this.setAction(PlayerAction.LOOK_AROUND);
        if (this.player.cameras!.active === this.player.cameras!.collect) {
          this.setActiveCamera(this.player.cameras!.back!);
          this.toggleBriefcase();
        }
      })

      object.castShadow = true;
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
      this.loadEnvironment(loader);
    }, undefined, this.onError);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.onWindowResize();
    }, false);

    // stats
    if (this.debug) {
      this.stats = Stats();
      this.container.appendChild(this.stats.dom);
    }

    this.initSfx();
  }

  private initSfx() {
    const context = new AudioContext();
    this.sfxManager = {
      context,
      records: (Object.values(GameSFX).reduce((accumulated, current) => {
        return {
          ...accumulated,
          [current]: new SFX({
            context,
            src: { mp3: `${this.assetsPath}sfx/${current}.mp3`, ogg: `${this.assetsPath}sfx/${current}.ogg` },
            loop: (current === GameSFX.FACTORY || current === GameSFX.FAN),
            autoplay: (current === GameSFX.FACTORY || current === GameSFX.FAN),
            volume: 0.3
          }),
        };
      }, {} as Record<GameSFX, SFX>))
    }

  }

  private loadEnvironment(loader: FBXLoader) {
    loader.load(`${this.assetsPath}fbx/environment.fbx`, (object) => {
      this.scene!.add(object);
      this.doors = [];
      this.fans = [];

      object.receiveShadow = true;
      object.scale.set(0.8, 0.8, 0.8);
      object.name = 'Environment';
      let door = { trigger: null!, proxy: [], doors: [] } as GameDoors;

      object.traverse((child) => {
        const checkDoor = () => {
          if (door.trigger !== null && door.proxy.length == 2 && door.doors.length == 2) {
            this.doors.push(Object.assign({}, door));
            door = { trigger: null!, proxy: [], doors: [] };
          }
        }

        if (child instanceof THREE.Mesh) {
          if (child.name.includes('main')) {
            child.castShadow = true;
            child.receiveShadow = true;
          } else if (child.name.includes('mentproxy')) {
            child.material.visible = false;
            this.environmentProxy = child;
          } else if (child.name.includes('door-proxy')) {
            child.material.visible = false;
            door.proxy.push(child);
            checkDoor();
          } else if (child.name.includes('door')) {
            door.doors.push(child);
            checkDoor()
          } else if (child.name.includes('fan')) {
            this.fans.push(child);
          }
        } else {
          if (child.name.includes('Door-null')) {
            door.trigger = child;
            checkDoor();
          }
        }
      });

      this.loadUSB(loader);
    }, undefined, this.onError);
  }

  private loadUSB(loader: FBXLoader): void {
    loader.load(`${this.assetsPath}fbx/usb.fbx`, (object) => {
      this.scene!.add(object);

      const scale = 0.2;
      object.scale.set(scale, scale, scale);
      object.name = 'usb';
      object.position.set(-416, 0.8, -472);
      object.castShadow = true;

      this.collect.push(object);

      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.loadNextAnimation(loader);
    }, undefined, this.onError);
  }

  private configureCameraButton(): void {
    const button = document.createElement('button')!;
    button.style.cssText = `
      padding: 8px 8px;
      position: absolute;
      cursor: pointer;
      right: 15px;
      bottom: 15px;
      background: #3B53A2;
      font-size: 30px;
      border-radius: 30%;
      border: #fff solid medium;
    `
    button.innerHTML = '📷';
    button.addEventListener('click', () => this.switchCamera());
    document.body.appendChild(button);
  }

  private configureOverlay(): void {
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      background: #000000;
      z-index: 10;
      opacity: 1;
    `;
    document.body.appendChild(overlay);
  }

  private configureBriefcase(): void {
    const button = document.createElement('button');
    button.style.cssText = `
      padding: 8px 8px;
      position: absolute;
      cursor: pointer;
      left: 15px;
      bottom: 15px;
      background: #3B53A2;
      font-size: 30px;
      border-radius: 30%;
      border: #fff solid medium;
    `;
    button.innerHTML = '💼';
    button.addEventListener('click', () => this.toggleBriefcase());
    document.body.appendChild(button);

    const briefcase = document.createElement('div');
    briefcase.id = 'briefcase';
    briefcase.style.cssText = `
      position: absolute;
      left: 20px;
      bottom: 75px;
      width: auto;
      opacity: 0;
      padding: 8px;
      border-radius: 8px;
      background: #3B53A2;
      transition: opacity 0.5s;
    `;

    const briefcaseList = document.createElement('ul');
    briefcaseList.id = 'briefcase-list';
    briefcaseList.style.cssText = `
      list-style: none;
      padding: 0;
      margin: 0;
    `;

    const createBriefcaseItem = (): HTMLLIElement => {
      const briefcaseItem = document.createElement('li');
      briefcaseItem.innerHTML = `
        <button style="all: unset; padding: 0 3px; cursor: pointer;">
          <img width="100" height="75" />
        </button>
      `;
      briefcaseItem.style.cssText = `
        float: left;
      `;

      return briefcaseItem;
    };

    briefcaseList.appendChild(createBriefcaseItem());
    briefcaseList.appendChild(createBriefcaseItem());
    briefcaseList.appendChild(createBriefcaseItem());
    briefcase.appendChild(briefcaseList);
    document.body.appendChild(briefcase);
  }

  private configureActionButton(): void {
    const button = document.createElement('button');
    button.style.cssText = `
      padding: 8px 8px;
      position: absolute;
      cursor: pointer;
      left: 50%;
      bottom: 5px;
      transform: translateX(-50%);
      background: #3B53A2;
      font-size: 30px;
      border-radius: 30%;
      border: #fff solid medium;
      z-index: 1;
    `;
    button.innerHTML = '👆';
    button.addEventListener('click', () => this.contextAction());
    document.body.appendChild(button);
    this.actionButton = button;
  }

  private configureSfxButton(): void {
    const button = document.createElement('button');
    button.style.cssText = `
      padding: 8px 8px;
      position: absolute;
      cursor: pointer;
      right: 15px;
      top: 15px;
      background: #3B53A2;
      font-size: 30px;
      border-radius: 30%;
      border: #fff solid medium;
    `;
    button.id = 'sfx-button';
    button.innerHTML = '🔊';
    button.addEventListener('click', () => this.toggleSound());
    document.body.appendChild(button);
  }

  private toggleBriefcase(): void {
    const briefcase = document.getElementById('briefcase')!;
    const isOpen = +(briefcase.style.opacity) > 0;

    if (isOpen) {
      briefcase.style.opacity = '0';
    } else {
      briefcase.style.opacity = '1';
    }
  }

  private toggleSound(): void {
    if (!this.sfxManager) {
      return;
    }

    this.mute = !this.mute;
    const button = document.getElementById('sfx-button')!;

    if (this.mute) {
      Object.values(this.sfxManager.records).forEach((sfx) => {
        sfx.stop();
      });
      button.innerHTML = '🔇';
    } else {
      this.sfxManager.records[GameSFX.FACTORY].play()
      this.sfxManager.records[GameSFX.FAN].play();
      button.innerHTML = '🔊';
    }
  }

  private contextAction(): void {
    if (!this.onAction || !this.sfxManager) {
      return;
    }

    this.setAction(this.onAction.action);

    switch (this.onAction.mode) {
      case 'open-doors':
        this.sfxManager.records[GameSFX.DOOR].play();
        this.sfxManager.records[GameSFX.BUTTON].play();
        const door = this.doors[this.onAction.index];
        const left = door.doors[0];
        const right = door.doors[1];
        this.cameraTarget = { position: left.position.clone(), target: left.position.clone() };
        this.cameraTarget.position.y += 150;
        this.cameraTarget.position.x -= 950;
        // Tween(target, channel, endValue, duration, oncomplete, easing='inOutQuad')
        this.tweens.push(new Tween(left.position, 'z', left.position.z - 240, 2, (thisTween) => {
          this.tweens.splice(this.tweens.indexOf(thisTween), 1);
        }));
        this.tweens.push(new Tween(right.position, 'z', right.position.z + 240, 2, (thisTween) => {
          this.tweens.splice(this.tweens.indexOf(thisTween), 1);
          delete this.cameraTarget;
          const door = this.doors[this.onAction!.index];
          const left = door.doors[0];
          const right = door.doors[1];
          const leftProxy = door.proxy[0];
          const rightProxy = door.proxy[1];
          leftProxy.position.copy(left.position);
          rightProxy.position.copy(right.position);
        }))
        break;

      case 'collect':
        this.setActiveCamera(this.player.cameras!.collect!);
        this.collect[this.onAction.index].visible = false;
        this.collected = this.collected ?? [];
        this.collected.push(this.onAction.index);

        const briefcaseList = document.getElementById('briefcase-list')!;
        const [currentSlot] = briefcaseList.children[this.onAction.index].getElementsByTagName('img')
        currentSlot.src = this.onAction.src!;
        break;
    }
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

    if (forward === 0 && turn === 0) {
      delete this.player.move;
    } else {
      this.player.move = { forward, turn };
    }

    if (forward > 0) {
      if (this.player.action !== PlayerAction.WALK && this.player.action !== PlayerAction.RUN) {
        this.setAction(PlayerAction.WALK);
      }
    } else if (forward < -0.2) {
      if (this.player.action !== PlayerAction.WALK) {
        this.setAction(PlayerAction.WALK);
      }
    } else {
      if (this.player.action === PlayerAction.WALK || this.player.action === PlayerAction.RUN) {
        this.setAction(PlayerAction.LOOK_AROUND);
      }
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
    this.camerasOrder = [
      PlayerCamera.FRONT,
      PlayerCamera.BACK,
      PlayerCamera.WIDE,
      PlayerCamera.OVERHEAD,
      PlayerCamera.COLLECT
    ];

    setTimeout(() => {
      this.setActiveCamera(this.player.cameras!.back!);
      this.cameraFade = 0.01;
      setTimeout(() => {
        this.cameraFade = 0.1;
      }, 1500);
    }, 2000);
  }

  private setActiveCamera(object: THREE.Object3D): void {
    this.player.cameras!.active = object;
  }

  private loadNextAnimation(loader: FBXLoader): void {
    const animation = this.animations.pop()!;
    loader.load(`${this.assetsPath}fbx/${animation}.fbx`, (object) => {
      this.player[animation] = object.animations[0];
      if (this.animations.length > 0) {
        this.loadNextAnimation(loader);
      } else {
        this.animations = [];
        this.setAction(PlayerAction.LOOK_AROUND);
        this.initPlayerPosition();
        this.mode = GameMode.ACTIVE;
        this.hideOverlay();
      }
    }, undefined, this.onError);
  }

  private hideOverlay(): void {
    const overlay = document.getElementById('overlay') as HTMLDivElement;
    overlay.classList.add('fade-in');
    overlay.addEventListener('animationend', ({ target }) => {
      (target as HTMLDivElement).style.display = 'none';
    }, false);
  }

  private initPlayerPosition(): void {
    if (!this.player.object || !this.environmentProxy) {
      return;
    }
    //cast down
    const direction = new THREE.Vector3(0, -1, 0);
    const position = this.player.object.position.clone();
    position.y += 200;
    const raycaster = new THREE.Raycaster(position, direction);
    const box = this.environmentProxy;

    const intersect = raycaster.intersectObject(box);
    if (intersect.length > 0) {
      this.player.object.position.y = position.y - intersect[0].distance;
    }
  }

  private onWindowResize = () => {
    if (!this.camera || !this.renderer) {
      return;
    }

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private setAction(name: PlayerAction): void {
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

    if (this.isActionFinite(name)) {
      action.loop = THREE.LoopOnce
    };

    const wasLastActionFinite = this.player.action && this.isActionFinite(this.player.action);
    if (wasLastActionFinite) {
      this.player.mixer.stopAllAction();
      action.reset().play();
    } else {
      action.timeScale = (
        name === PlayerAction.WALK &&
        (this.player.move?.forward ?? 0) < 0) ? -0.3 : 1;
      action.reset().fadeIn(0.5).play();
    }
    this.player.action = name;
    this.player.actionTime = Date.now();
  }

  private isActionFinite(action: PlayerAction): boolean {
    return action === PlayerAction.PUSH_BUTTON || action === PlayerAction.GATHER_OBJECTS;
  }

  private movePlayer(delta: number): void {
    if (!this.player.object || !this.player.move) {
      return;
    }

    const position = this.player.object.position.clone();
    position.y += 60;
    const direction = new THREE.Vector3();
    this.player.object.getWorldDirection(direction);

    if (this.player.move.forward < 0) {
      direction.negate();
    }
    const raycaster = new THREE.Raycaster(position, direction);
    const box = this.environmentProxy;
    let blocked = false;

    if (box) {
      const intersect = raycaster.intersectObject(box);
      if (intersect.length > 0) {
        if (intersect[0].distance < 50) blocked = true;
      }
    }

    if (!blocked) {
      if (this.player.move.forward > 0) {
        const speed = this.player.action === PlayerAction.RUN ? 200 : 100;
        this.player.object.translateZ(delta * speed);
      } else {
        this.player.object.translateZ(-delta * 30);
      }
    }

    if (box !== undefined) {
      //cast left
      {
        direction.set(-1, 0, 0);
        direction.applyMatrix4(this.player.object.matrix);
        direction.normalize();
        const raycaster = new THREE.Raycaster(position, direction);
        const intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
          if (intersect[0].distance < 50) {
            this.player.object.translateX(50 - intersect[0].distance);
          }
        }
      }

      //cast right
      {
        direction.set(1, 0, 0);
        direction.applyMatrix4(this.player.object.matrix);
        direction.normalize();
        const raycaster = new THREE.Raycaster(position, direction);
        const intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
          if (intersect[0].distance < 50) {
            this.player.object.translateX(intersect[0].distance - 50);
          }
        }
      }

      //cast down
      {
        direction.set(0, -1, 0);
        position.y += 200;
        const raycaster = new THREE.Raycaster(position, direction);
        const gravity = 30;
        const intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
          const targetY = position.y - intersect[0].distance;
          if (targetY > this.player.object.position.y) {
            //Going up
            this.player.object.position.y = 0.8 * this.player.object.position.y + 0.2 * targetY;
            this.player.velocityY = 0;
          } else if (targetY < this.player.object.position.y) {
            //Falling
            if (this.player.velocityY === undefined) {
              this.player.velocityY = 0;
            }
            this.player.velocityY += delta * gravity;
            this.player.object.position.y -= this.player.velocityY;
            if (this.player.object.position.y < targetY) {
              this.player.velocityY = 0;
              this.player.object.position.y = targetY;
            }
          }
        }
      }
    }
  }

  private animate(): void {
    const delta = this.clock.getDelta();
    requestAnimationFrame(() => this.animate());

    if (this.tweens.length > 0) {
      this.tweens.forEach((tween) => tween.update(delta));
    }

    if (this.player.mixer !== undefined && this.mode === GameMode.ACTIVE) {
      this.player.mixer.update(delta);
    }

    if (this.player.action === PlayerAction.WALK) {
      const elapsedTime = Date.now() - (this.player.actionTime ?? 0);
      if (elapsedTime > 1000 && (this.player.move?.forward ?? 0) > 0) {
        this.setAction(PlayerAction.RUN);
      }
    }
    if (this.player.move !== undefined) {
      if (this.player.move.forward !== 0) {
        this.movePlayer(delta);
      }
      this.player.object!.rotateY(this.player.move.turn * delta);
    }

    if (this.player.cameras !== undefined && this.player.cameras.active !== undefined) {
      this.camera!.position.lerp(this.player.cameras.active.getWorldPosition(new THREE.Vector3()), this.cameraFade);
      let position: THREE.Vector3;
      if (this.cameraTarget !== undefined) {
        this.camera!.position.copy(this.cameraTarget.position);
        position = this.cameraTarget.target;
      } else {
        position = this.player.object!.position.clone();
        position.y += 60;
      }
      this.camera!.lookAt(position);
    }

    this.actionButton!.style.display = 'none';
    let trigger = false;

    if (this.doors !== undefined) {
      this.doors.forEach((door) => {
        if (this.player.object!.position.distanceTo(door.trigger.position) < 100) {
          this.actionButton!.style.display = 'block';
          this.onAction = { action: PlayerAction.PUSH_BUTTON, mode: 'open-doors', index: 0 };
          trigger = true;
        }
      });
    }

    if (this.collect !== undefined && !trigger) {
      this.collect.forEach((object) => {
        if (object.visible && this.player.object!.position.distanceTo(object.position) < 100) {
          this.actionButton!.style.display = 'block';
          this.onAction = { action: PlayerAction.GATHER_OBJECTS, mode: 'collect', index: 0, src: `${this.assetsPath}usb.jpg` };
          trigger = true;
        }
      });
    }

    if (!trigger) {
      delete this.onAction;
    }

    if (this.fans !== undefined) {
      let volume = 0;
      this.fans.forEach((fan) => {
        const dist = fan.position.distanceTo(this.player.object!.position);
        const temporalVolume = 1 - dist / 1000;
        if (temporalVolume > volume) {
          volume = temporalVolume;
        }
        fan.rotateZ(delta);
      });
      this.sfxManager!.records[GameSFX.FAN].volume = volume;
    }

    this.renderer!.render(this.scene!, this.camera!);
    this.stats?.update();
  }

  private onError = (error: ErrorEvent) => {
    console.error(JSON.stringify(error));
    console.error(error.message);
  }
}
