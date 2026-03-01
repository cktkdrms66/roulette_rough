import Phaser from 'phaser';
import { Slot } from '../../types/slot.types';
import { RouletteSlot } from './RouletteSlot';
import { RouletteNeedle } from './RouletteNeedle';
import { makeDraggable } from '../utils/makeDraggable';
import { THEME } from '../theme';

const INNER_RADIUS = 70;
const OUTER_RADIUS = 170;

export class RouletteWheel extends Phaser.GameObjects.Container {
  segmentsContainer: Phaser.GameObjects.Container;
  private slotViews: RouletteSlot[] = [];
  private needle: RouletteNeedle;
  private centerLabel: Phaser.GameObjects.Text;
  private centerBg: Phaser.GameObjects.Graphics;
  private spinning: boolean = false;
  private centerEnabled: boolean = true;
  private onCenterClickCallback?: () => void;
  private onSlotClickCallback?: (index: number) => void;
  private slotClickEnabled: boolean = false;
  private onSlotHoverCallback?: (index: number) => void;
  private onSlotHoverOutCallback?: () => void;
  private lastHoveredSlotIndex: number = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, slots: Slot[]) {
    super(scene, x, y);

    this.segmentsContainer = scene.add.container(0, 0);

    // 배경 원
    const bg = scene.add.graphics();
    bg.fillStyle(THEME.BG_DARK, 1);
    bg.fillCircle(0, 0, OUTER_RADIUS + 8);
    this.segmentsContainer.add(bg);

    // 3겹 골드 외곽 링
    const rings = scene.add.graphics();
    rings.lineStyle(3, THEME.GOLD, 1);
    rings.strokeCircle(0, 0, OUTER_RADIUS + 7);
    rings.lineStyle(1, THEME.GOLD_DARK, 0.8);
    rings.strokeCircle(0, 0, OUTER_RADIUS + 3);
    rings.lineStyle(2, THEME.GOLD_DARK, 1);
    rings.strokeCircle(0, 0, OUTER_RADIUS + 0);
    this.segmentsContainer.add(rings);

    // 각 슬롯 세그먼트 생성
    for (const slot of slots) {
      const slotView = new RouletteSlot(scene, slot, INNER_RADIUS, OUTER_RADIUS);
      this.slotViews.push(slotView);
      this.segmentsContainer.add(slotView);
    }

    // 방사형 구분선
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

    // 중앙 원 (클릭 시 색상 변경용 Graphics)
    this.centerBg = scene.add.graphics();
    this.drawCenterBg(false);
    this.segmentsContainer.add(this.centerBg);

    // 중앙 텍스트
    this.centerLabel = scene.add.text(0, 0, 'SPIN!', {
      fontSize: '20px',
      color: THEME.TEXT_GOLD,
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    this.segmentsContainer.add(this.centerLabel);

    this.add(this.segmentsContainer);
    scene.add.existing(this);

    // 클릭 영역 설정
    this.setupClickZone(scene);

    // 바늘
    this.needle = new RouletteNeedle(scene, OUTER_RADIUS);
    scene.add.existing(this.needle);
    this.needle.setPosition(x, y);
    this.needle.setDepth(10);

    // 드래그 이동
    const R = OUTER_RADIUS + 5;
    makeDraggable(scene, this, R * 2, R * 2, -R, -R, (nx, ny) => {
      this.needle.setPosition(nx, ny);
    });
  }

  private setupClickZone(scene: Phaser.Scene): void {
    const R = OUTER_RADIUS;
    const hitZone = scene.add.zone(0, 0, R * 2, R * 2)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const local = this.segmentsContainer.getWorldTransformMatrix()
        .applyInverse(pointer.worldX, pointer.worldY);
      const dist = Math.sqrt(local.x * local.x + local.y * local.y);

      if (dist < INNER_RADIUS) {
        // 중앙 클릭 → 스핀
        if (this.centerEnabled && this.onCenterClickCallback) {
          this.onCenterClickCallback();
        }
      } else if (dist <= OUTER_RADIUS) {
        // 슬롯 클릭
        if (this.slotClickEnabled && this.onSlotClickCallback) {
          const idx = this.getSlotIndexFromPointer(pointer.worldX, pointer.worldY);
          if (idx >= 0) this.onSlotClickCallback(idx);
        }
      }
    });

    hitZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const local = this.segmentsContainer.getWorldTransformMatrix()
        .applyInverse(pointer.worldX, pointer.worldY);
      const dist = Math.sqrt(local.x * local.x + local.y * local.y);
      const overCenter = dist < INNER_RADIUS && this.centerEnabled;
      hitZone.input!.cursor = overCenter ? 'pointer' : 'default';
      this.drawCenterBg(overCenter);

      // 슬롯 hover 감지
      if (dist > INNER_RADIUS && dist <= OUTER_RADIUS) {
        const idx = this.getSlotIndexFromPointer(pointer.worldX, pointer.worldY);
        if (idx >= 0 && idx !== this.lastHoveredSlotIndex) {
          if (this.lastHoveredSlotIndex >= 0) {
            this.slotViews[this.lastHoveredSlotIndex]?.setHoverHighlight(false);
          }
          this.lastHoveredSlotIndex = idx;
          this.slotViews[idx]?.setHoverHighlight(true);
          this.onSlotHoverCallback?.(idx);
        }
      } else {
        if (this.lastHoveredSlotIndex >= 0) {
          this.slotViews[this.lastHoveredSlotIndex]?.setHoverHighlight(false);
          this.lastHoveredSlotIndex = -1;
          this.onSlotHoverOutCallback?.();
        }
      }
    });

    hitZone.on('pointerout', () => {
      this.drawCenterBg(false);
      if (this.lastHoveredSlotIndex >= 0) {
        this.slotViews[this.lastHoveredSlotIndex]?.setHoverHighlight(false);
        this.lastHoveredSlotIndex = -1;
        this.onSlotHoverOutCallback?.();
      }
    });

    this.segmentsContainer.add(hitZone);
  }

  private drawCenterBg(hovered: boolean): void {
    this.centerBg.clear();
    const fillColor = hovered ? THEME.GOLD_DARK : THEME.BG_DARK;
    this.centerBg.fillStyle(fillColor, 1);
    this.centerBg.fillCircle(0, 0, INNER_RADIUS - 2);
    this.centerBg.lineStyle(2.5, THEME.GOLD, hovered ? 1 : 0.8);
    this.centerBg.strokeCircle(0, 0, INNER_RADIUS - 1);
    this.centerBg.lineStyle(1, THEME.GOLD, 0.4);
    this.centerBg.strokeCircle(0, 0, INNER_RADIUS + 6);
  }

  // 중앙 스핀 버튼 콜백 등록
  setOnCenterClick(callback: () => void): void {
    this.onCenterClickCallback = callback;
  }

  // 중앙 스핀 버튼 활성/비활성
  setCenterEnabled(enabled: boolean): void {
    this.centerEnabled = enabled;
    this.centerLabel.setAlpha(enabled ? 1 : 0.4);
    this.drawCenterBg(false);
  }

  // 슬롯 hover 콜백 등록
  setOnSlotHover(onHover: (index: number) => void, onOut: () => void): void {
    this.onSlotHoverCallback    = onHover;
    this.onSlotHoverOutCallback = onOut;
  }

  // 슬롯 클릭 콜백 등록 및 활성화
  enableSlotClick(callback: (index: number) => void): void {
    this.onSlotClickCallback = callback;
    this.slotClickEnabled = true;
  }

  // 슬롯 클릭 비활성화
  disableSlotClick(): void {
    this.slotClickEnabled = false;
    this.onSlotClickCallback = undefined;
  }

  // 슬롯 데이터 갱신
  refreshSlots(slots: Slot[]): void {
    for (let i = 0; i < this.slotViews.length; i++) {
      if (slots[i]) this.slotViews[i].updateSlot(slots[i]);
    }
  }

  // 특정 인덱스로 스핀
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
        this.centerLabel.setText('SPIN!');
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

  // 슬롯 선택 모드 하이라이트
  setSelectHighlight(selectedIndices: number[]): void {
    for (let i = 0; i < this.slotViews.length; i++) {
      this.slotViews[i].highlight(selectedIndices.includes(i) ? 'valid' : 'none');
    }
  }

  clearHighlights(): void {
    for (const sv of this.slotViews) {
      sv.highlight('none');
    }
    for (const sv of this.slotViews) {
      sv.refresh();
    }
  }

  // 포인터로부터 호버 중인 슬롯 인덱스 계산
  getSlotIndexFromPointer(pointerX: number, pointerY: number): number {
    const point = this.segmentsContainer.getWorldTransformMatrix()
      .applyInverse(pointerX, pointerY);

    const dist = Math.sqrt(point.x * point.x + point.y * point.y);
    if (dist < INNER_RADIUS || dist > OUTER_RADIUS) return -1;

    let angle = Phaser.Math.RadToDeg(Math.atan2(point.y, point.x));
    // +30° 오프셋: 각 슬롯이 index*60° 중앙 ±30° 범위를 정확히 커버하도록
    angle = ((angle + 30) % 360 + 360) % 360;

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
