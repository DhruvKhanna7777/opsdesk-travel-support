import { ArrayMaxSize, ArrayUnique, IsArray, IsIn } from 'class-validator';
import { TRAVEL_THEMES } from '@helpdesk/shared';
import { classify } from './travel.rules';

export class TicketThemesDto {
  @IsArray()
  @ArrayMaxSize(TRAVEL_THEMES.length)
  @ArrayUnique()
  @IsIn(TRAVEL_THEMES, { each: true })
  themes: string[];
}

export function suggestThemes(title: string, description: string) {
  const text = `${title} ${description}`;
  const category = classify(text);
  return [
    ...(TRAVEL_THEMES.some((theme) => theme === category) ? [category] : []),
    ...(/\b(?:supplier|vendor|wholesaler)\b/i.test(text)
      ? ['SUPPLIER_FOLLOW_UP']
      : []),
  ];
}
