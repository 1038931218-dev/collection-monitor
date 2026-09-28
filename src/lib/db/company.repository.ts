// Company 仓库
import { Prisma } from '@prisma/client';
import { BaseRepository, NotFoundError } from './base-repository';

export class CompanyRepository extends BaseRepository {
  async create(
    data: {
      name: string;
      currency?: string;
      owner_id: string;
    }
  ) {
    return this.db.company.create({
      data: {
        name: data.name,
        currency: data.currency ?? 'USD',
        owner_id: data.owner_id,
      },
    });
  }

  async getById(id: string) {
    const c = await this.db.company.findUnique({ where: { id } });
    if (!c) throw new NotFoundError('Company', id);
    return c;
  }

  async listByOwner(ownerId: string) {
    return this.db.company.findMany({ where: { owner_id: ownerId } });
  }

  async update(
    id: string,
    data: Partial<Pick<Prisma.CompanyCreateInput, 'name' | 'currency'>>
  ) {
    return this.db.company.update({ where: { id }, data });
  }
}
