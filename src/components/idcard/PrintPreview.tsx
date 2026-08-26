import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Printer, Download, X } from 'lucide-react';
import type { PrintLayout, PageLayout, CardPosition } from '../../lib/idcard/printLayoutEngine';
import type { IdCardPerson } from '../../lib/idcard/types';

interface PrintPreviewProps {
  layout: PrintLayout;
  persons: IdCardPerson[];
  generationUrls: Map<string, { front?: string; back?: string }>;
  onClose: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
}

export function PrintPreview({
  layout,
  persons,
  generationUrls,
  onClose,
  onPrint,
  onDownloadPdf,
}: PrintPreviewProps) {
  const [screenPreviewScale, setScreenPreviewScale] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const calculateScale = () => {
      const maxPreviewWidth = Math.min(window.innerWidth - 80, 800);
      setScreenPreviewScale(maxPreviewWidth / layout.paperWidthMm);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [layout.paperWidthMm]);

  const totalPages = layout.pages.length;

  const scrollToPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    const element = pageRefs.current[pageNumber - 1];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleScroll = () => {
    // Scroll event listener
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col h-screen">
      {/* Header Bar */}
      <div className="flex-none bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Print Preview</h2>
          <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-gray-100 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-600 min-w-[100px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-gray-100 transition-colors"
              title="Next Page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
          <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Close Preview"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center"
        onScroll={handleScroll}
      >
        <div className="w-full max-w-5xl flex flex-col items-center space-y-12">
          {layout.pages.map((page: PageLayout, pageIndex: number) => (
            <div 
              key={pageIndex} 
              className="flex flex-col items-center"
              ref={(el) => { pageRefs.current[pageIndex] = el; }}
            >
              {/* Paper Sheet */}
              <div
                className="bg-white shadow-xl rounded-sm relative overflow-hidden"
                style={{
                  width: `${layout.paperWidthMm * screenPreviewScale}px`,
                  height: `${layout.paperHeightMm * screenPreviewScale}px`,
                }}
              >
                {page.cards.map((pos: CardPosition, posIdx: number) => {
                  const person = persons.find((p) => p.id === pos.personId);
                  const urls = generationUrls.get(pos.personId);
                  const imageUrl = pos.side === 'front' ? urls?.front : urls?.back;

                  return (
                    <div
                      key={posIdx}
                      className="absolute flex items-center justify-center bg-gray-50"
                      style={{
                        left: `${pos.xMm * screenPreviewScale}px`,
                        top: `${pos.yMm * screenPreviewScale}px`,
                        width: `${layout.cardWidthMm * screenPreviewScale}px`,
                        height: `${layout.cardHeightMm * screenPreviewScale}px`,
                        border: layout.showCutGuides ? '0.5px dashed #cbd5e1' : 'none',
                      }}
                    >
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={`${person?.name || 'Card'} ${pos.side}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-400 text-center px-2">
                          {person?.name || 'Empty'}
                          <br />
                          ({pos.side})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Page Number Label */}
              <div className="mt-4 text-sm text-gray-400 font-medium">
                Page {pageIndex + 1}
              </div>
            </div>
          ))}

          {/* Print Hint */}
          <div className="text-xs text-gray-400 mt-4 pb-8 text-center max-w-md">
            For accurate ID-card dimensions, print at 100% scale.
            <br />
            Do not select "Fit to Page" or "Scale to Fit" in your print dialogue.
          </div>
        </div>
      </div>
    </div>
  );
}
