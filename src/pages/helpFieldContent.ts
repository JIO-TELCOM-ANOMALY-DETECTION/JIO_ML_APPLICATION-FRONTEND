import { partAFields } from './helpFieldsA';
import { partBFields } from './helpFieldsB';
import { partCFields } from './helpFieldsC';
import { partDFields } from './helpFieldsD';
import { otherFields } from './helpFieldsOther';
import type { HelpFieldSections } from './helpFieldTypes';

export type { HelpField } from './helpFieldTypes';
export const helpFields: Record<string, HelpFieldSections> = {
  'training/part-a': partAFields,
  'training/part-b': partBFields,
  'training/part-c': partCFields,
  'training/part-d': partDFields,
  ...otherFields,
};
