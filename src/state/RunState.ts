import { JokerDef } from '../types/joker.types';
import { Slot } from '../types/slot.types';
import { createInitialSlots } from './BattleState';
import { getStartNode } from '../data/maps';

// 전투 간 영속 상태 (런 전체)
export interface RunState {
  playerHP: number;
  playerMaxHP: number;
  playerGold: number;
  slots: Slot[];
  jokers: JokerDef[];
  currentNodeId: string;
  completedNodeIds: string[];
  freeRerolls: number;
  globalAttackFlat: number;
}

let _runState: RunState | null = null;

export function createNewRun(): RunState {
  const state: RunState = {
    playerHP: 80,
    playerMaxHP: 80,
    playerGold: 5,
    slots: createInitialSlots(),
    jokers: [],
    currentNodeId: getStartNode().id,
    completedNodeIds: [],
    freeRerolls: 1,
    globalAttackFlat: 0,
  };
  _runState = state;
  return state;
}

export function getRunState(): RunState {
  if (!_runState) throw new Error('RunState not initialized');
  return _runState;
}

export function setRunState(state: RunState): void {
  _runState = state;
}

export function clearRunState(): void {
  _runState = null;
}
