import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Store } from '../stores/entities/store.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { CreateDealDto } from './dto/deal.dto';
import { Deal, DealStatus } from './entities/deal.entity';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal) private dealsRepository: Repository<Deal>,
    @InjectRepository(Store) private storesRepository: Repository<Store>,
    @InjectRepository(Product) private productsRepository: Repository<Product>,
    @InjectRepository(User) private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async findLive(marketId?: number, storeId?: number): Promise<Deal[]> {
    await this.expirePastDeals();
    const builder = this.dealsRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.store', 'store')
      .leftJoinAndSelect('deal.product', 'product')
      .leftJoinAndSelect('store.market', 'market')
      .where('deal.status = :status', { status: DealStatus.LIVE })
      .andWhere('deal.expiresAt > :now', { now: new Date() })
      .andWhere('deal.availableQuantity > 0')
      .orderBy('deal.expiresAt', 'ASC');

    if (marketId) {
      builder.andWhere('market.id = :marketId', { marketId });
    }
    if (storeId) {
      builder.andWhere('store.id = :storeId', { storeId });
    }

    return builder.getMany();
  }

  findMine(merchantId: number): Promise<Deal[]> {
    return this.dealsRepository.find({
      where: { store: { merchant: { id: merchantId } } },
      relations: ['store', 'store.merchant', 'product'],
      order: { expiresAt: 'ASC' },
    });
  }

  async create(merchantId: number, dto: CreateDealDto): Promise<Deal> {
    const merchant = await this.usersRepository.findOne({
      where: { id: merchantId },
    });
    if (
      merchant?.dealBlockedUntil &&
      merchant.dealBlockedUntil.getTime() > Date.now()
    ) {
      throw new ForbiddenException('Merchant is blocked from creating deals');
    }

    const store = await this.storesRepository.findOne({
      where: { id: dto.storeId },
      relations: ['merchant', 'market'],
    });
    if (!store) throw new NotFoundException('Store not found');
    if (store.merchant?.id !== merchantId) {
      throw new ForbiddenException('Store is not owned by current merchant');
    }

    const product = dto.productId
      ? await this.productsRepository.findOne({ where: { id: dto.productId } })
      : null;
    if (dto.productId && !product)
      throw new NotFoundException('Product not found');

    const deal = await this.dealsRepository.save(
      this.dealsRepository.create({
        store,
        product: product ?? undefined,
        title: dto.title,
        description: dto.description,
        dealPrice: dto.dealPrice,
        originalPrice: dto.originalPrice,
        availableQuantity: dto.availableQuantity,
        expiresAt: new Date(dto.expiresAt),
      }),
    );
    await this.notificationsService.notifyDealCreated(deal);
    return deal;
  }

  async end(merchantId: number, id: number): Promise<Deal> {
    const deal = await this.dealsRepository.findOne({
      where: { id },
      relations: ['store', 'store.merchant'],
    });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.store.merchant?.id !== merchantId) {
      throw new ForbiddenException('Deal is not owned by current merchant');
    }
    deal.status = DealStatus.ENDED;
    return this.dealsRepository.save(deal);
  }

  private async expirePastDeals(): Promise<void> {
    await this.dealsRepository.update(
      {
        status: DealStatus.LIVE,
        expiresAt: LessThanOrEqual(new Date()),
      },
      { status: DealStatus.EXPIRED },
    );
  }
}
