import Phaser from 'phaser';
import { JokerDef } from '../../types/joker.types';

const PANEL_W = 528;
const PANEL_H = 200;
const SLOT_W   = 84;
const SLOT_H   = 148;
const SLOT_GAP = 17; // (528-40-84*5)/4

const JOKER_ICONS: Record<string, string> = {
  JOKER_CURSE:         '💀',
  JOKER_DOPAMINE:      '⚡',
  JOKER_GOLD:          '💰',
  JOKER_ATTACK:        '⚔️',
  JOKER_GROWTH:        '📈',
  JOKER_FOOL:          '🃏',
  JOKER_REVERSE_CURSE: '🔄',
  JOKER_RIGHT:         '➡️',
};

export class JokerPanel extends Phaser.GameObjects.Container {
  private jokerSlots: Phaser.GameObjects.Container[] = [];
  private tooltip!: Phaser.GameObjects.Container;
  private tooltipBg!: Phaser.GameObjects.Graphics;
  private tooltipText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 8);
    bg.lineStyle(2, 0x7d3c98, 1);
    bg.strokeRoundedRect(0, 0, PANEL_W, PANEL_H, 8);
    this.add(bg);

    const title = scene.add.text(PANEL_W / 2, 12, '🃏 조커 슬롯', {
      fontSize: '15px', color: '#9b59b6', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add(title);

    for (let i = 0; i < 5; i++) {
      const sx = 20 + i * (SLOT_W + SLOT_GAP);
      const slot = this.buildSlot(scene, sx, 40);
      this.jokerSlots.push(slot);
      this.add(slot);
    }

    // 툴팁 (씬 최상단에 직접 추가해야 ShopPanel에 가려지지 않음)
    this.tooltipBg   = scene.add.graphics();
    this.tooltipText = scene.add.text(8, 8, '', {
      fontSize: '11px',
      color: '#ecf0f1',
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
    slotBg.fillStyle(0x2c3e50, 1);
    slotBg.fillRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
    slotBg.lineStyle(1, 0x34495e, 1);
    slotBg.strokeRoundedRect(0, 0, SLOT_W, SLOT_H, 6);

    const iconText = scene.add.text(SLOT_W / 2, SLOT_H / 2 - 18, '', {
      fontSize: '28px',
    }).setOrigin(0.5, 0.5).setVisible(false);

    const nameText = scene.add.text(SLOT_W / 2, SLOT_H / 2 + 30, '', {
      fontSize: '9px', color: '#ecf0f1', align: 'center',
      wordWrap: { width: SLOT_W - 6 },
    }).setOrigin(0.5, 0.5).setVisible(false);

    const emptyText = scene.add.text(SLOT_W / 2, SLOT_H / 2, '빈\n슬롯', {
      fontSize: '11px', color: '#4d6a7a', align: 'center',
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
    this.tooltipBg.fillStyle(0x0d0d1a, 0.97);
    this.tooltipBg.fillRoundedRect(0, 0, tw, th, 6);
    this.tooltipBg.lineStyle(1, 0x9b59b6, 1);
    this.tooltipBg.strokeRoundedRect(0, 0, tw, th, 6);

    // 씬 월드 좌표로 변환 (컨테이너가 씬 루트에 있으므로 this.x/y 더함)
    const worldX = this.x + slot.x;
    const worldY = this.y + slot.y;
    const tipY = worldY - th - 6;
    this.tooltip.setPosition(worldX, tipY > 0 ? tipY : worldY + SLOT_H + 6);
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
        slotBg.clear();
        slotBg.fillStyle(0x6c3483, 1);
        slotBg.fillRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
        slotBg.lineStyle(2, 0x9b59b6, 1);
        slotBg.strokeRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
        iconText.setText(JOKER_ICONS[jokers[i].id] ?? '🃏').setVisible(true);
        nameText.setText(jokers[i].name).setVisible(true);
        emptyText.setVisible(false);

        // 툴팁 이벤트 등록
        const joker = jokers[i];
        slot.setInteractive(new Phaser.Geom.Rectangle(0, 0, SLOT_W, SLOT_H), Phaser.Geom.Rectangle.Contains);
        slot.removeAllListeners('pointerover');
        slot.removeAllListeners('pointerout');
        slot.on('pointerover', () => this.showTooltip(slot, joker.name, joker.description));
        slot.on('pointerout',  () => this.hideTooltip());
      } else {
        slotBg.clear();
        slotBg.fillStyle(0x2c3e50, 1);
        slotBg.fillRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
        slotBg.lineStyle(1, 0x34495e, 1);
        slotBg.strokeRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
        iconText.setVisible(false);
        nameText.setVisible(false);
        emptyText.setVisible(true);
      }
    }
  }
}
