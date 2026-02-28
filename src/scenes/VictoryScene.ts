import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(0, 0, width, height, 0x0d1117).setOrigin(0);

    // 파티클 효과 (별 반짝임)
    const particles = this.add.particles(0, 0, undefined, {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      quantity: 2,
      frequency: 100,
      lifespan: 2000,
      alpha: { start: 1, end: 0 },
      scale: { start: 0.5, end: 0 },
      speed: { min: 20, max: 60 },
      angle: { min: -90, max: 90 },
      gravityY: -30,
      blendMode: 'ADD',
    });
    // 간단한 도형으로 파티클 텍스처 대체
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xf1c40f, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('star', 8, 8);
    g.destroy();
    particles.setTexture('star');

    this.add.text(width / 2, height / 2 - 100, '🏆 승리! 🏆', {
      fontSize: '56px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, '마왕을 물리쳤습니다!', {
      fontSize: '24px',
      color: '#ecf0f1',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 50, '당신의 용기가 세계를 구했습니다.', {
      fontSize: '16px',
      color: '#95a5a6',
    }).setOrigin(0.5);

    // 다시 시작 버튼
    const btn = this.add.container(width / 2, height / 2 + 130);
    const bg = this.add.graphics();
    bg.fillStyle(0xf1c40f, 1);
    bg.fillRoundedRect(-90, -25, 180, 50, 10);

    const txt = this.add.text(0, 0, '다시 시작', {
      fontSize: '20px',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.add([bg, txt]);
    btn.setSize(180, 50);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MapScene');
      });
    });

    btn.on('pointerover', () => {
      this.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 80 });
    });
    btn.on('pointerout', () => {
      this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 80 });
    });

    this.cameras.main.fadeIn(800, 0, 0, 0);
  }
}
