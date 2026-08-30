import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { getPhotoSignedUrl } from '../../lib/idcard/database';
import type { IdCardPerson, IdCardTemplate, TemplateField, TemplateSideLayout } from '../../lib/idcard/types';
import { sanitizeStudentId, getQrCodePayload } from '../../lib/idcard/validation';
import { formatFieldDisplay } from '../../lib/idcard/templatePresets';

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
    QRCode.toDataURL(text, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    })
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
  schoolLogoUrl,
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
  schoolLogoUrl?: string | null;
}) {
  function valueFor(field: TemplateField): string {
    if (field.source === 'static') {
      if (field.key === 'school_name') {
        return field.value || field.customText || schoolName;
      }
      return field.value ?? field.customText ?? '';
    }

    switch (field.key) {
      case 'school_name':
        return field.value || field.customText || schoolName;
      case 'school_subtitle':
        return field.value || field.customText || 'Motihari, Bihar';
      case 'student_name':
        return person.name || (person as any).student_name || (person as any).fullName || person.custom_fields?.student_name || person.custom_fields?.name || '';
      case 'student_id':
        return sanitizeStudentId(person.student_id || (person as any).id_no || (person as any).admission_no || (person as any).scholar_no || person.custom_fields?.student_id || person.custom_fields?.admission_no);
      case 'class':
        return person.class ?? (person as any).grade ?? (person as any).standard ?? person.custom_fields?.class ?? person.custom_fields?.grade ?? '';
      case 'section':
        return person.section ?? (person as any).sec ?? person.custom_fields?.section ?? person.custom_fields?.sec ?? '';
      case 'roll_number':
      case 'roll_no':
      case 'roll':
      case 'rollno':
      case 'r_no':
      case 'rno':
      case 'roll_num': {
        const val =
          person.roll_number ??
          (person as any).roll_no ??
          (person as any).roll ??
          (person as any).rollno ??
          (person as any).r_no ??
          (person as any).rno ??
          person.custom_fields?.roll_number ??
          person.custom_fields?.roll_no ??
          person.custom_fields?.roll ??
          person.custom_fields?.rollno ??
          person.custom_fields?.r_no ??
          person.custom_fields?.rno ??
          person.custom_fields?.['Roll No'] ??
          person.custom_fields?.['Roll Number'] ??
          person.custom_fields?.['Roll No.'] ??
          person.custom_fields?.['Roll'] ??
          (field.value ?? field.customText ?? '');
        return String(val);
      }
      case 'date_of_birth':
      case 'dob':
        return person.date_of_birth ?? (person as any).dob ?? person.custom_fields?.date_of_birth ?? person.custom_fields?.dob ?? '';
      case 'blood_group':
      case 'blood':
        return person.blood_group ?? (person as any).blood ?? person.custom_fields?.blood_group ?? person.custom_fields?.blood ?? '';
      case 'parent_info':
        return [person.father_name, person.mother_name].filter(Boolean).join(' / ');
      case 'father_name':
        return person.father_name ?? (person as any).father ?? person.custom_fields?.father_name ?? person.custom_fields?.father ?? '';
      case 'mother_name':
        return person.mother_name ?? (person as any).mother ?? (person as any).mothers_name ?? person.custom_fields?.mother_name ?? person.custom_fields?.mothers_name ?? '';
      case 'phone':
        return person.phone ?? (person as any).mobile ?? (person as any).contact ?? person.custom_fields?.phone ?? person.custom_fields?.mobile ?? '';
      case 'address':
        return person.address ?? (person as any).addr ?? person.custom_fields?.address ?? '';
      case 'academic_year':
        return field.value || field.customText || academicYear;
      case 'batch':
        return field.value || field.customText || academicYear;
      case 'designation':
        return (person as any).designation ?? (person.custom_fields?.designation ?? (field.value || field.customText || 'Student'));
      case 'emergency_no':
        return person.emergency_number ?? (person as any).emergency_no ?? (person.custom_fields?.emergency_no ?? (person.custom_fields?.emergency_number ?? (field.value || field.customText || '')));
      case 'valid_till':
        return field.value || field.customText || '';
      case 'terms':
        return field.value || field.customText || '';
      case 'website':
        return field.value || field.customText || '';
      case 'custom_text': {
        const normalizedPrefix = (field.labelPrefix || '').toLowerCase().replace(/[\s_.:-]/g, '');
        if (normalizedPrefix.includes('roll')) {
          const rollVal =
            person.roll_number ??
            (person as any).roll_no ??
            (person as any).roll ??
            (person as any).rollno ??
            person.custom_fields?.roll_number ??
            person.custom_fields?.roll_no ??
            person.custom_fields?.roll ??
            person.custom_fields?.['Roll No'] ??
            person.custom_fields?.['Roll Number'] ??
            person.custom_fields?.['Roll No.'];
          if (rollVal !== undefined && rollVal !== null && String(rollVal).trim() !== '') {
            return String(rollVal);
          }
        }
        return field.value ?? field.customText ?? '';
      }
      default: {
        const normalizedKey = (field.key || '').toLowerCase().replace(/[\s_.-]/g, '');
        const normalizedPrefix = (field.labelPrefix || '').toLowerCase().replace(/[\s_.:-]/g, '');
        const normalizedLabel = ((field as any).label || (field as any).name || '').toLowerCase().replace(/[\s_.:-]/g, '');

        if (
          normalizedKey.includes('roll') ||
          normalizedPrefix.includes('roll') ||
          normalizedLabel.includes('roll') ||
          normalizedKey === 'rno' ||
          normalizedKey === 'r_no'
        ) {
          const rollVal =
            person.roll_number ??
            (person as any).roll_no ??
            (person as any).roll ??
            (person as any).rollno ??
            (person as any).r_no ??
            (person as any).rno ??
            person.custom_fields?.roll_number ??
            person.custom_fields?.roll_no ??
            person.custom_fields?.roll ??
            person.custom_fields?.rollno ??
            person.custom_fields?.r_no ??
            person.custom_fields?.rno ??
            person.custom_fields?.['Roll No'] ??
            person.custom_fields?.['Roll Number'] ??
            person.custom_fields?.['Roll No.'] ??
            person.custom_fields?.['Roll'];
          if (rollVal !== undefined && rollVal !== null && String(rollVal).trim() !== '') {
            return String(rollVal);
          }
        }

        const customVal =
          (person as any)[field.key] ??
          person.custom_fields?.[field.key] ??
          (person as any)[normalizedKey] ??
          person.custom_fields?.[normalizedKey];
        if (customVal !== undefined && customVal !== null && String(customVal).trim() !== '') {
          return String(customVal);
        }
        return field.value ?? field.customText ?? '';
      }
    }
  }

  const bgImage = sideLayout.backgroundUrl !== undefined ? sideLayout.backgroundUrl : (backgroundUrl ?? null);
  const bgFit = sideLayout.backgroundFit || 'fill';
  const bgSize = bgFit === 'fill' ? '100% 100%' : bgFit === 'fit' ? 'contain' : 'cover';
  const bgOpacity = (sideLayout.backgroundOpacity ?? 100) / 100;
  const bgScale = (sideLayout.backgroundScale ?? 100) / 100;
  const bgOffsetX = sideLayout.backgroundOffsetX ?? 0;
  const bgOffsetY = sideLayout.backgroundOffsetY ?? 0;
  const bgBlur = sideLayout.backgroundBlur ?? 0;
  const bgBrightness = (sideLayout.backgroundBrightness ?? 100) / 100;
  const bgContrast = (sideLayout.backgroundContrast ?? 100) / 100;

  return (
    <div
      className="relative overflow-hidden rounded-md border border-slate-300 shadow-md transition-all"
      style={{
        width: widthMm * scale,
        height: heightMm * scale,
        backgroundColor: sideLayout.backgroundColor || '#FFFFFF',
      }}
    >
      {/* Background Image Layer with Adjustments */}
      {bgImage && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: bgSize,
            backgroundPosition: `${50 + bgOffsetX}% ${50 + bgOffsetY}%`,
            backgroundRepeat: 'no-repeat',
            opacity: bgOpacity,
            transform: `scale(${bgScale})`,
            transformOrigin: 'center center',
            filter: `blur(${bgBlur}px) brightness(${bgBrightness}) contrast(${bgContrast})`,
          }}
        />
      )}

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
            const logoSrc = (field.customText && field.customText !== '/logo.webp' && field.customText !== '/images/palak-logo-ram-hanuman.jpeg' ? field.customText : schoolLogoUrl) || null;
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
                  backgroundColor: 'transparent',
                }}
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt="School Logo"
                    className={`h-full w-full ${field.photoFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                    style={{ background: 'transparent' }}
                  />
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
            const barcodePayload = sanitizeStudentId(person.student_id) || '012345678901';
            const barcodeHtml = generateBarcodeSvg(
              barcodePayload,
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
          const rawValue = valueFor(field);
          const displayText = formatFieldDisplay(field.labelPrefix, rawValue);

          // Special highlight for VALID TILL date in red
          if (field.key === 'valid_till' && field.labelPrefix) {
            const prefixStr = field.labelPrefix.endsWith(' ') || field.labelPrefix.endsWith('\n') ? field.labelPrefix : `${field.labelPrefix} `;
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
                className="overflow-hidden whitespace-pre-line"
              >
                <span style={{ color: '#1B2A4A' }}>{prefixStr}</span>
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
              className="overflow-hidden whitespace-pre-line"
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

  const qrPayload = getQrCodePayload(person, schoolName);
  const qrData = useQrDataUrl(qrPayload);
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
    backgroundOpacity: template.layout.backgroundOpacity,
    backgroundPosition: template.layout.backgroundPosition,
    backgroundScale: template.layout.backgroundScale,
    backgroundOffsetX: template.layout.backgroundOffsetX,
    backgroundOffsetY: template.layout.backgroundOffsetY,
    backgroundBlur: template.layout.backgroundBlur,
    backgroundBrightness: template.layout.backgroundBrightness,
    backgroundContrast: template.layout.backgroundContrast,
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
              schoolLogoUrl={template.layout?.schoolLogoUrl || template.logo_url}
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
              schoolLogoUrl={template.layout?.schoolLogoUrl || template.logo_url}
            />
          </div>
        )}
      </div>
    </div>
  );
}
