import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.audio('roulette_ing',    'assets/sounds/roulette_ing.mp3');
    this.load.audio('roulette_result', 'assets/sounds/roulette_result.mp3');
    this.load.audio('attack',          'assets/sounds/attack.wav');
    this.load.audio('shield',          'assets/sounds/shield.wav');
  }

  create(): void {
    // 간단한 로딩 화면
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height / 2 - 30, 'RouletteRough', {
      fontSize: '36px',
      color: '#e74c3c',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, '로딩 중...', {
      fontSize: '16px',
      color: '#95a5a6',
    }).setOrigin(0.5);

    // 잠깐 딜레이 후 맵 씬으로
    this.time.delayedCall(500, () => {
      this.scene.start('MapScene');
    });
  }
}
