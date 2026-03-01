import Phaser from 'phaser';
import { JokerDef } from '../../types/joker.types';
import { THEME } from '../theme';

const PANEL_W = 528;
const PANEL_H = 200;
const SLOT_W   = 84;
const SLOT_H   = 148;
const SLOT_GAP = 17;

// 이모지 없이 카드 수트 심볼 + 약어 조합 (Unicode 기본 심볼, 이모지 아님)
const JOKER_ICONS: Record<string, string> = {
  JOKER_REROLL:          '\u2666\nLCK',  // ♦ 행운
  JOKER_CONSECUTIVE_UP:  '\u2663\nCNS',  // ♣ 연속의 달인
  JOKER_DOUBLE_CRIT:     '\u2660\nBRS',  // ♠ 광전사
  JOKER_PERM_KILL:       '\u2663\nCNQ',  // ♣ 정복자
  JOKER_DMG_ON_HIT:      '\u2665\nGRT',  // ♥ 투지
  JOKER_GOLD_DMG:        '\u2666\nGLD',  // ♦ 황금 손
  JOKER_CURSE_ATK:       '\u2660\nCRS',  // ♠ 저주의 힘
  JOKER_SPIN_BOOST:      '\u2666\nSPN',  // ♦ 스핀 러시
  JOKER_HEAL_BOOST:      '\u2665\nHLB',  // ♥ 생명력
  JOKER_SHIELD_DMG:      '\u2663\nSHD',  // ♣ 철벽
  JOKER_CRIT_CHANCE:     '\u2660\nSHP',  // ♠ 예리함
  JOKER_CRIT_DMG:        '\u2666\nSNP',  // ♦ 저격수
  JOKER_CRIT_GOLD:       '\u2665\nNDG',  // ♥ 노다지
  JOKER_CRIT_BOOST:      '\u2663\nOPT',  // ♣ 기회주의자
};

export class JokerPanel extends Phaser.GameObjects.Container {
  private jokerSlots: Phaser.GameObjects.Container[] = [];
  private tooltip!: Phaser.GameObjects.Container;
  private tooltipBg!: Phaser.GameObjects.Graphics;
  private tooltipText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

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
    titleBar.fillStyle(0x3d1f00, 1);
    titleBar.fillRoundedRect(2, 2, PANEL_W - 4, 32, { tl: 7, tr: 7, bl: 0, br: 0 });
    this.add(titleBar);

    const title = scene.add.text(PANEL_W / 2, 10, '\u2660  JOKER SLOTS  \u2660', {
      fontSize: '13px', color: THEME.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add(title);

    // ── 슬롯 5개 ─────────────────────────────────────────────────
    for (let i = 0; i < 5; i++) {
      const sx = 20 + i * (SLOT_W + SLOT_GAP);
      const slot = this.buildSlot(scene, sx, 40);
      this.jokerSlots.push(slot);
      this.add(slot);
    }

    // ── 툴팁 ─────────────────────────────────────────────────────
    this.tooltipBg   = scene.add.graphics();
    this.tooltipText = scene.add.text(8, 8, '', {
      fontSize: '11px',
      color: THEME.TEXT_CREAM,
      wordWrap: { width: 160 },
      lineSpacing: 3,
    });
    this.tooltip = scene.add.container(0, 0, [this.tooltipBg, this.tooltipText]);
    this.tooltip.setVisible(false).setDepth(1000);

    scene.add.existing(this);
  }

  private buildSlot(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
    const slot = scene.add.container(x, y);

    const slotBg = scene.add.graphics();
    // 빈 슬롯: 벽 위에 다크 오버레이만
    slotBg.fillStyle(THEME.PANEL_OVERLAY, 0.65);
    slotBg.fillRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
    slotBg.lineStyle(1, THEME.GOLD_DARK, 0.4);
    slotBg.strokeRoundedRect(0, 0, SLOT_W, SLOT_H, 6);

    const iconText = scene.add.text(SLOT_W / 2, SLOT_H / 2 - 14, '', {
      fontSize: '18px',
      color: THEME.TEXT_GOLD,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 0.5).setVisible(false);

    const nameText = scene.add.text(SLOT_W / 2, SLOT_H / 2 + 34, '', {
      fontSize: '9px', color: THEME.TEXT_CREAM, align: 'center',
      wordWrap: { width: SLOT_W - 6 },
    }).setOrigin(0.5, 0.5).setVisible(false);

    const emptyText = scene.add.text(SLOT_W / 2, SLOT_H / 2, 'EMPTY', {
      fontSize: '9px', color: THEME.TEXT_DIM, align: 'center',
    }).setOrigin(0.5, 0.5);

    slot.add([slotBg, iconText, nameText, emptyText]);
    return slot;
  }

  private showTooltip(slot: Phaser.GameObjects.Container, name: string, desc: string): void {
    const pad = 8;
    this.tooltipText.setText(`${name}\n${desc}`);

    const tw = this.tooltipText.width + pad * 2;
    const th = this.tooltipText.height + pad * 2;

    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(THEME.BRICK_MORTAR, 0.97);
    this.tooltipBg.fillRoundedRect(0, 0, tw, th, 6);
    this.tooltipBg.lineStyle(1, THEME.GOLD_DARK, 1);
    this.tooltipBg.strokeRoundedRect(0, 0, tw, th, 6);
    this.tooltipBg.lineStyle(1, THEME.GOLD, 0.5);
    this.tooltipBg.strokeRoundedRect(2, 2, tw - 4, th - 4, 5);

    const worldX = this.x + slot.x;
    const worldY = this.y + slot.y;

    // 카드 왼쪽 우선, 화면 밖이면 오른쪽
    let tipX = worldX - tw - 8;
    if (tipX < 4) tipX = worldX + SLOT_W + 8;
    const tipY = Math.max(4, worldY + (SLOT_H - th) / 2);

    this.tooltip.setPosition(tipX, tipY);
    this.tooltip.setVisible(true);
  }

  private hideTooltip(): void {
    this.tooltip.setVisible(false);
  }

  updateJokers(jokers: JokerDef[]): void {
    for (let i = 0; i < this.jokerSlots.length; i++) {
      const slot      = this.jokerSlots[i];
      const slotBg    = slot.getAt(0) as Phaser.GameObjects.Graphics;
      const iconText  = slot.getAt(1) as Phaser.GameObjects.Text;
      const nameText  = slot.getAt(2) as Phaser.GameObjects.Text;
      const emptyText = slot.getAt(3) as Phaser.GameObjects.Text;

      if (jokers[i]) {
        // 활성 슬롯: 퍼플-다크 골드 테마
        slotBg.clear();
        slotBg.fillStyle(0x1e0a2e, 1);
        slotBg.fillRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
        slotBg.lineStyle(2, THEME.GOLD, 0.9);
        slotBg.strokeRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
        slotBg.lineStyle(1, 0x9b59b6, 0.5);
        slotBg.strokeRoundedRect(3, 3, SLOT_W - 6, SLOT_H - 6, 4);

        iconText.setText(JOKER_ICONS[jokers[i].id] ?? '\u2660\nJKR').setVisible(true);
        nameText.setText(jokers[i].name).setVisible(true);
        emptyText.setVisible(false);

        const joker = jokers[i];
        slot.setInteractive(new Phaser.Geom.Rectangle(0, 0, SLOT_W, SLOT_H), Phaser.Geom.Rectangle.Contains);
        slot.removeAllListeners('pointerover');
        slot.removeAllListeners('pointerout');
        slot.on('pointerover', () => this.showTooltip(slot, joker.name, joker.description));
        slot.on('pointerout',  () => this.hideTooltip());
      } else {
        slotBg.clear();
        slotBg.fillStyle(THEME.PANEL_OVERLAY, 0.65);
        slotBg.fillRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
        slotBg.lineStyle(1, THEME.GOLD_DARK, 0.4);
        slotBg.strokeRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
        iconText.setVisible(false);
        nameText.setVisible(false);
        emptyText.setVisible(true);
      }
    }
  }
}
