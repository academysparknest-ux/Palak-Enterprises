import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { useToast } from '../../components/admin/AdminToast';
import { useAuth } from '../../context/AuthContext';
import { logAdminAudit } from '../../lib/supabase/database';
import { cn } from '../../lib/utils';
import { 
  Search, Image as ImageIcon, Trash2, Edit, UploadCloud, 
  RefreshCw, ExternalLink 
} from 'lucide-react';

interface ImageItem {
  id: string; // product id or content section id
  url: string;
  sourceName: string;
  type: 'product_image' | 'product_gallery' | 'content';
  dbField?: string;
  index?: number;
}

export const WebsitePhotosPage: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Replacement / Deletion state
  const [targetImageForReplace, setTargetImageForReplace] = useState<ImageItem | null>(null);
  const [imageToDelete, setImageToDelete] = useState<ImageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchImages = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allImages: ImageItem[] = [];

      // 1. Fetch from products table
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name_en, name_hi, image_url, gallery_urls');

      if (!productsError && products) {
        products.forEach((product) => {
          const name = product.name_en || product.name_hi || 'Unnamed Product';
          
          if (product.image_url && product.image_url.trim()) {
            allImages.push({
              id: product.id,
              url: product.image_url,
              sourceName: name,
              type: 'product_image',
              dbField: 'image_url',
            });
          }

          if (product.gallery_urls && Array.isArray(product.gallery_urls)) {
            product.gallery_urls.forEach((url: string, index: number) => {
              if (url && url.trim()) {
                allImages.push({
                  id: product.id,
                  url,
                  sourceName: `${name} (Gallery #${index + 1})`,
                  type: 'product_gallery',
                  dbField: 'gallery_urls',
                  index,
                });
              }
            });
          }
        });
      }

      // 2. Fetch from website_content table
      const { data: contents } = await supabase
        .from('website_content')
        .select('id, section, content');

      if (contents) {
        contents.forEach((c) => {
          if (c.content?.hero_image) {
            allImages.push({
              id: c.id,
              url: c.content.hero_image,
              sourceName: `Hero Section (${c.id})`,
              type: 'content',
              dbField: 'hero_image',
            });
          }
          if (c.content?.image) {
            allImages.push({
              id: c.id,
              url: c.content.image,
              sourceName: `Promo Banner (${c.id})`,
              type: 'content',
              dbField: 'image',
            });
          }
        });
      }

      setImages(allImages);
    } catch (err) {
      console.error('Error fetching images:', err);
      addToast({ title: 'Error fetching images', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addToast({ 
        title: 'Invalid File Type', 
        message: `${file.name} is not an image (JPEG, PNG, WebP, SVG required)`, 
        type: 'error' 
      });
      return false;
    }
    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      addToast({ 
        title: 'File Too Large', 
        message: `${file.name} exceeds the 10MB upload limit`, 
        type: 'error' 
      });
      return false;
    }
    return true;
  };

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase) {
      addToast({ title: 'Supabase not configured', type: 'error' });
      return null;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `${Date.now()}_${cleanName}.${fileExt}`;

    try {
      // 1. Try dedicated 'website-assets' public bucket first
      const { error: assetErr, data: assetData } = await supabase.storage
        .from('website-assets')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (!assetErr && assetData) {
        const { data: urlData } = supabase.storage
          .from('website-assets')
          .getPublicUrl(fileName);
        return urlData.publicUrl || fileName;
      }

      // 2. Fallback to 'customer-documents' segregated folder 'website-assets/'
      const fallbackPath = `website-assets/${fileName}`;
      const { error: fallbackError, data: fallbackData } = await supabase.storage
        .from('customer-documents')
        .upload(fallbackPath, file, { cacheControl: '3600', upsert: true });

      if (fallbackError) throw fallbackError;

      if (fallbackData) {
        const { data: urlData } = supabase.storage
          .from('customer-documents')
          .getPublicUrl(fallbackPath);
        return urlData.publicUrl || fallbackPath;
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      addToast({ title: 'Failed to upload image', message: err?.message || 'Storage error', type: 'error' });
    }
    return null;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(validateFile);
    if (files.length > 0) {
      await handleBatchUpload(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(validateFile);
      if (files.length > 0) {
        await handleBatchUpload(files);
      }
      e.target.value = '';
    }
  };

  const handleBatchUpload = async (files: File[]) => {
    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      const url = await uploadFileToStorage(file);
      if (url) {
        successCount++;
        await logAdminAudit({
          actorId: user?.id,
          actorName: user?.name,
          actorRole: user?.role,
          actionType: 'upload_image',
          entityType: 'photo',
          details: { fileName: file.name, fileSize: file.size, url },
        });
      }
    }

    if (successCount > 0) {
      addToast({ title: `Uploaded ${successCount} image(s) to media storage`, type: 'success' });
      await fetchImages();
    }
    setUploading(false);
  };

  // Trigger Replace Flow
  const triggerReplace = (img: ImageItem) => {
    setTargetImageForReplace(img);
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !targetImageForReplace || !supabase) return;
    const file = e.target.files[0];
    if (!validateFile(file)) return;

    setUploading(true);
    try {
      const newUrl = await uploadFileToStorage(file);
      if (!newUrl) throw new Error('Upload failed');

      const target = targetImageForReplace;
      const oldUrl = target.url;

      if (target.type === 'product_image') {
        await supabase
          .from('products')
          .update({ image_url: newUrl, updated_at: new Date().toISOString() })
          .eq('id', target.id);
      } else if (target.type === 'product_gallery' && target.index !== undefined) {
        const { data: prod } = await supabase.from('products').select('gallery_urls').eq('id', target.id).single();
        const currentUrls = [...(prod?.gallery_urls || [])];
        currentUrls[target.index] = newUrl;
        await supabase
          .from('products')
          .update({ gallery_urls: currentUrls, updated_at: new Date().toISOString() })
          .eq('id', target.id);
      } else if (target.type === 'content') {
        const { data: contentRow } = await supabase.from('website_content').select('content').eq('id', target.id).single();
        const updatedContent = { ...(contentRow?.content || {}), [target.dbField || 'image']: newUrl };
        await supabase
          .from('website_content')
          .update({ content: updatedContent, updated_at: new Date().toISOString() })
          .eq('id', target.id);
      }

      await logAdminAudit({
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
        actionType: 'replace_image',
        entityType: 'photo',
        entityId: target.id,
        details: { source: target.sourceName, oldUrl, newUrl },
        previousValue: oldUrl,
        newValue: newUrl,
      });

      addToast({ title: 'Image replaced successfully', type: 'success' });
      await fetchImages();
    } catch (err: any) {
      console.error('Replace error:', err);
      addToast({ title: 'Failed to replace image', message: err?.message, type: 'error' });
    } finally {
      setUploading(false);
      setTargetImageForReplace(null);
      e.target.value = '';
    }
  };

  // Safe Removal of Image Reference
  const handleConfirmDelete = async () => {
    if (!imageToDelete || !supabase) return;
    setIsDeleting(true);

    try {
      const target = imageToDelete;

      if (target.type === 'product_image') {
        await supabase
          .from('products')
          .update({ image_url: null, updated_at: new Date().toISOString() })
          .eq('id', target.id);
      } else if (target.type === 'product_gallery' && target.index !== undefined) {
        const { data: prod } = await supabase.from('products').select('gallery_urls').eq('id', target.id).single();
        const currentUrls = (prod?.gallery_urls || []).filter((_: any, i: number) => i !== target.index);
        await supabase
          .from('products')
          .update({ gallery_urls: currentUrls, updated_at: new Date().toISOString() })
          .eq('id', target.id);
      } else if (target.type === 'content') {
        const { data: contentRow } = await supabase.from('website_content').select('content').eq('id', target.id).single();
        const updatedContent = { ...(contentRow?.content || {}), [target.dbField || 'image']: '' };
        await supabase
          .from('website_content')
          .update({ content: updatedContent, updated_at: new Date().toISOString() })
          .eq('id', target.id);
      }

      await logAdminAudit({
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
        actionType: 'remove_image_reference',
        entityType: 'photo',
        entityId: target.id,
        details: { source: target.sourceName, removedUrl: target.url },
      });

      addToast({ title: 'Image reference removed safely', type: 'success' });
      setImageToDelete(null);
      await fetchImages();
    } catch (err: any) {
      console.error('Delete error:', err);
      addToast({ title: 'Failed to remove image', message: err?.message, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredImages = images.filter((img) => {
    const matchesSearch = img.sourceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' 
      || (filterType === 'product' && img.type.startsWith('product'))
      || (filterType === 'content' && img.type === 'content');
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <AdminPageHeader 
        title="Photo & Media Asset Manager" 
        subtitle="Upload, replace, and safely organize images across products, galleries, and website banners"
        actions={
          <button
            onClick={fetchImages}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin text-[#123B70]")} />
            <span>Reload Media</span>
          </button>
        }
      />

      {/* Upload Dropzone */}
      <div 
        className={cn(
          "border-2 border-dashed rounded-xl p-5 sm:p-6 text-center transition-all duration-200 shadow-xs cursor-pointer",
          isDragging ? "border-[#123B70] bg-[#123B70]/5 ring-4 ring-[#123B70]/10" : "border-slate-300 bg-white hover:bg-slate-50/70"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={handleFileSelect}
        />
        {/* Hidden input for replace action */}
        <input
          type="file"
          ref={replaceInputRef}
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={handleReplaceFile}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-2.5 bg-blue-50 text-[#123B70] rounded-xl border border-blue-200/60 shadow-xs">
            {uploading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-[#123B70]" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              {uploading ? 'Uploading media assets...' : 'Drag & Drop Images or Click to Browse'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Supports JPEG, PNG, WebP, SVG • Max 10MB per file • Auto-uploaded to Supabase Storage
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Gallery Grid */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer", filterType === 'all' ? "bg-[#123B70] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            >
              All Assets ({images.length})
            </button>
            <button
              onClick={() => setFilterType('product')}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer", filterType === 'product' ? "bg-[#123B70] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            >
              Product Images
            </button>
            <button
              onClick={() => setFilterType('content')}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer", filterType === 'content' ? "bg-[#123B70] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            >
              Content & Banners
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product / banner name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#123B70]/20"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredImages.map((img, idx) => (
              <div 
                key={`${img.id}-${idx}`} 
                className="group border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm hover:border-[#123B70]/40 transition-all bg-white flex flex-col justify-between"
              >
                <div className="aspect-square relative overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img 
                    src={img.url} 
                    alt={img.sourceName} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/gallery/visiting-cards-sample.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button 
                      onClick={() => triggerReplace(img)}
                      className="p-1.5 bg-white text-slate-800 rounded-lg hover:text-[#123B70] hover:bg-slate-100 shadow-xs cursor-pointer" 
                      title="Replace Image"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setImageToDelete(img)}
                      className="p-1.5 bg-white text-rose-600 rounded-lg hover:bg-rose-50 shadow-xs cursor-pointer" 
                      title="Remove Reference"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-white space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 truncate" title={img.sourceName}>
                    {img.sourceName}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {img.type === 'product_image' ? 'Main' : img.type === 'product_gallery' ? 'Gallery' : 'Banner'}
                    </span>
                    <a 
                      href={img.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-slate-400 hover:text-[#123B70]"
                      title="Open full image"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 space-y-1.5">
            <ImageIcon className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">No media assets found</p>
            <p className="text-[10px] text-slate-400">Drag & drop image files above to upload new assets</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog with Usage Warning */}
      <ConfirmDialog
        isOpen={Boolean(imageToDelete)}
        title="Remove Image Reference?"
        message={
          imageToDelete
            ? `Are you sure you want to remove the image used on "${imageToDelete.sourceName}"? This will unlink the image from the live catalog.`
            : ''
        }
        confirmText="Remove Image"
        cancelText="Keep"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setImageToDelete(null)}
      />
    </div>
  );
};

export default WebsitePhotosPage;
