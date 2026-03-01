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
import { WaveIndicator } from '../ui/battle/WaveIndicator';
import { DamageNumber } from '../ui/battle/DamageNumber';
import { AttackEffect } from '../ui/battle/AttackEffect';
import { getTagDef } from '../data/tags';
import { SlotTag } from '../types/tag.types';
import { CardDef } from '../types/card.types';
import { CheatPanel } from '../ui/debug/CheatPanel';
import { TagSystem } from '../systems/TagSystem';

const LEFT_PANEL_X  = 5;
const LEFT_PANEL_W  = 285;
const CENTER_X      = 515;
const RIGHT_X       = 742;
const PLAYER_Y      = 361;
const ENEMY_Y       = 5;
const JOKER_Y       = 5;
const SHOP_Y        = 213;

export class BattleScene extends Phaser.Scene {
  private battleSystem!: BattleSystem;
  private state!: BattleState;
  private gameEvents!: TypedEventEmitter;

  private rouletteIngSound!: Phaser.Sound.BaseSound;

  // 태그 랜딩 패널
  private tagPanelContainers: Phaser.GameObjects.Container[] = [];
  private tagPanelBobTweens: Phaser.Tweens.Tween[] = [];

  // 치트
  private cheatPanel!: CheatPanel;
  private tagSystem: TagSystem = new TagSystem();

  // 슬롯 스왑 선택 오버레이
  private swapSelectorOverlay: Phaser.GameObjects.Container | null = null;

  // UI
  private wheel!: RouletteWheel;
  private playerPanel!: PlayerPanel;
  private enemyPanel!: EnemyPanel;
  private jokerPanel!: JokerPanel;
  private shopPanel!: ShopPanel;
  private waveIndicator!: WaveIndicator;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { wave?: number; state?: BattleState } = {}): void {
    const wave = data.wave ?? 1;

    if (data.state) {
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
        waveGlobalFlat: 0,
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

    // 배경
    this.add.rectangle(0, 0, width, height, THEME.BG_DARK).setOrigin(0);

    const wallBrick = this.add.graphics();
    wallBrick.fillStyle(THEME.BRICK_MORTAR, 1);
    wallBrick.fillRect(0, 0, width, height);
    drawBricks(wallBrick, width, height, 0, 0);

    // 스팟라이트 비네트
    const spotlight = this.add.graphics();
    const spotX = CENTER_X;
    const spotY = 320;
    const STEPS  = 32;
    const MIN_R  = 130;
    const MAX_R  = 560;

    for (let i = 0; i < STEPS; i++) {
      const t      = i / STEPS;
      const innerR = MIN_R + (MAX_R - MIN_R) * t;
      const outerR = MIN_R + (MAX_R - MIN_R) * (i + 1) / STEPS;
      const alpha  = t * t * 0.88;

      spotlight.fillStyle(THEME.BG_DARK, alpha);
      spotlight.beginPath();
      spotlight.arc(spotX, spotY, outerR, 0, Math.PI * 2, false);
      spotlight.arc(spotX, spotY, innerR, 0, Math.PI * 2, true);
      spotlight.closePath();
      spotlight.fillPath();
    }

    // 상단 장식 라인
    const topLine = this.add.graphics();
    topLine.lineStyle(1, THEME.GOLD_DARK, 0.5);
    topLine.beginPath();
    topLine.moveTo(0, 44); topLine.lineTo(width, 44);
    topLine.strokePath();

    // 열 구분선
    const dividers = this.add.graphics();
    dividers.lineStyle(1.5, THEME.GOLD_DARK, 0.6);
    dividers.beginPath();
    dividers.moveTo(295, 0); dividers.lineTo(295, height);
    dividers.moveTo(736, 0); dividers.lineTo(736, height);
    dividers.strokePath();

    // 중앙 열: 룰렛
    this.waveIndicator = new WaveIndicator(this, CENTER_X, 22);
    this.waveIndicator.update(this.state.wave, this.state.maxWaves);

    this.wheel = new RouletteWheel(this, CENTER_X, 320, this.state.slots);
    this.wheel.setOnCenterClick(() => this.onSpinPressed());
    this.wheel.setOnSlotHover(
      (idx) => {
        if (this.wheel.isSpinning()) return;
        const tags = this.state.slots[idx]?.tags ?? [];
        if (tags.length === 0) {
          this.hideTagPanels();
          return;
        }
        const slotAngleRad = Phaser.Math.DegToRad(
          this.wheel.segmentsContainer.angle + idx * 60,
        );
        const midR = (70 + 170) / 2;
        const fromX = CENTER_X + Math.cos(slotAngleRad) * midR;
        const fromY = 320 + Math.sin(slotAngleRad) * midR;
        this.showTagPanels(tags, fromX, fromY, () => { /* no-op */ });
      },
      () => this.hideTagPanels(),
    );

    // 좌측 열: 전투 패널
    this.playerPanel = new PlayerPanel(this, LEFT_PANEL_X, PLAYER_Y);
    this.playerPanel.update(this.state);

    this.enemyPanel = new EnemyPanel(this, LEFT_PANEL_X, ENEMY_Y);
    this.enemyPanel.update(this.state.enemy);

    // 우측 열: 조커 + 상점
    this.jokerPanel = new JokerPanel(this, RIGHT_X, JOKER_Y);
    this.jokerPanel.updateJokers(this.state.jokers);

    this.shopPanel = new ShopPanel(
      this,
      RIGHT_X,
      SHOP_Y,
      this.wheel,
      this.gameEvents,
      this.state,
      (card, resolve) => this.startSwapSlotSelection(card, resolve),
    );
    this.add.existing(this.shopPanel);
    this.shopPanel.update(this.state);

    // 치트 패널
    this.cheatPanel = new CheatPanel(
      this, this.state, this.gameEvents, this.tagSystem,
      () => this.refreshUI(),
    );
    this.add.existing(this.cheatPanel);

    // 치트 버튼 (우측 상단)
    this.createCheatButton(width - 56, 14);

    // 이벤트
    this.setupEventListeners();
  }

  private createCheatButton(x: number, y: number): void {
    const btnBg = this.add.graphics();
    const draw = (hovered: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hovered ? 0x5a2a0a : 0x3a1a0a, 1);
      btnBg.fillRoundedRect(-38, -12, 76, 24, 5);
      btnBg.lineStyle(1.5, THEME.GOLD_DARK, hovered ? 1 : 0.6);
      btnBg.strokeRoundedRect(-38, -12, 76, 24, 5);
    };
    draw(false);
    btnBg.setPosition(x, y).setDepth(100);

    const btnLabel = this.add.text(x, y, '⚙ CHEAT', {
      fontSize: '11px', fontStyle: 'bold', color: THEME.TEXT_CREAM,
    }).setOrigin(0.5, 0.5).setDepth(101);

    const zone = this.add.zone(x, y, 76, 24)
      .setInteractive({ useHandCursor: true }).setDepth(102);
    zone.on('pointerdown', () => this.cheatPanel.toggle());
    zone.on('pointerover', () => { draw(true); btnLabel.setColor(THEME.TEXT_GOLD); });
    zone.on('pointerout',  () => { draw(false); btnLabel.setColor(THEME.TEXT_CREAM); });
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

      this.enemyPanel.playDeathEffect(goldReward, goldBonus, freeRerollBonus, () => {
        const fromX = LEFT_PANEL_X + LEFT_PANEL_W / 2;
        const fromY = ENEMY_Y + 176;
        const goldPos   = this.shopPanel.getGoldWorldPos();
        const rerollPos = this.shopPanel.getRerollBtnWorldPos();

        let doneCount = 0;
        const onFlyDone = () => {
          doneCount++;
          if (doneCount < 2) return;
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
      this.wheel.setCenterEnabled(phase === 'PlayerTurn');
    });

    this.gameEvents.on(GameEvents.GOLD_CHANGED, () => this.refreshUI());
  }

  private onSpinPressed(): void {
    if (this.state.phase !== 'PlayerTurn') return;
    if (this.wheel.isSpinning()) return;

    const spinResult = this.battleSystem.startSpin();
    if (!spinResult) return;

    this.wheel.setCenterEnabled(false);

    this.rouletteIngSound = this.sound.add('roulette_ing', { loop: true });
    this.rouletteIngSound.play();

    this.wheel.spinTo(spinResult.finalAngle, () => {
      this.rouletteIngSound.stop();

      const landedTags = this.state.slots[spinResult.landedIndex]?.tags ?? [];

      const afterAllTurns = () => {
        this.time.delayedCall(900, () => this.hideTagPanels());
      };

      const doTurns = () => {
        this.battleSystem.resolvePlayerPhase();
        this.refreshUI();

        // 체인(MOVE_RIGHT/LEFT) 처리: 애니메이션 후 순차 실행
        const processChains = () => {
          if (!this.battleSystem.hasPendingChain()) {
            // 모든 체인 완료 → 사망 체크 및 적 턴
            const needsEnemyTurn = this.battleSystem.finishPlayerPhase();
            if (needsEnemyTurn) {
              this.time.delayedCall(700, () => {
                this.battleSystem.resolveEnemyPhase();
                this.time.delayedCall(380, () => {
                  this.refreshUI();
                  afterAllTurns();
                });
              });
            } else {
              afterAllTurns();
            }
            return;
          }

          // 현재 슬롯 애니메이션 대기 후 룰렛 회전
          const dir = this.battleSystem.peekChainDirection();
          const rotDelta = dir === 'right' ? -60 : 60;

          this.time.delayedCall(620, () => {
            this.tweens.add({
              targets: this.wheel.segmentsContainer,
              angle: this.wheel.segmentsContainer.angle + rotDelta,
              duration: 380,
              ease: 'Back.Out',
              onComplete: () => {
                const chainSlotIdx = this.battleSystem.peekChainSlotIndex();
                if (chainSlotIdx >= 0) {
                  this.wheel.highlightLanded(chainSlotIdx);
                }

                const executeAndContinue = () => {
                  this.battleSystem.executeChainSlot();
                  this.refreshUI();
                  processChains();
                };

                // 체인 슬롯에 태그가 있으면 패널 먼저 표시
                const chainTags = chainSlotIdx >= 0
                  ? (this.state.slots[chainSlotIdx]?.tags ?? [])
                  : [];

                if (chainTags.length > 0) {
                  const containerAngleDeg = this.wheel.segmentsContainer.angle;
                  const slotAngleDeg = containerAngleDeg + chainSlotIdx * 60;
                  const slotAngleRad = Phaser.Math.DegToRad(slotAngleDeg);
                  const midR = (70 + 170) / 2;
                  const fromX = CENTER_X + Math.cos(slotAngleRad) * midR;
                  const fromY = 320 + Math.sin(slotAngleRad) * midR;
                  this.showTagPanels(chainTags, fromX, fromY, executeAndContinue);
                } else {
                  executeAndContinue();
                }
              },
            });
          });
        };

        processChains();
      };

      if (landedTags.length > 0) {
        // 슬롯 월드 좌표 계산 (세그먼트 회전 반영)
        const containerAngleDeg = this.wheel.segmentsContainer.angle;
        const slotAngleDeg = containerAngleDeg + spinResult.landedIndex * 60;
        const slotAngleRad = Phaser.Math.DegToRad(slotAngleDeg);
        const midR = (70 + 170) / 2;
        const fromX = CENTER_X + Math.cos(slotAngleRad) * midR;
        const fromY = 320 + Math.sin(slotAngleRad) * midR;

        this.showTagPanels(landedTags, fromX, fromY, doTurns);
      } else {
        doTurns();
      }
    });
  }

  private showTagPanels(
    tags: SlotTag[],
    fromX: number,
    fromY: number,
    onShown: () => void,
  ): void {
    this.hideTagPanels();

    const PANEL_W    = 130;
    const PANEL_H    = 82;
    const GAP        = 10;

    // 슬롯 방향 벡터로 패널 그룹 위치 계산 (룰렛 외곽 바깥쪽)
    const WHEEL_X    = CENTER_X;
    const WHEEL_Y    = 320;
    const OUTER_R    = 170;
    const dirX       = fromX - WHEEL_X;
    const dirY       = fromY - WHEEL_Y;
    const dirLen     = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const normX      = dirX / dirLen;
    const normY      = dirY / dirLen;
    const groupCX    = WHEEL_X + normX * (OUTER_R + 20 + PANEL_H / 2);
    const groupCY    = WHEEL_Y + normY * (OUTER_R + 20 + PANEL_H / 2);

    const totalW     = tags.length * PANEL_W + (tags.length - 1) * GAP;
    const startX     = groupCX - totalW / 2 + PANEL_W / 2;

    let doneCount = 0;

    for (let i = 0; i < tags.length; i++) {
      const tag    = tags[i];
      const tagDef = getTagDef(tag.type);
      const targetX = startX + i * (PANEL_W + GAP);
      const targetY = groupCY;

      const panel = this.buildTagPanel(tag, tagDef, PANEL_W, PANEL_H);
      // 시작 위치: 슬롯 중심에서 아주 작게 시작
      panel.setPosition(fromX, fromY);
      panel.setScale(0.05);
      panel.setAlpha(0);
      panel.setDepth(150);
      this.add.existing(panel);
      this.tagPanelContainers.push(panel);

      this.tweens.add({
        targets: panel,
        x: targetX,
        y: targetY,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 420,
        delay: i * 60,
        ease: 'Back.Out',
        onComplete: () => {
          // 둥실둥실 애니메이션
          const bobTween = this.tweens.add({
            targets: panel,
            y: targetY + 5,
            duration: 1200 + i * 80,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
          });
          this.tagPanelBobTweens.push(bobTween);

          doneCount++;
          if (doneCount === tags.length) onShown();
        },
      });
    }
  }

  private hideTagPanels(): void {
    for (const tween of this.tagPanelBobTweens) tween.stop();
    this.tagPanelBobTweens = [];

    for (const panel of this.tagPanelContainers) {
      this.tweens.add({
        targets: panel,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 200,
        ease: 'Quad.In',
        onComplete: () => panel.destroy(),
      });
    }
    this.tagPanelContainers = [];
  }

  private buildTagPanel(
    tag: SlotTag,
    tagDef: { name: string; description: string; color: number },
    w: number,
    h: number,
  ): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);

    const bg = this.add.graphics();
    bg.fillStyle(THEME.PANEL_OVERLAY, 0.92);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.lineStyle(2, tagDef.color, 0.9);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.lineStyle(1, THEME.GOLD, 0.25);
    bg.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 4);
    panel.add(bg);

    // 태그 색상 헤더 바
    const header = this.add.graphics();
    header.fillStyle(tagDef.color, 0.35);
    header.fillRoundedRect(-w / 2, -h / 2, w, 22, { tl: 6, tr: 6, bl: 0, br: 0 });
    panel.add(header);

    // 이름 + 레벨
    const nameText = this.add.text(0, -h / 2 + 11, `${tagDef.name}  Lv.${tag.level}`, {
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    panel.add(nameText);

    // 설명
    const desc = this.add.text(0, -h / 2 + 38, tagDef.description, {
      fontSize: '8px',
      color: THEME.TEXT_CREAM,
      wordWrap: { width: w - 14 },
      lineSpacing: 2,
      align: 'center',
    }).setOrigin(0.5, 0);
    panel.add(desc);

    return panel;
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

  private startSwapSlotSelection(
    _card: CardDef,
    resolve: (indices: number[]) => void,
  ): void {
    // 기존 오버레이 제거
    this.swapSelectorOverlay?.destroy();
    this.swapSelectorOverlay = null;

    const WHEEL_Y   = 320;
    const OUTER_R   = 170;
    const overlayY  = WHEEL_Y - OUTER_R - 72;
    const PW = 380;
    const PH = 58;

    const overlay = this.add.container(0, 0).setDepth(200);
    this.swapSelectorOverlay = overlay;

    // 배경 패널
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.78);
    bg.fillRoundedRect(CENTER_X - PW / 2, overlayY, PW, PH, 8);
    bg.lineStyle(2, THEME.GOLD, 0.9);
    bg.strokeRoundedRect(CENTER_X - PW / 2, overlayY, PW, PH, 8);
    overlay.add(bg);

    const titleTxt = this.add.text(CENTER_X, overlayY + 16, '위치를 바꿀 룰렛 칸 2개를 선택하세요!', {
      fontSize: '14px', fontStyle: 'bold',
      color: THEME.TEXT_GOLD,
      stroke: '#000000', strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    overlay.add(titleTxt);

    const subTxt = this.add.text(CENTER_X, overlayY + 38, '( 0 / 2 선택 )', {
      fontSize: '11px', color: '#bbbbbb',
      stroke: '#000000', strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    overlay.add(subTxt);

    const selected: number[] = [];

    this.wheel.enableSlotClick((idx) => {
      // 같은 칸 재선택 방지
      if (selected.includes(idx)) return;

      selected.push(idx);
      subTxt.setText(`( ${selected.length} / 2 선택 )`);
      this.wheel.setSelectHighlight(selected);

      if (selected.length === 2) {
        this.wheel.disableSlotClick();
        this.wheel.clearHighlights();

        overlay.destroy();
        this.swapSelectorOverlay = null;

        resolve(selected);
      }
    });
  }
}
