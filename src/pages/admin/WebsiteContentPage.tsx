import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../components/admin/AdminToast';
import { logAdminAudit } from '../../lib/supabase/database';
import { formatAdminErrorMessage, cn } from '../../lib/utils';
import { Save, Image as ImageIcon, UploadCloud, Trash2, RefreshCw } from 'lucide-react';

interface BusinessInfo {
  phone: string;
  whatsapp: string;
  address: string;
  email: string;
  hours: string;
}

export const WebsiteContentPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Content States
  const [heroContent, setHeroContent] = useState<any>({
    heading_en: 'Palak Enterprises',
    heading_hi: 'पलक एंटरप्राइजेज',
    subtitle_en: 'Premium printing solutions',
    subtitle_hi: 'प्रीमियम प्रिंटिंग समाधान',
    cta_text_en: 'Get Started',
    cta_text_hi: 'शुरू करें'
  });

  const [promoContent, setPromoContent] = useState<any>({
    heading: 'Special Offer',
    description: 'Get 20% off on bulk printing',
    image: '',
    is_active: true
  });

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    phone: '',
    whatsapp: '',
    address: '',
    email: '',
    hours: ''
  });

  const [heroId, setHeroId] = useState<string | null>(null);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [businessInfoExists, setBusinessInfoExists] = useState(false);
  const [promoImageUploading, setPromoImageUploading] = useState(false);
  const [isPromoDragging, setIsPromoDragging] = useState(false);
  const [showPromoUrlInput, setShowPromoUrlInput] = useState(false);
  const promoFileInputRef = useRef<HTMLInputElement>(null);

  const validatePromoImage = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addToast({
        title: 'Invalid File Type',
        message: 'Please upload a valid image file (PNG, JPG, WebP, SVG, or GIF).',
        type: 'error',
      });
      return false;
    }
    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      addToast({
        title: 'File Too Large',
        message: 'Banner image size must be under 10MB.',
        type: 'error',
      });
      return false;
    }
    return true;
  };

  const handlePromoImageUpload = async (file: File) => {
    if (!validatePromoImage(file)) return;

    setPromoImageUploading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
        const storagePath = `promo/${Date.now()}_${cleanName}.${fileExt}`;

        // 1. Try public 'business-assets' bucket
        const { error: uploadErr } = await supabase.storage
          .from('business-assets')
          .upload(storagePath, file, {
            contentType: file.type || 'image/png',
            cacheControl: '3600',
            upsert: true,
          });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage
            .from('business-assets')
            .getPublicUrl(storagePath);

          if (pubData?.publicUrl) {
            setPromoContent((prev: any) => ({ ...prev, image: pubData.publicUrl }));
            addToast({
              type: 'success',
              title: 'Image Uploaded Successfully',
              message: 'Banner image uploaded to cloud storage.',
            });
            return;
          }
        } else {
          console.warn('[Storage] business-assets upload notice:', uploadErr.message);
        }

        // 2. Fallback to 'idcard-assets' public bucket if needed
        const { error: fallbackErr } = await supabase.storage
          .from('idcard-assets')
          .upload(`promo/${Date.now()}_${cleanName}.${fileExt}`, file, {
            contentType: file.type || 'image/png',
            upsert: true,
          });

        if (!fallbackErr) {
          const { data: pubData } = supabase.storage
            .from('idcard-assets')
            .getPublicUrl(`promo/${Date.now()}_${cleanName}.${fileExt}`);

          if (pubData?.publicUrl) {
            setPromoContent((prev: any) => ({ ...prev, image: pubData.publicUrl }));
            addToast({
              type: 'success',
              title: 'Image Uploaded Successfully',
              message: 'Banner image uploaded to cloud storage.',
            });
            return;
          }
        }
      }

      // 3. Fallback: Base64 data URL if storage is unreachable or offline
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPromoContent((prev: any) => ({ ...prev, image: result }));
          addToast({
            type: 'success',
            title: 'Image Loaded',
            message: 'Image preview loaded locally.',
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Error uploading promo image:', err);
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err?.message || 'Could not upload banner image.',
      });
    } finally {
      setPromoImageUploading(false);
    }
  };

  const fetchContent = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      // Fetch website content
      const { data: contentData, error: contentError } = await supabase
        .from('website_content')
        .select('id, section, content, is_active, updated_at');

      if (contentError) throw contentError;

      if (contentData) {
        const hero = contentData.find(c => c.section === 'hero');
        if (hero) {
          setHeroId(hero.id);
          if (hero.content) setHeroContent(hero.content);
        }

        const promo = contentData.find(c => c.section === 'promo');
        if (promo) {
          setPromoId(promo.id);
          if (promo.content) {
            setPromoContent({ ...promo.content, is_active: promo.is_active });
          }
        }
      }

      // Fetch business settings
      const { data: bizData, error: bizError } = await supabase
        .from('business_settings')
        .select('id, key, value, updated_at')
        .eq('key', 'business_info')
        .single();

      if (bizError && bizError.code !== 'PGRST116') { // not found is ok
        throw bizError;
      }

      if (bizData && bizData.value) {
        setBusinessInfoExists(true);
        setBusinessInfo(bizData.value as any);
      }

    } catch (error) {
      console.error('Error fetching website content:', error);
      addToast({ type: 'error', title: 'Failed to load content' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleSaveSection = async (section: 'hero' | 'promo' | 'business') => {
    if (!isSupabaseConfigured || !supabase) return;
    setSaving(section);

    try {
      if (section === 'hero') {
        const data = {
          section: 'hero',
          content: heroContent,
          is_active: true,
          updated_at: new Date().toISOString()
        };

        if (heroId) {
          await supabase.from('website_content').update(data).eq('id', heroId);
        } else {
          const { data: inserted, error } = await supabase.from('website_content').insert({ ...data, id: 'hero' }).select().single();
          if (error) throw error;
          setHeroId(inserted.id);
        }
      } else if (section === 'promo') {
        const data = {
          section: 'promo',
          content: {
            heading: promoContent.heading,
            description: promoContent.description,
            image: promoContent.image
          },
          is_active: promoContent.is_active,
          updated_at: new Date().toISOString()
        };

        if (promoId) {
          await supabase.from('website_content').update(data).eq('id', promoId);
        } else {
          const { data: inserted, error } = await supabase.from('website_content').insert({ ...data, id: 'promo' }).select().single();
          if (error) throw error;
          setPromoId(inserted.id);
        }
      } else if (section === 'business') {
        if (businessInfoExists) {
          await supabase
            .from('business_settings')
            .update({ 
              value: businessInfo,
              updated_at: new Date().toISOString()
            })
            .eq('key', 'business_info');
        } else {
          await supabase
            .from('business_settings')
            .insert({
              key: 'business_info',
              value: businessInfo
            });
          setBusinessInfoExists(true);
        }
      }

      await logAdminAudit({
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
        actionType: 'update_content',
        entityType: 'content',
        entityId: section,
        details: { section, description: `Updated ${section} website content` },
      });

      addToast({ type: 'success', title: `${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully` });
    } catch (error) {
      console.error(`Error saving ${section}:`, error);
      addToast({ type: 'error', title: `Failed to save ${section}`, message: formatAdminErrorMessage(error, `Unable to save ${section} content. Please check permissions.`) });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading content settings...</div>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader 
        title="Website Content" 
        subtitle="Manage text, images, and content across your website"
      />

      {/* Hero Section */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-sm font-bold text-[#123B70]">Hero Section (Homepage)</h2>
          <button
            onClick={() => handleSaveSection('hero')}
            disabled={saving === 'hero'}
            className="flex items-center gap-1.5 bg-[#123B70] text-white px-3 py-1.5 rounded-lg hover:bg-[#123B70]/90 transition-colors disabled:opacity-70 text-xs font-bold shadow-xs cursor-pointer"
          >
            <Save size={14} />
            <span>{saving === 'hero' ? 'Saving...' : 'Save Hero'}</span>
          </button>
        </div>
        <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700">English Content</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Heading</label>
              <input
                type="text"
                value={heroContent.heading_en}
                onChange={(e) => setHeroContent({ ...heroContent, heading_en: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Subtitle</label>
              <input
                type="text"
                value={heroContent.subtitle_en}
                onChange={(e) => setHeroContent({ ...heroContent, subtitle_en: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">CTA Text</label>
              <input
                type="text"
                value={heroContent.cta_text_en}
                onChange={(e) => setHeroContent({ ...heroContent, cta_text_en: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700">Hindi Content</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Heading</label>
              <input
                type="text"
                value={heroContent.heading_hi}
                onChange={(e) => setHeroContent({ ...heroContent, heading_hi: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Subtitle</label>
              <input
                type="text"
                value={heroContent.subtitle_hi}
                onChange={(e) => setHeroContent({ ...heroContent, subtitle_hi: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">CTA Text</label>
              <input
                type="text"
                value={heroContent.cta_text_hi}
                onChange={(e) => setHeroContent({ ...heroContent, cta_text_hi: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Promo Section */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-[#123B70]">Promotional Banner</h2>
            <div className="flex items-center space-x-1.5">
              <input
                type="checkbox"
                id="promo_active"
                checked={promoContent.is_active}
                onChange={(e) => setPromoContent({ ...promoContent, is_active: e.target.checked })}
                className="w-3.5 h-3.5 text-[#123B70] border-slate-300 rounded focus:ring-[#123B70]"
              />
              <label htmlFor="promo_active" className="text-xs text-slate-600 font-medium cursor-pointer">Enable Banner</label>
            </div>
          </div>
          <button
            onClick={() => handleSaveSection('promo')}
            disabled={saving === 'promo'}
            className="flex items-center gap-1.5 bg-[#123B70] text-white px-3 py-1.5 rounded-lg hover:bg-[#123B70]/90 transition-colors disabled:opacity-70 text-xs font-bold shadow-xs cursor-pointer"
          >
            <Save size={14} />
            <span>{saving === 'promo' ? 'Saving...' : 'Save Promo'}</span>
          </button>
        </div>
        <div className="p-3.5 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Banner Heading</label>
                <input
                  type="text"
                  value={promoContent.heading}
                  onChange={(e) => setPromoContent({ ...promoContent, heading: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Banner Description</label>
                <textarea
                  value={promoContent.description}
                  onChange={(e) => setPromoContent({ ...promoContent, description: e.target.value })}
                  rows={3}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-[#123B70]" />
                  <span>Banner Image</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPromoUrlInput(!showPromoUrlInput)}
                  className="text-[11px] text-[#123B70] hover:underline font-semibold cursor-pointer"
                >
                  {showPromoUrlInput ? 'Hide URL field' : 'Paste Image URL instead'}
                </button>
              </div>

              {/* Hidden File Input for Image Upload */}
              <input
                ref={promoFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePromoImageUpload(file);
                  e.target.value = '';
                }}
              />

              {/* Upload Dropzone or Current Image Preview */}
              {promoContent.image ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                  <div className="relative h-28 sm:h-32 w-full rounded-lg bg-slate-900/5 border border-slate-200 overflow-hidden flex items-center justify-center group">
                    <img
                      src={promoContent.image}
                      alt="Promo preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs p-1 rounded-md">
                      <button
                        type="button"
                        onClick={() => promoFileInputRef.current?.click()}
                        disabled={promoImageUploading}
                        className="p-1 rounded bg-white/20 hover:bg-white/40 text-white text-xs transition-colors cursor-pointer"
                        title="Upload a different image"
                      >
                        <UploadCloud size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromoContent({ ...promoContent, image: '' })}
                        className="p-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-xs transition-colors cursor-pointer"
                        title="Remove banner image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[220px] font-mono text-[10px] text-slate-600">
                      {promoContent.image.startsWith('data:') ? 'Local preview data' : promoContent.image}
                    </span>
                    <button
                      type="button"
                      onClick={() => promoFileInputRef.current?.click()}
                      disabled={promoImageUploading}
                      className="text-[#123B70] font-bold hover:underline cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <UploadCloud size={13} />
                      <span>Change Image</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsPromoDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsPromoDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsPromoDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handlePromoImageUpload(file);
                  }}
                  onClick={() => promoFileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 min-h-[120px]",
                    isPromoDragging
                      ? "border-[#123B70] bg-blue-50/50 scale-[1.01]"
                      : "border-slate-300 hover:border-[#123B70] hover:bg-slate-50/80 bg-slate-50/40"
                  )}
                >
                  {promoImageUploading ? (
                    <div className="flex flex-col items-center gap-1.5 text-slate-600">
                      <RefreshCw size={22} className="animate-spin text-[#123B70]" />
                      <span className="text-xs font-semibold">Uploading banner to cloud storage...</span>
                    </div>
                  ) : (
                    <>
                      <div className="h-9 w-9 rounded-full bg-blue-50 text-[#123B70] flex items-center justify-center">
                        <UploadCloud size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#123B70] hover:underline">Click to upload banner image</span>
                        <span className="text-xs text-slate-500"> or drag and drop</span>
                      </div>
                      <p className="text-[10px] text-slate-400">PNG, JPG, WebP, SVG or GIF (Max 10MB)</p>
                    </>
                  )}
                </div>
              )}

              {/* Optional URL Direct Input */}
              {showPromoUrlInput && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-medium text-slate-500">Or enter Image URL</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <ImageIcon size={14} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={promoContent.image}
                      onChange={(e) => setPromoContent({ ...promoContent, image: e.target.value })}
                      placeholder="https://example.com/banner.jpg"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Business Info Section */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-sm font-bold text-[#123B70]">Business Information (Footer/Contact)</h2>
          <button
            onClick={() => handleSaveSection('business')}
            disabled={saving === 'business'}
            className="flex items-center gap-1.5 bg-[#123B70] text-white px-3 py-1.5 rounded-lg hover:bg-[#123B70]/90 transition-colors disabled:opacity-70 text-xs font-bold shadow-xs cursor-pointer"
          >
            <Save size={14} />
            <span>{saving === 'business' ? 'Saving...' : 'Save Info'}</span>
          </button>
        </div>
        <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Phone Number</label>
              <input
                type="text"
                value={businessInfo.phone}
                onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">WhatsApp Number</label>
              <input
                type="text"
                value={businessInfo.whatsapp}
                onChange={(e) => setBusinessInfo({ ...businessInfo, whatsapp: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Email Address</label>
              <input
                type="email"
                value={businessInfo.email}
                onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Physical Address</label>
              <textarea
                value={businessInfo.address}
                onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                rows={3}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Business Hours</label>
              <input
                type="text"
                value={businessInfo.hours}
                onChange={(e) => setBusinessInfo({ ...businessInfo, hours: e.target.value })}
                placeholder="e.g. Mon-Sat: 10 AM - 8 PM"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
