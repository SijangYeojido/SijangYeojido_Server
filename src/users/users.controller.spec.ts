import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deletes the authenticated user account', async () => {
    usersService.deleteAccount.mockResolvedValue(true);

    await expect(
      controller.deleteMe({ user: { id: 7 } } as never),
    ).resolves.toEqual({ deleted: true });
    expect(usersService.deleteAccount).toHaveBeenCalledWith(7);
  });
});
