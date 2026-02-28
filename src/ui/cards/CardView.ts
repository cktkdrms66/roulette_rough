import Phaser from 'phaser';
import { CardDef } from '../../types/card.types';
import { THEME, CARD_SUITS } from '../theme';

const CARD_W = 140;
const CARD_H = 175;

export class CardView extends Phaser.GameObjects.Container {
  private nameText: Phaser.GameObjects.Text;
  private descText: Phaser.GameObjects.Text;
  private costText: Phaser.GameObjects.Text;
  readonly card: CardDef;

  static readonly WIDTH = CARD_W;
  static readonly HEIGHT = CARD_H;

  constructor(scene: Phaser.Scene, x: number, y: number, card: CardDef) {
    super(scene, x, y);
    this.card = card;

    const suit = CARD_SUITS[card.cardType] ?? { symbol: '?', color: 0x888888, colorStr: '#888888' };
    const cx = -CARD_W / 2;
    const cy = -CARD_H / 2;

    // ── 그림자 ──────────────────────────────────────────────────
    const shadow = scene.add.graphics();
    shadow.fillStyle(THEME.CARD_SHADOW, 0.35);
    shadow.fillRoundedRect(cx + 4, cy + 4, CARD_W, CARD_H, 10);
    this.add(shadow);

    // ── 아이보리 배경 ────────────────────────────────────────────
    const bg = scene.add.graphics();
    bg.fillStyle(THEME.CARD_BG, 1);
    bg.fillRoundedRect(cx, cy, CARD_W, CARD_H, 10);
    // 수트 색 테두리
    bg.lineStyle(1.5, suit.color, 0.6);
    bg.strokeRoundedRect(cx, cy, CARD_W, CARD_H, 10);
    this.add(bg);

    // ── 좌상단: 수트 심볼 + 비용 ────────────────────────────────
    const topLeft = scene.add.text(cx + 8, cy + 7, `${suit.symbol} ${card.cost}`, {
      fontSize: '12px',
      color: suit.colorStr,
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.add(topLeft);

    // ── 중앙 상단: 큰 수트 심볼 ─────────────────────────────────
    const bigSuit = scene.add.text(0, cy + 34, suit.symbol, {
      fontSize: '36px',
      color: suit.colorStr,
    }).setOrigin(0.5, 0);
    this.add(bigSuit);

    // ── 카드 이름 ────────────────────────────────────────────────
    this.nameText = scene.add.text(0, cy + 76, card.name, {
      fontSize: '13px',
      color: '#1a0a08',
      fontStyle: 'bold',
      wordWrap: { width: CARD_W - 16 },
      align: 'center',
    }).setOrigin(0.5, 0);
    this.add(this.nameText);

    // ── 골드 구분선 ──────────────────────────────────────────────
    const divider = scene.add.graphics();
    divider.lineStyle(1, THEME.GOLD_DARK, 0.7);
    divider.beginPath();
    divider.moveTo(cx + 12, cy + 98);
    divider.lineTo(cx + CARD_W - 12, cy + 98);
    divider.strokePath();
    this.add(divider);

    // ── 설명 텍스트 ──────────────────────────────────────────────
    this.descText = scene.add.text(0, cy + 104, card.description, {
      fontSize: '10px',
      color: '#3a2010',
      wordWrap: { width: CARD_W - 20 },
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5, 0);
    this.add(this.descText);

    // ── 우하단: 가격 ─────────────────────────────────────────────
    this.costText = scene.add.text(cx + CARD_W - 8, cy + CARD_H - 8, `${card.cost} G`, {
      fontSize: '12px',
      color: suit.colorStr,
      fontStyle: 'bold',
    }).setOrigin(1, 1);
    this.add(this.costText);

    this.setSize(CARD_W, CARD_H);
    scene.add.existing(this);
  }

  setHighlight(on: boolean): void {
    if (on) {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Quad.Out',
      });
    } else {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Quad.Out',
      });
    }
  }

  setAffordable(canAfford: boolean): void {
    this.alpha = canAfford ? 1 : 0.5;
  }
}
