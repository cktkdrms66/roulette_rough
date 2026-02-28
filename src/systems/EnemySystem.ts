import { BattleState } from '../types/battle.types';
import { getEnemyForWave, selectAction } from '../data/enemies';
import { applyDamageToPlayer, addEnemyShield } from './DamageSystem';
import { TypedEventEmitter, GameEvents } from '../events/GameEvents';

export class EnemySystem {
  // 적 턴 실행
  executeEnemyTurn(state: BattleState, events: TypedEventEmitter): void {
    if (state.playerStunned) {
      // 플레이어 스턴 시 행동 불가
      state.playerStunned = false;
      return;
    }

    const action = state.enemy.nextAction;

    switch (action.type) {
      case 'Attack': {
        const dmg = applyDamageToPlayer(state, action.value);
        events.emit(GameEvents.DAMAGE_DEALT, { target: 'player', amount: dmg });
        break;
      }
      case 'Defend': {
        addEnemyShield(state.enemy, action.value);
        events.emit(GameEvents.SHIELD_GAINED, { target: 'enemy', amount: action.value });
        break;
      }
      case 'Curse': {
        // 적 저주: 플레이어에게 피해 + 임시 저주 부여
        const dmg = applyDamageToPlayer(state, action.value);
        events.emit(GameEvents.DAMAGE_DEALT, { target: 'player', amount: dmg });
        // 임의의 슬롯을 임시 저주로 변경
        this.applyCurseToRandomSlot(state);
        break;
      }
    }

    // 다음 행동 선택
    this.prepareNextAction(state);
  }

  private applyCurseToRandomSlot(state: BattleState): void {
    const nonCurseSlots = state.slots.filter(s => s.category !== 'Curse' && s.tempCurseTimer === 0);
    if (nonCurseSlots.length === 0) return;

    const target = nonCurseSlots[Math.floor(Math.random() * nonCurseSlots.length)];
    target.originalSkillId = target.skillId;
    target.originalCategory = target.category;
    target.skillId = 'CURSE';
    target.category = 'Curse';
    target.attackType = 'None';
    target.tempCurseTimer = 2; // 2턴 후 복원
  }

  // 다음 적 행동 준비
  prepareNextAction(state: BattleState): void {
    const enemyDef = getEnemyForWave(state.wave);
    state.enemy.nextAction = selectAction(enemyDef);
  }
}
