import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Coupon, CouponClaim } from './entities/coupon.entity';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon) private couponsRepository: Repository<Coupon>,
    @InjectRepository(CouponClaim)
    private claimsRepository: Repository<CouponClaim>,
  ) {}

  async findAll(userId?: number) {
    const coupons = await this.couponsRepository.find({
      where: { isActive: true },
      relations: ['market'],
      order: { createdAt: 'DESC' },
    });
    const claims = userId
      ? await this.claimsRepository.find({
          where: { user: { id: userId } },
          relations: ['coupon'],
        })
      : [];
    const claimedIds = new Set(claims.map((claim) => claim.coupon.id));
    return coupons.map((coupon) => ({
      ...coupon,
      claimed: claimedIds.has(coupon.id),
    }));
  }

  async claim(userId: number, couponId: number) {
    const coupon = await this.couponsRepository.findOne({
      where: { id: couponId, isActive: true },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    const existing = await this.claimsRepository.findOne({
      where: { user: { id: userId }, coupon: { id: couponId } },
      relations: ['coupon'],
    });
    if (existing) return existing;

    return this.claimsRepository.save(
      this.claimsRepository.create({
        user: { id: userId } as User,
        coupon,
      }),
    );
  }
}
