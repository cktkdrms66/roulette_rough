import Phaser from 'phaser';

export class SpinButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private enabled: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, onClick: () => void) {
    super(scene, x, y);

    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, 'SPIN', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add([this.bg, this.label]);
    this.drawButton(false);

    // 인터랙션
    this.setSize(140, 50);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => { if (this.enabled) this.drawButton(true); });
    this.on('pointerout', () => this.drawButton(false));
    this.on('pointerdown', () => {
      if (this.enabled) {
        this.scene.cameras.main.shake(80, 0.003);
        onClick();
      }
    });

    scene.add.existing(this);
  }

  private drawButton(hovered: boolean): void {
    this.bg.clear();
    const color = this.enabled
      ? (hovered ? 0xe74c3c : 0xc0392b)
      : 0x7f8c8d;

    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(-70, -25, 140, 50, 10);
    this.bg.lineStyle(2, 0xffffff, 0.3);
    this.bg.strokeRoundedRect(-70, -25, 140, 50, 10);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.drawButton(false);
    this.label.setAlpha(enabled ? 1 : 0.5);
  }

  setText(text: string): void {
    this.label.setText(text);
  }
}
