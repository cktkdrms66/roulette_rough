import { BattleState } from '../types/battle.types';
import { SkillResult } from '../types/skill.types';
import { applyDamageToEnemy, healPlayer } from './DamageSystem';
import { TypedEventEmitter, GameEvents } from '../events/GameEvents';

export interface JokerContext {
  state: BattleState;
  events: TypedEventEmitter;
}

export class JokerSystem {
  // 공격 명중 시 조커 효과 적용 → 최종 피해 반환
  onAttackHit(ctx: JokerContext, result: SkillResult): SkillResult {
    let damage = result.value;

    for (const joker of ctx.state.jokers) {
      if (joker.trigger !== 'OnAttackHit') continue;

      switch (joker.id) {
        case 'JOKER_CURSE': {
          const curseCount = ctx.state.slots.filter(s => s.category === 'Curse').length;
          const bonus = 1 + (joker.param ?? 0.3) * curseCount;
          damage = Math.floor(damage * bonus);
          break;
        }
        case 'JOKER_DOPAMINE': {
          const count = ctx.state.consecutiveAttackCount;
          const bonus = 1 + (joker.param ?? 0.5) * count;
          damage = Math.floor(damage * bonus);
          break;
        }
        case 'JOKER_ATTACK': {
          const attackCount = ctx.state.slots.filter(s => s.category === 'Attack').length;
          const bonus = 1 + (joker.param ?? 0.3) * attackCount;
          damage = Math.floor(damage * bonus);
          break;
        }
        case 'JOKER_GROWTH': {
          ctx.state.globalAttackFlat += joker.param ?? 10;
          break;
        }
      }
    }

    return { ...result, value: damage };
  }

  // 골드 획득 시 조커 효과
  onGoldGained(ctx: JokerContext, rawAmount: number): number {
    let amount = rawAmount;

    for (const joker of ctx.state.jokers) {
      if (joker.trigger !== 'OnGoldGained') continue;

      if (joker.id === 'JOKER_GOLD') {
        amount = Math.floor(amount * (joker.param ?? 1.3));
      }
    }

    return amount;
  }

  // 저주 발동 시 조커 효과 (반환: 실제 HP 변화량, 양수=증가, 음수=감소)
  onCurseTriggered(ctx: JokerContext, baseDamage: number): number {
    const hasFool = ctx.state.jokers.some(j => j.id === 'JOKER_FOOL');
    const hasCurseCurse = ctx.state.jokers.some(j => j.id === 'JOKER_CURSE_CURSE');

    if (hasFool) {
      // HP 회복
      const joker = ctx.state.jokers.find(j => j.id === 'JOKER_FOOL')!;
      const healAmount = joker.param ?? 5;
      healPlayer(ctx.state, healAmount);
      ctx.events.emit(GameEvents.HEAL_APPLIED, { amount: healAmount });
      return healAmount; // 양수
    }

    if (hasCurseCurse) {
      // 적에게 피해
      const joker = ctx.state.jokers.find(j => j.id === 'JOKER_CURSE_CURSE')!;
      const dmg = joker.param ?? 5;
      applyDamageToEnemy(ctx.state.enemy, dmg);
      ctx.events.emit(GameEvents.DAMAGE_DEALT, { target: 'enemy', amount: dmg });
      return -baseDamage; // 원래 저주 피해는 그대로
    }

    return -baseDamage; // 기본: 플레이어 피해
  }

  // 스핀 완료 후 조커 확인 (오른쪽 조커는 RouletteSystem에서 처리)
  onSpinResolved(_ctx: JokerContext): void {
    // 오른쪽 조커는 buildTriggerList에서 이미 처리됨
  }
}
