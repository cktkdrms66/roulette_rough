import Phaser from 'phaser';
import { THEME } from '../theme';

export class SpinButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private enabled: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, onClick: () => void) {
    super(scene, x, y);

    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, 'SPIN', {
      fontSize: '22px',
      color: '#1a0a08',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add([this.bg, this.label]);
    this.drawButton(false);

    this.setSize(140, 50);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => { if (this.enabled) this.drawButton(true); });
    this.on('pointerout', () => this.drawButton(false));
    this.on('pointerdown', () => {
      if (this.enabled) {
        scene.cameras.main.shake(80, 0.003);
        onClick();
      }
    });

    scene.add.existing(this);
  }

  private drawButton(hovered: boolean): void {
    this.bg.clear();

    if (this.enabled) {
      // 골드 카지노 버튼
      const fill = hovered ? THEME.GOLD : THEME.GOLD_DARK;
      this.bg.fillStyle(fill, 1);
      this.bg.fillRoundedRect(-70, -25, 140, 50, 10);
      // 이중 골드 테두리
      this.bg.lineStyle(2, THEME.GOLD, 1);
      this.bg.strokeRoundedRect(-70, -25, 140, 50, 10);
      this.bg.lineStyle(1, 0xffffff, hovered ? 0.4 : 0.2);
      this.bg.strokeRoundedRect(-67, -22, 134, 44, 8);
      this.label.setColor('#1a0a08');
    } else {
      this.bg.fillStyle(0x2a1a0a, 1);
      this.bg.fillRoundedRect(-70, -25, 140, 50, 10);
      this.bg.lineStyle(1, THEME.GOLD_DARK, 0.3);
      this.bg.strokeRoundedRect(-70, -25, 140, 50, 10);
      this.label.setColor(THEME.TEXT_DIM);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.drawButton(false);
    this.label.setAlpha(enabled ? 1 : 0.6);
  }

  setText(text: string): void {
    this.label.setText(text);
  }
}
