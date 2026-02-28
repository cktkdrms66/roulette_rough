import Phaser from 'phaser';
import { BattleState } from '../types/battle.types';
import { TypedEventEmitter, GameEvents } from '../events/GameEvents';
import { BattleSystem } from '../systems/BattleSystem';
import { createInitialBattleState, pickShopCards } from '../state/BattleState';
import { getEnemyForWave, createEnemyState } from '../data/enemies';
import { enrichReplaceCards } from '../systems/ShopSystem';
import { RouletteWheel } from '../ui/roulette/RouletteWheel';
import { PlayerPanel } from '../ui/panels/PlayerPanel';
import { EnemyPanel } from '../ui/panels/EnemyPanel';
import { THEME, drawBricks } from '../ui/theme';
import { JokerPanel } from '../ui/panels/JokerPanel';
import { ShopPanel } from '../ui/panels/ShopPanel';
import { SpinButton } from '../ui/battle/SpinButton';
import { WaveIndicator } from '../ui/battle/WaveIndicator';
import { DamageNumber } from '../ui/battle/DamageNumber';
import { AttackEffect } from '../ui/battle/AttackEffect';

// ── 레이아웃 상수 (캔버스 1280×720) ─────────────────────────────
// 좌측 전투 패널 영역: x 0-295
// 중앙 룰렛 영역:     x 295-735 (center=515)
// 우측 조커+상점:     x 740-1275

const LEFT_PANEL_X  = 5;
const LEFT_PANEL_W  = 285;
const CENTER_X      = 515;      // 좌측 끝(295) + 중앙 열 너비(440) / 2
const RIGHT_X       = 742;      // 우측 열 시작
const PLAYER_Y      = 361;
const ENEMY_Y       = 5;
const JOKER_Y       = 5;
const SHOP_Y        = 213;

export class BattleScene extends Phaser.Scene {
  private battleSystem!: BattleSystem;
  private state!: BattleState;
  private gameEvents!: TypedEventEmitter;

  private rouletteIngSound!: Phaser.Sound.BaseSound;

  // UI
  private wheel!: RouletteWheel;
  private playerPanel!: PlayerPanel;
  private enemyPanel!: EnemyPanel;
  private jokerPanel!: JokerPanel;
  private shopPanel!: ShopPanel;
  private spinButton!: SpinButton;
  private waveIndicator!: WaveIndicator;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { wave?: number; state?: BattleState } = {}): void {
    const wave = data.wave ?? 1;

    if (data.state) {
      // 이전 전투에서 조커·체력·골드·슬롯 유지, 전투 관련 값만 리셋
      const freshShop = enrichReplaceCards(pickShopCards(3), data.state.slots);
      this.state = {
        ...data.state,
        wave,
        maxWaves: 3,
        enemy: createEnemyState(getEnemyForWave(wave)),
        shopCards: freshShop,
        freeRerolls: 1,
        playerShield: 0,
        phase: 'PlayerTurn',
        consecutiveAttackCount: 0,
        nextAttackMultiplier: 1,
        playerStunned: false,
      };
    } else {
      this.state = createInitialBattleState(wave);
      this.state.shopCards = enrichReplaceCards(this.state.shopCards, this.state.slots);
    }

    this.gameEvents   = new TypedEventEmitter(new Phaser.Events.EventEmitter());
    this.battleSystem = new BattleSystem(this.state, this.gameEvents);
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // ── 배경 (다크 레드-블랙) ───────────────────────
    this.add.rectangle(0, 0, width, height, THEME.BG_DARK).setOrigin(0);

    // ── 3열 전체: 벽돌 배경 ─────────────────────────
    // 하나의 Graphics에 전체 화면 벽돌을 한 번에 그림
    const wallBrick = this.add.graphics();
    wallBrick.fillStyle(THEME.BRICK_MORTAR, 1);
    wallBrick.fillRect(0, 0, width, height);
    drawBricks(wallBrick, width, height, 0, 0);

    // ── 스팟라이트 비네트 ────────────────────────────
    // 룰렛 중심에서 방사형으로 어두워지는 조명 효과
    // Graphics의 ring(annulus) 방식: 바깥 원 - 안쪽 원 = 도넛 모양
    const spotlight = this.add.graphics();
    const spotX = CENTER_X;
    const spotY = 320;   // 룰렛 휠 중심 Y
    const STEPS  = 32;
    const MIN_R  = 130;  // 스팟라이트 밝은 중심 반경
    const MAX_R  = 560;  // 코너까지 완전히 덮는 반경

    for (let i = 0; i < STEPS; i++) {
      const t      = i / STEPS;
      const innerR = MIN_R + (MAX_R - MIN_R) * t;
      const outerR = MIN_R + (MAX_R - MIN_R) * (i + 1) / STEPS;
      const alpha  = t * t * 0.88; // 2차 커브 → 중심은 투명, 가장자리는 짙게

      spotlight.fillStyle(THEME.BG_DARK, alpha);
      spotlight.beginPath();
      spotlight.arc(spotX, spotY, outerR, 0, Math.PI * 2, false);
      spotlight.arc(spotX, spotY, innerR, 0, Math.PI * 2, true);
      spotlight.closePath();
      spotlight.fillPath();
    }

    // ── 상단 장식 라인 (골드) ────────────────────────
    const topLine = this.add.graphics();
    topLine.lineStyle(1, THEME.GOLD_DARK, 0.5);
    topLine.beginPath();
    topLine.moveTo(0, 44); topLine.lineTo(width, 44);
    topLine.strokePath();

    // ── 열 구분선 (골드) ─────────────────────────────
    const dividers = this.add.graphics();
    dividers.lineStyle(1.5, THEME.GOLD_DARK, 0.6);
    dividers.beginPath();
    dividers.moveTo(295, 0); dividers.lineTo(295, height);
    dividers.moveTo(736, 0); dividers.lineTo(736, height);
    dividers.strokePath();

    // ── 중앙 열: 룰렛 ────────────────────────────────
    this.waveIndicator = new WaveIndicator(this, CENTER_X, 22);
    this.waveIndicator.update(this.state.wave, this.state.maxWaves);

    this.wheel = new RouletteWheel(this, CENTER_X, 320, this.state.slots);

    this.spinButton = new SpinButton(this, CENTER_X, 560, () => {
      this.onSpinPressed();
    });

    // ── 좌측 열: 전투 패널 ───────────────────────────
    this.playerPanel = new PlayerPanel(this, LEFT_PANEL_X, PLAYER_Y);
    this.playerPanel.update(this.state);

    this.enemyPanel = new EnemyPanel(this, LEFT_PANEL_X, ENEMY_Y);
    this.enemyPanel.update(this.state.enemy);

    // ── 우측 열: 조커 + 상점 ─────────────────────────
    this.jokerPanel = new JokerPanel(this, RIGHT_X, JOKER_Y);
    this.jokerPanel.updateJokers(this.state.jokers);

    this.shopPanel = new ShopPanel(
      this,
      RIGHT_X,
      SHOP_Y,
      this.wheel,
      this.gameEvents,
      this.state,
    );
    this.add.existing(this.shopPanel);
    this.shopPanel.update(this.state);

    // ── 이벤트 ──────────────────────────────────────
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.gameEvents.on(GameEvents.DAMAGE_DEALT, (data: unknown) => {
      const { target, amount } = data as { target: 'player' | 'enemy'; amount: number };

      if (target === 'enemy') {
        const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const toY = ENEMY_Y + 176;
        AttackEffect.shoot(this, CENTER_X, 150, toX, toY, 0xff5500, () => {
          DamageNumber.show(this, toX, ENEMY_Y + 60, amount, 'damage');
          this.enemyPanel.playHitEffect('attack', () => this.refreshUI());
          this.sound.play('attack');
        });
      } else {
        const src = this.enemyPanel.getActionCardWorldCenter();
        const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const toY = PLAYER_Y + 176;
        AttackEffect.shootFromEnemy(this, src.x, src.y, toX, toY, () => {
          DamageNumber.show(this, toX, PLAYER_Y + 60, amount, 'damage');
          this.playerPanel.playHitEffect('attack', () => this.refreshUI());
          this.sound.play('attack');
        });
      }
    });

    this.gameEvents.on(GameEvents.SHIELD_GAINED, (data: unknown) => {
      const { target } = data as { target: 'player' | 'enemy'; amount: number };
      if (target === 'player') {
        const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const toY = PLAYER_Y + 176;
        AttackEffect.shootShield(this, CENTER_X, 150, toX, toY, () => {
          this.playerPanel.playHitEffect('shield', () => this.refreshUI());
          this.sound.play('shield');
        });
      } else {
        const src = this.enemyPanel.getActionCardWorldCenter();
        const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const toY = ENEMY_Y + 140;
        AttackEffect.shootEnemyShield(this, src.x, src.y, toX, toY, () => {
          this.enemyPanel.playHitEffect('shield', () => this.refreshUI());
          this.sound.play('shield');
        });
      }
    });

    this.gameEvents.on(GameEvents.HEAL_APPLIED, (data: unknown) => {
      const { amount } = data as { amount: number };
      DamageNumber.show(this, LEFT_PANEL_X + LEFT_PANEL_W / 2, PLAYER_Y + 100, amount, 'heal');
      this.refreshUI();
    });

    this.gameEvents.on(GameEvents.CURSE_TRIGGERED, (data: unknown) => {
      const { damage } = data as { damage: number };
      const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
      const toY = PLAYER_Y + 176;
      AttackEffect.shootCurse(this, CENTER_X, 150, toX, toY, () => {
        DamageNumber.show(this, toX, PLAYER_Y + 60, damage, 'curse');
        this.playerPanel.playHitEffect('curse', () => this.refreshUI());
        this.cameras.main.shake(150, 0.005);
        this.sound.play('attack');
      });
    });

    this.gameEvents.on(GameEvents.SPIN_LANDED, (data: unknown) => {
      const { index } = data as { index: number };
      this.wheel.highlightLanded(index);
    });

    this.gameEvents.on(GameEvents.WAVE_CLEARED, (data: unknown) => {
      const { wave, goldReward, goldBonus, freeRerollBonus } =
        data as { wave: number; goldReward: number; goldBonus: number; freeRerollBonus: number };

      this.waveIndicator.update(this.state.wave, this.state.maxWaves);

      // 적 패널 사망 연출
      this.enemyPanel.playDeathEffect(goldReward, goldBonus, freeRerollBonus, () => {
        // 연출 완료 후 flying 이펙트 시작
        const fromX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const fromY = ENEMY_Y + 176;
        const goldPos   = this.shopPanel.getGoldWorldPos();
        const rerollPos = this.shopPanel.getRerollBtnWorldPos();

        let doneCount = 0;
        const onFlyDone = () => {
          doneCount++;
          if (doneCount < 2) return;
          // 두 이펙트 모두 완료 → 실제 반영
          this.battleSystem.applyNextWave(goldReward, freeRerollBonus);
          this.enemyPanel.clearDeathOverlay();
          this.refreshUI();
          this.showMessage(`WAVE ${wave} CLEAR!`, THEME.TEXT_GOLD);
        };

        this.flyEffect(fromX, fromY - 10, goldPos.x, goldPos.y,
          `+${goldReward} G`, 0xFFD700, onFlyDone);
        this.flyEffect(fromX, fromY + 10, rerollPos.x, rerollPos.y,
          `x${freeRerollBonus} REROLL`, 0x88CCFF, onFlyDone);
      });
    });

    this.gameEvents.on(GameEvents.BATTLE_ENDED, (data: unknown) => {
      const { victory } = data as { victory: boolean };
      this.time.delayedCall(1200, () => {
        if (victory) {
          this.scene.start('JokerSelectScene', { state: this.state });
        } else {
          this.scene.start('GameOverScene');
        }
      });
    });

    this.gameEvents.on(GameEvents.PHASE_CHANGED, (data: unknown) => {
      const { phase } = data as { phase: string };
      this.spinButton.setEnabled(phase === 'PlayerTurn');
    });

    this.gameEvents.on(GameEvents.GOLD_CHANGED, () => this.refreshUI());
  }

  private onSpinPressed(): void {
    if (this.state.phase !== 'PlayerTurn') return;
    if (this.wheel.isSpinning()) return;

    const spinResult = this.battleSystem.startSpin();
    if (!spinResult) return;

    this.spinButton.setEnabled(false);

    // 룰렛 회전 중 사운드 시작
    this.rouletteIngSound = this.sound.add('roulette_ing', { loop: true });
    this.rouletteIngSound.play();

    this.wheel.spinTo(spinResult.finalAngle, () => {
      // 회전 중 사운드 즉시 정지
      this.rouletteIngSound.stop();
      // 1단계: 플레이어 슬롯 효과 발동 후 UI 반영
      const needsEnemyTurn = this.battleSystem.resolvePlayerPhase();
      this.refreshUI();

      // 2단계: 잠시 후 적 공격 발동
      if (needsEnemyTurn) {
        this.time.delayedCall(700, () => {
          this.battleSystem.resolveEnemyPhase();
          // 적 발사체 도착(~320ms) 이후에 UI 갱신 → HP 바 타이밍 자연스럽게
          this.time.delayedCall(380, () => this.refreshUI());
        });
      }
    });
  }

  private refreshUI(): void {
    this.playerPanel.update(this.state);
    this.enemyPanel.update(this.state.enemy);
    this.jokerPanel.updateJokers(this.state.jokers);
    this.wheel.refreshSlots(this.state.slots);
  }

  private showMessage(text: string, color: string = '#ffffff'): void {
    const { width, height } = this.cameras.main;
    const msg = this.add.text(width / 2, height / 2 - 60, text, {
      fontSize: '26px', color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: msg,
      y: height / 2 - 130,
      alpha: 0,
      duration: 1800,
      ease: 'Quad.Out',
      onComplete: () => msg.destroy(),
    });
  }

  /** 텍스트가 from → to 로 날아가며 도착 시 버스트 후 onComplete 호출 */
  private flyEffect(
    fromX: number, fromY: number,
    toX: number,   toY: number,
    label: string,
    color: number,
    onComplete: () => void,
  ): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const txt = this.add.text(fromX, fromY, label, {
      fontSize: '15px', color: hex, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: txt,
      x: toX,
      y: toY,
      scaleX: 0.45,
      scaleY: 0.45,
      alpha: 0.85,
      duration: 580,
      ease: 'Cubic.InOut',
      onComplete: () => {
        txt.destroy();
        // 도착지 버스트
        const burst = this.add.text(toX, toY, label, {
          fontSize: '13px', color: hex, fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(200);
        this.tweens.add({
          targets: burst,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 280,
          ease: 'Quad.Out',
          onComplete: () => { burst.destroy(); onComplete(); },
        });
      },
    });
  }
}
