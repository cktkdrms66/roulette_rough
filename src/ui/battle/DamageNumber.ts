import Phaser from 'phaser';

export class DamageNumber {
  static show(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: number,
    type: 'damage' | 'heal' | 'shield' | 'curse' = 'damage',
  ): void {
    const colorMap = {
      damage: '#ff4444',
      heal: '#44ff88',
      shield: '#4488ff',
      curse: '#aa44ff',
    };

    const prefix = type === 'heal' ? '+' : type === 'shield' ? '🛡' : '-';
    const text = scene.add.text(x, y, `${prefix}${value}`, {
      fontSize: '24px',
      color: colorMap[type],
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(100);

    scene.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    });
  }
}
