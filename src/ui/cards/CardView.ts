import Phaser from 'phaser';
import { CardDef } from '../../types/card.types';

const CARD_W = 140;
const CARD_H = 175;
const HEADER_H = 34;

const TYPE_COLORS: Record<string, number> = {
  ModifyRandom: 0x2ecc71,
  ModifySelect: 0x3498db,
  ReplaceSlots: 0xe67e22,
  ModifyGlobal: 0x9b59b6,
  RuleModify: 0x1abc9c,
};

const TYPE_LABELS: Record<string, string> = {
  ModifyRandom: '랜덤 강화',
  ModifySelect: '선택 강화',
  ReplaceSlots: '슬롯 교체',
  ModifyGlobal: '전체 강화',
  RuleModify:   '규칙 변경',
};

export class CardView extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private descText: Phaser.GameObjects.Text;
  private costText: Phaser.GameObjects.Text;
  readonly card: CardDef;

  static readonly WIDTH = CARD_W;
  static readonly HEIGHT = CARD_H;

  constructor(scene: Phaser.Scene, x: number, y: number, card: CardDef) {
    super(scene, x, y);
    this.card = card;

    const color = TYPE_COLORS[card.cardType] ?? 0x555555;

    // 카드 배경
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x1e2235, 1);
    this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
    this.bg.lineStyle(2, color, 1);
    this.bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);

    // 상단 색상 헤더 띠
    const header = scene.add.graphics();
    header.fillStyle(color, 1);
    header.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, HEADER_H, { tl: 10, tr: 10, bl: 0, br: 0 });

    // 카드 타입 레이블 (헤더 내)
    const typeLabel = scene.add.text(0, -CARD_H / 2 + HEADER_H / 2, TYPE_LABELS[card.cardType] ?? card.cardType, {
      fontSize: '11px',
      color: 'rgba(255,255,255,0.75)',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // 구분선 (헤더 아래)
    const divider = scene.add.graphics();
    divider.lineStyle(1, color, 0.3);
    divider.beginPath();
    divider.moveTo(-CARD_W / 2 + 8, -CARD_H / 2 + HEADER_H + 1);
    divider.lineTo(CARD_W / 2 - 8, -CARD_H / 2 + HEADER_H + 1);
    divider.strokePath();

    // 카드 이름 (헤더 바로 아래)
    this.nameText = scene.add.text(0, -CARD_H / 2 + HEADER_H + 22, card.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: CARD_W - 16 },
      align: 'center',
    }).setOrigin(0.5, 0.5);

    // 설명 텍스트 (중앙)
    this.descText = scene.add.text(0, 10, card.description, {
      fontSize: '11px',
      color: '#c8d0e0',
      wordWrap: { width: CARD_W - 18 },
      align: 'center',
      lineSpacing: 3,
    }).setOrigin(0.5, 0.5);

    // 비용 (우측 하단)
    this.costText = scene.add.text(CARD_W / 2 - 10, CARD_H / 2 - 10, `${card.cost}💰`, {
      fontSize: '14px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(1, 1);

    this.add([this.bg, header, typeLabel, divider, this.nameText, this.descText, this.costText]);
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
