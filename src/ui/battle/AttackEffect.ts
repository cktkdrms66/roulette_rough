import Phaser from 'phaser';

/**
 * 전투 이펙트 모음
 * shoot()         - 플레이어 공격 (룰렛 → 적 패널)
 * shootFromEnemy()- 적 공격    (적 카드  → 플레이어 패널, 아크 궤적)
 * shootShield()   - 방어 이펙트 (룰렛 → 플레이어 패널, 파란 반짝임)
 * shootCurse()    - 저주 이펙트 (룰렛 → 플레이어 패널, 보라 어둠)
 */
export class AttackEffect {
  private static readonly DURATION = 320; // ms (기본 이동 시간)

  // ── 플레이어 공격 (기존) ──────────────────────────────────────────

  static shoot(
    scene: Phaser.Scene,
    fromX: number, fromY: number,
    toX: number,   toY: number,
    color: number = 0xff5500,
    onHit?: () => void,
  ): void {
    const proj = scene.add.graphics();
    AttackEffect.drawProjectile(proj, color);
    proj.setPosition(fromX, fromY).setDepth(200);

    const trailEvent = AttackEffect.startTrail(scene, proj, color, 35, 6, 180);

    scene.tweens.add({
      targets: proj,
      x: toX, y: toY,
      duration: AttackEffect.DURATION,
      ease: 'Quad.In',
      onComplete: () => {
        trailEvent.destroy();
        proj.destroy();
        AttackEffect.spawnBurst(scene, toX, toY, color);
        onHit?.();
      },
    });
  }

  // ── 적 공격 (적 행동 카드 → 플레이어 패널, 아크 궤적) ────────────

  static shootFromEnemy(
    scene: Phaser.Scene,
    fromX: number, fromY: number,
    toX: number,   toY: number,
    onHit?: () => void,
  ): void {
    const COLOR = 0xcc1111;

    const proj = scene.add.graphics();
    // 외곽 글로우
    proj.fillStyle(COLOR, 0.2);
    proj.fillCircle(0, 0, 22);
    // 중간
    proj.fillStyle(COLOR, 0.8);
    proj.fillCircle(0, 0, 12);
    // 코어 (밝은 흰색)
    proj.fillStyle(0xff9999, 0.9);
    proj.fillCircle(0, 0, 5);
    proj.setPosition(fromX, fromY).setDepth(200);

    const startX = fromX;
    const trailEvent = AttackEffect.startTrail(scene, proj, COLOR, 30, 7, 200);

    // y만 트윈 + onUpdate로 아크 궤적 (sin 곡선으로 옆으로 30px)
    scene.tweens.add({
      targets: proj,
      y: toY,
      duration: AttackEffect.DURATION,
      ease: 'Quad.In',
      onUpdate: (tween) => {
        proj.x = startX + Math.sin(tween.progress * Math.PI) * 30;
      },
      onComplete: () => {
        trailEvent.destroy();
        proj.destroy();
        AttackEffect.spawnBurst(scene, toX, toY, COLOR);
        onHit?.();
      },
    });
  }

  // ── 방어 이펙트 (룰렛 → 플레이어 패널, 파란 반짝임) ──────────────

  static shootShield(
    scene: Phaser.Scene,
    fromX: number, fromY: number,
    toX: number,   toY: number,
    onArrive?: () => void,
  ): void {
    const COLOR = 0x3498db;

    const proj = scene.add.graphics();
    // 부드러운 파란 구체
    proj.fillStyle(COLOR, 0.2);
    proj.fillCircle(0, 0, 20);
    proj.fillStyle(COLOR, 0.7);
    proj.fillCircle(0, 0, 11);
    proj.fillStyle(0xddf0ff, 0.85);
    proj.fillCircle(0, 0, 5);
    proj.setPosition(fromX, fromY).setDepth(200);

    const trailEvent = AttackEffect.startTrail(scene, proj, COLOR, 45, 5, 280);

    scene.tweens.add({
      targets: proj,
      x: toX, y: toY,
      duration: 420,       // 방어는 조금 더 부드럽게
      ease: 'Quad.Out',
      onComplete: () => {
        trailEvent.destroy();
        proj.destroy();

        // 방어 착탄: 확장 링 + 6방향 반짝임
        const ring = scene.add.graphics();
        ring.lineStyle(4, COLOR, 0.9);
        ring.strokeCircle(0, 0, 6);
        ring.setPosition(toX, toY).setDepth(200);
        scene.tweens.add({
          targets: ring,
          scaleX: 6, scaleY: 6, alpha: 0,
          duration: 450, ease: 'Quad.Out',
          onComplete: () => ring.destroy(),
        });

        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const p = scene.add.graphics();
          p.fillStyle(COLOR, 1);
          p.fillCircle(0, 0, 4);
          p.setPosition(toX, toY).setDepth(200);
          scene.tweens.add({
            targets: p,
            x: toX + Math.cos(angle) * 32,
            y: toY + Math.sin(angle) * 32,
            alpha: 0, duration: 380, ease: 'Quad.Out',
            onComplete: () => p.destroy(),
          });
        }

        onArrive?.();
      },
    });
  }

  // ── 적 방어 이펙트 (적 행동 카드 → 오른쪽으로 뻗었다 → U턴 → 적 패널) ──

  static shootEnemyShield(
    scene: Phaser.Scene,
    fromX: number, fromY: number,
    toX: number,   toY: number,
    onArrive?: () => void,
  ): void {
    const COLOR = 0x3498db;

    const proj = scene.add.graphics();
    proj.fillStyle(COLOR, 0.2);
    proj.fillCircle(0, 0, 20);
    proj.fillStyle(COLOR, 0.7);
    proj.fillCircle(0, 0, 11);
    proj.fillStyle(0xddf0ff, 0.85);
    proj.fillCircle(0, 0, 5);
    proj.setPosition(fromX, fromY).setDepth(200);

    const peakX = fromX + 150;
    const peakY = (fromY + toY) / 2;

    const trailEvent = AttackEffect.startTrail(scene, proj, COLOR, 40, 5, 260);

    // 1단계: 오른쪽으로 뻗기
    scene.tweens.add({
      targets: proj,
      x: peakX, y: peakY,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => {
        // 2단계: U턴하여 적 패널로 복귀
        scene.tweens.add({
          targets: proj,
          x: toX, y: toY,
          duration: 300,
          ease: 'Quad.In',
          onComplete: () => {
            trailEvent.destroy();
            proj.destroy();

            // 착탄: 확장 링 + 6방향 반짝임
            const ring = scene.add.graphics();
            ring.lineStyle(4, COLOR, 0.9);
            ring.strokeCircle(0, 0, 6);
            ring.setPosition(toX, toY).setDepth(200);
            scene.tweens.add({
              targets: ring,
              scaleX: 6, scaleY: 6, alpha: 0,
              duration: 450, ease: 'Quad.Out',
              onComplete: () => ring.destroy(),
            });

            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2;
              const p = scene.add.graphics();
              p.fillStyle(COLOR, 1);
              p.fillCircle(0, 0, 4);
              p.setPosition(toX, toY).setDepth(200);
              scene.tweens.add({
                targets: p,
                x: toX + Math.cos(angle) * 32,
                y: toY + Math.sin(angle) * 32,
                alpha: 0, duration: 380, ease: 'Quad.Out',
                onComplete: () => p.destroy(),
              });
            }

            onArrive?.();
          },
        });
      },
    });
  }

  // ── 저주 이펙트 (룰렛 → 플레이어 패널, 보라 어둠 구체) ───────────

  static shootCurse(
    scene: Phaser.Scene,
    fromX: number, fromY: number,
    toX: number,   toY: number,
    onArrive?: () => void,
  ): void {
    const COLOR = 0x9b59b6;

    const proj = scene.add.graphics();
    // 외곽 어두운 글로우
    proj.fillStyle(COLOR, 0.22);
    proj.fillCircle(0, 0, 24);
    // 중간 보라
    proj.fillStyle(COLOR, 0.85);
    proj.fillCircle(0, 0, 13);
    // 코어 (어두운 속)
    proj.fillStyle(0x1a0033, 0.95);
    proj.fillCircle(0, 0, 7);
    proj.setPosition(fromX, fromY).setDepth(200);

    const trailEvent = AttackEffect.startTrail(scene, proj, COLOR, 50, 8, 320);

    scene.tweens.add({
      targets: proj,
      x: toX, y: toY,
      duration: AttackEffect.DURATION + 60,
      ease: 'Quad.In',
      onComplete: () => {
        trailEvent.destroy();
        proj.destroy();
        AttackEffect.spawnBurst(scene, toX, toY, COLOR);
        onArrive?.();
      },
    });
  }

  // ── private helpers ──────────────────────────────────────────────

  private static drawProjectile(gfx: Phaser.GameObjects.Graphics, color: number): void {
    gfx.fillStyle(color, 0.25);
    gfx.fillCircle(0, 0, 20);
    gfx.fillStyle(color, 0.55);
    gfx.fillCircle(0, 0, 13);
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(0, 0, 5);
  }

  /** 트레일 타이머 생성 - 발사체 뒤에 작은 잔상 원을 남긴다 */
  private static startTrail(
    scene: Phaser.Scene,
    proj: Phaser.GameObjects.Graphics,
    color: number,
    delay: number,
    radius: number,
    fadeDuration: number,
  ): Phaser.Time.TimerEvent {
    return scene.time.addEvent({
      delay,
      repeat: Math.ceil((AttackEffect.DURATION + 100) / delay),
      callback: () => {
        if (!proj.active) return;
        const t = scene.add.graphics();
        t.fillStyle(color, 0.42);
        t.fillCircle(0, 0, radius);
        t.setPosition(proj.x, proj.y).setDepth(199);
        scene.tweens.add({
          targets: t,
          alpha: 0, scaleX: 0.1, scaleY: 0.1,
          duration: fadeDuration,
          ease: 'Quad.Out',
          onComplete: () => t.destroy(),
        });
      },
    });
  }

  /** 착탄 파티클 버스트 (8방향 + 충격파 링) */
  private static spawnBurst(
    scene: Phaser.Scene,
    x: number, y: number,
    color: number,
  ): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const p = scene.add.graphics();
      p.fillStyle(color, 1);
      p.fillCircle(0, 0, 5);
      p.setPosition(x, y).setDepth(200);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 38,
        y: y + Math.sin(angle) * 38,
        alpha: 0, scaleX: 0.3, scaleY: 0.3,
        duration: 300, ease: 'Quad.Out',
        onComplete: () => p.destroy(),
      });
    }

    const ring = scene.add.graphics();
    ring.lineStyle(3, color, 0.8);
    ring.strokeCircle(0, 0, 8);
    ring.setPosition(x, y).setDepth(199);
    scene.tweens.add({
      targets: ring,
      scaleX: 4, scaleY: 4, alpha: 0,
      duration: 350, ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });
  }
}
