import Phaser from 'phaser';
import { Slot } from '../../types/slot.types';
import { SkillDef } from '../../types/skill.types';
import { getSkill } from '../../data/skills';

function getValueLabel(slot: Slot, skill: SkillDef): string {
  const flat = slot.flatDamageBonus;
  const base = skill.basePower;

  switch (skill.id) {
    case 'BASIC_ATTACK':
    case 'POWER_STRIKE':
    case 'FIRE_BOLT':
    case 'THUNDER_CLAP':
    case 'COLD_PUNCH':
      return flat > 0 ? `⚔${base}+${flat}` : `⚔${base}`;

    case 'RAPID_STRIKE': {
      const hits = skill.hitCount ?? 3;
      return flat > 0 ? `⚔${base}+${flat}×${hits}` : `⚔${base}×${hits}`;
    }

    case 'DEFENSE':
      return flat > 0 ? `🛡${base}+${flat}` : `🛡${base}`;

    case 'HEAL':
      return flat > 0 ? `💚${base}+${flat}` : `💚${base}`;

    case 'DEEP_BREATH':
      return `×${skill.specialParam ?? 2}`;

    case 'CURSE':
    case 'HEAVY_CURSE':
      return `💀${base}`;

    default:
      return base > 0 ? `${base}` : '';
  }
}

// 카테고리별 색상
const CATEGORY_COLORS: Record<string, number> = {
  Attack: 0xc0392b,
  Transform: 0x2980b9,
  Curse: 0x8e44ad,
};

const HIGHLIGHT_VALID = 0x27ae60;
const HIGHLIGHT_INVALID = 0xe74c3c;

export class RouletteSlot extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private slot: Slot;
  private slotAngle: number; // 슬롯 중심 각도 (도)
  private radius: number;
  private outerRadius: number;

  constructor(
    scene: Phaser.Scene,
    slot: Slot,
    innerRadius: number,
    outerRadius: number,
  ) {
    super(scene, 0, 0);
    this.slot = slot;
    this.radius = innerRadius;
    this.outerRadius = outerRadius;
    this.slotAngle = slot.index * 30; // 각 슬롯은 30도

    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, '', {
      fontSize: '11px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 50 },
    }).setOrigin(0.5, 0.5);

    this.add([this.bg, this.label]);
    this.refresh();
  }

  refresh(): void {
    const skill = getSkill(this.slot.skillId);
    const color = CATEGORY_COLORS[this.slot.category] ?? 0x555555;

    this.bg.clear();

    // 파이 슬라이스 그리기
    const startAngle = Phaser.Math.DegToRad(this.slotAngle - 15);
    const endAngle = Phaser.Math.DegToRad(this.slotAngle + 15);

    this.bg.fillStyle(color, 1);
    this.bg.beginPath();
    this.bg.moveTo(
      Math.cos(startAngle) * this.radius,
      Math.sin(startAngle) * this.radius,
    );
    this.bg.arc(0, 0, this.outerRadius, startAngle, endAngle, false);
    this.bg.arc(0, 0, this.radius, endAngle, startAngle, true);
    this.bg.closePath();
    this.bg.fillPath();

    // 테두리
    this.bg.lineStyle(1, 0x000000, 0.5);
    this.bg.strokePath();

    // 라벨 위치: 내부/외부 반경 중간
    const midRadius = (this.radius + this.outerRadius) / 2;
    const midAngle = Phaser.Math.DegToRad(this.slotAngle);
    this.label.setPosition(
      Math.cos(midAngle) * midRadius,
      Math.sin(midAngle) * midRadius,
    );

    // 스킬명 + 수치 표시
    const namePrefix = this.slot.tempCurseTimer > 0 ? '⚠️' : '';
    const valueLine = getValueLabel(this.slot, skill);
    const labelText = `${namePrefix}${skill.name}\n${valueLine}`;

    this.label.setText(labelText);
    this.label.setAngle(-this.slotAngle); // 텍스트는 항상 읽기 방향으로
  }

  highlight(type: 'valid' | 'invalid' | 'none'): void {
    const color = type === 'valid' ? HIGHLIGHT_VALID :
                  type === 'invalid' ? HIGHLIGHT_INVALID : null;

    this.bg.clear();

    const startAngle = Phaser.Math.DegToRad(this.slotAngle - 15);
    const endAngle = Phaser.Math.DegToRad(this.slotAngle + 15);
    const baseColor = CATEGORY_COLORS[this.slot.category] ?? 0x555555;

    this.bg.fillStyle(color ?? baseColor, 1);
    this.bg.beginPath();
    this.bg.moveTo(
      Math.cos(startAngle) * this.radius,
      Math.sin(startAngle) * this.radius,
    );
    this.bg.arc(0, 0, this.outerRadius, startAngle, endAngle, false);
    this.bg.arc(0, 0, this.radius, endAngle, startAngle, true);
    this.bg.closePath();
    this.bg.fillPath();

    if (color) {
      this.bg.lineStyle(3, color, 1);
      this.bg.strokePath();
    }
  }

  pulseLight(): void {
    this.scene.tweens.add({
      targets: this.bg,
      alpha: { from: 1, to: 0.4 },
      duration: 300,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.InOut',
    });
  }

  getSlot(): Slot {
    return this.slot;
  }

  updateSlot(slot: Slot): void {
    this.slot = slot;
    this.refresh();
  }
}
