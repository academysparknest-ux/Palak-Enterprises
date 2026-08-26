import { useEffect, useState } from 'react';
import { getPhotoSignedUrl } from '../../lib/idcard/database';
import type { IdCardPerson, IdCardTemplate } from '../../lib/idcard/types';

export function IdCardPreview({
  person,
  template,
  schoolName,
  academicYear,
  scale = 4,
}: {
  person: IdCardPerson;
  template: IdCardTemplate;
  schoolName: string;
  academicYear: string;
  scale?: number;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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

  function valueFor(key: string, customText?: string): string {
    switch (key) {
      case 'school_name':
        return schoolName;
      case 'student_name':
        return person.name;
      case 'student_id':
        return person.student_id;
      case 'class':
        return person.class ? `Class: ${person.class}` : '';
      case 'section':
        return person.section ? `Sec: ${person.section}` : '';
      case 'roll_number':
        return person.roll_number ? `Roll: ${person.roll_number}` : '';
      case 'date_of_birth':
        return person.date_of_birth ?? '';
      case 'blood_group':
        return person.blood_group ? `Blood Group: ${person.blood_group}` : '';
      case 'parent_info':
        return [person.father_name, person.mother_name].filter(Boolean).join(' / ');
      case 'address':
        return person.address ?? '';
      case 'academic_year':
        return academicYear;
      case 'custom_text':
        return customText ?? '';
      default:
        return '';
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-md border border-slate-300 shadow-sm"
      style={{
        width: template.card_width_mm * scale,
        height: template.card_height_mm * scale,
        backgroundColor: template.layout.backgroundColor,
        backgroundImage: template.background_url ? `url(${template.background_url})` : undefined,
        backgroundSize: 'cover',
      }}
    >
      {template.layout.fields
        .filter((f) => f.visible)
        .map((field, idx) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            left: field.x * scale,
            top: field.y * scale,
            width: field.width * scale,
            height: field.height * scale,
            fontSize: (field.fontSize ?? 10) * (scale / 3.78),
            fontWeight: field.fontWeight === 'bold' ? 700 : 400,
            color: field.color ?? '#111',
            textAlign: field.textAlign ?? 'left',
          };

          if (field.key === 'student_photo') {
            return (
              <div key={idx} style={style} className="overflow-hidden bg-slate-100">
                {photoUrl && <img src={photoUrl} alt={person.name} className="h-full w-full object-cover" />}
              </div>
            );
          }

          return (
            <div key={idx} style={style} className="overflow-hidden leading-tight">
              {valueFor(field.key, field.customText)}
            </div>
          );
        })}
    </div>
  );
}
