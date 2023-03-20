import { Game } from './game';

window.onload = () => {
  new Game();
};

window.onerror = (error) => {
  console.error(JSON.stringify(error));
};
