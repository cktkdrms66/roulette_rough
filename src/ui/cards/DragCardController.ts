import Phaser from 'phaser';
import { CardView } from './CardView';
import { CardDef } from '../../types/card.types';
import { RouletteWheel } from '../roulette/RouletteWheel';
import { TypedEventEmitter, GameEvents } from '../../events/GameEvents';
import { BattleState } from '../../types/battle.types';
import { CardSystem } from '../../systems/CardSystem';

type DragState = 'idle' | 'dragging';

export class DragCardController {
  private scene: Phaser.Scene;
  private wheel: RouletteWheel;
  private events: TypedEventEmitter;
  private cardSystem: CardSystem;
  private state: DragState = 'idle';

  private dragOriginX: number = 0;
  private dragOriginY: number = 0;
  private currentHoveredIndices: number[] = [];
  private battleState: BattleState;

  constructor(
    scene: Phaser.Scene,
    wheel: RouletteWheel,
    events: TypedEventEmitter,
    battleState: BattleState,
  ) {
    this.scene = scene;
    this.wheel = wheel;
    this.events = events;
    this.battleState = battleState;
    this.cardSystem = new CardSystem();
  }

  // 카드 뷰에 드래그 인터랙션 연결
  attachToCard(cardView: CardView): void {
    const card = cardView.card;

    // 드래그 필요 없는 카드: 클릭으로 구매
    if (!this.cardSystem.requiresDrag(card)) return;

    cardView.setInteractive({ useHandCursor: true });

    cardView.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.state !== 'idle') return;
      this.beginDrag(cardView, pointer);
    });
  }

  private beginDrag(cardView: CardView, pointer: Phaser.Input.Pointer): void {
    this.state = 'dragging';
    this.dragOriginX = cardView.x;
    this.dragOriginY = cardView.y;

    // 부모 컨테이너의 월드 좌표 (로컬 ↔ 월드 변환)
    const parent = cardView.parentContainer;
    const parentX = parent ? parent.x : 0;
    const parentY = parent ? parent.y : 0;

    // 클릭 지점과 카드 중심의 오프셋 (드래그 시작 시 카드가 튀지 않도록)
    const grabOffsetX = pointer.x - (parentX + cardView.x);
    const grabOffsetY = pointer.y - (parentY + cardView.y);

    // 드래그 중 카드를 최상단으로
    cardView.setDepth(50);

    const onMove = (p: Phaser.Input.Pointer) => {
      if (this.state !== 'dragging') return;

      // 월드 좌표를 부모 컨테이너 로컬 좌표로 변환
      cardView.setPosition(
        p.x - grabOffsetX - parentX,
        p.y - grabOffsetY - parentY,
      );

      // 휠 위 슬롯 감지
      const hoveredIndex = this.wheel.getSlotIndexFromPointer(p.x, p.y);
      if (hoveredIndex >= 0) {
        const count = this.cardSystem.requiredSlotCount(cardView.card);
        const group = this.wheel.getSlotGroup(hoveredIndex, count);
        this.currentHoveredIndices = group;

        // 필터 유효성 검사 + 구매 가능 여부 검사
        const canAfford = this.battleState.playerGold >= (cardView.card.cost ?? 0);
        const isValid = canAfford && this.isValidTarget(cardView.card, group);
        this.wheel.setHighlight(group, isValid ? 'valid' : 'invalid');

        // 유효 슬롯 위에 올라가면 카드 반투명
        cardView.setAlpha(isValid ? 0.45 : 1);
      } else {
        this.currentHoveredIndices = [];
        this.wheel.clearHighlights();
        cardView.setAlpha(1);
      }
    };

    const onUp = (_p: Phaser.Input.Pointer) => {
      this.scene.input.off('pointermove', onMove);
      this.scene.input.off('pointerup', onUp);

      if (this.state !== 'dragging') return;
      this.endDrag(cardView);
    };

    this.scene.input.on('pointermove', onMove);
    this.scene.input.on('pointerup', onUp);
  }

  private endDrag(cardView: CardView): void {
    this.state = 'idle';
    this.wheel.clearHighlights();

    const indices = this.currentHoveredIndices;
    const card = cardView.card;

    const canAfford = this.battleState.playerGold >= (card.cost ?? 0);
    if (indices.length > 0 && canAfford && this.isValidTarget(card, indices)) {
      // 드롭 성공 → 이벤트 발행
      this.events.emit(GameEvents.CARD_DROPPED_ON_SLOTS, {
        cardDef: card,
        slotIndices: indices,
      });
      cardView.destroy();
    } else {
      // 드롭 취소 → 원위치로 Back.Out 트윈
      cardView.setAlpha(1);
      this.scene.tweens.add({
        targets: cardView,
        x: this.dragOriginX,
        y: this.dragOriginY,
        duration: 300,
        ease: 'Back.Out',
        onComplete: () => {
          cardView.setDepth(0);
        },
      });
    }

    this.currentHoveredIndices = [];
  }

  private isValidTarget(card: CardDef, slotIndices: number[]): boolean {
    if (!card.filter) return true;

    for (const idx of slotIndices) {
      const slot = this.battleState.slots[idx];
      if (!slot) return false;

      if (card.filter.category && slot.category !== card.filter.category) return false;
      if (card.filter.attackType && slot.attackType !== card.filter.attackType) return false;
      if (card.filter.skillId && slot.skillId !== card.filter.skillId) return false;
    }

    return true;
  }

  updateBattleState(state: BattleState): void {
    this.battleState = state;
  }
}
