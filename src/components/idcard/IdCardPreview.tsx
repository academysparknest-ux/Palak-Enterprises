import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { getPhotoSignedUrl } from '../../lib/idcard/database';
import type { IdCardPerson, IdCardTemplate, TemplateFieldKey, TemplateSideLayout } from '../../lib/idcard/types';

// ============================================================
// BARCODE: Code128-style SVG rendering
// ============================================================

function generateBarcodeSvg(text: string, width: number, height: number): string {
  const bars: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    bars.push(c % 3 === 0 ? 2 : 1, 1, c % 2 === 0 ? 1 : 2, 1);
  }
  while (bars.length < 50) bars.push(1, 2, 1, 1);
  const totalUnits = bars.reduce((a, b) => a + b, 0);
  const unitW = width / totalUnits;
  let x = 0;
  let paths = '';
  for (let i = 0; i < bars.length; i++) {
    const w = bars[i] * unitW;
    if (i % 2 === 0) {
      paths += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#1B2A4A"/>`;
    }
    x += w;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;">${paths}</svg>`;
}

// ============================================================
// QR CODE HOOK
// ============================================================

function useQrDataUrl(text: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    QRCode.toDataURL(text, { width: 160, margin: 1, color: { dark: '#1B2A4A', light: '#FFFFFF' } })
      .then(setUrl)
      .catch(() => setUrl(null));
  }, [text]);
  return url;
}

// ============================================================
// SINGLE CARD FACE COMPONENT
// ============================================================

function SingleCardFace({
  sideLayout,
  widthMm,
  heightMm,
  scale,
  person,
  photoUrl,
  qrData,
  schoolName,
  academicYear,
  backgroundUrl,
}: {
  sideLayout: TemplateSideLayout;
  widthMm: number;
  heightMm: number;
  scale: number;
  person: IdCardPerson;
  photoUrl: string | null;
  qrData: string | null;
  schoolName: string;
  academicYear: string;
  backgroundUrl?: string | null;
}) {
  function valueFor(key: TemplateFieldKey, customText?: string): string {
    switch (key) {
      case 'school_name':
        return schoolName;
      case 'school_subtitle':
        return customText || 'Motihari, Bihar';
      case 'student_name':
        return person.name;
      case 'student_id':
        return person.student_id;
      case 'class':
        return person.class ? (person.class.toLowerCase().includes('class') ? person.class : `CLASS: ${person.class}`) : '';
      case 'section':
        return person.section ? `Sec: ${person.section}` : '';
      case 'roll_number':
        return person.roll_number ? `Roll: ${person.roll_number}` : '';
      case 'date_of_birth':
        return person.date_of_birth ?? '';
      case 'blood_group':
        return person.blood_group ?? '';
      case 'parent_info':
        return [person.father_name, person.mother_name].filter(Boolean).join(' / ');
      case 'father_name':
        return person.father_name ?? '';
      case 'mother_name':
        return person.mother_name ?? '';
      case 'phone':
        return person.phone ?? '';
      case 'address':
        return person.address ?? '';
      case 'academic_year':
        return academicYear;
      case 'batch':
        return academicYear;
      case 'designation':
        return customText || 'Student';
      case 'emergency_no':
        return customText || '';
      case 'valid_till':
        return customText || '';
      case 'terms':
        return customText || '';
      case 'website':
        return customText || '';
      case 'custom_text':
        return customText ?? '';
      default:
        return '';
    }
  }

  const bgImage = sideLayout.backgroundUrl !== undefined ? sideLayout.backgroundUrl : (backgroundUrl ?? null);
  const bgFit = sideLayout.backgroundFit || 'fill';
  const bgSize = bgFit === 'fill' ? '100% 100%' : bgFit === 'fit' ? 'contain' : 'cover';

  return (
    <div
      className="relative overflow-hidden rounded-md border border-slate-300 shadow-md transition-all"
      style={{
        width: widthMm * scale,
        height: heightMm * scale,
        backgroundColor: sideLayout.backgroundColor || '#FFFFFF',
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: bgSize,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Header SVG decoration (only if no background image is active) */}
      {sideLayout.headerSvg && !bgImage && (
        <div
          className="absolute left-0 top-0 w-full pointer-events-none"
          style={{ height: 18 * scale, zIndex: 0 }}
          dangerouslySetInnerHTML={{ __html: sideLayout.headerSvg }}
        />
      )}

      {/* Footer SVG decoration (only if no background image is active) */}
      {sideLayout.footerSvg && !bgImage && (
        <div
          className="absolute bottom-0 left-0 w-full pointer-events-none"
          style={{ height: 14 * scale, zIndex: 0 }}
          dangerouslySetInnerHTML={{ __html: sideLayout.footerSvg }}
        />
      )}

      {/* Fields */}
      {sideLayout.fields
        .filter((f) => f.visible)
        .map((field, idx) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            left: field.x * scale,
            top: field.y * scale,
            width: field.width * scale,
            height: field.height * scale,
            zIndex: 1,
            boxSizing: 'border-box',
          };

          // Student Photo
          if (field.key === 'student_photo') {
            const isCircle = field.photoShape === 'circle' || (field.borderRadius ?? 0) >= 45;
            const bRadius = isCircle ? '50%' : field.borderRadius ? `${field.borderRadius}%` : undefined;

            return (
              <div
                key={idx}
                style={{
                  ...style,
                  borderRadius: bRadius,
                  border: field.borderWidth
                    ? `${field.borderWidth * (scale / 3.78)}px solid ${field.borderColor || '#E69526'}`
                    : undefined,
                  overflow: 'hidden',
                  backgroundColor: '#e2e8f0',
                }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={person.name}
                    className="h-full w-full"
                    style={{ objectFit: field.photoFit || 'cover' }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
            );
          }

          // School Logo
          if (field.key === 'school_logo') {
            const logoSrc = field.customText;
            return (
              <div
                key={idx}
                style={{
                  ...style,
                  borderRadius: field.borderRadius ? `${field.borderRadius}%` : undefined,
                  border: field.borderWidth
                    ? `${field.borderWidth * (scale / 3.78)}px solid ${field.borderColor || '#fff'}`
                    : undefined,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {logoSrc ? (
                  <img src={logoSrc} alt="School Logo" className="h-full w-full object-contain" />
                ) : (
                  /* Default School Shield Emblem */
                  <svg viewBox="0 0 100 120" className="h-full w-full">
                    <path
                      d="M50 5 L88 20 V60 C88 88 50 115 50 115 C50 115 12 88 12 60 V20 Z"
                      fill="#1B2A4A"
                      stroke="#E69526"
                      strokeWidth="4"
                    />
                    <path
                      d="M50 14 L80 26 V58 C80 80 50 104 50 104 C50 104 20 80 20 58 V26 Z"
                      fill="#152238"
                    />
                    <polygon points="50,22 53,30 62,30 55,36 57,44 50,39 43,44 45,36 38,30 47,30" fill="#E69526" />
                    <path
                      d="M32 50 Q50 42 68 50 V68 Q50 60 32 68 Z"
                      fill="#FFFFFF"
                      opacity="0.9"
                    />
                    <path
                      d="M32 72 Q50 64 68 72"
                      stroke="#E69526"
                      strokeWidth="2.5"
                      fill="none"
                    />
                  </svg>
                )}
              </div>
            );
          }

          // Barcode
          if (field.key === 'barcode') {
            const barcodeHtml = generateBarcodeSvg(
              person.student_id || '012345678901',
              field.width * scale,
              field.height * scale
            );
            return (
              <div
                key={idx}
                style={style}
                dangerouslySetInnerHTML={{ __html: barcodeHtml }}
              />
            );
          }

          // QR Code
          if (field.key === 'qr_code') {
            return (
              <div key={idx} style={style}>
                {qrData ? (
                  <img src={qrData} alt="QR Code" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                    <span className="text-[8px]">QR</span>
                  </div>
                )}
              </div>
            );
          }

          // Text fields
          const rawValue = valueFor(field.key, field.customText);
          const hasPrefix = Boolean(field.labelPrefix && field.labelPrefix.trim());
          const displayText = hasPrefix ? `${field.labelPrefix} ${rawValue}` : rawValue;

          // Special highlight for VALID TILL date in red
          if (field.key === 'valid_till' && field.labelPrefix) {
            return (
              <div
                key={idx}
                style={{
                  ...style,
                  fontSize: (field.fontSize ?? 10) * (scale / 2.835),
                  fontWeight: field.fontWeight === 'bold' ? 700 : field.fontWeight || 400,
                  fontStyle: field.fontStyle === 'italic' ? 'italic' : undefined,
                  fontFamily: field.fontFamily || "'Times New Roman', serif",
                  textAlign: field.textAlign ?? 'left',
                  lineHeight: field.lineHeight || 1.25,
                }}
                className="overflow-hidden whitespace-normal"
              >
                <span style={{ color: '#1B2A4A' }}>{field.labelPrefix} </span>
                <span style={{ color: field.color || '#E74C3C' }}>{rawValue}</span>
              </div>
            );
          }

          return (
            <div
              key={idx}
              style={{
                ...style,
                fontSize: (field.fontSize ?? 10) * (scale / 2.835),
                fontWeight: field.fontWeight === 'bold' ? 700 : field.fontWeight || 400,
                fontStyle: field.fontStyle === 'italic' ? 'italic' : undefined,
                fontFamily: field.fontFamily || "'Times New Roman', serif",
                color: field.color ?? '#1B2A4A',
                textAlign: field.textAlign ?? 'left',
                lineHeight: field.lineHeight || 1.25,
              }}
              className="overflow-hidden whitespace-normal"
            >
              {displayText}
            </div>
          );
        })}
    </div>
  );
}

// ============================================================
// MAIN ID CARD PREVIEW
// ============================================================

export function IdCardPreview({
  person,
  template,
  schoolName,
  academicYear,
  scale = 4.5,
}: {
  person: IdCardPerson;
  template: IdCardTemplate;
  schoolName: string;
  academicYear: string;
  scale?: number;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'both' | 'front' | 'back'>('both');

  useEffect(() => {
    let cancelled = false;
    if (person.photo_url) {
      getPhotoSignedUrl(person.photo_url).then((url) => !cancelled && setPhotoUrl(url));
    } else {
      setPhotoUrl(null);
    }
    return () => {
      cancelled = true;
    };
  }, [person.photo_url]);

  const qrData = useQrDataUrl(person.student_id || person.name);
  const isDoubleSided = Boolean(
    template.layout.isDoubleSided || template.layout.templateType === 'double' || template.layout.back
  );

  const frontBackground =
    template.layout.backgroundUrl !== undefined
      ? template.layout.backgroundUrl
      : template.background_url;

  const frontSideLayout: TemplateSideLayout = {
    fields: template.layout.fields,
    backgroundColor: template.layout.backgroundColor,
    backgroundUrl: frontBackground,
    backgroundFit: template.layout.backgroundFit,
    headerSvg: template.layout.headerSvg,
    footerSvg: template.layout.footerSvg,
    headerGradientColors: template.layout.headerGradientColors,
    footerGradientColors: template.layout.footerGradientColors,
  };

  const backSideLayout: TemplateSideLayout | undefined = template.layout.back;

  return (
    <div>
      {/* View Switcher for Double-Sided */}
      {isDoubleSided && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">View:</span>
          <div className="flex rounded-md bg-slate-100 p-0.5 text-xs">
            <button
              onClick={() => setPreviewTab('both')}
              className={`rounded px-2.5 py-1 font-medium transition ${
                previewTab === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Both Sides
            </button>
            <button
              onClick={() => setPreviewTab('front')}
              className={`rounded px-2.5 py-1 font-medium transition ${
                previewTab === 'front' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Front Only
            </button>
            <button
              onClick={() => setPreviewTab('back')}
              className={`rounded px-2.5 py-1 font-medium transition ${
                previewTab === 'back' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Back Only
            </button>
          </div>
        </div>
      )}

      {/* Render Cards */}
      <div className="flex flex-wrap items-start gap-8">
        {/* Front Face */}
        {(previewTab === 'both' || previewTab === 'front' || !isDoubleSided) && (
          <div>
            {isDoubleSided && <p className="mb-2 text-xs font-semibold text-slate-500 text-center">FRONT SIDE</p>}
            <SingleCardFace
              sideLayout={frontSideLayout}
              widthMm={template.card_width_mm}
              heightMm={template.card_height_mm}
              scale={scale}
              person={person}
              photoUrl={photoUrl}
              qrData={qrData}
              schoolName={schoolName}
              academicYear={academicYear}
              backgroundUrl={frontBackground}
            />
          </div>
        )}

        {/* Back Face */}
        {isDoubleSided && backSideLayout && (previewTab === 'both' || previewTab === 'back') && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500 text-center">BACK SIDE</p>
            <SingleCardFace
              sideLayout={backSideLayout}
              widthMm={template.card_width_mm}
              heightMm={template.card_height_mm}
              scale={scale}
              person={person}
              photoUrl={photoUrl}
              qrData={qrData}
              schoolName={schoolName}
              academicYear={academicYear}
              backgroundUrl={backSideLayout.backgroundUrl ?? null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
