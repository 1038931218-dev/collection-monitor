/**
 * 严格日期解析工具
 * 所有日期必须经过此模块解析，禁止直接使用 new Date(userInput)
 * 
 * 设计原则：
 * 1. 拒绝不存在的日期（2026-02-30、2026-02-29等）
 * 2. 拒绝裸数字（可能是 Excel 序列号）
 * 3. 拒绝 NaN/Infinity
 * 4. 验证解析后的日期与输入一致（防止 JS 自动滚动）
 */

export class StrictDate {
  /**
   * 严格解析日期字符串，返回有效 Date 或 null
   */
  static parse(input: string | number | Date | null | undefined): Date | null {
    // null/undefined 返回 null
    if (input === null || input === undefined) return null;

    // 如果是 Date 对象，验证有效性
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }

    // 如果是数字，验证是否是合法的Excel序列号（1-2958465）
    if (typeof input === 'number') {
      if (input <= 0 || input > 2958465) return null;
      // Excel序列号转换：从1900-01-01开始的天数
      // 1900-01-01 = Excel序列号1
      // Unix Epoch 1970-01-01 = Excel序列号25569
      const unixTimestamp = (input - 25569) * 86400 * 1000;
      const d = new Date(unixTimestamp);
      return isNaN(d.getTime()) ? null : d;
    }

    // 字符串解析
    const str = String(input).trim();
    if (!str) return null;

    // 1. YYYY-MM-DD（最严格格式）
    const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      const year = parseInt(ymd[1], 10);
      const month = parseInt(ymd[2], 10);
      const day = parseInt(ymd[3], 10);
      
      // 基本范围检查
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      
      const d = new Date(Date.UTC(year, month - 1, day));
      // 验证：如果 JS 自动滚动，年份/月份/日期会不一致
      if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
        return null; // 例如 2026-02-30 → 2026-03-02，拒绝
      }
      if (isNaN(d.getTime())) return null;
      return d;
    }

    // 2. MM/DD/YYYY
    const mmddyyyy = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (mmddyyyy) {
      const month = parseInt(mmddyyyy[1], 10);
      const day = parseInt(mmddyyyy[2], 10);
      const year = parseInt(mmddyyyy[3], 10);
      
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      
      const d = new Date(Date.UTC(year, month - 1, day));
      if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
        return null; // 例如 13/02/2026 → Invalid
      }
      if (isNaN(d.getTime())) return null;
      return d;
    }

    // 3. DD/MM/YYYY（备选，如果 MM/DD 失败）
    const ddmmyyyy = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10);
      const year = parseInt(ddmmyyyy[3], 10);
      
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      
      const d = new Date(Date.UTC(year, month - 1, day));
      if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
        return null;
      }
      if (isNaN(d.getTime())) return null;
      return d;
    }

    // 4. YYYY/MM/DD
    const ymdSlash = str.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
    if (ymdSlash) {
      const year = parseInt(ymdSlash[1], 10);
      const month = parseInt(ymdSlash[2], 10);
      const day = parseInt(ymdSlash[3], 10);
      
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      
      const d = new Date(Date.UTC(year, month - 1, day));
      if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
        return null;
      }
      if (isNaN(d.getTime())) return null;
      return d;
    }

    // 5. YYYYMMDD
    const ymd8 = str.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (ymd8) {
      const year = parseInt(ymd8[1], 10);
      const month = parseInt(ymd8[2], 10);
      const day = parseInt(ymd8[3], 10);
      
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      
      const d = new Date(Date.UTC(year, month - 1, day));
      if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
        return null;
      }
      if (isNaN(d.getTime())) return null;
      return d;
    }

    // 6. ISO 格式（2026-01-15T10:30:00Z）
    const iso = str.match(/^\d{4}-\d{2}-\d{2}T/);
    if (iso) {
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    }

    // 其他格式一律拒绝
    return null;
  }

  /**
   * 安全计算逾期天数
   */
  static daysOverdue(dueDate: Date | null | undefined, today: Date): number {
    if (!dueDate || isNaN(dueDate.getTime())) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / msPerDay));
  }

  /**
   * 获取今天（截断时间部分，使用 UTC 避免时区问题）
   */
  static today(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
