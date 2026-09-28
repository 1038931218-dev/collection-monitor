/**
 * 生成示例 Report JSON（Phase 1 完整链路输出）
 */

import { normalizeInvoices } from '../src/data-normalizer';
import { calculateARHealth } from '../src/ar-engine';
import { generateCollectionTasks } from '../src/priority-engine';
import { generateCollectionReport } from '../src/lib/report-generator';
import { generateTestInvoices } from './test-data';

const invoices = generateTestInvoices();
const normalized = normalizeInvoices(invoices);
const arReport = calculateARHealth(normalized);
const tasks = generateCollectionTasks(normalized, arReport.customer_aggregations, 5);
const report = generateCollectionReport(normalized, arReport, tasks);

console.log(JSON.stringify(report, null, 2));
