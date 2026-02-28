import Phaser from 'phaser';

// 상단 고정 포인터 (휠 위에 오버레이)
export class RouletteNeedle extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, outerRadius: number) {
    super(scene, 0, 0);

    const g = scene.add.graphics();

    // 삼각형 포인터 (하단 방향)
    g.fillStyle(0xf1c40f, 1);
    g.fillTriangle(
      -10, -outerRadius - 5,
       10, -outerRadius - 5,
        0, -outerRadius + 15,
    );

    // 외곽선
    g.lineStyle(2, 0xe67e22, 1);
    g.strokeTriangle(
      -10, -outerRadius - 5,
       10, -outerRadius - 5,
        0, -outerRadius + 15,
    );

    this.add(g);
  }
}
