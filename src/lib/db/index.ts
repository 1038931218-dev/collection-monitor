// src/lib/db — 数据访问层统一入口
//
// 所有业务代码、UI、API 层只从这里 import，禁止直接 import @prisma/client。

export { prisma } from './client';
export { BaseRepository, CrossTenantError, NotFoundError } from './base-repository';
export { CompanyRepository } from './company.repository';
export { CustomerRepository } from './customer.repository';
export { InvoiceRepository } from './invoice.repository';
export { PaymentRecordRepository } from './payment-record.repository';
