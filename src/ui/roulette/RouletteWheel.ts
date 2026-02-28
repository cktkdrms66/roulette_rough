import Phaser from 'phaser';
import { Slot } from '../../types/slot.types';
import { RouletteSlot } from './RouletteSlot';
import { RouletteNeedle } from './RouletteNeedle';
import { makeDraggable } from '../utils/makeDraggable';

const INNER_RADIUS = 70;
const OUTER_RADIUS = 170;

export class RouletteWheel extends Phaser.GameObjects.Container {
  // segmentsContainer가 실제로 회전하는 컨테이너
  segmentsContainer: Phaser.GameObjects.Container;
  private slotViews: RouletteSlot[] = [];
  private needle: RouletteNeedle;
  private centerLabel: Phaser.GameObjects.Text;
  private spinning: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, slots: Slot[]) {
    super(scene, x, y);

    this.segmentsContainer = scene.add.container(0, 0);

    // 배경 원
    const bg = scene.add.graphics();
    bg.fillStyle(0x2c3e50, 1);
    bg.fillCircle(0, 0, OUTER_RADIUS + 5);
    bg.lineStyle(3, 0x34495e, 1);
    bg.strokeCircle(0, 0, OUTER_RADIUS + 5);
    this.segmentsContainer.add(bg);

    // 각 슬롯 세그먼트 생성
    for (const slot of slots) {
      const slotView = new RouletteSlot(scene, slot, INNER_RADIUS, OUTER_RADIUS);
      this.slotViews.push(slotView);
      this.segmentsContainer.add(slotView);
    }

    // 중앙 원
    const center = scene.add.graphics();
    center.fillStyle(0x1a252f, 1);
    center.fillCircle(0, 0, INNER_RADIUS - 2);
    center.lineStyle(2, 0x95a5a6, 1);
    center.strokeCircle(0, 0, INNER_RADIUS - 2);
    this.segmentsContainer.add(center);

    // 중앙 텍스트
    this.centerLabel = scene.add.text(0, 0, 'SPIN', {
      fontSize: '18px',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.segmentsContainer.add(this.centerLabel);

    this.add(this.segmentsContainer);
    scene.add.existing(this);

    // 바늘 (휠 다음에 추가 → 휠 위에 렌더링)
    this.needle = new RouletteNeedle(scene, OUTER_RADIUS);
    scene.add.existing(this.needle);
    this.needle.setPosition(x, y);
    this.needle.setDepth(10);

    // 드래그 이동 (바늘도 함께 이동)
    const R = OUTER_RADIUS + 5;
    makeDraggable(scene, this, R * 2, R * 2, -R, -R, (nx, ny) => {
      this.needle.setPosition(nx, ny);
    });
  }

  // 슬롯 데이터 갱신
  refreshSlots(slots: Slot[]): void {
    for (let i = 0; i < this.slotViews.length; i++) {
      if (slots[i]) this.slotViews[i].updateSlot(slots[i]);
    }
  }

  // 특정 인덱스로 스핀 (finalAngle은 BattleSystem에서 계산)
  spinTo(finalAngle: number, onComplete: () => void): void {
    if (this.spinning) return;
    this.spinning = true;
    this.centerLabel.setText('...');

    this.scene.tweens.add({
      targets: this.segmentsContainer,
      angle: finalAngle,
      duration: 1500,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.spinning = false;
        this.centerLabel.setText('SPIN');
        onComplete();
      },
    });
  }

  // 착지한 슬롯 강조
  highlightLanded(index: number): void {
    this.slotViews[index]?.pulseLight();
  }

  // 드래그 하이라이트
  setHighlight(indices: number[], type: 'valid' | 'invalid' | 'none'): void {
    for (let i = 0; i < this.slotViews.length; i++) {
      this.slotViews[i].highlight(indices.includes(i) ? type : 'none');
    }
  }

  clearHighlights(): void {
    for (const sv of this.slotViews) {
      sv.highlight('none');
    }
    // 모든 슬롯 정상 상태로 리프레시
    for (const sv of this.slotViews) {
      sv.refresh();
    }
  }

  // 포인터로부터 호버 중인 슬롯 인덱스 계산
  getSlotIndexFromPointer(pointerX: number, pointerY: number): number {
    // applyInverse가 컨테이너 회전을 이미 반영 → 로컬 좌표(슬롯 원점 기준)
    const point = this.segmentsContainer.getWorldTransformMatrix()
      .applyInverse(pointerX, pointerY);

    const dist = Math.sqrt(point.x * point.x + point.y * point.y);
    if (dist < INNER_RADIUS || dist > OUTER_RADIUS) return -1;

    // atan2 결과는 로컬 각도 (0°=오른쪽, 270°=상단=바늘위치)
    let angle = Phaser.Math.RadToDeg(Math.atan2(point.y, point.x));
    angle = ((angle % 360) + 360) % 360;

    return Math.floor(angle / 30) % 12;
  }

  // 연속 n칸 그룹 반환
  getSlotGroup(hoveredIndex: number, count: number): number[] {
    if (count === 1) return [hoveredIndex];
    if (count === 2) return [hoveredIndex, (hoveredIndex + 1) % 12];
    if (count === 3) {
      return [
        (hoveredIndex - 1 + 12) % 12,
        hoveredIndex,
        (hoveredIndex + 1) % 12,
      ];
    }
    // 일반적인 경우: hoveredIndex 중심
    const result: number[] = [];
    const half = Math.floor(count / 2);
    for (let i = -half; i <= count - half - 1; i++) {
      result.push((hoveredIndex + i + 12) % 12);
    }
    return result;
  }

  isSpinning(): boolean {
    return this.spinning;
  }

  getOuterRadius(): number {
    return OUTER_RADIUS;
  }
}
