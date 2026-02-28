import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(0, 0, width, height, 0x0d0d0d).setOrigin(0);

    this.add.text(width / 2, height / 2 - 80, '게임 오버', {
      fontSize: '48px',
      color: '#e74c3c',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, '당신의 모험은 여기서 끝났습니다...', {
      fontSize: '18px',
      color: '#95a5a6',
    }).setOrigin(0.5);

    // 다시 시작 버튼
    const btn = this.add.container(width / 2, height / 2 + 100);
    const bg = this.add.graphics();
    bg.fillStyle(0xc0392b, 1);
    bg.fillRoundedRect(-90, -25, 180, 50, 10);

    const txt = this.add.text(0, 0, '다시 시작', {
      fontSize: '20px',
      color: '#ffffff',
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

    // 페이드인
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }
}
