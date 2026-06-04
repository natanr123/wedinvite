import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRelationDto {
  @IsUUID()
  guestAId!: string;

  @IsUUID()
  guestBId!: string;

  /** Preset label ("Sister", "Friend", …) or any custom label. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  typeLabel!: string;
}
