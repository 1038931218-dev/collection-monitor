/**
 * 固定时钟工具 - 解决日期硬编码问题
 * 所有测试使用固定日期 2026-09-28，引擎默认使用系统时间
 */
export const TEST_FIXED_DATE = new Date('2026-09-28T00:00:00Z');

/**
 * 获取测试用的"今天"日期
 */
export function getTestToday(): Date {
  return new Date(TEST_FIXED_DATE);
}

/**
 * 计算相对日期（用于测试不同的逾期天数）
 */
export function getRelativeDate(daysOffset: number): Date {
  const date = new Date(TEST_FIXED_DATE);
  date.setDate(date.getDate() + daysOffset);
  return date;
}
