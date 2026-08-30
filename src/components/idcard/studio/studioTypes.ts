import type { TemplateFieldKey } from '../../../lib/idcard/types';

export type StudioTab = 'elements' | 'layers' | 'templates' | 'school';

export interface ElementPaletteItem {
  key: TemplateFieldKey;
  label: string;
  category: 'student_data' | 'images' | 'generated' | 'design';
  icon: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultFontSize?: number;
  defaultFontWeight?: 'normal' | 'bold' | '600' | '800';
  defaultColor?: string;
  defaultLabelPrefix?: string;
  defaultCustomText?: string;
  isImage?: boolean;
  source: 'dynamic' | 'static' | 'system';
  dataType?: 'text' | 'date' | 'photo' | 'qr' | 'barcode';
}

export interface SnapGuide {
  type: 'x' | 'y';
  positionMm: number;
  label?: string;
}

export interface DistanceGuide {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  distanceMm: number;
}

export type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

export interface ValidationIssue {
  id: string;
  fieldId?: string;
  side: 'front' | 'back';
  level: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  category: 'boundary' | 'scannability' | 'contrast' | 'overlap' | 'quality' | 'binding';
  fieldKey?: TemplateFieldKey;
}
