import Phaser from 'phaser';
import { Slot } from '../../types/slot.types';
import { SkillDef } from '../../types/skill.types';
import { TagType } from '../../types/tag.types';
import { getSkill } from '../../data/skills';
import { getTagDef } from '../../data/tags';

function getDisplayValue(slot: Slot, skill: SkillDef): string {
  const flat = slot.flatDamageBonus;
  const base = skill.basePower;

  switch (skill.id) {
    case 'RAPID_STRIKE': {
      const hits = skill.hitCount ?? 3;
      return `${base + flat}×${hits}`;
    }
    case 'DEEP_BREATH':
      return `×${skill.specialParam ?? 2}`;
    default:
      return base + flat > 0 ? `${base + flat}` : `${base}`;
  }
}

// 태그별 이모지/유니코드 심볼
const TAG_EMOJIS: Record<TagType, string> = {
  CRITICAL:        '★',  // 치명타
  CONSECUTIVE:     '∞',  // 연속
  HEAL:            '♥',  // 회복
  MOVE_RIGHT:      '▶',  // 우측 발동
  MOVE_LEFT:       '◀',  // 좌측 발동
  GOLD:            '◆',  // 황금
  ACTIVATE:        '✦',  // 활성화
  EXTEND_LIFESPAN: '⏱',  // 수명 연장
  SHIELD:          '◈',  // 방어막
  SHIELD_BREAK:    '✕',  // 방어막 파괴
};

// 인덱스 기반 룰렛 컬러 (카지노 느낌)
const ROULETTE_SLOT_COLORS: number[] = [
  0xB22222, // 0 - 진홍 (Firebrick)
  0x14141E, // 1 - 블랙
  0x1B5E20, // 2 - 딥 그린
  0x4A0E4E, // 3 - 딥 퍼플
  0x8B6914, // 4 - 다크 골드
  0x0D3B6E, // 5 - 딥 블루
];

const ROULETTE_SLOT_HIGHLIGHTS: number[] = [
  0xFF5544, // 0
  0x3A3A55, // 1
  0x4CAF50, // 2
  0xAB47BC, // 3
  0xFFD700, // 4
  0x2196F3, // 5
];

const HIGHLIGHT_VALID   = 0x27ae60;
const HIGHLIGHT_INVALID = 0xe74c3c;

// 태그 슬롯 최대 개수
const MAX_TAG_HOLES = 3;

// 태그 아이콘 반지름
const ICON_RADIUS = 12;

// 슬롯 내 좌/우 서브 방향 오프셋 (도)
const NUM_OFFSET_DEG  = 16;   // 숫자 → 오른쪽(시계방향) 서브
const TAG_OFFSET_DEG  = -16;  // 태그 → 왼쪽(반시계방향) 서브

export class RouletteSlot extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private hoverOverlay: Phaser.GameObjects.Graphics;
  private valueLabel: Phaser.GameObjects.Text;
  private tagDots: Phaser.GameObjects.Graphics;
  private tagTexts: Phaser.GameObjects.Text[] = [];
  private slot: Slot;
  private slotAngle: number;
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
    this.slotAngle = slot.index * 60;

    this.bg = scene.add.graphics();
    this.hoverOverlay = scene.add.graphics();

    this.valueLabel = scene.add.text(0, 0, '', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.tagDots = scene.add.graphics();

    this.add([this.bg, this.hoverOverlay, this.valueLabel, this.tagDots]);
    this.refresh();
  }

  refresh(): void {
    const skill = getSkill(this.slot.skillId);
    const colorIdx = this.slot.index % ROULETTE_SLOT_COLORS.length;
    const color = ROULETTE_SLOT_COLORS[colorIdx];
    const highlightColor = ROULETTE_SLOT_HIGHLIGHTS[colorIdx];

    this.bg.clear();

    const startAngle = Phaser.Math.DegToRad(this.slotAngle - 30);
    const endAngle   = Phaser.Math.DegToRad(this.slotAngle + 30);

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

    // 내곽 밝은 하이라이트 띠
    const innerHighlight = this.radius + 18;
    this.bg.fillStyle(highlightColor, 0.25);
    this.bg.beginPath();
    this.bg.arc(0, 0, innerHighlight, startAngle, endAngle, false);
    this.bg.arc(0, 0, this.radius, endAngle, startAngle, true);
    this.bg.closePath();
    this.bg.fillPath();

    // 구분선 (피자 조각 테두리)
    this.bg.lineStyle(1.5, 0xffd700, 0.3);
    this.bg.beginPath();
    this.bg.moveTo(
      Math.cos(startAngle) * this.radius,
      Math.sin(startAngle) * this.radius,
    );
    this.bg.arc(0, 0, this.outerRadius, startAngle, endAngle, false);
    this.bg.arc(0, 0, this.radius, endAngle, startAngle, true);
    this.bg.closePath();
    this.bg.strokePath();

    // 좌우 구분 중앙 선
    const midAngle = Phaser.Math.DegToRad(this.slotAngle);
    this.bg.lineStyle(1, 0xffffff, 0.12);
    this.bg.lineBetween(
      Math.cos(midAngle) * this.radius,
      Math.sin(midAngle) * this.radius,
      Math.cos(midAngle) * this.outerRadius,
      Math.sin(midAngle) * this.outerRadius,
    );

    // 숫자 — 오른쪽 서브(시계방향) 영역, 외곽 중심부
    const numAngle = Phaser.Math.DegToRad(this.slotAngle + NUM_OFFSET_DEG);
    const numR     = (this.radius + this.outerRadius) / 2 + 8;

    const cursed = this.slot.tempCurseTimer > 0;
    this.valueLabel.setText(getDisplayValue(this.slot, skill));
    this.valueLabel.setColor(cursed ? '#FF9999' : '#FFFFFF');
    this.valueLabel.setPosition(
      Math.cos(numAngle) * numR,
      Math.sin(numAngle) * numR,
    );
    this.valueLabel.setAngle(this.slotAngle + NUM_OFFSET_DEG);

    // 태그 아이콘 — 왼쪽 서브(반시계방향) 영역
    this.renderTagSlots(midAngle);
  }

  private renderTagSlots(midAngle: number): void {
    this.tagDots.clear();

    for (const t of this.tagTexts) t.destroy();
    this.tagTexts = [];

    const maxHoles = Math.min(this.slot.maxTags, MAX_TAG_HOLES);
    if (maxHoles === 0) return;

    // 왼쪽 서브 방향 (반시계방향)
    const tagSubAngle = midAngle + Phaser.Math.DegToRad(TAG_OFFSET_DEG);

    // 아이콘을 radial 방향으로 균등 배치
    // 사용 가능 깊이: radius ~ outerRadius (70~170 = 100px)
    // 여백 감안: 82 ~ 158 범위 내 배치
    const rMin = this.radius + ICON_RADIUS + 4;
    const rMax = this.outerRadius - ICON_RADIUS - 4;
    const spacing = maxHoles > 1 ? (rMax - rMin) / (maxHoles - 1) : 0;

    for (let i = 0; i < maxHoles; i++) {
      const r = maxHoles === 1 ? (rMin + rMax) / 2 : rMin + i * spacing;
      const cx = Math.cos(tagSubAngle) * r;
      const cy = Math.sin(tagSubAngle) * r;

      const tag = this.slot.tags[i] ?? null;

      if (tag) {
        const tagDef   = getTagDef(tag.type);
        const tagColor = tagDef.color;
        const isInactive = tag.currentCharges !== null && tag.currentCharges === 0;
        const alpha    = isInactive ? 0.35 : 1.0;
        const emoji    = TAG_EMOJIS[tag.type] ?? '?';

        // 배경 원
        this.tagDots.fillStyle(tagColor, alpha * 0.85);
        this.tagDots.fillCircle(cx, cy, ICON_RADIUS);
        this.tagDots.lineStyle(2, 0xffffff, alpha * 0.8);
        this.tagDots.strokeCircle(cx, cy, ICON_RADIUS);

        // 이모지 심볼
        const emojiTxt = this.scene.add.text(cx, cy, emoji, {
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
          align: 'center',
        }).setOrigin(0.5, 0.5).setAlpha(alpha);
        this.add(emojiTxt);
        this.tagTexts.push(emojiTxt);

        // 레벨 배지 (Lv2+)
        if (tag.level > 1) {
          const lvBadge = this.scene.add.text(
            cx + ICON_RADIUS * 0.65,
            cy - ICON_RADIUS * 0.65,
            `${tag.level}`,
            {
              fontSize: '10px',
              fontStyle: 'bold',
              color: '#ffff00',
              stroke: '#000000',
              strokeThickness: 3,
              align: 'center',
            },
          ).setOrigin(0.5, 0.5).setAlpha(alpha);
          this.add(lvBadge);
          this.tagTexts.push(lvBadge);
        }
      } else {
        // 빈 슬롯
        this.tagDots.fillStyle(0x000000, 0.35);
        this.tagDots.fillCircle(cx, cy, ICON_RADIUS);
        this.tagDots.lineStyle(1.5, 0x666666, 0.45);
        this.tagDots.strokeCircle(cx, cy, ICON_RADIUS);
      }
    }
  }

  highlight(type: 'valid' | 'invalid' | 'none'): void {
    this.bg.clear();

    const startAngle = Phaser.Math.DegToRad(this.slotAngle - 30);
    const endAngle   = Phaser.Math.DegToRad(this.slotAngle + 30);
    const colorIdx   = this.slot.index % ROULETTE_SLOT_COLORS.length;
    const baseColor  = ROULETTE_SLOT_COLORS[colorIdx];

    let overlayColor: number | null = null;
    if (type === 'valid')   overlayColor = HIGHLIGHT_VALID;
    if (type === 'invalid') overlayColor = HIGHLIGHT_INVALID;

    this.bg.fillStyle(overlayColor ?? baseColor, 1);
    this.bg.beginPath();
    this.bg.moveTo(
      Math.cos(startAngle) * this.radius,
      Math.sin(startAngle) * this.radius,
    );
    this.bg.arc(0, 0, this.outerRadius, startAngle, endAngle, false);
    this.bg.arc(0, 0, this.radius, endAngle, startAngle, true);
    this.bg.closePath();
    this.bg.fillPath();

    if (overlayColor) {
      this.bg.lineStyle(3, overlayColor, 1);
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

  setHoverHighlight(active: boolean): void {
    this.hoverOverlay.clear();
    if (active) {
      const startAngle = Phaser.Math.DegToRad(this.slotAngle - 30);
      const endAngle   = Phaser.Math.DegToRad(this.slotAngle + 30);
      this.hoverOverlay.fillStyle(0x000000, 0.35);
      this.hoverOverlay.beginPath();
      this.hoverOverlay.moveTo(
        Math.cos(startAngle) * this.radius,
        Math.sin(startAngle) * this.radius,
      );
      this.hoverOverlay.arc(0, 0, this.outerRadius, startAngle, endAngle, false);
      this.hoverOverlay.arc(0, 0, this.radius, endAngle, startAngle, true);
      this.hoverOverlay.closePath();
      this.hoverOverlay.fillPath();
    }
  }

  getSlot(): Slot {
    return this.slot;
  }

  updateSlot(slot: Slot): void {
    this.slot = slot;
    this.refresh();
  }
}
