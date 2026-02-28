import Phaser from 'phaser';
import { BattleState } from '../../types/battle.types';
import { CardDef } from '../../types/card.types';
import { CardView } from '../cards/CardView';
import { DragCardController } from '../cards/DragCardController';
import { RouletteWheel } from '../roulette/RouletteWheel';
import { TypedEventEmitter, GameEvents } from '../../events/GameEvents';
import { CardSystem } from '../../systems/CardSystem';
import { ShopSystem } from '../../systems/ShopSystem';
import { THEME } from '../theme';

// 상단-좌측 원점 (0, 0) 기준
const PANEL_W = 528;
const PANEL_H = 500;

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

    // ── 반투명 다크 오버레이 (벽돌 벽 위에 덮임) ────────────────
    const overlay = scene.add.graphics();
    overlay.fillStyle(THEME.PANEL_OVERLAY, 0.52);
    overlay.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 8);
    this.add(overlay);

    // ── 골드 이중 테두리 ─────────────────────────────────────────
    const border = scene.add.graphics();
    border.lineStyle(2, THEME.GOLD_DARK, 1);
    border.strokeRoundedRect(0, 0, PANEL_W, PANEL_H, 8);
    border.lineStyle(1, THEME.GOLD, 0.5);
    border.strokeRoundedRect(4, 4, PANEL_W - 8, PANEL_H - 8, 6);
    this.add(border);

    // ── 타이틀 바 ────────────────────────────────────────────────
    const titleBar = scene.add.graphics();
    titleBar.fillStyle(THEME.GOLD_DARK, 1);
    titleBar.fillRoundedRect(2, 2, PANEL_W - 4, 36, { tl: 7, tr: 7, bl: 0, br: 0 });
    this.add(titleBar);

    // ── 헤더 행 ──────────────────────────────────────────────────
    const title = scene.add.text(16, 10, '\u2666  SHOP  \u2666', {
      fontSize: '14px', color: '#1a0a08', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.add(title);

    this.goldText = scene.add.text(PANEL_W - 16, 10, 'GOLD  0', {
      fontSize: '13px', color: '#1a0a08', fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.add(this.goldText);

    // ── 헤더 구분선 (골드) ───────────────────────────────────────
    const hdrSep = scene.add.graphics();
    hdrSep.lineStyle(1, THEME.GOLD_DARK, 0.5);
    hdrSep.beginPath();
    hdrSep.moveTo(12, 44);
    hdrSep.lineTo(PANEL_W - 12, 44);
    hdrSep.strokePath();
    this.add(hdrSep);

    // ── 리롤 버튼 ────────────────────────────────────────────────
    this.rerollBtn = this.createRerollButton(scene);
    this.add(this.rerollBtn);

    // ── 드래그 힌트 ──────────────────────────────────────────────
    this.hintText = scene.add.text(PANEL_W / 2, PANEL_H - 18, 'DRAG CARD  >>  DROP ON ROULETTE SLOT', {
      fontSize: '10px', color: THEME.TEXT_DIM,
    }).setOrigin(0.5, 1);
    this.add(this.hintText);

    // ── 이벤트 리스너 ────────────────────────────────────────────
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
      this.goldText.setText(`GOLD  ${this.battleState.playerGold}`);
    });
  }

  update(state: BattleState): void {
    this.battleState = state;
    this.dragController.updateBattleState(state);
    this.rebuildCards(state.shopCards);
    this.updateRerollButton();
    this.goldText.setText(`GOLD  ${state.playerGold}`);
  }

  private rebuildCards(cards: CardDef[]): void {
    for (const cv of this.cardViews) cv.destroy();
    this.cardViews = [];

    const spacing = CardView.WIDTH + 20;
    const cx = PANEL_W / 2;
    const startX = cx - (cards.length - 1) * spacing / 2;
    const cy = 210;

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
    const btn = scene.add.container(PANEL_W / 2, 380);

    this.rerollBtnBg   = scene.add.graphics();
    this.rerollBtnText = scene.add.text(0, 0, '', {
      fontSize: '13px', color: '#1a0a08', fontStyle: 'bold', align: 'center',
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
      ? `>> REROLL  (FREE x${this.battleState.freeRerolls})`
      : `>> REROLL  (${this.battleState.rerollCost} G)`;
    this.rerollBtnText.setText(cost);
    this.rerollBtn.setAlpha(this.shopSystem.canReroll(this.battleState) ? 1 : 0.5);
    this.drawRerollBtn(false);
  }

  private drawRerollBtn(hovered: boolean): void {
    this.rerollBtnBg.clear();
    const canReroll = this.shopSystem.canReroll(this.battleState);

    if (canReroll) {
      // 골드 버튼 스타일
      const fillColor = hovered ? THEME.GOLD : THEME.GOLD_DARK;
      this.rerollBtnBg.fillStyle(fillColor, 1);
      this.rerollBtnBg.fillRoundedRect(-110, -30, 220, 60, 8);
      // 골드 이중 테두리
      this.rerollBtnBg.lineStyle(2, THEME.GOLD, hovered ? 1 : 0.7);
      this.rerollBtnBg.strokeRoundedRect(-110, -30, 220, 60, 8);
      this.rerollBtnBg.lineStyle(1, 0xffffff, 0.2);
      this.rerollBtnBg.strokeRoundedRect(-107, -27, 214, 54, 6);
      this.rerollBtnText.setColor('#1a0a08');
    } else {
      this.rerollBtnBg.fillStyle(0x2a1a0a, 1);
      this.rerollBtnBg.fillRoundedRect(-110, -30, 220, 60, 8);
      this.rerollBtnBg.lineStyle(1, THEME.GOLD_DARK, 0.3);
      this.rerollBtnBg.strokeRoundedRect(-110, -30, 220, 60, 8);
      this.rerollBtnText.setColor(THEME.TEXT_DIM);
    }
  }
}
