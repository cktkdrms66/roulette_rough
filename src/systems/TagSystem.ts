import { BattleState } from '../types/battle.types';
import { Slot } from '../types/slot.types';
import { SlotTag, TagType, TagEffectResult, AddTagResult } from '../types/tag.types';
import { JokerDef } from '../types/joker.types';
import { getTagDef } from '../data/tags';
import { TypedEventEmitter, GameEvents } from '../events/GameEvents';
import { addPlayerShield, healPlayer } from './DamageSystem';

export class TagSystem {
  // 스핀 시작 시 모든 슬롯의 태그 charges를 baseLifespan으로 리셋
  resetTagsForNewSpin(state: BattleState): void {
    for (const slot of state.slots) {
      for (const tag of slot.tags) {
        if (tag.baseLifespan !== null) {
          tag.currentCharges = tag.baseLifespan;
        }
      }
    }
  }

  // 슬롯 발동 시 태그 효과 계산 및 적용 — 결과를 TagEffectResult로 반환
  // GOLD, HEAL, SHIELD는 여기서 직접 적용
  // CRITICAL, CONSECUTIVE, MOVE_RIGHT/LEFT는 결과를 BattleSystem에 전달
  executeTagEffects(
    state: BattleState,
    slotIndex: number,
    events: TypedEventEmitter,
    depth: number = 0,
  ): TagEffectResult {
    const slot = state.slots[slotIndex];
    const result: TagEffectResult = {
      critMultiplier: 1.0,
      extraExecutions: 0,
      goldGained: 0,
      healAmount: 0,
      shieldAmount: 0,
      breakEnemyShield: false,
      moveDirection: null,
      didCrit: false,
    };

    if (!slot || slot.tags.length === 0) return result;

    // 1. EXTEND_LIFESPAN 먼저 처리 → 다른 태그 charges 연장
    for (const tag of slot.tags) {
      if (tag.type !== 'EXTEND_LIFESPAN') continue;
      if (!this.consumeCharge(tag)) continue;

      const bonus = 1 + Math.floor((tag.level - 1) / 2);
      for (const other of slot.tags) {
        if (other === tag) continue;
        if (other.currentCharges !== null && other.baseLifespan !== null) {
          other.currentCharges = Math.min(other.currentCharges + bonus, other.baseLifespan + bonus);
        }
      }
      events.emit(GameEvents.TAG_TRIGGERED, { type: 'EXTEND_LIFESPAN', slotIndex, bonus });
    }

    // 2. ACTIVATE → 비활성 태그 1개 활성화
    for (const tag of slot.tags) {
      if (tag.type !== 'ACTIVATE') continue;
      if (!this.consumeCharge(tag)) continue;

      const inactive = slot.tags.filter(
        t => t !== tag && t.currentCharges !== null && t.currentCharges === 0,
      );
      if (inactive.length > 0) {
        const pick = inactive[Math.floor(Math.random() * inactive.length)];
        pick.currentCharges = 1;
        events.emit(GameEvents.TAG_TRIGGERED, { type: 'ACTIVATE', slotIndex });
      }
    }

    // 3. SHIELD_BREAK → 적 실드 즉시 제거
    for (const tag of slot.tags) {
      if (tag.type !== 'SHIELD_BREAK') continue;
      if (!this.isActive(tag)) continue;
      // SHIELD_BREAK는 무제한 수명 → 소모 없음
      result.breakEnemyShield = true;
      events.emit(GameEvents.TAG_TRIGGERED, { type: 'SHIELD_BREAK', slotIndex });
    }

    // 4. CRITICAL → 크리티컬 판정
    for (const tag of slot.tags) {
      if (tag.type !== 'CRITICAL') continue;
      if (!this.isActive(tag)) continue;

      const chance = 0.3 + 0.1 * (tag.level - 1);
      const critChanceBonus = this.getCritChanceBonusFromJokers(state.jokers);
      const totalChance = Math.min(chance + critChanceBonus, 1.0);

      if (Math.random() < totalChance) {
        // 크리티컬 배율 계산 (기본 1.5 + 조커 보정)
        const critMult = 1.5 + this.getCritMultiplierBonusFromJokers(state.jokers);
        result.critMultiplier = Math.max(result.critMultiplier, critMult);
        result.didCrit = true;
        events.emit(GameEvents.TAG_TRIGGERED, { type: 'CRITICAL', slotIndex, multiplier: critMult });
      }
    }

    // 5. CONSECUTIVE → 추가 발동 횟수
    for (const tag of slot.tags) {
      if (tag.type !== 'CONSECUTIVE') continue;
      if (!this.isActive(tag)) continue;

      const levelBonus = this.getConsecutiveLevelBonusFromJokers(state.jokers);
      const effectiveLevel = Math.min(tag.level + levelBonus, tag.maxLevel);
      const extra = 1 + Math.floor((effectiveLevel - 1) / 2);
      result.extraExecutions = Math.max(result.extraExecutions, extra);
      events.emit(GameEvents.TAG_TRIGGERED, { type: 'CONSECUTIVE', slotIndex, executions: extra + 1 });
    }

    // 6. GOLD 수집
    for (const tag of slot.tags) {
      if (tag.type !== 'GOLD') continue;
      if (!this.isActive(tag)) continue;

      const gold = 1 + tag.level;
      result.goldGained += gold;
      events.emit(GameEvents.TAG_TRIGGERED, { type: 'GOLD', slotIndex, amount: gold });
    }

    // 7. HEAL 수집
    for (const tag of slot.tags) {
      if (tag.type !== 'HEAL') continue;
      if (!this.isActive(tag)) continue;

      const heal = 4 + tag.level;
      result.healAmount += heal;
      events.emit(GameEvents.TAG_TRIGGERED, { type: 'HEAL', slotIndex, amount: heal });
    }

    // 8. SHIELD 수집
    for (const tag of slot.tags) {
      if (tag.type !== 'SHIELD') continue;
      if (!this.isActive(tag)) continue;

      const shield = 1 + tag.level;
      result.shieldAmount += shield;
      events.emit(GameEvents.TAG_TRIGGERED, { type: 'SHIELD', slotIndex, amount: shield });
    }

    // 9. MOVE_RIGHT / MOVE_LEFT (depth < 12)
    if (depth < 12) {
      for (const tag of slot.tags) {
        if (tag.type === 'MOVE_RIGHT') {
          if (!this.consumeCharge(tag)) continue;
          result.moveDirection = 'right';
          events.emit(GameEvents.TAG_TRIGGERED, { type: 'MOVE_RIGHT', slotIndex });
          break;
        }
        if (tag.type === 'MOVE_LEFT') {
          if (!this.consumeCharge(tag)) continue;
          result.moveDirection = 'left';
          events.emit(GameEvents.TAG_TRIGGERED, { type: 'MOVE_LEFT', slotIndex });
          break;
        }
      }
    }

    // GOLD / HEAL / SHIELD 즉시 상태에 적용
    if (result.goldGained > 0) {
      state.playerGold += result.goldGained;
      events.emit(GameEvents.GOLD_CHANGED, {
        amount: result.goldGained,
        newTotal: state.playerGold,
      });
    }

    if (result.healAmount > 0) {
      const healed = healPlayer(state, result.healAmount);
      events.emit(GameEvents.HEAL_APPLIED, { amount: healed });
    }

    if (result.shieldAmount > 0) {
      addPlayerShield(state, result.shieldAmount);
      events.emit(GameEvents.SHIELD_GAINED, { target: 'player', amount: result.shieldAmount });
    }

    return result;
  }

  // 태그 추가 로직
  addTagToSlot(slot: Slot, tagType: TagType, level: number = 1): AddTagResult {
    const tagDef = getTagDef(tagType);
    const existing = slot.tags.find(t => t.type === tagType);

    if (existing) {
      if (existing.level < existing.maxLevel) {
        // 레벨업
        existing.level += level;
        existing.level = Math.min(existing.level, existing.maxLevel);
        return { success: true, leveledUp: true, needsRemoval: false };
      } else {
        // 최대 레벨 도달 → 중복 부여 가능한지 확인
        if (slot.tags.length >= slot.maxTags) {
          return { success: false, leveledUp: false, needsRemoval: true };
        }
        // 새 태그 추가 (중복)
        slot.tags.push(this.createTag(tagType, level, tagDef));
        return { success: true, leveledUp: false, needsRemoval: false };
      }
    }

    // 새 태그
    if (slot.tags.length >= slot.maxTags) {
      return { success: false, leveledUp: false, needsRemoval: true };
    }
    slot.tags.push(this.createTag(tagType, level, tagDef));
    return { success: true, leveledUp: false, needsRemoval: false };
  }

  // 패시브 보정: 조커로부터 치명타 확률 보너스
  getCritChanceBonusFromJokers(jokers: JokerDef[]): number {
    let bonus = 0;
    for (const j of jokers) {
      if (j.id === 'JOKER_CRIT_CHANCE') {
        bonus += j.param ?? 0.1;
      }
    }
    return bonus;
  }

  // 패시브 보정: 조커로부터 치명타 배율 보너스 (기본 1.5 위에 추가)
  getCritMultiplierBonusFromJokers(jokers: JokerDef[]): number {
    let bonus = 0;
    for (const j of jokers) {
      if (j.id === 'JOKER_DOUBLE_CRIT') {
        // 1.5 → 2.0: +0.5 적용 (사실 DOUBLE_CRIT은 기본 1.5에서 배가 = 1.5 → 2.0)
        // param=1.0은 "배율을 +1.0배"가 아니라 "기본치에서 더하는 양"으로 해석
        bonus += j.param ?? 0;
      }
      if (j.id === 'JOKER_CRIT_DMG') {
        bonus += j.param ?? 0.5;
      }
    }
    return bonus;
  }

  // 패시브 보정: 조커로부터 연속 태그 레벨 보너스
  getConsecutiveLevelBonusFromJokers(jokers: JokerDef[]): number {
    let bonus = 0;
    for (const j of jokers) {
      if (j.id === 'JOKER_CONSECUTIVE_UP') {
        bonus += j.param ?? 1;
      }
    }
    return bonus;
  }

  // 태그가 활성 상태인지 (charges > 0 또는 무제한)
  private isActive(tag: SlotTag): boolean {
    if (tag.currentCharges === null) return true;
    return tag.currentCharges > 0;
  }

  // charge 소모 시도 → 성공 여부 반환
  private consumeCharge(tag: SlotTag): boolean {
    if (tag.currentCharges === null) return true;
    if (tag.currentCharges <= 0) return false;
    tag.currentCharges -= 1;
    return true;
  }

  private createTag(type: TagType, level: number, tagDef: ReturnType<typeof getTagDef>): SlotTag {
    const charges = tagDef.baseLifespan !== null ? tagDef.baseLifespan : null;
    return {
      type,
      level: Math.min(level, tagDef.maxLevel),
      maxLevel: tagDef.maxLevel,
      baseLifespan: tagDef.baseLifespan,
      currentCharges: charges,
    };
  }
}
