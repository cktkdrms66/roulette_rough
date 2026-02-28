import Phaser from 'phaser';
import { BattleState } from '../../types/battle.types';

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

    // 배경
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a252f, 0.95);
    bg.fillRoundedRect(0, 0, W, PANEL_H, 8);
    bg.lineStyle(2, 0x2c3e50, 1);
    bg.strokeRoundedRect(0, 0, W, PANEL_H, 8);
    this.add(bg);

    // 제목
    const title = scene.add.text(W / 2, Y.TITLE, '⚔ 플레이어', {
      fontSize: '16px', color: '#ecf0f1', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add(title);

    // HP
    this.hpText = scene.add.text(12, Y.HP_LABEL, '', {
      fontSize: '14px', color: '#e74c3c',
    });
    this.add(this.hpText);
    this.hpBar = scene.add.graphics();
    this.add(this.hpBar);

    // 실드
    this.shieldText = scene.add.text(12, Y.SHIELD_LABEL, '', {
      fontSize: '14px', color: '#3498db',
    });
    this.add(this.shieldText);
    this.shieldBar = scene.add.graphics();
    this.add(this.shieldBar);

    // 구분선
    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x2c3e50, 1);
    sep.beginPath();
    sep.moveTo(12, Y.SEP);
    sep.lineTo(W - 12, Y.SEP);
    sep.strokePath();
    this.add(sep);

    // 골드
    this.goldText = scene.add.text(12, Y.GOLD, '', {
      fontSize: '14px', color: '#f1c40f',
    });
    this.add(this.goldText);

    // 리롤
    this.rerollText = scene.add.text(12, Y.REROLL, '', {
      fontSize: '14px', color: '#2ecc71',
    });
    this.add(this.rerollText);

    // 웨이브
    this.waveText = scene.add.text(12, Y.WAVE, '', {
      fontSize: '14px', color: '#95a5a6',
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
    this.hpText.setText(`❤  HP  ${state.playerHP} / ${state.playerMaxHP}`);
    this.hpBar.clear();
    const hpRatio = Math.max(0, state.playerHP / state.playerMaxHP);
    this.hpBar.fillStyle(0x1a3a2a, 1);
    this.hpBar.fillRect(12, Y.HP_BAR, BAR_W, 18);
    this.hpBar.fillStyle(0xe74c3c, 1);
    this.hpBar.fillRect(12, Y.HP_BAR, Math.floor(BAR_W * hpRatio), 18);

    // 실드 바
    this.shieldText.setText(`🛡  실드  ${state.playerShield}`);
    this.shieldBar.clear();
    const shieldRatio = Math.min(1, state.playerShield > 0 ? state.playerShield / 30 : 0);
    this.shieldBar.fillStyle(0x1a2f3a, 1);
    this.shieldBar.fillRect(12, Y.SHIELD_BAR, BAR_W, 14);
    if (state.playerShield > 0) {
      this.shieldBar.fillStyle(0x3498db, 1);
      this.shieldBar.fillRect(12, Y.SHIELD_BAR, Math.floor(BAR_W * shieldRatio), 14);
    }

    // 자원
    this.goldText.setText(`💰  골드  ${state.playerGold}`);
    this.rerollText.setText(`🔄  무료 리롤  ${state.freeRerolls}회`);
    this.waveText.setText(`🌊  웨이브  ${state.wave} / ${state.maxWaves}`);
  }
}
