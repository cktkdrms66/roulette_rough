import Phaser from 'phaser';
import { EnemyState } from '../../types/battle.types';

const Y = {
  TITLE:        18,
  HP_LABEL:     56,
  HP_BAR:       78,
  SHIELD_LABEL: 118,
  SHIELD_BAR:   140,
  SEP:          170,
  CARD_TOP:     178,  // 행동 카드 시작 y
};

const W        = 285;
const PANEL_H  = 352;
const BAR_W    = 258;
const CARD_X   = 12;   // 카드 좌측 여백
const CARD_W   = 261;  // 카드 너비 (= W - CARD_X*2 + 2)
const CARD_H   = 166;  // 카드 높이 (178 + 166 = 344, 패널 끝 근처)

// 카드 내부 y 오프셋 (CARD_TOP 기준)
const CY = {
  HEADER:   10,  // "다음 행동" 라벨
  DIVIDER:  28,  // 헤더 구분선
  ICON:     38,  // 큰 아이콘 이모지
  TYPE:     80,  // 행동 타입 + 수치
  DESC:    104,  // 설명 텍스트
};

const TYPE_COLOR: Record<string, number> = {
  Attack: 0xe74c3c,
  Defend: 0x3498db,
  Curse:  0x9b59b6,
};
const TYPE_LABEL: Record<string, string> = {
  Attack: '공격',
  Defend: '방어',
  Curse:  '저주',
};
const TYPE_ICON: Record<string, string> = {
  Attack: '⚔️',
  Defend: '🛡️',
  Curse:  '💜',
};

export class EnemyPanel extends Phaser.GameObjects.Container {
  private hpBar:     Phaser.GameObjects.Graphics;
  private shieldBar: Phaser.GameObjects.Graphics;
  private nameText:  Phaser.GameObjects.Text;
  private hpText:    Phaser.GameObjects.Text;
  private shieldText:Phaser.GameObjects.Text;

  // 행동 카드 요소
  private cardBg:       Phaser.GameObjects.Graphics;
  private cardIconText: Phaser.GameObjects.Text;
  private cardTypeText: Phaser.GameObjects.Text;
  private cardDescText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // ── 패널 배경 ────────────────────────────────────────────────
    const bg = scene.add.graphics();
    bg.fillStyle(0x2c1a1a, 0.95);
    bg.fillRoundedRect(0, 0, W, PANEL_H, 8);
    bg.lineStyle(2, 0x5c2c2c, 1);
    bg.strokeRoundedRect(0, 0, W, PANEL_H, 8);
    this.add(bg);

    // ── 이름 ────────────────────────────────────────────────────
    this.nameText = scene.add.text(W / 2, Y.TITLE, '적', {
      fontSize: '16px', color: '#e74c3c', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add(this.nameText);

    // ── HP ──────────────────────────────────────────────────────
    this.hpText = scene.add.text(12, Y.HP_LABEL, '', {
      fontSize: '14px', color: '#e74c3c',
    });
    this.add(this.hpText);
    this.hpBar = scene.add.graphics();
    this.add(this.hpBar);

    // ── 실드 ────────────────────────────────────────────────────
    this.shieldText = scene.add.text(12, Y.SHIELD_LABEL, '', {
      fontSize: '14px', color: '#3498db',
    });
    this.add(this.shieldText);
    this.shieldBar = scene.add.graphics();
    this.add(this.shieldBar);

    // ── 구분선 ──────────────────────────────────────────────────
    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x5c2c2c, 1);
    sep.beginPath();
    sep.moveTo(12, Y.SEP);
    sep.lineTo(W - 12, Y.SEP);
    sep.strokePath();
    this.add(sep);

    // ── 행동 카드 ────────────────────────────────────────────────
    // 동적 배경 (update에서 clear→redraw)
    this.cardBg = scene.add.graphics();
    this.add(this.cardBg);

    // "다음 행동" 정적 헤더 라벨
    const headerLabel = scene.add.text(
      CARD_X + 10, Y.CARD_TOP + CY.HEADER, '다음 행동', {
        fontSize: '11px', color: '#7f8c8d',
      },
    );
    this.add(headerLabel);

    // 행동 아이콘 (큰 이모지, 중앙 정렬)
    this.cardIconText = scene.add.text(W / 2, Y.CARD_TOP + CY.ICON, '', {
      fontSize: '30px',
    }).setOrigin(0.5, 0);
    this.add(this.cardIconText);

    // 행동 타입 + 수치 (중앙, 컬러)
    this.cardTypeText = scene.add.text(W / 2, Y.CARD_TOP + CY.TYPE, '', {
      fontSize: '14px', color: '#e74c3c', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add(this.cardTypeText);

    // 설명 (중앙, 작은 회색, 줄바꿈)
    this.cardDescText = scene.add.text(W / 2, Y.CARD_TOP + CY.DESC, '', {
      fontSize: '11px', color: '#7f8c8d',
      wordWrap: { width: CARD_W - 24 },
      align: 'center',
    }).setOrigin(0.5, 0);
    this.add(this.cardDescText);

    scene.add.existing(this);
  }

  // ── 공개 메서드 ──────────────────────────────────────────────────

  /** 행동 카드 월드 중심 좌표 (적 공격 이펙트 발사 기준점) */
  getActionCardWorldCenter(): { x: number; y: number } {
    return {
      x: this.x + W / 2,
      y: this.y + Y.CARD_TOP + CARD_H / 2,
    };
  }

  /** 피격/실드 플래시 효과 (PlayerPanel과 동일한 방식) */
  playHitEffect(type: 'attack' | 'shield' = 'attack'): void {
    const color = type === 'shield' ? 0x3498db : 0xff2222;
    const alpha = type === 'shield' ? 0.35 : 0.5;

    const flash = this.scene.add.graphics();
    flash.fillStyle(color, alpha);
    flash.fillRoundedRect(0, 0, W, PANEL_H, 8);
    flash.setDepth(10);
    this.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 420,
      ease: 'Quad.Out',
      onComplete: () => this.remove(flash, true),
    });

    // 공격은 흔들기
    if (type === 'attack') {
      const originX = this.x;
      this.scene.tweens.add({
        targets: this,
        x: originX + 8,
        duration: 45,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: 3,
        onComplete: () => { this.x = originX; },
      });
    }
  }

  update(enemy: EnemyState): void {
    this.nameText.setText(`👾  ${enemy.name}`);

    // HP 바
    this.hpBar.clear();
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    this.hpBar.fillStyle(0x3a1a1a, 1);
    this.hpBar.fillRect(12, Y.HP_BAR, BAR_W, 18);
    this.hpBar.fillStyle(0xe74c3c, 1);
    this.hpBar.fillRect(12, Y.HP_BAR, Math.floor(BAR_W * hpRatio), 18);
    this.hpText.setText(`❤  HP  ${enemy.hp} / ${enemy.maxHp}`);

    // 실드 바
    this.shieldBar.clear();
    this.shieldBar.fillStyle(0x1a2f3a, 1);
    this.shieldBar.fillRect(12, Y.SHIELD_BAR, BAR_W, 14);
    if (enemy.shield > 0) {
      const shieldRatio = Math.min(1, enemy.shield / 30);
      this.shieldBar.fillStyle(0x3498db, 1);
      this.shieldBar.fillRect(12, Y.SHIELD_BAR, Math.floor(BAR_W * shieldRatio), 14);
    }
    this.shieldText.setText(`🛡  실드  ${enemy.shield}`);

    // ── 행동 카드 업데이트 ──────────────────────────────────────
    const action = enemy.nextAction;
    const color   = TYPE_COLOR[action.type] ?? 0xffffff;
    const hexStr  = `#${color.toString(16).padStart(6, '0')}`;
    const icon    = TYPE_ICON[action.type]  ?? '❓';
    const label   = TYPE_LABEL[action.type] ?? action.type;

    // 카드 배경 재드로우
    this.cardBg.clear();

    // 어두운 카드 내부
    this.cardBg.fillStyle(0x110e1b, 0.98);
    this.cardBg.fillRoundedRect(CARD_X, Y.CARD_TOP, CARD_W, CARD_H, 6);

    // 컬러 테두리
    this.cardBg.lineStyle(2, color, 0.75);
    this.cardBg.strokeRoundedRect(CARD_X, Y.CARD_TOP, CARD_W, CARD_H, 6);

    // 좌측 컬러 액센트 바
    this.cardBg.fillStyle(color, 0.85);
    this.cardBg.fillRect(CARD_X, Y.CARD_TOP + 6, 4, CARD_H - 12);

    // 헤더 구분선 (얇은 컬러)
    this.cardBg.lineStyle(1, color, 0.25);
    this.cardBg.beginPath();
    this.cardBg.moveTo(CARD_X + 10, Y.CARD_TOP + CY.DIVIDER);
    this.cardBg.lineTo(CARD_X + CARD_W - 10, Y.CARD_TOP + CY.DIVIDER);
    this.cardBg.strokePath();

    // 텍스트 업데이트
    this.cardIconText.setText(icon);
    this.cardTypeText
      .setText(action.value > 0 ? `${label}  ${action.value}` : label)
      .setColor(hexStr);
    this.cardDescText.setText(action.description);
  }
}
