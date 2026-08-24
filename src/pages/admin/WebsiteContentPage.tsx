import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../components/admin/AdminToast';
import { logAdminAudit } from '../../lib/supabase/database';
import { formatAdminErrorMessage } from '../../lib/utils';
import { Save, Image as ImageIcon } from 'lucide-react';

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
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Image URL</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <ImageIcon size={14} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={promoContent.image}
                    onChange={(e) => setPromoContent({ ...promoContent, image: e.target.value })}
                    placeholder="https://..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
                  />
                </div>
              </div>
              {promoContent.image && (
                <div className="mt-1.5 h-24 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                  <img src={promoContent.image} alt="Promo preview" className="h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
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
