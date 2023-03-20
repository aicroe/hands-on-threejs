import { SFX } from './sfx';

export enum GameSFX {
  GLISS = 'gliss',
  DOOR = 'door',
  FACTORY = 'factory',
  BUTTON = 'button',
  FAN = 'fan',
}

export interface GameSFXManager {
  context: AudioContext;
  records: Record<GameSFX, SFX>;
}
