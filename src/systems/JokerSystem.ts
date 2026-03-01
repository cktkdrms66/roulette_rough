import { BattleState } from '../types/battle.types';
import { SkillResult } from '../types/skill.types';
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
        case 'JOKER_GOLD_DMG': {
          const bonus = Math.floor(ctx.state.playerGold / 5) * (joker.param ?? 3);
          damage += bonus;
          break;
        }
        case 'JOKER_SHIELD_DMG': {
          const bonus = Math.floor(ctx.state.playerShield / 5) * (joker.param ?? 10);
          damage += bonus;
          break;
        }
      }
    }

    return { ...result, value: damage };
  }

  // 저주 발동 시 조커 효과
  onCurseTriggered(ctx: JokerContext, _baseDamage: number): void {
    for (const joker of ctx.state.jokers) {
      if (joker.trigger !== 'OnCurseTriggered') continue;

      if (joker.id === 'JOKER_CURSE_ATK') {
        const attackSlots = ctx.state.slots.filter(s => s.category === 'Attack');
        if (attackSlots.length > 0) {
          const pick = attackSlots[Math.floor(Math.random() * attackSlots.length)];
          pick.flatDamageBonus += joker.param ?? 2;
        }
      }
    }
  }

  // 적 처치 시
  onEnemyDefeated(ctx: JokerContext): void {
    for (const joker of ctx.state.jokers) {
      if (joker.trigger !== 'OnEnemyDefeated') continue;

      if (joker.id === 'JOKER_PERM_KILL') {
        const delta = joker.param ?? 1;
        for (const slot of ctx.state.slots) {
          if (slot.category === 'Attack') {
            slot.flatDamageBonus += delta;
          }
        }
      }
    }
  }

  // 플레이어 피해 시
  onPlayerDamaged(ctx: JokerContext): void {
    for (const joker of ctx.state.jokers) {
      if (joker.trigger !== 'OnPlayerDamaged') continue;

      if (joker.id === 'JOKER_DMG_ON_HIT') {
        ctx.state.waveGlobalFlat += joker.param ?? 5;
      }
    }
  }

  // 스핀 시작 시
  onSpinStart(ctx: JokerContext): void {
    for (const joker of ctx.state.jokers) {
      if (joker.trigger !== 'OnSpinStart') continue;

      if (joker.id === 'JOKER_SPIN_BOOST') {
        ctx.state.waveGlobalFlat += joker.param ?? 5;
      }
    }
  }

  // 회복 시
  onHealApplied(ctx: JokerContext): void {
    for (const joker of ctx.state.jokers) {
      if (joker.trigger !== 'OnHealApplied') continue;

      if (joker.id === 'JOKER_HEAL_BOOST') {
        ctx.state.waveGlobalFlat += joker.param ?? 10;
      }
    }
  }

  // 치명타 발생 시
  onCriticalHit(ctx: JokerContext): void {
    for (const joker of ctx.state.jokers) {
      if (joker.trigger !== 'OnCriticalHit') continue;

      switch (joker.id) {
        case 'JOKER_CRIT_GOLD': {
          const gold = joker.param ?? 1;
          ctx.state.playerGold += gold;
          ctx.events.emit(GameEvents.GOLD_CHANGED, {
            amount: gold,
            newTotal: ctx.state.playerGold,
          });
          break;
        }
        case 'JOKER_CRIT_BOOST': {
          const attackSlots = ctx.state.slots.filter(s => s.category === 'Attack');
          if (attackSlots.length > 0) {
            const pick = attackSlots[Math.floor(Math.random() * attackSlots.length)];
            pick.flatDamageBonus += joker.param ?? 1;
          }
          break;
        }
      }
    }
  }

  // 스핀 완료 시 → true 반환 시 BattleSystem이 재스핀
  onSpinResolved(ctx: JokerContext): boolean {
    for (const joker of ctx.state.jokers) {
      if (joker.trigger !== 'OnSpinResolved') continue;

      if (joker.id === 'JOKER_REROLL') {
        if (Math.random() < (joker.param ?? 0.2)) {
          return true; // 재스핀 트리거
        }
      }
    }
    return false;
  }

  // 골드 획득 시 (현재 사용 안 함, 확장용)
  onGoldGained(_ctx: JokerContext, rawAmount: number): number {
    return rawAmount;
  }

  // 저주 발동 시: 피해 면제 여부 반환 (현재 시스템에서는 항상 false)
  onCurseFoolCheck(_ctx: JokerContext, _damage: number): boolean {
    return false;
  }
}
