import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  /**
   * Calendar date only — reject full ISO datetimes for the date-typed column.
   * `strict` also rejects impossible dates (e.g. 2027-02-30), which would
   * otherwise reach Postgres and fail with a 500.
   */
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'eventDate must be YYYY-MM-DD' })
  eventDate?: string;
}
