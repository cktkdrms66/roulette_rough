export const THEME = {
  // 배경
  BG_DARK:       0x0f0a0a,  // 메인 배경 (다크 레드-블랙)
  BG_FELT:       0x0d2b18,  // 카지노 테이블 그린 (참고용)

  // 벽돌 패널
  BRICK_BASE:    0x2d1a10,  // 벽돌 색
  BRICK_MORTAR:  0x0f0804,  // 줄눈 색
  PANEL_OVERLAY: 0x000000,  // 정보 표시 오버레이 (alpha 0.45)

  // 강조
  GOLD:          0xFFD700,  // 골드 (주요 강조)
  GOLD_DARK:     0xAD8B00,  // 다크 골드 (테두리)
  RED_DEEP:      0x8B0000,  // 딥 레드 (위험/HP)
  RED_BRIGHT:    0xCC0000,  // 브라이트 레드 (카드 수트)

  // 텍스트
  TEXT_CREAM:    '#F5E6C8', // 크림 (기본 텍스트)
  TEXT_GOLD:     '#FFD700', // 골드 (강조 텍스트)
  TEXT_DIM:      '#8B7355', // 어두운 (보조 텍스트)

  // 카드
  CARD_BG:       0xF5F0E0,  // 아이보리 (카드 배경)
  CARD_SHADOW:   0x000000,  // 카드 그림자
} as const;

// 카드 타입 → 수트 매핑
export const CARD_SUITS: Record<string, { symbol: string; color: number; colorStr: string }> = {
  ModifyRandom: { symbol: '\u2665', color: 0xCC0000, colorStr: '#CC0000' },  // ♥
  ModifySelect: { symbol: '\u2666', color: 0xCC0000, colorStr: '#CC0000' },  // ♦
  ReplaceSlots: { symbol: '\u2660', color: 0x1a1a1a, colorStr: '#1a1a1a' },  // ♠
  ModifyGlobal: { symbol: '\u2663', color: 0x1a1a1a, colorStr: '#1a1a1a' },  // ♣
  RuleModify:   { symbol: '\u2605', color: 0xFFD700, colorStr: '#FFD700' },  // ★
};

/** 벽돌 패턴을 Graphics에 그립니다 (패널 배경용) */
export function drawBricks(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  offsetX: number = 0,
  offsetY: number = 0,
): void {
  const BW = 28, BH = 12, M = 2;
  const rows = Math.ceil(h / (BH + M)) + 1;
  const cols = Math.ceil(w / (BW + M)) + 2;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * ((BW + M) / 2);
    for (let c = -1; c < cols; c++) {
      const bx = offsetX + c * (BW + M) + offset;
      const by = offsetY + r * (BH + M);

      // 4방향 클리핑: 패널 경계 밖으로 나가지 않게 좌표와 크기를 모두 조정
      const drawX = Math.max(bx, offsetX);
      const drawY = Math.max(by, offsetY);
      const drawW = Math.min(bx + BW, offsetX + w) - drawX;
      const drawH = Math.min(by + BH, offsetY + h) - drawY;
      if (drawW <= 0 || drawH <= 0) continue;

      // 벽돌마다 미세한 명도 변화 (결정론적)
      const shade = ((r * 7 + c * 13) % 5) * 0x020101;
      g.fillStyle(THEME.BRICK_BASE + shade, 1);
      g.fillRect(drawX, drawY, drawW, drawH);
    }
  }
}
