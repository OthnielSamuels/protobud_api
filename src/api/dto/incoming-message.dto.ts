import { IsString, IsNotEmpty, Length } from 'class-validator';

export class IncomingMessageDto {
  @IsString()
  @IsNotEmpty()
  @Length(7, 20)
  phone!: string; // WhatsApp phone number, e.g. "5970000000@c.us"

  @IsString()
  @IsNotEmpty()
  @Length(1, 4000)
  message!: string;
}
