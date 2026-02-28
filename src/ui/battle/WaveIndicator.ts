import Phaser from 'phaser';
import { THEME } from '../theme';

export class WaveIndicator extends Phaser.GameObjects.Container {
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // 골드 장식 심볼
    const leftSuit = scene.add.text(-80, 0, '\u2666', {
      fontSize: '12px',
      color: THEME.TEXT_GOLD,
    }).setOrigin(0.5, 0.5);

    const rightSuit = scene.add.text(80, 0, '\u2666', {
      fontSize: '12px',
      color: THEME.TEXT_GOLD,
    }).setOrigin(0.5, 0.5);

    this.label = scene.add.text(0, 0, 'WAVE 1 / 3', {
      fontSize: '15px',
      color: THEME.TEXT_GOLD,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add([leftSuit, rightSuit, this.label]);
    scene.add.existing(this);
  }

  update(wave: number, maxWaves: number): void {
    this.label.setText(`WAVE  ${wave} / ${maxWaves}`);
  }
}
