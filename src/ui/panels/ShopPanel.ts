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
import { getTagDef, TagDef } from '../../data/tags';

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

  // 태그 툴팁
  private tooltip!: Phaser.GameObjects.Container;
  private tooltipBg!: Phaser.GameObjects.Graphics;
  private tooltipText!: Phaser.GameObjects.Text;

  private onSwapRequest?: (card: CardDef, resolve: (indices: number[]) => void) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    wheel: RouletteWheel,
    events: TypedEventEmitter,
    state: BattleState,
    onSwapRequest?: (card: CardDef, resolve: (indices: number[]) => void) => void,
  ) {
    super(scene, x, y);
    this.wheel         = wheel;
    this.shopEvents    = events;
    this.battleState   = state;
    this.onSwapRequest = onSwapRequest;
    this.cardSystem  = new CardSystem();
    this.shopSystem  = new ShopSystem();
    this.dragController = new DragCardController(scene, wheel, events, state);

    // 반투명 다크 오버레이
    const overlay = scene.add.graphics();
    overlay.fillStyle(THEME.PANEL_OVERLAY, 0.52);
    overlay.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 8);
    this.add(overlay);

    // 골드 이중 테두리
    const border = scene.add.graphics();
    border.lineStyle(2, THEME.GOLD_DARK, 1);
    border.strokeRoundedRect(0, 0, PANEL_W, PANEL_H, 8);
    border.lineStyle(1, THEME.GOLD, 0.5);
    border.strokeRoundedRect(4, 4, PANEL_W - 8, PANEL_H - 8, 6);
    this.add(border);

    // 타이틀 바
    const titleBar = scene.add.graphics();
    titleBar.fillStyle(THEME.GOLD_DARK, 1);
    titleBar.fillRoundedRect(2, 2, PANEL_W - 4, 36, { tl: 7, tr: 7, bl: 0, br: 0 });
    this.add(titleBar);

    // 헤더
    const title = scene.add.text(16, 10, '\u2666  SHOP  \u2666', {
      fontSize: '14px', color: '#1a0a08', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.add(title);

    this.goldText = scene.add.text(PANEL_W - 16, 10, 'GOLD  0', {
      fontSize: '13px', color: '#1a0a08', fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.add(this.goldText);

    // 헤더 구분선
    const hdrSep = scene.add.graphics();
    hdrSep.lineStyle(1, THEME.GOLD_DARK, 0.5);
    hdrSep.beginPath();
    hdrSep.moveTo(12, 44);
    hdrSep.lineTo(PANEL_W - 12, 44);
    hdrSep.strokePath();
    this.add(hdrSep);

    // 리롤 버튼
    this.rerollBtn = this.createRerollButton(scene);
    this.add(this.rerollBtn);

    // 드래그 힌트
    this.hintText = scene.add.text(PANEL_W / 2, PANEL_H - 18, 'DRAG CARD  >>  DROP ON ROULETTE SLOT', {
      fontSize: '10px', color: THEME.TEXT_DIM,
    }).setOrigin(0.5, 1);
    this.add(this.hintText);

    // 태그 툴팁 (씬 레벨, depth 높게)
    this.tooltipBg   = scene.add.graphics();
    this.tooltipText = scene.add.text(10, 8, '', {
      fontSize: '11px',
      color: THEME.TEXT_CREAM,
      wordWrap: { width: 190 },
      lineSpacing: 4,
    });
    this.tooltip = scene.add.container(0, 0, [this.tooltipBg, this.tooltipText]);
    this.tooltip.setVisible(false).setDepth(1000);

    // 이벤트 리스너
    this.shopEvents.on(GameEvents.SHOP_REROLLED, (data: unknown) => {
      const { newCards } = data as { newCards: CardDef[] };
      this.rebuildCards(newCards);
    });

    this.shopEvents.on(GameEvents.CARD_DROPPED_ON_SLOTS, (data: unknown) => {
      const { cardDef, slotIndices } = data as { cardDef: CardDef; slotIndices: number[] };
      const purchased = this.shopSystem.purchaseCard(this.battleState, cardDef, this.shopEvents);
      if (!purchased) return;
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

      if (this.cardSystem.requiresDrag(card)) {
        // 슬롯에 드래그&드롭으로 적용하는 카드
        this.dragController.attachToCard(cardView);
      } else if (card.cardType === 'SwapSlots') {
        // 구매 후 룰렛 칸 2개 클릭 선택
        cardView.setInteractive({ useHandCursor: true });
        cardView.on('pointerdown', () => {
          if (!this.shopSystem.canAfford(this.battleState, card)) return;
          const purchased = this.shopSystem.purchaseCard(this.battleState, card, this.shopEvents);
          if (!purchased) return;
          this.onSwapRequest?.(card, (indices) => {
            this.cardSystem.applyCard(this.battleState, card, indices);
            this.wheel.refreshSlots(this.battleState.slots);
            this.update(this.battleState);
          });
        });
        cardView.on('pointerover', () => cardView.setHighlight(true));
        cardView.on('pointerout',  () => cardView.setHighlight(false));
      } else {
        // 즉시 적용 카드 (클릭으로 구매)
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

      // 태그 카드: hover 툴팁
      const isTagCard = card.cardType === 'AddTagRandom' || card.cardType === 'AddTagSelect';
      if (isTagCard && card.tagType) {
        const tagDef = getTagDef(card.tagType);
        cardView.on('pointerover', () => this.showTagTooltip(cardView, tagDef));
        cardView.on('pointerout',  () => this.hideTagTooltip());
      }
    }
  }

  private showTagTooltip(cardView: CardView, tagDef: TagDef): void {
    const pad = 10;
    const lifespanStr = tagDef.baseLifespan === null
      ? '무제한'
      : `스핀당 ${tagDef.baseLifespan}회`;

    this.tooltipText.setText(
      `[ ${tagDef.name} ]\n${tagDef.description}\n최대 Lv.${tagDef.maxLevel}  |  수명: ${lifespanStr}`,
    );

    const tw = this.tooltipText.width + pad * 2;
    const th = this.tooltipText.height + pad * 2;

    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(THEME.BRICK_MORTAR, 0.97);
    this.tooltipBg.fillRoundedRect(0, 0, tw, th, 6);
    this.tooltipBg.lineStyle(2, tagDef.color, 0.9);
    this.tooltipBg.strokeRoundedRect(0, 0, tw, th, 6);
    this.tooltipBg.lineStyle(1, THEME.GOLD, 0.35);
    this.tooltipBg.strokeRoundedRect(3, 3, tw - 6, th - 6, 5);

    // 카드 월드 좌표 (ShopPanel 로컬 + ShopPanel 위치)
    const worldX = this.x + cardView.x;
    const worldY = this.y + cardView.y;

    // 카드 왼쪽 우선, 화면 밖이면 오른쪽
    let tipX = worldX - CardView.WIDTH / 2 - tw - 8;
    if (tipX < 4) tipX = worldX + CardView.WIDTH / 2 + 8;
    const tipY = Math.max(4, worldY - th / 2);

    this.tooltip.setPosition(tipX, tipY);
    this.tooltip.setVisible(true);
  }

  private hideTagTooltip(): void {
    this.tooltip.setVisible(false);
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

  getGoldWorldPos(): { x: number; y: number } {
    return { x: this.x + PANEL_W - 60, y: this.y + 18 };
  }

  getRerollBtnWorldPos(): { x: number; y: number } {
    return { x: this.x + PANEL_W / 2, y: this.y + 380 };
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
      const fillColor = hovered ? THEME.GOLD : THEME.GOLD_DARK;
      this.rerollBtnBg.fillStyle(fillColor, 1);
      this.rerollBtnBg.fillRoundedRect(-110, -30, 220, 60, 8);
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
