import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../stores/entities/store.entity';
import { User } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/review.dto';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(Store)
    private storesRepository: Repository<Store>,
  ) {}

  findByStore(storeId: number) {
    return this.reviewsRepository.find({
      where: { store: { id: storeId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: number, dto: CreateReviewDto) {
    const store = await this.storesRepository.findOne({
      where: { id: dto.storeId },
    });
    if (!store) throw new NotFoundException('Store not found');

    return this.reviewsRepository.save(
      this.reviewsRepository.create({
        user: { id: userId } as User,
        store,
        rating: dto.rating,
        content: dto.content.trim(),
        imageUrl: dto.imageUrl,
      }),
    );
  }

  async remove(userId: number, id: number) {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.user.id !== userId) throw new NotFoundException('Review not found');
    await this.reviewsRepository.delete(id);
  }
}
