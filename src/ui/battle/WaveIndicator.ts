import Phaser from 'phaser';

export class WaveIndicator extends Phaser.GameObjects.Container {
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.label = scene.add.text(0, 0, '웨이브 1/3', {
      fontSize: '16px',
      color: '#f39c12',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add(this.label);
    scene.add.existing(this);
  }

  update(wave: number, maxWaves: number): void {
    this.label.setText(`웨이브 ${wave} / ${maxWaves}`);
  }
}
