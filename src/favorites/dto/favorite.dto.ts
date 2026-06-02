import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class FavoriteMarketDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  marketId: number;
}

export class FavoriteStoreDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  storeId: number;
}
