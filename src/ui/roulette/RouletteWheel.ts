import Phaser from 'phaser';
import { Slot } from '../../types/slot.types';
import { RouletteSlot } from './RouletteSlot';
import { RouletteNeedle } from './RouletteNeedle';
import { makeDraggable } from '../utils/makeDraggable';
import { THEME } from '../theme';

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

    // ── 배경 원 (다크 레드-블랙) ────────────────────────────────
    const bg = scene.add.graphics();
    bg.fillStyle(THEME.BG_DARK, 1);
    bg.fillCircle(0, 0, OUTER_RADIUS + 8);
    this.segmentsContainer.add(bg);

    // ── 3겹 골드 외곽 링 ─────────────────────────────────────────
    const rings = scene.add.graphics();
    // 바깥 링 (3px, 밝은 골드)
    rings.lineStyle(3, THEME.GOLD, 1);
    rings.strokeCircle(0, 0, OUTER_RADIUS + 7);
    // 중간 간격 (2px 간격)
    rings.lineStyle(1, THEME.GOLD_DARK, 0.8);
    rings.strokeCircle(0, 0, OUTER_RADIUS + 3);
    // 안쪽 링 (2px, 다크 골드)
    rings.lineStyle(2, THEME.GOLD_DARK, 1);
    rings.strokeCircle(0, 0, OUTER_RADIUS + 0);
    this.segmentsContainer.add(rings);

    // 각 슬롯 세그먼트 생성
    for (const slot of slots) {
      const slotView = new RouletteSlot(scene, slot, INNER_RADIUS, OUTER_RADIUS);
      this.slotViews.push(slotView);
      this.segmentsContainer.add(slotView);
    }

    // ── 방사형 구분선 (슬롯 경계마다 흰색 선) ────────────────────
    const divG = scene.add.graphics();
    divG.lineStyle(1, 0xffffff, 0.2);
    for (let i = 0; i < 6; i++) {
      const a = Phaser.Math.DegToRad(i * 60);
      divG.lineBetween(
        Math.cos(a) * INNER_RADIUS,
        Math.sin(a) * INNER_RADIUS,
        Math.cos(a) * OUTER_RADIUS,
        Math.sin(a) * OUTER_RADIUS,
      );
    }
    this.segmentsContainer.add(divG);

    // ── 중앙 원 (다크, 골드 테두리 강화) ─────────────────────────
    const center = scene.add.graphics();
    center.fillStyle(THEME.BG_DARK, 1);
    center.fillCircle(0, 0, INNER_RADIUS - 2);
    // 이중 골드 링 (강화)
    center.lineStyle(2.5, THEME.GOLD, 1);
    center.strokeCircle(0, 0, INNER_RADIUS - 1);
    center.lineStyle(1, THEME.GOLD, 0.45);
    center.strokeCircle(0, 0, INNER_RADIUS + 6);
    this.segmentsContainer.add(center);

    // 중앙 텍스트 (♠ 심볼 + SPIN)
    this.centerLabel = scene.add.text(0, 0, '\u2660\nSPIN', {
      fontSize: '16px',
      color: THEME.TEXT_GOLD,
      fontStyle: 'bold',
      align: 'center',
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
    this.centerLabel.setText('\u2660\n...');

    this.scene.tweens.add({
      targets: this.segmentsContainer,
      angle: finalAngle,
      duration: 1500,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.spinning = false;
        this.centerLabel.setText('\u2660\nSPIN');
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

    return Math.floor(angle / 60) % 6;
  }

  // 연속 n칸 그룹 반환
  getSlotGroup(hoveredIndex: number, count: number): number[] {
    const N = 6;
    if (count === 1) return [hoveredIndex];
    if (count === 2) return [hoveredIndex, (hoveredIndex + 1) % N];
    if (count === 3) {
      return [
        (hoveredIndex - 1 + N) % N,
        hoveredIndex,
        (hoveredIndex + 1) % N,
      ];
    }
    // 일반적인 경우: hoveredIndex 중심
    const result: number[] = [];
    const half = Math.floor(count / 2);
    for (let i = -half; i <= count - half - 1; i++) {
      result.push((hoveredIndex + i + N) % N);
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
