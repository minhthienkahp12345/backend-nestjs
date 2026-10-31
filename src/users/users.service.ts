import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll() {
    const users = await this.usersRepository.find({
      order: { id: 'DESC' },
    });
    return users.map((user) => this.toResponse(user));
  }

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepository.findOne({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    const user = this.usersRepository.create({
      username: dto.username.trim(),
      fullName: dto.full_name.trim(),
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: dto.role,
    });
    return this.toResponse(await this.usersRepository.save(user));
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findById(id);
    if (dto.full_name !== undefined) user.fullName = dto.full_name.trim();
    if (dto.role !== undefined) user.role = dto.role;
    return this.toResponse(await this.usersRepository.save(user));
  }

  async resetPassword(id: number, dto: ResetPasswordDto) {
    const user = await this.findById(id);
    user.passwordHash = await bcrypt.hash(dto.password, 10);
    await this.usersRepository.save(user);
    return { message: 'Đã đổi mật khẩu thành công' };
  }

  async remove(id: number) {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
    return { message: 'Đã xóa tài khoản thành công' };
  }

  private async findById(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Không tìm thấy tài khoản với id ${id}`);
    return user;
  }

  private toResponse(user: User) {
    return {
      id: user.id,
      username: user.username,
      full_name: user.fullName,
      role: user.role,
      created_at: user.createdAt,
    };
  }
}
