import { NestFactory } from '@nestjs/core';
import { scryptSync } from 'crypto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { Coupon } from './coupons/entities/coupon.entity';
import { Deal } from './deals/entities/deal.entity';
import { MarketZone } from './markets/entities/market-zone.entity';
import { Market } from './markets/entities/market.entity';
import { Poi, PoiType } from './markets/entities/poi.entity';
import { ProductPriceHistory } from './products/entities/product-price-history.entity';
import {
  Product,
  ProductStockStatus,
} from './products/entities/product.entity';
import { StorePhoto } from './stores/entities/store-photo.entity';
import {
  BusinessStatus,
  Store,
  StoreApprovalStatus,
} from './stores/entities/store.entity';
import { OAuthProvider, User } from './users/entities/user.entity';
import { Role } from './users/enums/role.enum';

type SeedProduct = [
  name: string,
  category: string,
  price: number,
  origin: string,
  unit: string,
];

type SeedStore = {
  name: string;
  category: string;
  zone: MarketZone;
  unitNo?: string;
  mapX: number;
  mapY: number;
  items: SeedProduct[];
};

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const users = app.get<Repository<User>>(getRepositoryToken(User));
  const markets = app.get<Repository<Market>>(getRepositoryToken(Market));
  const zones = app.get<Repository<MarketZone>>(getRepositoryToken(MarketZone));
  const pois = app.get<Repository<Poi>>(getRepositoryToken(Poi));
  const stores = app.get<Repository<Store>>(getRepositoryToken(Store));
  const photos = app.get<Repository<StorePhoto>>(
    getRepositoryToken(StorePhoto),
  );
  const products = app.get<Repository<Product>>(getRepositoryToken(Product));
  const deals = app.get<Repository<Deal>>(getRepositoryToken(Deal));
  const coupons = app.get<Repository<Coupon>>(getRepositoryToken(Coupon));
  const priceHistories = app.get<Repository<ProductPriceHistory>>(
    getRepositoryToken(ProductPriceHistory),
  );

  const admin = await ensureUser(users, {
    provider: OAuthProvider.DEV,
    providerId: 'dev-admin',
    email: 'dev-admin@sijang.local',
    name: '개발 운영자',
    role: Role.ADMIN,
  });
  const merchant = await ensureUser(users, {
    provider: OAuthProvider.DEV,
    providerId: 'dev-merchant',
    email: 'dev-merchant@sijang.local',
    name: '개발 상인',
    role: Role.MERCHANT,
  });
  await ensureUser(users, {
    provider: OAuthProvider.DEV,
    providerId: 'dev-user',
    email: 'dev-user@sijang.local',
    name: '개발 사용자',
    role: Role.USER,
  });
  await ensureUser(users, {
    provider: OAuthProvider.DEV,
    providerId: 'review-user',
    email: 'review-user@sijangyeojido.com',
    passwordHash: hashSeedPassword('SijangReview2026!'),
    name: '심사 사용자',
    role: Role.USER,
  });
  await ensureUser(users, {
    provider: OAuthProvider.DEV,
    providerId: 'review-merchant',
    email: 'review-merchant@sijangyeojido.com',
    passwordHash: hashSeedPassword('SijangReview2026!'),
    name: '심사 상인',
    role: Role.MERCHANT,
  });
  await ensureUser(users, {
    provider: OAuthProvider.DEV,
    providerId: 'review-admin',
    email: 'review-admin@sijangyeojido.com',
    passwordHash: hashSeedPassword('SijangReview2026!'),
    name: '심사 운영자',
    role: Role.ADMIN,
  });

  const market = await ensureMarket(markets, {
    name: '신원시장',
    address: '서울특별시 관악구 신원로 3길 일대',
    region: '서울 관악구',
    description: '생활 먹거리와 신선식품을 가까이에서 만나는 동네 시장',
    operatingHours: '09:00 - 21:00',
    phoneNumber: '02-000-0000',
    mapImageUrl: '',
    mapWidth: 1200,
    mapHeight: 800,
    latitude: 37.4836,
    longitude: 126.9294,
  });

  const zoneData = [
    { name: 'A동 정육/청과', category: '정육, 청과', color: '#16A34A' },
    { name: 'B동 수산/건어물', category: '수산, 건어물', color: '#2563EB' },
    { name: 'C동 분식/반찬', category: '분식, 반찬', color: '#EA580C' },
  ];
  const savedZones: MarketZone[] = [];
  for (const [index, zone] of zoneData.entries()) {
    savedZones.push(
      await ensureZone(zones, market, {
        ...zone,
        description: `${zone.category} 중심 구역`,
        boundary: [
          { x: 80 + index * 330, y: 120 },
          { x: 350 + index * 330, y: 120 },
          { x: 350 + index * 330, y: 430 },
          { x: 80 + index * 330, y: 430 },
        ],
      }),
    );
  }

  await ensurePoi(pois, market, {
    type: PoiType.ENTRANCE,
    name: '정문',
    description: '시장 메인 입구',
    latitude: 37.4836,
    longitude: 126.9294,
    mapX: 80,
    mapY: 420,
  });
  await ensurePoi(pois, market, {
    type: PoiType.PARKING,
    name: '공영 주차장',
    description: '시장 방문객 주차장',
    latitude: 37.484,
    longitude: 126.9301,
    mapX: 1040,
    mapY: 680,
  });

  const storeSeeds: SeedStore[] = [
    {
      name: '바다건어물',
      category: '건어물',
      zone: savedZones[1],
      mapX: 520,
      mapY: 260,
      items: [
        ['프리미엄 멸치 500g', '건어물', 15000, '국내산', '500g'],
        ['반건조 오징어 5미', '수산', 22000, '국내산', '5미'],
      ],
    },
    {
      name: '시장호떡',
      category: '분식',
      zone: savedZones[2],
      mapX: 860,
      mapY: 330,
      items: [
        ['꿀호떡', '분식', 1500, '국내산', '1개'],
        ['씨앗호떡', '분식', 2000, '국내산', '1개'],
      ],
    },
    {
      name: '싱싱청과',
      category: '청과',
      zone: savedZones[0],
      mapX: 210,
      mapY: 250,
      items: [
        ['샤인머스캣', '청과', 25000, '국내산', '1송이'],
        ['꿀사과 5입', '청과', 12000, '국내산', '5입'],
      ],
    },
    ...buildDirectoryStoreSeeds(savedZones),
  ];

  for (const seed of storeSeeds) {
    const store = await ensureStore(stores, market, merchant, seed.zone, {
      name: seed.name,
      category: seed.category,
      description: `${seed.name} 대표 점포입니다.`,
      businessStatus: BusinessStatus.OPEN,
      approvalStatus: StoreApprovalStatus.APPROVED,
      openingTime: '09:00',
      closingTime: '20:00',
      regularHolidays: ['매월 둘째주 월요일'],
      temporaryHolidays: [],
      paymentMethods: ['cash', 'card', 'zeroPay'],
      latitude: market.latitude,
      longitude: market.longitude,
      unitNo: seed.unitNo,
      addressDetail: seed.unitNo,
      mapX: seed.mapX,
      mapY: seed.mapY,
    });
    if (seed.items.length > 0) {
      await ensurePhoto(photos, store, {
        imageUrl:
          'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=600',
        caption: `${seed.name} 대표 사진`,
        sortOrder: 0,
      });
    }

    for (const [name, category, price, origin, unit] of seed.items) {
      const product = await ensureProduct(products, store, {
        name,
        category,
        currentPrice: Number(price),
        origin,
        unit,
        description: `${name} 상품`,
        stockStatus: ProductStockStatus.AVAILABLE,
      });
      await ensurePriceHistory(
        priceHistories,
        product,
        admin,
        Math.max(500, Number(price) + 500),
        '지난주 seed 가격',
      );
      await ensurePriceHistory(priceHistories, product, admin, Number(price));
      await ensureDeal(deals, store, product, {
        title: `${name} 오늘 특가`,
        description: '앱 예약 후 15분 안에 픽업해 주세요.',
        dealPrice: Math.max(1000, Math.round(Number(price) * 0.85)),
        originalPrice: Number(price),
        availableQuantity: 10,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }
  }

  await ensureCoupon(coupons, market, {
    title: '첫 방문 쿠폰',
    description: '시장여지도 첫 예약 고객 혜택',
    benefit: '현장 결제 1,000원 할인',
  });

  await app.close();
  console.log('Seed completed');
}

const rawStoreDirectory = `
우리상회 건어물 씨앗 비료 A-2
호떡어때? A-3
착한 칼국수 A-4 5
농심 축산 A-6
킹구수산 A-7
바다정원 A-8
신원호떡 A-10 2000원
성암축산 A-11 12 임대
용궁 A-13 14
비타민수산 A-15 16 17
꼬마김밥 A-18
열매상회 A-19
조개찜 조개구이 A-20
이화 인테리어 A-21
별미반찬 A-22
불꽃닭강정 A-23
목포수산 A-23.1
신촌양말 A-24
맛조아 한과 강정 A-25
진격의 곱창 A-26 27
도토리와 치킨 A-28
병천순대 A-29
남한강닭 A-30
남원상회 A-31
신원분식 A-32
안성축산 A-33
인천상회 A-34
떡수레 A-35
금거래소 A-36
청과야채 A-37
대우 뼈감자탕 A-38
육영한우 A-39
동광수산 A-40
야채 백화점 A-41
가마솥 바베큐 A-42
신림당 떡집 A-43
신정집 반찬 A-45
전과 함께 A-46
부성신발 할인점 A-47
장터 순대국 A-48
땅과 바다 건어물 A-49
이모네 전칼국수 A-50
무공해 시골채소 A-51
토방한우마을 A-52
베들레햄 떡집 A-53
유림 건강약초 A-55
영주네 집반찬 A-56
형제 상회 A-57
팥죽 A-58
완도 건어물 A-59 60
태강축산 A-61
만나 반찬 A-62
중국 식품 A-63
동해 수산 A-64
문성 기름집 A-65-1
너구리전집 A-65
소문난 순대국 A-66
원조 순대국 A-67
시장 탕수육 A-68
두명 전집 A-69
명가두부 국산두부 A-70
고은이네 A-71 72
진흥축협 B-60
신림 원조김밥 탕수육 B-58 59
엄마손반찬 B-57
59떡갈비 B-56
뜨레봉 닭강정 B-55
중앙수산물 B-54
흥부네 즉석어묵 B-53 옆 공용 화장실 2층
정렴마트 B-52
진미 웰빙반찬 B-51
관악떡집 B-50
충북야채 B-49
고모네 정육식당 B-48
차이나는 클라스 B-47
단골상회 B-45
고려 왕족발 B-43
이가꽈배기 B-42.1 42
원조 홍어 B-41
부천 축산 B-40
신림 즉석두부 B-39
건강기능식품 전문점 B-38 호주 면세점
싱싱한 생선 B-37
희망야채 (희망청과) B-36
송이네 닭 B-35
김치천국 B-34 33
오떡순 B-32
뚱이네 축산 B-31
명성 왕족발 B-30
삼수니네 살림가게 B-29
꿀마니 닭강정 B-28
소문난 순대집 B-27
건우축산 B-26
쪼마찌네 쥬스 B-25
영광 과일 B-25
동진 상회 B-24
신림 기름 고추집 B-23
영광마트 B-22
우리청과 B-21
애완용품 B-20
중앙한우 B-19
신림 반찬 B-18
명품 한우 B-17
양촌 떡갈비 B-16
소문난 야채 B-15
우리동네 B-14
싱싱 수산물 B-13
방림 이불 B-12
부창 명품한우 B-11
비타민 수산 B-10
오지다 족발 B-9
독립문 떡집 B-8
모아 할인마트 B-6 7
아부찌 부대찌개 B-5
청춘청과 B-4
현대 건강원 B-3
주현 BYC B-2
모녀 튀김 B-1
`;

function buildDirectoryStoreSeeds(zones: MarketZone[]): SeedStore[] {
  let aIndex = 0;
  let bIndex = 0;
  const stores: SeedStore[] = [];

  for (const line of rawStoreDirectory.split('\n')) {
    const store = parseDirectoryLine(line.trim(), zones, { aIndex, bIndex });
    if (!store) continue;
    if (store.section === 'A') aIndex += 1;
    if (store.section === 'B') bIndex += 1;
    const { section: _section, ...seed } = store;
    stores.push(seed);
  }

  return stores;
}

function parseDirectoryLine(
  line: string,
  zones: MarketZone[],
  counters: { aIndex: number; bIndex: number },
): (SeedStore & { section: 'A' | 'B' }) | null {
  if (!line) return null;
  const cleaned = line
    .replace(/\s+\d+원/g, '')
    .replace(/\s+임대/g, '')
    .replace(/\s+옆\s+공용\s+화장실\s+2층/g, '')
    .trim();
  const match = cleaned.match(/^(.*?)\s+([AB]-[\d.]+(?:\s+\d+(?:\.\d+)?)*)$/);
  if (!match) return null;

  const [, name, unitText] = match;
  const section = unitText.startsWith('A-') ? 'A' : 'B';
  const zone = section === 'A' ? zones[0] : zones[1];
  const index = section === 'A' ? counters.aIndex : counters.bIndex;
  const column = index % 8;
  const row = Math.floor(index / 8);

  return {
    section,
    name: name.trim(),
    category: inferStoreCategory(name),
    zone,
    unitNo: normalizeUnitNo(unitText),
    mapX: section === 'A' ? 130 + column * 30 : 500 + column * 34,
    mapY: 150 + row * 44,
    items: sampleProductsForCategory(inferStoreCategory(name)),
  };
}

function normalizeUnitNo(unitText: string) {
  const [first, ...rest] = unitText.trim().split(/\s+/);
  const prefix = first.split('-')[0];
  return [first, ...rest.map((unit) => `${prefix}-${unit}`)].join(', ');
}

function inferStoreCategory(name: string) {
  if (/반찬|김치/.test(name)) return '반찬';
  if (
    /떡|호떡|분식|김밥|순대|국|칼국수|곱창|족발|어묵|탕수육|꽈배기|치킨|닭강정|부대찌개|팥죽|두부|튀김/.test(
      name,
    )
  ) {
    return '분식';
  }
  if (/축산|축협|한우|정육|고기|닭/.test(name)) return '정육';
  if (/수산|생선|홍어|조개|바다/.test(name)) return '수산';
  if (/청과|야채|채소|과일|열매/.test(name)) return '청과';
  if (/건어물|기름|고추|한과|강정|약초|건강|식품/.test(name)) {
    return '식품';
  }
  if (/신발|양말|이불|인테리어|살림|애완|BYC|금거래소|마트/.test(name)) {
    return '생활';
  }
  return '기타';
}

function sampleProductsForCategory(category: string): SeedProduct[] {
  switch (category) {
    case '반찬':
      return [
        ['포기김치', '반찬', 9000, '국내산', '1kg'],
        ['나물 3종', '반찬', 7000, '국내산', '1팩'],
      ];
    case '분식':
      return [
        ['꼬마김밥', '분식', 4000, '국내산', '1팩'],
        ['즉석 떡볶이', '분식', 5000, '국내산', '1인분'],
      ];
    case '정육':
      return [
        ['한우 국거리', '정육', 18000, '국내산', '300g'],
        ['돼지 삼겹살', '정육', 12000, '국내산', '300g'],
      ];
    case '수산':
      return [
        ['고등어', '수산', 6000, '국내산', '1마리'],
        ['손질 오징어', '수산', 9000, '국내산', '2마리'],
      ];
    case '청과':
      return [
        ['제철 사과', '청과', 8000, '국내산', '5입'],
        ['대파', '청과', 2500, '국내산', '1단'],
      ];
    case '식품':
      return [
        ['볶음 참깨', '식품', 6000, '국내산', '200g'],
        ['국물 멸치', '건어물', 12000, '국내산', '500g'],
      ];
    case '생활':
      return [
        ['생활용품 세트', '생활', 5000, '국내산', '1세트'],
        ['면 양말', '생활', 3000, '국내산', '1켤레'],
      ];
    default:
      return [
        ['대표 상품', category, 5000, '국내산', '1개'],
        ['추천 상품', category, 7000, '국내산', '1개'],
      ];
  }
}

async function ensureUser(
  repository: Repository<User>,
  values: Partial<User> & { provider: OAuthProvider; providerId: string },
) {
  let user = await repository.findOne({
    where: { provider: values.provider, providerId: values.providerId },
  });
  if (!user) {
    user = repository.create(values);
  } else {
    Object.assign(user, values);
  }
  return repository.save(user);
}

function hashSeedPassword(password: string) {
  const salt = 'sijang-review-seed';
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function ensureMarket(
  repository: Repository<Market>,
  values: Partial<Market> & { name: string },
) {
  let market = await repository.findOne({ where: { name: values.name } });
  if (!market) {
    market = repository.create(values);
  } else {
    Object.assign(market, values);
  }
  return repository.save(market);
}

async function ensureZone(
  repository: Repository<MarketZone>,
  market: Market,
  values: Partial<MarketZone> & { name: string },
) {
  let zone = await repository.findOne({
    where: { name: values.name, market: { id: market.id } },
    relations: ['market'],
  });
  if (!zone) {
    zone = repository.create({ ...values, market });
  } else {
    Object.assign(zone, values, { market });
  }
  return repository.save(zone);
}

async function ensurePoi(
  repository: Repository<Poi>,
  market: Market,
  values: Partial<Poi> & { type: PoiType; name: string },
) {
  let poi = await repository.findOne({
    where: { name: values.name, market: { id: market.id } },
  });
  if (!poi) {
    poi = repository.create({ ...values, market });
  } else {
    Object.assign(poi, values, { market });
  }
  return repository.save(poi);
}

async function ensureStore(
  repository: Repository<Store>,
  market: Market,
  merchant: User,
  zone: MarketZone,
  values: Partial<Store> & { name: string; category: string },
) {
  let store = await repository.findOne({
    where: { name: values.name, market: { id: market.id } },
  });
  if (!store) {
    store = repository.create({ ...values, market, merchant, zone });
  } else {
    Object.assign(store, values, { market, merchant, zone });
  }
  return repository.save(store);
}

async function ensurePhoto(
  repository: Repository<StorePhoto>,
  store: Store,
  values: Partial<StorePhoto> & { imageUrl: string },
) {
  const existing = await repository.findOne({
    where: { imageUrl: values.imageUrl, store: { id: store.id } },
  });
  if (existing) return existing;
  return repository.save(repository.create({ ...values, store }));
}

async function ensureProduct(
  repository: Repository<Product>,
  store: Store,
  values: Partial<Product> & {
    name: string;
    category: string;
    currentPrice: number;
  },
) {
  let product = await repository.findOne({
    where: { name: values.name, store: { id: store.id } },
  });
  if (!product) {
    product = repository.create({ ...values, store });
  } else {
    Object.assign(product, values, { store });
  }
  return repository.save(product);
}

async function ensureDeal(
  repository: Repository<Deal>,
  store: Store,
  product: Product,
  values: Partial<Deal> & { title: string },
) {
  let deal = await repository.findOne({
    where: { title: values.title, store: { id: store.id } },
    relations: ['store'],
  });
  if (!deal) {
    deal = repository.create({ ...values, store, product });
  } else {
    Object.assign(deal, values, { store, product });
  }
  return repository.save(deal);
}

async function ensureCoupon(
  repository: Repository<Coupon>,
  market: Market,
  values: Partial<Coupon> & { title: string },
) {
  let coupon = await repository.findOne({
    where: { title: values.title, market: { id: market.id } },
    relations: ['market'],
  });
  if (!coupon) {
    coupon = repository.create({ ...values, market });
  } else {
    Object.assign(coupon, values, { market });
  }
  return repository.save(coupon);
}

async function ensurePriceHistory(
  repository: Repository<ProductPriceHistory>,
  product: Product,
  user: User,
  price: number,
  note = '초기 seed 가격',
) {
  const existing = await repository.findOne({
    where: { product: { id: product.id }, price },
  });
  if (existing) return existing;
  return repository.save(
    repository.create({
      product,
      price,
      changedBy: user,
      note,
    }),
  );
}

void bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
