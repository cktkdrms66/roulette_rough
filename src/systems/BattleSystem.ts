import { BattleState } from '../types/battle.types';
import { TypedEventEmitter, GameEvents } from '../events/GameEvents';
import { RouletteSystem, SpinResult } from './RouletteSystem';
import { SkillSystem } from './SkillSystem';
import { JokerSystem } from './JokerSystem';
import { TagSystem } from './TagSystem';
import { EnemySystem } from './EnemySystem';
import {
  applyDamageToEnemy,
  applyDamageToPlayer,
  addPlayerShield,
  healPlayer,
  isEnemyDead,
  isPlayerDead,
} from './DamageSystem';
import { getEnemyForWave, createEnemyState } from '../data/enemies';

export class BattleSystem {
  private rouletteSystem = new RouletteSystem();
  private skillSystem = new SkillSystem();
  private jokerSystem = new JokerSystem();
  private tagSystem = new TagSystem();
  private enemySystem = new EnemySystem();

  private state: BattleState;
  private events: TypedEventEmitter;
  private lastSpinAngle: number = 0;
  private pendingSpinResult: SpinResult | null = null;
  private chainQueue: Array<{ slotIndex: number; chainDepth: number; direction: 'right' | 'left' }> = [];

  constructor(state: BattleState, events: TypedEventEmitter) {
    this.state = state;
    this.events = events;
  }

  // === 페이즈: PlayerTurn → Spinning ===
  startSpin(): SpinResult | null {
    if (this.state.phase !== 'PlayerTurn') return null;

    this.state.phase = 'Spinning';
    this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'Spinning' });

    // 스핀 시작 시 태그 charges 리셋
    this.tagSystem.resetTagsForNewSpin(this.state);

    // 조커 OnSpinStart
    this.jokerSystem.onSpinStart({ state: this.state, events: this.events });

    const result = this.rouletteSystem.resolveSpin(this.state, this.lastSpinAngle);
    this.lastSpinAngle = result.finalAngle;
    this.pendingSpinResult = result;

    this.events.emit(GameEvents.SPIN_STARTED, { targetIndex: result.landedIndex });

    return result;
  }

  // === 페이즈: Spinning → Resolving (플레이어 슬롯 발동) ===
  // 체인(MOVE_RIGHT/LEFT)은 chainQueue에 쌓기만 하고 즉시 실행하지 않음
  resolvePlayerPhase(): void {
    if (this.state.phase !== 'Spinning' || !this.pendingSpinResult) return;

    this.chainQueue = [];
    const spinResult = this.pendingSpinResult;
    this.pendingSpinResult = null;

    this.state.phase = 'Resolving';
    this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'Resolving' });
    this.events.emit(GameEvents.SPIN_LANDED, { index: spinResult.landedIndex });

    // 플레이어 슬롯 발동
    for (const slotIndex of spinResult.triggerList) {
      this.executeSlot(slotIndex);
      if (isEnemyDead(this.state.enemy)) {
        this.chainQueue = []; // 적 사망 시 체인 취소
        break;
      }
    }

    // 조커 OnSpinResolved → JOKER_REROLL 처리
    if (!isEnemyDead(this.state.enemy) && !isPlayerDead(this.state)) {
      const shouldReroll = this.jokerSystem.onSpinResolved({
        state: this.state,
        events: this.events,
      });
      if (shouldReroll) {
        // 재스핀: 랜덤 슬롯 1개 추가 발동
        const rerollIndex = Math.floor(Math.random() * this.state.slots.length);
        this.executeSlot(rerollIndex);
      }
    }

    // enemy/player dead 처리는 finishPlayerPhase()로 위임
  }

  // 체인이 남아있는지 확인
  hasPendingChain(): boolean {
    return this.chainQueue.length > 0;
  }

  // 다음 체인의 방향 미리 보기 (애니메이션용)
  peekChainDirection(): 'right' | 'left' {
    return this.chainQueue[0]?.direction ?? 'right';
  }

  // 다음 체인의 슬롯 인덱스 미리 보기 (태그 패널 표시용)
  peekChainSlotIndex(): number {
    return this.chainQueue[0]?.slotIndex ?? -1;
  }

  // 체인 슬롯 1개 실행 (애니메이션 후 BattleScene에서 호출)
  executeChainSlot(): number | null {
    if (!this.chainQueue.length || isEnemyDead(this.state.enemy)) {
      this.chainQueue = [];
      return null;
    }
    const next = this.chainQueue.shift()!;
    this.executeSlot(next.slotIndex, next.chainDepth);
    return next.slotIndex;
  }

  // 플레이어 페이즈 완료 후 사망 체크 및 최종 처리
  finishPlayerPhase(): boolean {
    if (isEnemyDead(this.state.enemy)) {
      this.handleEnemyDefeated();
      return false;
    }
    if (isPlayerDead(this.state)) {
      this.handlePlayerDefeated();
      return false;
    }
    return true; // 적 턴 진행 필요
  }

  // === 페이즈: Resolving → EnemyTurn → PlayerTurn ===
  resolveEnemyPhase(): void {
    this.runEnemyTurn();
  }

  // 슬롯 개별 실행 (태그 효과 포함)
  private executeSlot(slotIndex: number, chainDepth: number = 0): void {
    const slot = this.state.slots[slotIndex];
    if (!slot) return;

    // 1. 태그 효과 먼저 계산/적용 (GOLD, HEAL, SHIELD는 내부에서 직접 적용)
    const tagResult = this.tagSystem.executeTagEffects(
      this.state,
      slotIndex,
      this.events,
      chainDepth,
    );

    // 1a. SHIELD_BREAK: 적 실드 즉시 0으로
    if (tagResult.breakEnemyShield) {
      this.state.enemy.shield = 0;
    }

    // 2. CONSECUTIVE: 발동 횟수 결정 (1 + extraExecutions)
    const totalExecutions = 1 + tagResult.extraExecutions;

    for (let exec = 0; exec < totalExecutions; exec++) {
      // 적이 중간에 사망하면 중단
      if (isEnemyDead(this.state.enemy)) break;

      // 3. 스킬 결과 계산
      let result = this.skillSystem.executeSkill(this.state, slot);

      // 4. CRITICAL: 크리티컬 배율 적용
      if (result.type === 'damage' && tagResult.didCrit) {
        result = { ...result, value: Math.floor(result.value * tagResult.critMultiplier) };
      }

      // 5. 조커 OnAttackHit (damage 타입에만)
      if (result.type === 'damage') {
        result = this.jokerSystem.onAttackHit(
          { state: this.state, events: this.events },
          result,
        );
      }

      // 6. 실제 상태 변경
      this.applySkillResult(slotIndex, result);

      // 7. 크리티컬 발생 시 조커 OnCriticalHit
      if (result.type === 'damage' && tagResult.didCrit) {
        this.jokerSystem.onCriticalHit({ state: this.state, events: this.events });
        this.events.emit(GameEvents.CRITICAL_HIT, { slotIndex });
      }

      // 8. 조커 OnHealApplied (heal 결과 시)
      if (result.type === 'heal') {
        this.jokerSystem.onHealApplied({ state: this.state, events: this.events });
      }
    }

    // 9. MOVE_RIGHT / MOVE_LEFT: 즉시 실행하지 않고 chainQueue에 등록 (BattleScene이 애니메이션 후 실행)
    if (tagResult.moveDirection && chainDepth < 12) {
      const N = this.state.slots.length;
      const adjacent = tagResult.moveDirection === 'right'
        ? (slotIndex + 1) % N
        : (slotIndex - 1 + N) % N;
      if (!isEnemyDead(this.state.enemy)) {
        this.chainQueue.push({ slotIndex: adjacent, chainDepth: chainDepth + 1, direction: tagResult.moveDirection });
      }
    }

    this.events.emit(GameEvents.SKILL_EXECUTED, {
      skillId: slot.skillId,
      slotIndex,
      result: { type: 'noop', value: 0 },
    });
  }

  private applySkillResult(slotIndex: number, result: ReturnType<SkillSystem['executeSkill']>): void {
    switch (result.type) {
      case 'damage': {
        applyDamageToEnemy(this.state.enemy, result.value);
        this.state.consecutiveAttackCount += 1;
        this.state.nextAttackMultiplier = 1;
        if (result.targetWasStunned) {
          this.state.enemy.nextAction = { type: 'Defend', value: 0, description: '스턴됨' };
        }
        this.events.emit(GameEvents.DAMAGE_DEALT, { target: 'enemy', amount: result.value });
        break;
      }
      case 'shield': {
        addPlayerShield(this.state, result.value);
        this.state.consecutiveAttackCount = 0;
        this.events.emit(GameEvents.SHIELD_GAINED, { target: 'player', amount: result.value });
        break;
      }
      case 'heal': {
        const healed = healPlayer(this.state, result.value);
        this.state.consecutiveAttackCount = 0;
        this.events.emit(GameEvents.HEAL_APPLIED, { amount: healed });
        break;
      }
      case 'buff': {
        this.state.nextAttackMultiplier = result.value;
        this.state.consecutiveAttackCount = 0;
        break;
      }
      case 'curse': {
        // 바보 조커 / 저주저주 조커 처리
        const foolAbsorbed = this.jokerSystem.onCurseFoolCheck(
          { state: this.state, events: this.events },
          result.value,
        );
        if (!foolAbsorbed) {
          // 조커 OnCurseTriggered (JOKER_CURSE_ATK)
          this.jokerSystem.onCurseTriggered(
            { state: this.state, events: this.events },
            result.value,
          );
          applyDamageToPlayer(this.state, result.value);
          // 플레이어 피해 → JOKER_DMG_ON_HIT
          this.jokerSystem.onPlayerDamaged({ state: this.state, events: this.events });
        }
        if (result.targetWasStunned) {
          this.state.playerStunned = true;
          this.events.emit(GameEvents.PLAYER_STUNNED, {});
        }
        this.events.emit(GameEvents.CURSE_TRIGGERED, {
          slotIndex,
          damage: result.value,
        });
        break;
      }
    }
  }

  // === 적 턴 ===
  private runEnemyTurn(): void {
    this.state.phase = 'EnemyTurn';
    this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'EnemyTurn' });

    // 임시저주 타이머 감소 및 복원
    for (const slot of this.state.slots) {
      if (slot.tempCurseTimer > 0) {
        slot.tempCurseTimer -= 1;
        if (slot.tempCurseTimer === 0 && slot.originalSkillId) {
          slot.skillId = slot.originalSkillId;
          slot.category = slot.originalCategory ?? 'Attack';
          slot.attackType = 'Physical';
          delete slot.originalSkillId;
          delete slot.originalCategory;
        }
      }
    }

    try {
      const prevHP = this.state.playerHP;
      this.enemySystem.executeEnemyTurn(this.state, this.events);
      // 피해를 받은 경우 JOKER_DMG_ON_HIT 발동
      if (this.state.playerHP < prevHP) {
        this.jokerSystem.onPlayerDamaged({ state: this.state, events: this.events });
        this.events.emit(GameEvents.PLAYER_DAMAGED, {});
      }
    } catch (e) {
      console.error('[BattleSystem] executeEnemyTurn error:', e);
    }

    if (isPlayerDead(this.state)) {
      this.handlePlayerDefeated();
      return;
    }

    // 플레이어 턴 복귀
    this.state.phase = 'PlayerTurn';
    this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'PlayerTurn' });
  }

  // 적 처치
  private handleEnemyDefeated(): void {
    // 조커 OnEnemyDefeated
    this.jokerSystem.onEnemyDefeated({ state: this.state, events: this.events });
    this.events.emit(GameEvents.ENEMY_DEFEATED, {});

    this.state.wave += 1;

    if (this.state.wave > this.state.maxWaves) {
      const healAmount = this.state.playerMaxHP - this.state.playerHP;
      this.state.playerHP = this.state.playerMaxHP;
      this.state.phase = 'BattleEnd';
      this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'BattleEnd' });
      if (healAmount > 0) {
        this.events.emit(GameEvents.HEAL_APPLIED, { amount: healAmount });
      }
      this.events.emit(GameEvents.BATTLE_ENDED, { victory: true });
    } else {
      this.state.phase = 'WaveEnd';
      this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'WaveEnd' });
      this.endWave();
    }
  }

  // 플레이어 사망
  private handlePlayerDefeated(): void {
    this.state.phase = 'BattleEnd';
    this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'BattleEnd' });
    this.events.emit(GameEvents.BATTLE_ENDED, { victory: false });
  }

  // 웨이브 종료 보상
  private endWave(): void {
    const goldBonus = Math.floor(this.state.playerGold / 5);
    const goldReward = 3 + this.state.wave + goldBonus;
    const freeRerollBonus = 1;

    this.events.emit(GameEvents.WAVE_CLEARED, {
      wave: this.state.wave - 1,
      goldReward,
      goldBonus,
      freeRerollBonus,
    });
  }

  // BattleScene 연출 완료 후 호출 — 실제 상태 반영 + 다음 웨이브 진행
  applyNextWave(goldReward: number, freeRerollBonus: number): void {
    this.state.playerGold += goldReward;
    this.state.freeRerolls += freeRerollBonus;
    // 웨이브 임시 보너스 리셋
    this.state.waveGlobalFlat = 0;
    this.state.rerollCost = 2;

    this.events.emit(GameEvents.GOLD_CHANGED, {
      amount: goldReward,
      newTotal: this.state.playerGold,
    });

    // 다음 적 스폰
    const nextEnemyDef = getEnemyForWave(this.state.wave);
    this.state.enemy = createEnemyState(nextEnemyDef);

    this.state.phase = 'PlayerTurn';
    this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'PlayerTurn' });
  }

  getState(): BattleState {
    return this.state;
  }

  getCurrentAngle(): number {
    return this.lastSpinAngle;
  }
}
