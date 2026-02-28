import Phaser from 'phaser';
import { BattleState } from '../../types/battle.types';
import { THEME } from '../theme';

// ─────────────────────────────────────────────
//  레이아웃 상수 (모든 Y 좌표는 겹침 없이 배치됨)
// ─────────────────────────────────────────────
const Y = {
  TITLE:        18,   // 패널 제목
  HP_LABEL:     56,   // "HP: 80 / 100"
  HP_BAR:       78,   // HP 바
  SHIELD_LABEL: 118,  // "실드: 15"
  SHIELD_BAR:   140,  // 실드 바
  SEP:          170,  // 구분선
  GOLD:         188,  // 골드
  REROLL:       220,  // 무료 리롤
  WAVE:         258,  // 웨이브
};
const W       = 285;
const PANEL_H = 352;
const BAR_W   = 258;

export class PlayerPanel extends Phaser.GameObjects.Container {
  private hpBar:      Phaser.GameObjects.Graphics;
  private shieldBar:  Phaser.GameObjects.Graphics;
  private hpText:     Phaser.GameObjects.Text;
  private shieldText: Phaser.GameObjects.Text;
  private goldText:   Phaser.GameObjects.Text;
  private rerollText: Phaser.GameObjects.Text;
  private waveText:   Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // ── 반투명 다크 오버레이 (벽돌 벽 위에 덮임) ────────────────
    const overlay = scene.add.graphics();
    overlay.fillStyle(THEME.PANEL_OVERLAY, 0.52);
    overlay.fillRoundedRect(0, 0, W, PANEL_H, 8);
    this.add(overlay);

    // ── 골드 이중 테두리 ─────────────────────────────────────────
    const border = scene.add.graphics();
    // 바깥 테두리 (2px)
    border.lineStyle(2, THEME.GOLD_DARK, 1);
    border.strokeRoundedRect(0, 0, W, PANEL_H, 8);
    // 안쪽 테두리 (1px, 4px 간격)
    border.lineStyle(1, THEME.GOLD, 0.5);
    border.strokeRoundedRect(4, 4, W - 8, PANEL_H - 8, 6);
    this.add(border);

    // ── 타이틀 바 ────────────────────────────────────────────────
    const titleBar = scene.add.graphics();
    titleBar.fillStyle(THEME.GOLD_DARK, 1);
    titleBar.fillRoundedRect(2, 2, W - 4, 36, { tl: 7, tr: 7, bl: 0, br: 0 });
    this.add(titleBar);

    const title = scene.add.text(W / 2, Y.TITLE, '[ PLAYER ]', {
      fontSize: '14px',
      color: '#1a0a08',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add(title);

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

    // ── 구분선 (골드) ─────────────────────────────────────────────
    const sep = scene.add.graphics();
    sep.lineStyle(1, THEME.GOLD_DARK, 0.6);
    sep.beginPath();
    sep.moveTo(12, Y.SEP);
    sep.lineTo(W - 12, Y.SEP);
    sep.strokePath();
    this.add(sep);

    // ── 골드 ────────────────────────────────────────────────────
    this.goldText = scene.add.text(12, Y.GOLD, '', {
      fontSize: '13px', color: THEME.TEXT_GOLD,
    });
    this.add(this.goldText);

    // ── 리롤 ────────────────────────────────────────────────────
    this.rerollText = scene.add.text(12, Y.REROLL, '', {
      fontSize: '13px', color: THEME.TEXT_CREAM,
    });
    this.add(this.rerollText);

    // ── 웨이브 ──────────────────────────────────────────────────
    this.waveText = scene.add.text(12, Y.WAVE, '', {
      fontSize: '13px', color: THEME.TEXT_DIM,
    });
    this.add(this.waveText);

    scene.add.existing(this);
  }

  /**
   * 피격/방어/저주 이펙트
   * - attack: 빨간 플래시 + 흔들기
   * - shield: 파란 글로우 (흔들림 없음)
   * - curse : 보라 플래시 + 약한 흔들기
   */
  playHitEffect(type: 'attack' | 'shield' | 'curse' = 'attack'): void {
    const colorMap = {
      attack: 0xff2222,
      shield: 0x3498db,
      curse:  0x9b59b6,
    };
    const alphaMap = { attack: 0.5, shield: 0.35, curse: 0.45 };
    const color = colorMap[type];
    const alpha = alphaMap[type];

    // 플래시 오버레이
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

    // 공격·저주는 흔들기
    if (type !== 'shield') {
      const originX = this.x;
      this.scene.tweens.add({
        targets: this,
        x: originX + (type === 'attack' ? 8 : 5),
        duration: 45,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: type === 'attack' ? 3 : 2,
        onComplete: () => { this.x = originX; },
      });
    }
  }

  update(state: BattleState): void {
    // HP 바
    this.hpText.setText(`HP  ${state.playerHP} / ${state.playerMaxHP}`);
    this.hpBar.clear();
    const hpRatio = Math.max(0, state.playerHP / state.playerMaxHP);
    this.hpBar.fillStyle(0x1a0505, 1);
    this.hpBar.fillRect(12, Y.HP_BAR, BAR_W, 18);
    this.hpBar.fillStyle(THEME.RED_DEEP, 1);
    this.hpBar.fillRect(12, Y.HP_BAR, Math.floor(BAR_W * hpRatio), 18);
    // HP 바 테두리
    this.hpBar.lineStyle(1, THEME.GOLD_DARK, 0.3);
    this.hpBar.strokeRect(12, Y.HP_BAR, BAR_W, 18);

    // 실드 바
    this.shieldText.setText(`SHIELD  ${state.playerShield}`);
    this.shieldBar.clear();
    const shieldRatio = Math.min(1, state.playerShield > 0 ? state.playerShield / 30 : 0);
    this.shieldBar.fillStyle(0x05101a, 1);
    this.shieldBar.fillRect(12, Y.SHIELD_BAR, BAR_W, 14);
    if (state.playerShield > 0) {
      this.shieldBar.fillStyle(0x3498db, 1);
      this.shieldBar.fillRect(12, Y.SHIELD_BAR, Math.floor(BAR_W * shieldRatio), 14);
    }
    this.shieldBar.lineStyle(1, THEME.GOLD_DARK, 0.3);
    this.shieldBar.strokeRect(12, Y.SHIELD_BAR, BAR_W, 14);

    // 자원
    this.goldText.setText(`GOLD  ${state.playerGold}`);
    this.rerollText.setText(`REROLL  x${state.freeRerolls}`);
    this.waveText.setText(`WAVE  ${state.wave} / ${state.maxWaves}`);
  }
}
