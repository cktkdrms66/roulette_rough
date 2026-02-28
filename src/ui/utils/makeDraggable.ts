import Phaser from 'phaser';

/**
 * Container에 드래그 이동 기능 추가.
 * 8px 이상 이동해야 드래그로 인식 (버튼 클릭과 구분).
 *
 * @param scene      현재 씬
 * @param container  드래그할 컨테이너
 * @param hitW       인터랙션 히트 영역 너비
 * @param hitH       인터랙션 히트 영역 높이
 * @param hitOffsetX 히트 영역 로컬 X 오프셋 (기본 0)
 * @param hitOffsetY 히트 영역 로컬 Y 오프셋 (기본 0)
 * @param onMove     이동 후 콜백 (다른 객체 동기화용)
 */
export function makeDraggable(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  hitW: number,
  hitH: number,
  hitOffsetX: number = 0,
  hitOffsetY: number = 0,
  onMove?: (x: number, y: number) => void,
): void {
  container.setInteractive(
    new Phaser.Geom.Rectangle(hitOffsetX, hitOffsetY, hitW, hitH),
    Phaser.Geom.Rectangle.Contains,
  );

  let down = false;
  let thresholdMet = false;
  let startPX = 0;
  let startPY = 0;
  let startOX = 0;
  let startOY = 0;

  container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    down = true;
    thresholdMet = false;
    startPX = pointer.x;
    startPY = pointer.y;
    startOX = container.x;
    startOY = container.y;
    container.setDepth(50);
  });

  scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (!down) return;
    const dx = pointer.x - startPX;
    const dy = pointer.y - startPY;
    if (!thresholdMet && Math.hypot(dx, dy) > 8) thresholdMet = true;
    if (thresholdMet) {
      container.setPosition(startOX + dx, startOY + dy);
      onMove?.(container.x, container.y);
    }
  });

  scene.input.on('pointerup', () => {
    down = false;
    thresholdMet = false;
    container.setDepth(0);
  });
}
