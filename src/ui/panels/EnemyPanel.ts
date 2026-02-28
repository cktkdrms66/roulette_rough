import Phaser from 'phaser';
import { EnemyState } from '../../types/battle.types';
import { THEME } from '../theme';

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
  ICON:     38,  // 큰 심볼
  TYPE:     80,  // 행동 타입 + 수치
  DESC:    104,  // 설명 텍스트
};

const TYPE_COLOR: Record<string, number> = {
  Attack: 0xCC2200,
  Defend: 0x1a5c2a,
  Curse:  0x6b21a8,
};
const TYPE_LABEL: Record<string, string> = {
  Attack: 'ATTACK',
  Defend: 'DEFEND',
  Curse:  'CURSE',
};
const TYPE_ICON: Record<string, string> = {
  Attack: '/\\',
  Defend: '[]',
  Curse:  '**',
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

  // 사망 연출 오버레이 요소 (clearDeathOverlay로 정리)
  private deathOverlay?: Phaser.GameObjects.Graphics;
  private deathGoldLabel?: Phaser.GameObjects.Text;
  private deathRerollLabel?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // ── 반투명 다크 오버레이 (벽돌 벽 위에 덮임) ────────────────
    const overlay = scene.add.graphics();
    overlay.fillStyle(THEME.PANEL_OVERLAY, 0.52);
    overlay.fillRoundedRect(0, 0, W, PANEL_H, 8);
    this.add(overlay);

    // ── 골드 이중 테두리 (딥 레드 악센트) ───────────────────────
    const border = scene.add.graphics();
    border.lineStyle(2, THEME.GOLD_DARK, 1);
    border.strokeRoundedRect(0, 0, W, PANEL_H, 8);
    border.lineStyle(1, THEME.GOLD, 0.5);
    border.strokeRoundedRect(4, 4, W - 8, PANEL_H - 8, 6);
    this.add(border);

    // ── 타이틀 바 (딥 레드) ─────────────────────────────────────
    const titleBar = scene.add.graphics();
    titleBar.fillStyle(THEME.RED_DEEP, 1);
    titleBar.fillRoundedRect(2, 2, W - 4, 36, { tl: 7, tr: 7, bl: 0, br: 0 });
    this.add(titleBar);

    // ── 이름 ────────────────────────────────────────────────────
    this.nameText = scene.add.text(W / 2, Y.TITLE, 'ENEMY', {
      fontSize: '14px', color: THEME.TEXT_CREAM, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add(this.nameText);

    // ── HP ──────────────────────────────────────────────────────
    this.hpText = scene.add.text(12, Y.HP_LABEL, '', {
      fontSize: '13px', color: THEME.TEXT_CREAM,
    });
    this.add(this.hpText);
    this.hpBar = scene.add.graphics();
    this.add(this.hpBar);

    // ── 실드 ────────────────────────────────────────────────────
    this.shieldText = scene.add.text(12, Y.SHIELD_LABEL, '', {
      fontSize: '13px', color: THEME.TEXT_CREAM,
    });
    this.add(this.shieldText);
    this.shieldBar = scene.add.graphics();
    this.add(this.shieldBar);

    // ── 구분선 (골드) ────────────────────────────────────────────
    const sep = scene.add.graphics();
    sep.lineStyle(1, THEME.GOLD_DARK, 0.6);
    sep.beginPath();
    sep.moveTo(12, Y.SEP);
    sep.lineTo(W - 12, Y.SEP);
    sep.strokePath();
    this.add(sep);

    // ── 행동 카드 ────────────────────────────────────────────────
    this.cardBg = scene.add.graphics();
    this.add(this.cardBg);

    // "다음 행동" 정적 헤더 라벨
    const headerLabel = scene.add.text(
      CARD_X + 10, Y.CARD_TOP + CY.HEADER, 'NEXT ACTION', {
        fontSize: '10px', color: THEME.TEXT_DIM,
      },
    );
    this.add(headerLabel);

    // 행동 아이콘 (ASCII 심볼, 중앙 정렬)
    this.cardIconText = scene.add.text(W / 2, Y.CARD_TOP + CY.ICON, '', {
      fontSize: '24px', color: THEME.TEXT_CREAM, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add(this.cardIconText);

    // 행동 타입 + 수치 (중앙, 컬러)
    this.cardTypeText = scene.add.text(W / 2, Y.CARD_TOP + CY.TYPE, '', {
      fontSize: '14px', color: '#CC2200', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add(this.cardTypeText);

    // 설명 (중앙, 작은 크림, 줄바꿈)
    this.cardDescText = scene.add.text(W / 2, Y.CARD_TOP + CY.DESC, '', {
      fontSize: '11px', color: THEME.TEXT_DIM,
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

  /** 사망 연출: 회색 오버레이 + 골드/리롤 텍스트 표시 후 onComplete 호출 */
  playDeathEffect(
    goldReward: number,
    goldBonus: number,
    freeRerollBonus: number,
    onComplete: () => void,
  ): void {
    // 회색 오버레이
    this.deathOverlay = this.scene.add.graphics();
    this.deathOverlay.fillStyle(0x222222, 0.72);
    this.deathOverlay.fillRoundedRect(0, 0, W, PANEL_H, 8);
    this.deathOverlay.setAlpha(0);
    this.add(this.deathOverlay);

    this.scene.tweens.add({
      targets: this.deathOverlay,
      alpha: 1,
      duration: 350,
      ease: 'Quad.Out',
    });

    // 골드 텍스트
    const goldLine = goldBonus > 0
      ? `+${goldReward} G  (이자 +${goldBonus})`
      : `+${goldReward} G`;
    this.deathGoldLabel = this.scene.add.text(W / 2, PANEL_H / 2 - 26, goldLine, {
      fontSize: '17px', color: '#FFD700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    this.add(this.deathGoldLabel);

    // 무료 리롤 텍스트
    this.deathRerollLabel = this.scene.add.text(W / 2, PANEL_H / 2 + 14, `FREE REROLL  x${freeRerollBonus}`, {
      fontSize: '14px', color: '#88CCFF', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);
    this.add(this.deathRerollLabel);

    // 텍스트 페이드인 후 대기, 콜백 전달
    this.scene.tweens.add({
      targets: [this.deathGoldLabel, this.deathRerollLabel],
      alpha: 1,
      duration: 280,
      ease: 'Quad.Out',
      delay: 280,
      onComplete: () => {
        this.scene.time.delayedCall(700, onComplete);
      },
    });
  }

  /** 사망 연출 오버레이 정리 (다음 웨이브 시작 전 호출) */
  clearDeathOverlay(): void {
    if (this.deathOverlay)      { this.remove(this.deathOverlay, true);      this.deathOverlay = undefined; }
    if (this.deathGoldLabel)    { this.remove(this.deathGoldLabel, true);    this.deathGoldLabel = undefined; }
    if (this.deathRerollLabel)  { this.remove(this.deathRerollLabel, true);  this.deathRerollLabel = undefined; }
  }

  /** 피격/실드 플래시 효과. onComplete는 플래시 완료 후 호출됨 */
  playHitEffect(type: 'attack' | 'shield' = 'attack', onComplete?: () => void): void {
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
      onComplete: () => {
        this.remove(flash, true);
        onComplete?.();
      },
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
    this.nameText.setText(enemy.name.toUpperCase());

    // HP 바
    this.hpBar.clear();
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    this.hpBar.fillStyle(0x1a0505, 1);
    this.hpBar.fillRect(12, Y.HP_BAR, BAR_W, 18);
    this.hpBar.fillStyle(THEME.RED_DEEP, 1);
    this.hpBar.fillRect(12, Y.HP_BAR, Math.floor(BAR_W * hpRatio), 18);
    this.hpBar.lineStyle(1, THEME.GOLD_DARK, 0.3);
    this.hpBar.strokeRect(12, Y.HP_BAR, BAR_W, 18);
    this.hpText.setText(`HP  ${enemy.hp} / ${enemy.maxHp}`);

    // 실드 바
    this.shieldBar.clear();
    this.shieldBar.fillStyle(0x05101a, 1);
    this.shieldBar.fillRect(12, Y.SHIELD_BAR, BAR_W, 14);
    if (enemy.shield > 0) {
      const shieldRatio = Math.min(1, enemy.shield / 30);
      this.shieldBar.fillStyle(0x3498db, 1);
      this.shieldBar.fillRect(12, Y.SHIELD_BAR, Math.floor(BAR_W * shieldRatio), 14);
    }
    this.shieldBar.lineStyle(1, THEME.GOLD_DARK, 0.3);
    this.shieldBar.strokeRect(12, Y.SHIELD_BAR, BAR_W, 14);
    this.shieldText.setText(`SHIELD  ${enemy.shield}`);

    // ── 행동 카드 업데이트 ──────────────────────────────────────
    const action = enemy.nextAction;
    const color   = TYPE_COLOR[action.type] ?? 0x888888;
    const hexStr  = `#${color.toString(16).padStart(6, '0')}`;
    const icon    = TYPE_ICON[action.type]  ?? '??';
    const label   = TYPE_LABEL[action.type] ?? action.type;

    // 카드 배경 재드로우
    this.cardBg.clear();

    // 벽돌 카드 내부
    this.cardBg.fillStyle(THEME.BRICK_MORTAR, 1);
    this.cardBg.fillRoundedRect(CARD_X, Y.CARD_TOP, CARD_W, CARD_H, 6);

    // 반투명 다크 오버레이
    this.cardBg.fillStyle(THEME.PANEL_OVERLAY, 0.6);
    this.cardBg.fillRoundedRect(CARD_X, Y.CARD_TOP, CARD_W, CARD_H, 6);

    // 골드 테두리
    this.cardBg.lineStyle(1.5, THEME.GOLD_DARK, 0.7);
    this.cardBg.strokeRoundedRect(CARD_X, Y.CARD_TOP, CARD_W, CARD_H, 6);

    // 좌측 컬러 액센트 바
    this.cardBg.fillStyle(color, 0.9);
    this.cardBg.fillRect(CARD_X, Y.CARD_TOP + 6, 4, CARD_H - 12);

    // 헤더 구분선 (골드)
    this.cardBg.lineStyle(1, THEME.GOLD_DARK, 0.4);
    this.cardBg.beginPath();
    this.cardBg.moveTo(CARD_X + 10, Y.CARD_TOP + CY.DIVIDER);
    this.cardBg.lineTo(CARD_X + CARD_W - 10, Y.CARD_TOP + CY.DIVIDER);
    this.cardBg.strokePath();

    // 텍스트 업데이트
    this.cardIconText.setText(icon).setColor(hexStr);
    this.cardTypeText
      .setText(action.value > 0 ? `${label}  ${action.value}` : label)
      .setColor(hexStr);
    this.cardDescText.setText(action.description);
  }
}
