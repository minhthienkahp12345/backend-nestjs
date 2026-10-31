import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../../entities/order.entity';
import { ReportPeriod } from '../../reports/dto/report-period.dto';

export class OrderHistoryQueryDto {
  @IsOptional()
  @IsEnum(ReportPeriod)
  period: ReportPeriod = ReportPeriod.DAY;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
