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
      return `ATK ${base + flat}`;

    case 'RAPID_STRIKE': {
      const hits = skill.hitCount ?? 3;
      return flat > 0 ? `ATK ${base}+${flat}x${hits}` : `ATK ${base}x${hits}`;
    }

    case 'DEFENSE':
      return flat > 0 ? `DEF ${base}+${flat}` : `DEF ${base}`;

    case 'HEAL':
      return flat > 0 ? `HLR ${base}+${flat}` : `HLR ${base}`;

    case 'DEEP_BREATH':
      return `x${skill.specialParam ?? 2}`;

    case 'CURSE':
    case 'HEAVY_CURSE':
      return `CRS ${base}`;

    default:
      return base > 0 ? `${base}` : '';
  }
}

// 카테고리별 색상 (더 선명한 카지노 느낌)
const CATEGORY_COLORS: Record<string, number> = {
  Attack:    0xD42000,  // 레드 더 선명
  Transform: 0x1E45A8,  // 블루 약간 밝게
  Curse:     0x7B28C0,  // 퍼플 약간 밝게
  Defense:   0x1e6b30,  // 그린 약간 밝게
  Heal:      0xC89A10,  // 골드 약간 밝게
};

// 내곽 하이라이트용 밝은 색 (카테고리 색 + 밝기 증가)
const CATEGORY_HIGHLIGHT_COLORS: Record<string, number> = {
  Attack:    0xFF5533,
  Transform: 0x4472E8,
  Curse:     0xAA55F0,
  Defense:   0x33AA55,
  Heal:      0xF0CC44,
};

const HIGHLIGHT_VALID = 0x27ae60;
const HIGHLIGHT_INVALID = 0xe74c3c;

export class RouletteSlot extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private nameLabel: Phaser.GameObjects.Text;
  private valueLabel: Phaser.GameObjects.Text;
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
    this.slotAngle = slot.index * 60; // 각 슬롯은 60도

    this.bg = scene.add.graphics();

    // 스킬명 라벨 (작은 크기, 반투명)
    this.nameLabel = scene.add.text(0, 0, '', {
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0.5).setAlpha(0.85);

    // 수치 라벨 (굵고 선명하게)
    this.valueLabel = scene.add.text(0, 0, '', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.add([this.bg, this.nameLabel, this.valueLabel]);
    this.refresh();
  }

  refresh(): void {
    const skill = getSkill(this.slot.skillId);
    const color = CATEGORY_COLORS[this.slot.category] ?? 0x555555;
    const highlightColor = CATEGORY_HIGHLIGHT_COLORS[this.slot.category] ?? 0x888888;

    this.bg.clear();

    const startAngle = Phaser.Math.DegToRad(this.slotAngle - 30);
    const endAngle = Phaser.Math.DegToRad(this.slotAngle + 30);

    // 메인 파이 슬라이스
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

    // 내곽 밝은 하이라이트 띠 (innerRadius ~ innerRadius+22)
    const innerHighlight = this.radius + 22;
    this.bg.fillStyle(highlightColor, 0.3);
    this.bg.beginPath();
    this.bg.arc(0, 0, innerHighlight, startAngle, endAngle, false);
    this.bg.arc(0, 0, this.radius, endAngle, startAngle, true);
    this.bg.closePath();
    this.bg.fillPath();

    // 골드 테두리 (은은하게)
    this.bg.lineStyle(1.5, 0xffd700, 0.25);
    this.bg.strokePath();

    // 슬롯을 안쪽/바깥쪽 두 영역으로 나눠 각 중앙에 배치
    const midRadius = (this.radius + this.outerRadius) / 2; // 120
    const innerHalfR = (this.radius + midRadius) / 2;       // 95  (안쪽 영역 중앙)
    const outerHalfR = (midRadius + this.outerRadius) / 2;  // 145 (바깥쪽 영역 중앙)
    const midAngle = Phaser.Math.DegToRad(this.slotAngle);

    // 스킬명: 안쪽 영역 중앙 (baseline이 원 중심을 향하도록 radial 회전)
    const namePrefix = this.slot.tempCurseTimer > 0 ? '! ' : '';
    this.nameLabel.setText(`${namePrefix}${skill.name}`);
    this.nameLabel.setPosition(
      Math.cos(midAngle) * innerHalfR,
      Math.sin(midAngle) * innerHalfR,
    );
    this.nameLabel.setAngle(this.slotAngle);

    // 수치: 바깥쪽 영역 중앙
    const valueLine = getValueLabel(this.slot, skill);
    this.valueLabel.setText(valueLine);
    this.valueLabel.setPosition(
      Math.cos(midAngle) * outerHalfR,
      Math.sin(midAngle) * outerHalfR,
    );
    this.valueLabel.setAngle(this.slotAngle);
  }

  highlight(type: 'valid' | 'invalid' | 'none'): void {
    const color = type === 'valid' ? HIGHLIGHT_VALID :
                  type === 'invalid' ? HIGHLIGHT_INVALID : null;

    this.bg.clear();

    const startAngle = Phaser.Math.DegToRad(this.slotAngle - 30);
    const endAngle = Phaser.Math.DegToRad(this.slotAngle + 30);
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
