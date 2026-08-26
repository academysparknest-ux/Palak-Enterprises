import React, { useState, useEffect, useMemo } from 'react';
import { Settings, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import {
  type PrintConfig,
  DEFAULT_PRINT_CONFIG,
  type PaperSize,
  type PaperOrientation,
  type PrintMode,
  type DuplexFlip,
  type Alignment,
  validatePrintConfig,
  calculatePrintLayout,
  type CardInput,
} from '../../lib/idcard/printLayoutEngine';

const STORAGE_KEY_PREFIX = 'palak_print_config_';

function loadPrintConfig(projectId: string): PrintConfig | null {
  try {
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    if (data) {
      return JSON.parse(data) as PrintConfig;
    }
  } catch (e) {
    console.error('Failed to load print config', e);
  }
  return null;
}

function savePrintConfig(projectId: string, config: PrintConfig) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save print config', e);
  }
}

export function usePrintConfig(
  projectId: string,
  templateWidth: number,
  templateHeight: number,
  isDoubleSided: boolean
): [PrintConfig, (config: PrintConfig) => void, boolean, string | null] {
  const [config, setConfigState] = useState<PrintConfig>(() => {
    const saved = loadPrintConfig(projectId);
    if (saved) {
      if (!isDoubleSided && saved.printMode !== 'front-only') {
        saved.printMode = 'front-only';
      }
      return saved;
    }
    return {
      ...DEFAULT_PRINT_CONFIG,
      cardWidthMm: templateWidth || 85.6,
      cardHeightMm: templateHeight || 54,
      printMode: isDoubleSided ? 'duplex' : 'front-only',
    };
  });

  useEffect(() => {
    if (!isDoubleSided && config.printMode !== 'front-only') {
      setConfigState((prev) => {
        const next: PrintConfig = { ...prev, printMode: 'front-only' };
        savePrintConfig(projectId, next);
        return next;
      });
    }
  }, [isDoubleSided, config.printMode, projectId]);

  const setConfig = (newConfig: PrintConfig) => {
    setConfigState(newConfig);
    savePrintConfig(projectId, newConfig);
  };

  const validationResult = validatePrintConfig(config);

  return [config, setConfig, validationResult.valid, validationResult.error || null];
}

interface PrintSettingsPanelProps {
  config: PrintConfig;
  onChange: (config: PrintConfig) => void;
  isDoubleSided: boolean;
  selectedCount: number;
  cards: CardInput[];
}

export function PrintSettingsPanel({
  config,
  onChange,
  isDoubleSided,
  selectedCount,
  cards,
}: PrintSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const validationResult = validatePrintConfig(config);
  const layout = useMemo(() => {
    if (!validationResult.valid) return null;
    try {
      return calculatePrintLayout(config, cards);
    } catch {
      return null;
    }
  }, [config, cards, validationResult.valid]);

  const handleConfigChange = (changes: Partial<PrintConfig>) => {
    onChange({ ...config, ...changes });
  };

  const handleNumberChange = (field: keyof PrintConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      handleConfigChange({ [field]: val });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-t-lg cursor-pointer"
      >
        <div className="flex items-center gap-2 text-slate-800 font-medium">
          <Settings className="w-5 h-5 text-slate-500" />
          Print Settings
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-slate-200">
          {!validationResult.valid && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{validationResult.error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paper Size</label>
                <select
                  value={config.paperSize}
                  onChange={(e) => handleConfigChange({ paperSize: e.target.value as PaperSize })}
                  className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                >
                  <option value="a4">A4</option>
                  <option value="a5">A5</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paper Orientation</label>
                <div className="flex gap-4">
                  {(['auto', 'portrait', 'landscape'] as PaperOrientation[]).map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="paperOrientation"
                        value={opt}
                        checked={config.paperOrientation === opt}
                        onChange={(e) => handleConfigChange({ paperOrientation: e.target.value as PaperOrientation })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Card Dimensions (mm)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={config.cardWidthMm}
                      onChange={handleNumberChange('cardWidthMm')}
                      className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                      placeholder="W"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">Width</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={config.cardHeightMm}
                      onChange={handleNumberChange('cardHeightMm')}
                      className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                      placeholder="H"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">Height</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gap (mm)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={config.gapHorizontalMm}
                      onChange={handleNumberChange('gapHorizontalMm')}
                      className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                      placeholder="H-Gap"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">Horizontal</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={config.gapVerticalMm}
                      onChange={handleNumberChange('gapVerticalMm')}
                      className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                      placeholder="V-Gap"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">Vertical</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Margins (mm)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={config.marginTopMm}
                      onChange={handleNumberChange('marginTopMm')}
                      className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                    />
                    <span className="text-xs text-slate-500 block">Top</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={config.marginBottomMm}
                      onChange={handleNumberChange('marginBottomMm')}
                      className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                    />
                    <span className="text-xs text-slate-500 block">Bottom</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={config.marginLeftMm}
                      onChange={handleNumberChange('marginLeftMm')}
                      className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                    />
                    <span className="text-xs text-slate-500 block">Left</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={config.marginRightMm}
                      onChange={handleNumberChange('marginRightMm')}
                      className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                    />
                    <span className="text-xs text-slate-500 block">Right</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alignment</label>
                <select
                  value={config.alignment}
                  onChange={(e) => handleConfigChange({ alignment: e.target.value as Alignment })}
                  className="w-full border-slate-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="center">Center</option>
                </select>
              </div>
            </div>

            {/* Right Column & Info */}
            <div className="space-y-6 flex flex-col">
              <div className="space-y-4">
                {isDoubleSided && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Print Mode</label>
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="printMode"
                          value="front-only"
                          checked={config.printMode === 'front-only'}
                          onChange={(e) => handleConfigChange({ printMode: e.target.value as PrintMode })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Front Only</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="printMode"
                          value="front-back-together"
                          checked={config.printMode === 'front-back-together'}
                          onChange={(e) => handleConfigChange({ printMode: e.target.value as PrintMode })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Front + Back Together</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="printMode"
                          value="duplex"
                          checked={config.printMode === 'duplex'}
                          onChange={(e) => handleConfigChange({ printMode: e.target.value as PrintMode })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Duplex Sheets</span>
                      </label>
                    </div>
                  </div>
                )}

                {isDoubleSided && config.printMode === 'duplex' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duplex Flip</label>
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="duplexFlip"
                          value="long-edge"
                          checked={config.duplexFlip === 'long-edge'}
                          onChange={(e) => handleConfigChange({ duplexFlip: e.target.value as DuplexFlip })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Long Edge</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="duplexFlip"
                          value="short-edge"
                          checked={config.duplexFlip === 'short-edge'}
                          onChange={(e) => handleConfigChange({ duplexFlip: e.target.value as DuplexFlip })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Short Edge</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={config.showCutGuides}
                        onChange={(e) => handleConfigChange({ showCutGuides: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${config.showCutGuides ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.showCutGuides ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700">Cut Guides</span>
                  </label>
                </div>
              </div>

              {layout && (
                <div className="mt-auto bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-900 space-y-2">
                  <h4 className="font-semibold mb-3">Calculated Layout</h4>
                  <div className="flex justify-between">
                    <span className="text-blue-700/80">Paper:</span>
                    <span className="font-medium uppercase">{config.paperSize} ({layout.orientation})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700/80">Card:</span>
                    <span className="font-medium">{config.cardWidthMm} × {config.cardHeightMm} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700/80">Grid:</span>
                    <span className="font-medium">{layout.columns} × {layout.rows} (cols × rows)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700/80">Cards/Sheet:</span>
                    <span className="font-medium">{layout.cardsPerPage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700/80">Selected:</span>
                    <span className="font-medium">{selectedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700/80">Required Sheets:</span>
                    <span className="font-medium">{layout.totalSheets}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
