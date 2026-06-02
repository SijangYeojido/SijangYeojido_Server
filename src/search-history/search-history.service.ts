import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { SearchHistory } from './entities/search-history.entity';

@Injectable()
export class SearchHistoryService {
  constructor(
    @InjectRepository(SearchHistory)
    private searchHistoryRepository: Repository<SearchHistory>,
  ) {}

  findAll(userId: number) {
    return this.searchHistoryRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: 30,
    });
  }

  async create(userId: number, keyword: string) {
    const normalized = keyword.trim();
    if (!normalized) return this.findAll(userId);

    await this.searchHistoryRepository
      .createQueryBuilder()
      .delete()
      .where('"userId" = :userId', { userId })
      .andWhere('LOWER(keyword) = LOWER(:keyword)', { keyword: normalized })
      .execute();

    const row = this.searchHistoryRepository.create({
      user: { id: userId } as User,
      keyword: normalized,
    });
    await this.searchHistoryRepository.save(row);
    return this.findAll(userId);
  }

  async remove(userId: number, id: number) {
    await this.searchHistoryRepository.delete({
      id,
      user: { id: userId },
    });
  }

  async clear(userId: number) {
    await this.searchHistoryRepository.delete({ user: { id: userId } });
  }
}
