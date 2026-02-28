import Phaser from 'phaser';
import { BattleState } from '../../types/battle.types';
import { CardDef } from '../../types/card.types';
import { CardView } from '../cards/CardView';
import { DragCardController } from '../cards/DragCardController';
import { RouletteWheel } from '../roulette/RouletteWheel';
import { TypedEventEmitter, GameEvents } from '../../events/GameEvents';
import { CardSystem } from '../../systems/CardSystem';
import { ShopSystem } from '../../systems/ShopSystem';

// 상단-좌측 원점 (0, 0) 기준
const PANEL_W = 528;
const PANEL_H = 500; // 카드 cy=210, H=175 → 하단 297, 리롤 버튼 380, 힌트 482

export class ShopPanel extends Phaser.GameObjects.Container {
  private cardViews: CardView[] = [];
  private rerollBtn: Phaser.GameObjects.Container;
  private rerollBtnBg!: Phaser.GameObjects.Graphics;
  private rerollBtnText!: Phaser.GameObjects.Text;
  private goldText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private dragController: DragCardController;
  private cardSystem: CardSystem;
  private shopSystem: ShopSystem;
  private shopEvents: TypedEventEmitter;
  private wheel: RouletteWheel;
  private battleState: BattleState;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    wheel: RouletteWheel,
    events: TypedEventEmitter,
    state: BattleState,
  ) {
    super(scene, x, y);
    this.wheel      = wheel;
    this.shopEvents = events;
    this.battleState = state;
    this.cardSystem  = new CardSystem();
    this.shopSystem  = new ShopSystem();
    this.dragController = new DragCardController(scene, wheel, events, state);

    // ── 배경 ──────────────────────────────────────
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 8);
    bg.lineStyle(2, 0xf39c12, 1);
    bg.strokeRoundedRect(0, 0, PANEL_W, PANEL_H, 8);
    this.add(bg);

    // ── 헤더 행 ────────────────────────────────────
    const title = scene.add.text(16, 14, '🛒 상점', {
      fontSize: '16px', color: '#f39c12', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.add(title);

    this.goldText = scene.add.text(PANEL_W - 16, 14, '💰 0', {
      fontSize: '15px', color: '#f1c40f',
    }).setOrigin(1, 0);
    this.add(this.goldText);

    // 헤더 구분선
    const hdrSep = scene.add.graphics();
    hdrSep.lineStyle(1, 0xf39c12, 0.35);
    hdrSep.beginPath();
    hdrSep.moveTo(12, 44);
    hdrSep.lineTo(PANEL_W - 12, 44);
    hdrSep.strokePath();
    this.add(hdrSep);

    // ── 리롤 버튼 ──────────────────────────────────
    this.rerollBtn = this.createRerollButton(scene);
    this.add(this.rerollBtn);

    // ── 드래그 힌트 ────────────────────────────────
    this.hintText = scene.add.text(PANEL_W / 2, PANEL_H - 18, '💡 드래그 카드 → 룰렛 슬롯에 놓기', {
      fontSize: '11px', color: '#4d6a7a',
    }).setOrigin(0.5, 1);
    this.add(this.hintText);

    // ── 이벤트 리스너 ──────────────────────────────
    this.shopEvents.on(GameEvents.SHOP_REROLLED, (data: unknown) => {
      const { newCards } = data as { newCards: CardDef[] };
      this.rebuildCards(newCards);
    });

    this.shopEvents.on(GameEvents.CARD_DROPPED_ON_SLOTS, (data: unknown) => {
      const { cardDef, slotIndices } = data as { cardDef: CardDef; slotIndices: number[] };
      this.shopSystem.purchaseCard(this.battleState, cardDef, this.shopEvents);
      this.cardSystem.applyCard(this.battleState, cardDef, slotIndices);
      this.wheel.refreshSlots(this.battleState.slots);
      this.update(this.battleState);
    });

    this.shopEvents.on(GameEvents.GOLD_CHANGED, () => {
      this.updateRerollButton();
      this.goldText.setText(`💰 ${this.battleState.playerGold}`);
    });
  }

  update(state: BattleState): void {
    this.battleState = state;
    this.dragController.updateBattleState(state);
    this.rebuildCards(state.shopCards);
    this.updateRerollButton();
    this.goldText.setText(`💰 ${state.playerGold}`);
  }

  private rebuildCards(cards: CardDef[]): void {
    for (const cv of this.cardViews) cv.destroy();
    this.cardViews = [];

    const spacing = CardView.WIDTH + 20;
    const cx = PANEL_W / 2;
    const startX = cx - (cards.length - 1) * spacing / 2;
    const cy = 210; // 카드 중심 Y (헤더 44px 아래, 큰 카드(175px) 기준)

    for (let i = 0; i < cards.length; i++) {
      const card     = cards[i];
      const cardView = new CardView(this.scene, startX + i * spacing, cy, card);
      cardView.setAffordable(this.shopSystem.canAfford(this.battleState, card));
      this.cardViews.push(cardView);
      this.add(cardView);

      const requiresDrag = this.cardSystem.requiresDrag(card);
      if (requiresDrag) {
        this.dragController.attachToCard(cardView);
      } else {
        cardView.setInteractive({ useHandCursor: true });
        cardView.on('pointerdown', () => {
          if (!this.shopSystem.canAfford(this.battleState, card)) return;
          const purchased = this.shopSystem.purchaseCard(this.battleState, card, this.shopEvents);
          if (purchased) {
            this.cardSystem.applyCard(this.battleState, card, []);
            this.wheel.refreshSlots(this.battleState.slots);
            this.update(this.battleState);
          }
        });
        cardView.on('pointerover', () => cardView.setHighlight(true));
        cardView.on('pointerout',  () => cardView.setHighlight(false));
      }
    }
  }

  private createRerollButton(scene: Phaser.Scene): Phaser.GameObjects.Container {
    // 카드 아래 중앙에 크게 배치
    const btn = scene.add.container(PANEL_W / 2, 380);

    this.rerollBtnBg   = scene.add.graphics();
    this.rerollBtnText = scene.add.text(0, 0, '', {
      fontSize: '14px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5, 0.5);

    btn.add([this.rerollBtnBg, this.rerollBtnText]);
    btn.setSize(220, 60);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.shopSystem.reroll(this.battleState, this.shopEvents));
    btn.on('pointerover', () => this.drawRerollBtn(true));
    btn.on('pointerout',  () => this.drawRerollBtn(false));

    return btn;
  }

  private updateRerollButton(): void {
    const cost = this.battleState.freeRerolls > 0
      ? `🔄 리롤  (무료 × ${this.battleState.freeRerolls})`
      : `🔄 리롤  (${this.battleState.rerollCost} 💰)`;
    this.rerollBtnText.setText(cost);
    this.rerollBtn.setAlpha(this.shopSystem.canReroll(this.battleState) ? 1 : 0.5);
    this.drawRerollBtn(false);
  }

  private drawRerollBtn(hovered: boolean): void {
    this.rerollBtnBg.clear();
    const canReroll = this.shopSystem.canReroll(this.battleState);
    const color     = canReroll ? (hovered ? 0x27ae60 : 0x1e8449) : 0x5d6d7e;
    this.rerollBtnBg.fillStyle(color, 1);
    this.rerollBtnBg.fillRoundedRect(-110, -30, 220, 60, 10);
  }
}
