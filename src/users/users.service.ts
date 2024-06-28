import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { PrismaService } from '../prisma.service';
import {
  CreateUserDto,
  LoginUserDto,
  UpdatePasswordDto,
} from './dto/users.user.dto';

interface FormatLogin extends Partial<User> {
  username: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updatePassword(payload: UpdatePasswordDto, id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new HttpException('invalid_credentials', HttpStatus.UNAUTHORIZED);
    }

    const areEqual = await compare(payload.old_password, user.password);
    if (!areEqual) {
      throw new HttpException('invalid_credentials', HttpStatus.UNAUTHORIZED);
    }

    return await this.prisma.user.update({
      where: { id },
      data: { password: await hash(payload.new_password, 10) },
    });
  }

  async create(userDto: CreateUserDto): Promise<any> {
    try {
      const hashedPassword = await hash(userDto.password, 10);

      const createdUser = await this.prisma.user.create({
        data: {
          name: userDto.name,
          username: userDto.username,
          email: userDto.email,
          password: hashedPassword,
          role: 'CLIENT' as const,
        },
      });

      return createdUser;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        'Erro ao criar usuário',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByLogin({
    username,
    password,
  }: LoginUserDto): Promise<FormatLogin> {
    const user = await this.prisma.user.findFirst({
      where: { username },
    });

    if (!user) {
      throw new HttpException('invalid_credentials', HttpStatus.UNAUTHORIZED);
    }

    const areEqual = await compare(password, user.password);

    if (!areEqual) {
      throw new HttpException('invalid_credentials', HttpStatus.UNAUTHORIZED);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: p, ...rest } = user;
    return rest;
  }

  async findByPayload({ username }: any): Promise<any> {
    return await this.prisma.user.findFirst({
      where: { username },
    });
  }
}
