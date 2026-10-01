export type HelpField = {
  labels: string[];
  effect: string;
  example: string;
  defaultValue?: string;
};
export type HelpFieldSections = Record<string, HelpField[]>;
export const field = (label: string, effect: string, example: string, defaultValue?: string, ...aliases: string[]): HelpField => ({ labels: [label, ...aliases], effect, example, defaultValue });
export const fieldId = (section: string, label: string) => `${section}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
