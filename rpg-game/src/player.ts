export enum PlayerAnimation {
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

export type Player = {
  cameras?: {
    front?: THREE.Object3D;
    back?: THREE.Object3D;
    wide?: THREE.Object3D;
    overhead?: THREE.Object3D;
    collect?: THREE.Object3D;
    active?: THREE.Object3D;
  };
  mixer?: THREE.AnimationMixer;
  root?: THREE.Object3D | THREE.AnimationObjectGroup;
  object?: THREE.Object3D;
  action?: PlayerAnimation;
  move?: {
    forward: number;
    turn: number;
  };
} & Partial<Record<PlayerAnimation, THREE.AnimationClip>>;
