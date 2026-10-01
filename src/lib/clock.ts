/**
 * Clock 接口 - 支持测试注入固定时间
 */
export interface Clock {
  now(): Date;
}

/**
 * 系统时钟实现
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/**
 * 测试时钟实现 - 返回固定时间
 */
export class TestClock implements Clock {
  constructor(private fixedDate: Date) {}

  now(): Date {
    return new Date(this.fixedDate);
  }
}

/**
 * 默认使用系统时钟
 */
let currentClock: Clock = new SystemClock();

/**
 * 设置测试时钟（仅用于测试）
 */
export function setTestClock(clock: Clock): void {
  currentClock = clock;
}

/**
 * 重置为系统时钟
 */
export function resetClock(): void {
  currentClock = new SystemClock();
}

/**
 * 获取当前时钟
 */
export function getCurrentClock(): Clock {
  return currentClock;
}

/**
 * 获取当前日期（截断时间部分）
 */
export function getToday(): Date {
  const now = currentClock.now();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
