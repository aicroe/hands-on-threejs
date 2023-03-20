export enum PlayerAction {
  ASCEND_STAIRS = 'ascend-stairs',
  CLIMB_LADDER = 'climb-ladder',
  CLIMB_ROPE = 'climb-rope',
  GATHER_OBJECTS = 'gather-objects',
  WALK = 'walk',
  LOOK_AROUND = 'look-around',
  PUNCH = 'punch',
  PUSH_BUTTON = 'push-button',
  RUN = 'run',
  STUMBLE_BACKWARDS = 'stumble-backwards',
}

export enum PlayerCamera {
  FRONT = 'front',
  BACK = 'back',
  WIDE = 'wide',
  OVERHEAD = 'overhead',
  COLLECT = 'collect',
  ACTIVE = 'active',
}

export type Player = {
  cameras?: Partial<Record<PlayerCamera, THREE.Object3D>>;
  mixer?: THREE.AnimationMixer;
  root?: THREE.Object3D | THREE.AnimationObjectGroup;
  object?: THREE.Object3D;
  action?: PlayerAction;
  move?: {
    forward: number;
    turn: number;
  };
  velocityY?: number;
  actionTime?: number;
} & Partial<Record<PlayerAction, THREE.AnimationClip>>;
