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

    // ── 배경 ────────────────────────────────────────
    this.add.rectangle(0, 0, width, height, 0x0e0e1a).setOrigin(0);

    // 열 구분선 (장식)
    const dividers = this.add.graphics();
    dividers.lineStyle(1, 0x1c2a3a, 1);
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
        // HP 바 즉시 갱신 → 이후 애니메이션은 눈요기
        this.refreshUI();
        const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const toY = ENEMY_Y + 176;
        AttackEffect.shoot(this, CENTER_X, 150, toX, toY, 0xff5500, () => {
          DamageNumber.show(this, toX, ENEMY_Y + 60, amount, 'damage');
          this.enemyPanel.playHitEffect();
          this.sound.play('attack');
        });
      } else {
        // HP 바 즉시 갱신 → 이후 애니메이션은 눈요기
        this.refreshUI();
        const src = this.enemyPanel.getActionCardWorldCenter();
        const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const toY = PLAYER_Y + 176;
        AttackEffect.shootFromEnemy(this, src.x, src.y, toX, toY, () => {
          DamageNumber.show(this, toX, PLAYER_Y + 60, amount, 'damage');
          this.playerPanel.playHitEffect('attack');
          this.sound.play('attack');
        });
      }
    });

    this.gameEvents.on(GameEvents.SHIELD_GAINED, (data: unknown) => {
      const { target } = data as { target: 'player' | 'enemy'; amount: number };
      if (target === 'player') {
        // 룰렛 → 플레이어 패널 (파란 방어 이펙트)
        const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const toY = PLAYER_Y + 176;
        AttackEffect.shootShield(this, CENTER_X, 150, toX, toY, () => {
          this.playerPanel.playHitEffect('shield');
          this.sound.play('shield');
        });
      } else {
        // 적 행동 카드 → 오른쪽으로 뻗었다 U턴 → 적 패널
        const src = this.enemyPanel.getActionCardWorldCenter();
        const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const toY = ENEMY_Y + 140;
        AttackEffect.shootEnemyShield(this, src.x, src.y, toX, toY, () => {
          this.enemyPanel.playHitEffect('shield');
          this.sound.play('shield');
        });
      }
      this.refreshUI(); // 실드 바 즉시 반영
    });

    this.gameEvents.on(GameEvents.HEAL_APPLIED, (data: unknown) => {
      const { amount } = data as { amount: number };
      DamageNumber.show(this, LEFT_PANEL_X + LEFT_PANEL_W / 2, PLAYER_Y + 100, amount, 'heal');
      this.refreshUI();
    });

    this.gameEvents.on(GameEvents.CURSE_TRIGGERED, (data: unknown) => {
      const { damage } = data as { damage: number };
      // 룰렛 → 플레이어 패널 (저주 이펙트)
      const toX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
      const toY = PLAYER_Y + 176;
      AttackEffect.shootCurse(this, CENTER_X, 150, toX, toY, () => {
        DamageNumber.show(this, toX, PLAYER_Y + 60, damage, 'curse');
        this.playerPanel.playHitEffect('curse');
        this.cameras.main.shake(150, 0.005);
        this.sound.play('attack');
      });
      this.refreshUI();
    });

    this.gameEvents.on(GameEvents.SPIN_LANDED, (data: unknown) => {
      const { index } = data as { index: number };
      this.wheel.highlightLanded(index);
    });

    this.gameEvents.on(GameEvents.WAVE_CLEARED, (data: unknown) => {
      const { wave, goldReward } = data as { wave: number; goldReward: number };
      this.showMessage(`웨이브 ${wave} 클리어!  +${goldReward}💰`, '#f1c40f');
      this.waveIndicator.update(this.state.wave, this.state.maxWaves);
      this.refreshUI();
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
}
