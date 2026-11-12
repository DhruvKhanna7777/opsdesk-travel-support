import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { Prisma } from '../../generated/prisma/client';

class RecipientDto {
  @IsIn(['USER', 'EMAIL'])
  kind: string;

  @IsString()
  @MaxLength(254)
  target: string;

  @IsIn(['TO', 'CC'])
  role: string;
}

export class ConversationRecipientsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients: RecipientDto[];
}

type SupplierIdentity = {
  supplierId: string | null;
  userId: string;
  email: string;
};

export function supplierThreadScope(
  identity: SupplierIdentity,
): Prisma.TravelConversationWhereInput {
  if (!identity.supplierId) return { id: '__none__' };
  return {
    supplierId: identity.supplierId,
    OR: [
      { recipientsConfigured: false },
      {
        recipients: {
          some: {
            OR: [
              { kind: 'USER', target: identity.userId },
              { kind: 'EMAIL', target: identity.email.toLowerCase() },
            ],
          },
        },
      },
    ],
  };
}
