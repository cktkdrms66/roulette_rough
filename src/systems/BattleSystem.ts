import { BattleState } from '../types/battle.types';
import { TypedEventEmitter, GameEvents } from '../events/GameEvents';
import { RouletteSystem, SpinResult } from './RouletteSystem';
import { SkillSystem } from './SkillSystem';
import { JokerSystem } from './JokerSystem';
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
  private enemySystem = new EnemySystem();

  private state: BattleState;
  private events: TypedEventEmitter;
  private lastSpinAngle: number = 0;
  private pendingSpinResult: SpinResult | null = null;

  constructor(state: BattleState, events: TypedEventEmitter) {
    this.state = state;
    this.events = events;
  }

  // === 페이즈: PlayerTurn → Spinning ===
  // 반환값: 휠 애니메이션에 필요한 SpinResult
  startSpin(): SpinResult | null {
    if (this.state.phase !== 'PlayerTurn') return null;

    this.state.phase = 'Spinning';
    this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'Spinning' });

    const result = this.rouletteSystem.resolveSpin(this.state, this.lastSpinAngle);
    this.lastSpinAngle = result.finalAngle;
    this.pendingSpinResult = result;

    this.events.emit(GameEvents.SPIN_STARTED, { targetIndex: result.landedIndex });

    return result;
  }

  // === 페이즈: Spinning → Resolving (플레이어 슬롯 발동) ===
  // 반환값: true면 적 턴 진행 필요 (resolveEnemyPhase 호출), false면 전투 종료
  resolvePlayerPhase(): boolean {
    if (this.state.phase !== 'Spinning' || !this.pendingSpinResult) return false;

    const spinResult = this.pendingSpinResult;
    this.pendingSpinResult = null;

    this.state.phase = 'Resolving';
    this.events.emit(GameEvents.PHASE_CHANGED, { phase: 'Resolving' });
    this.events.emit(GameEvents.SPIN_LANDED, { index: spinResult.landedIndex });

    // 플레이어 슬롯 발동
    for (const slotIndex of spinResult.triggerList) {
      this.executeSlot(slotIndex);
      if (isEnemyDead(this.state.enemy)) break;
    }

    // 적 사망
    if (isEnemyDead(this.state.enemy)) {
      this.handleEnemyDefeated();
      return false;
    }
    // 플레이어 사망 (저주 등으로 플레이어 턴에 사망 가능)
    if (isPlayerDead(this.state)) {
      this.handlePlayerDefeated();
      return false;
    }

    return true; // 적 턴 진행 필요
  }

  // === 페이즈: Resolving → EnemyTurn → PlayerTurn ===
  // resolvePlayerPhase()가 true를 반환한 후 BattleScene이 딜레이를 두고 호출
  resolveEnemyPhase(): void {
    this.runEnemyTurn();
  }

  // 슬롯 개별 실행 (계산 → 조커 → 적용)
  private executeSlot(slotIndex: number): void {
    const slot = this.state.slots[slotIndex];
    if (!slot) return;

    // 1. 스킬 결과 계산 (상태 변경 없음)
    let result = this.skillSystem.executeSkill(this.state, slot);

    // 2. 조커 효과 적용 (damage 타입에만)
    if (result.type === 'damage') {
      result = this.jokerSystem.onAttackHit(
        { state: this.state, events: this.events },
        result,
      );
    }

    // 3. 실제 상태 변경
    switch (result.type) {
      case 'damage': {
        applyDamageToEnemy(this.state.enemy, result.value);
        // 연속 공격 카운터 증가, 심호흡 배율 리셋
        this.state.consecutiveAttackCount += 1;
        this.state.nextAttackMultiplier = 1;
        // 스턴 처리
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
        // DEEP_BREATH: 다음 공격 배율 설정
        this.state.nextAttackMultiplier = result.value;
        this.state.consecutiveAttackCount = 0;
        break;
      }
      case 'curse': {
        // 조커 효과 체크 (바보 조커, 저주저주 조커)
        this.jokerSystem.onCurseTriggered(
          { state: this.state, events: this.events },
          result.value,
        );
        // 조커가 없으면 플레이어가 피해
        const hasFool = this.state.jokers.some(j => j.id === 'JOKER_FOOL');
        if (!hasFool) {
          applyDamageToPlayer(this.state, result.value);
        }
        // 무거운 저주: 플레이어 스턴
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

    this.events.emit(GameEvents.SKILL_EXECUTED, { skillId: slot.skillId, slotIndex, result });
  }

  // === 페이즈: Resolving → EnemyTurn → PlayerTurn ===
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

    // 적 행동 실행 (이벤트 핸들러 예외가 전파되어 phase 전환이 막히지 않도록 보호)
    try {
      this.enemySystem.executeEnemyTurn(this.state, this.events);
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
    this.state.freeRerolls += 1;
    this.state.playerGold += goldReward;
    // 성장형 조커 전투 내 누적치 리셋 (웨이브 간은 리셋하지 않음 - 전투 종료 시에만)
    // globalAttackFlat은 전투 전체 유지

    this.events.emit(GameEvents.WAVE_CLEARED, {
      wave: this.state.wave - 1,
      goldReward,
    });
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
