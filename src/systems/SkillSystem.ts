import { BattleState } from '../types/battle.types';
import { Slot } from '../types/slot.types';
import { SkillResult } from '../types/skill.types';
import { getSkill } from '../data/skills';
import { calculateDamage } from './DamageSystem';

// SkillSystem은 '결과 계산'만 담당 (실제 상태 변경은 BattleSystem이 수행)
export class SkillSystem {
  executeSkill(state: BattleState, slot: Slot): SkillResult {
    const skill = getSkill(slot.skillId);

    switch (skill.id) {
      case 'BASIC_ATTACK':
      case 'POWER_STRIKE':
      case 'FIRE_BOLT':
      case 'THUNDER_CLAP':
        return this.calcAttack(state, slot, 1);

      case 'RAPID_STRIKE':
        return this.calcAttack(state, slot, skill.hitCount ?? 3);

      case 'COLD_PUNCH':
        return this.calcColdPunch(state, slot);

      case 'DEFENSE':
        return this.calcDefense(state, slot);

      case 'HEAL':
        return this.calcHeal(state, slot);

      case 'DEEP_BREATH':
        return this.calcDeepBreath(slot);

      case 'CURSE':
        return this.calcCurse(slot, false);

      case 'HEAVY_CURSE':
        return this.calcCurse(slot, true);

      default:
        return { type: 'noop', value: 0 };
    }
  }

  private calcAttack(state: BattleState, slot: Slot, hitCount: number): SkillResult {
    const skill = getSkill(slot.skillId);
    const damage = calculateDamage({
      basePower: skill.basePower,
      flatBonus: slot.flatDamageBonus,
      percentBonus: slot.percentDamageBonus,
      globalFlat: state.globalAttackFlat + state.waveGlobalFlat,
      multiplier: state.nextAttackMultiplier,
      hitCount,
    });

    return {
      type: 'damage',
      value: damage,
      hitCount,
      slotIndex: slot.index,
    };
  }

  private calcColdPunch(state: BattleState, slot: Slot): SkillResult {
    const skill = getSkill(slot.skillId);
    // 적이 공격 준비 중이면 스턴 + 추가 피해
    const willStun = state.enemy.nextAction.type === 'Attack';
    const bonus = willStun ? (skill.specialParam ?? 5) : 0;

    const damage = calculateDamage({
      basePower: skill.basePower + bonus,
      flatBonus: slot.flatDamageBonus,
      percentBonus: slot.percentDamageBonus,
      globalFlat: state.globalAttackFlat + state.waveGlobalFlat,
      multiplier: state.nextAttackMultiplier,
      hitCount: 1,
    });

    return {
      type: 'damage',
      value: damage,
      targetWasStunned: willStun,
      slotIndex: slot.index,
    };
  }

  private calcDefense(_state: BattleState, slot: Slot): SkillResult {
    const skill = getSkill(slot.skillId);
    return {
      type: 'shield',
      value: skill.basePower + slot.flatDamageBonus,
      slotIndex: slot.index,
    };
  }

  private calcHeal(_state: BattleState, slot: Slot): SkillResult {
    const skill = getSkill(slot.skillId);
    return {
      type: 'heal',
      value: skill.basePower + slot.flatDamageBonus,
      slotIndex: slot.index,
    };
  }

  private calcDeepBreath(slot: Slot): SkillResult {
    const skill = getSkill(slot.skillId);
    return {
      type: 'buff',
      value: skill.specialParam ?? 2,
      slotIndex: slot.index,
    };
  }

  private calcCurse(slot: Slot, heavy: boolean): SkillResult {
    const skill = getSkill(slot.skillId);
    return {
      type: 'curse',
      value: skill.basePower,
      targetWasStunned: heavy && !!skill.specialParam,
      slotIndex: slot.index,
    };
  }
}
