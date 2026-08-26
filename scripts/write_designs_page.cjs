const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'pages', 'admin', 'idcard', 'IdCardDesignsPage.tsx');

const content = `import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectContext } from './IdCardProjectLayout';
import {
  getDesigns, getDesign, createDesign, updateDesign, createDesignVersion,
  getDesignAssignments, assignDesignToGroup, getGroups, getProjectFields, getPersons
} from '../../../lib/idcard/database';
import type { 
  IdCardDesign, DesignConfig, DesignElement, DesignElementType, 
  IdCardGroup, ProjectField, IdCardPerson, CardDataSnapshot
} from '../../../types/idcard';
import { ID_CARD_TEMPLATES, type CardTemplate } from '../../../lib/idcard/templates';
import {
  Plus, Copy, Users, Palette, Type, Image as ImageIcon, Grid, Circle, Square,
  Save, Trash2, AlertTriangle, Check, Layers, Loader2, Undo2, Redo2, ZoomIn, ZoomOut,
  Eye, EyeOff, Lock, Unlock, AlignLeft, AlignCenter, AlignRight,
  MoveUp, MoveDown, ArrowUpToLine, ArrowDownToLine, CheckCircle2, ChevronLeft, ChevronRight,
  Sliders, ShieldAlert, Sparkles, Barcode
} from 'lucide-react';
import { cn, formatAdminErrorMessage } from '../../../lib/utils';
import { AdminContentContainer } from '../../../components/admin/AdminContentContainer';
import { resolveText } from '../../../lib/idcard/cardRenderer';
import { buildIdCardVerificationUrl, generateQrToken, generateIdCardQr } from '../../../lib/idcard/qrVerification';

type TabType = 'templates' | 'designs' | 'designer' | 'assignments';

interface StandardSizePreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  orientation: 'landscape' | 'portrait';
}

const SIZE_PRESETS: StandardSizePreset[] = [
  { id: 'cr80_h', name: 'CR80 Landscape (Standard)', widthMm: 85.60, heightMm: 53.98, orientation: 'landscape' },
  { id: 'cr80_v', name: 'CR80 Portrait (Standard)', widthMm: 53.98, heightMm: 85.60, orientation: 'portrait' },
  { id: 'cr79', name: 'CR79 (Slightly Smaller)', widthMm: 83.90, heightMm: 52.07, orientation: 'landscape' },
  { id: 'a7_v', name: 'A7 Vertical Badge', widthMm: 74.00, heightMm: 105.00, orientation: 'portrait' },
];

const FONT_FAMILIES = [
  'Arial, sans-serif',
  'Inter, sans-serif',
  'Roboto, sans-serif',
  'Montserrat, sans-serif',
  'Poppins, sans-serif',
  'Times New Roman, serif',
  'Courier New, monospace'
];

interface HistoryState {
  frontConfig: DesignConfig;
  backConfig: DesignConfig;
  cardWidthMm: number;
  cardHeightMm: number;
}

export const IdCardDesignsPage: React.FC = () => {
  const { project } = useProjectContext();
  const [activeTab, setActiveTab] = useState<TabType>('designs');
  const [designs, setDesigns] = useState<IdCardDesign[]>([]);
  const [groups, setGroups] = useState<IdCardGroup[]>([]);
  const [fields, setFields] = useState<ProjectField[]>([]);
  const [samplePersons, setSamplePersons] = useState<IdCardPerson[]>([]);
  const [samplePersonIndex, setSamplePersonIndex] = useState(0);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Designer State
  const [editingDesign, setEditingDesign] = useState<IdCardDesign | null>(null);
  const [frontConfig, setFrontConfig] = useState<DesignConfig>({ background: { type: 'solid', color: '#ffffff' }, elements: [] });
  const [backConfig, setBackConfig] = useState<DesignConfig>({ background: { type: 'solid', color: '#f8fafc' }, elements: [] });
  const [isDoubleSided, setIsDoubleSided] = useState(true);
  const [cardWidthMm, setCardWidthMm] = useState(85.60);
  const [cardHeightMm, setCardHeightMm] = useState(53.98);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Canvas Viewport & Guidelines
  const [zoom, setZoom] = useState(3.5);
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const [snapToGrid] = useState(true);
  const [livePreviewMode, setLivePreviewMode] = useState(false);
  const [sampleQrDataUrl, setSampleQrDataUrl] = useState<string | null>(null);

  // Validation Drawer
  const [showValidation, setShowValidation] = useState(false);
  const [validationIssues, setValidationIssues] = useState<Array<{ type: 'error' | 'warning'; message: string; elementId?: string }>>([]);

  // Undo / Redo Stack
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // Dragging & Resizing Interactions
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number; elemW: number; elemH: number }>({
    mouseX: 0, mouseY: 0, elemX: 0, elemY: 0, elemW: 0, elemH: 0
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!project?.id) return;
      const [fetchedDesigns, fetchedGroups, fetchedFields, fetchedAssignments, fetchedPersons] = await Promise.all([
        getDesigns(project.id),
        getGroups(project.id),
        getProjectFields(project.id),
        getDesignAssignments(project.id),
        getPersons(project.id, { pageSize: 20 })
      ]);
      setDesigns(fetchedDesigns || []);
      setGroups(fetchedGroups || []);
      setFields(fetchedFields || []);
      setSamplePersons(fetchedPersons.persons || []);
      
      const assignmentMap: Record<string, string> = {};
      fetchedAssignments.forEach(a => {
        if (a.groupId) assignmentMap[a.groupId] = a.designId;
      });
      setAssignments(assignmentMap);

      // Generate sample QR code data url
      const sampleToken = generateQrToken();
      const sampleUrl = buildIdCardVerificationUrl(sampleToken);
      const qrData = await generateIdCardQr(sampleUrl);
      setSampleQrDataUrl(qrData);

    } catch (err: any) {
      setError(formatAdminErrorMessage(err, 'Failed to load design data'));
    } finally {
      setIsLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (project) {
      loadData();
    }
  }, [project, loadData]);

  // Record History State for Undo/Redo
  const pushHistoryState = useCallback((newFront: DesignConfig, newBack: DesignConfig, width: number, height: number) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    const state: HistoryState = {
      frontConfig: JSON.parse(JSON.stringify(newFront)),
      backConfig: JSON.parse(JSON.stringify(newBack)),
      cardWidthMm: width,
      cardHeightMm: height
    };
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, state].slice(-30);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const currentConfig = activeSide === 'front' ? frontConfig : backConfig;
  const setCurrentConfig = (cfg: DesignConfig, recordHistory = true) => {
    if (activeSide === 'front') {
      setFrontConfig(cfg);
      if (recordHistory) pushHistoryState(cfg, backConfig, cardWidthMm, cardHeightMm);
    } else {
      setBackConfig(cfg);
      if (recordHistory) pushHistoryState(frontConfig, cfg, cardWidthMm, cardHeightMm);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const target = history[historyIndex - 1];
      setFrontConfig(target.frontConfig);
      setBackConfig(target.backConfig);
      setCardWidthMm(target.cardWidthMm);
      setCardHeightMm(target.cardHeightMm);
      setHistoryIndex(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const target = history[historyIndex + 1];
      setFrontConfig(target.frontConfig);
      setBackConfig(target.backConfig);
      setCardWidthMm(target.cardWidthMm);
      setCardHeightMm(target.cardHeightMm);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const selectedElement = currentConfig.elements.find(el => el.id === selectedElementId);

  const updateSelectedElement = (updates: Partial<DesignElement>) => {
    if (!selectedElementId) return;
    setCurrentConfig({
      ...currentConfig,
      elements: currentConfig.elements.map(el => el.id === selectedElementId ? { ...el, ...updates } : el)
    });
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) return;
    setCurrentConfig({
      ...currentConfig,
      elements: currentConfig.elements.filter(el => el.id !== selectedElementId)
    });
    setSelectedElementId(null);
  };

  const duplicateSelectedElement = () => {
    if (!selectedElement) return;
    const dup: DesignElement = {
      ...selectedElement,
      id: \`el_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`,
      x: Math.min(cardWidthMm - selectedElement.width, selectedElement.x + 3),
      y: Math.min(cardHeightMm - selectedElement.height, selectedElement.y + 3),
      zIndex: (currentConfig.elements.length || 0) + 1
    };
    setCurrentConfig({
      ...currentConfig,
      elements: [...currentConfig.elements, dup]
    });
    setSelectedElementId(dup.id);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'designer') return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          deleteSelectedElement();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedElementId) {
          e.preventDefault();
          duplicateSelectedElement();
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedElementId) {
          e.preventDefault();
          const step = e.shiftKey ? 2.0 : 0.5;
          let dx = 0, dy = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;
          
          updateSelectedElement({
            x: Math.max(0, Math.min(cardWidthMm, (selectedElement?.x || 0) + dx)),
            y: Math.max(0, Math.min(cardHeightMm, (selectedElement?.y || 0) + dy))
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedElementId, historyIndex, history, selectedElement, cardWidthMm, cardHeightMm]);

  const handleUseTemplate = async (template: CardTemplate) => {
    try {
      if (!project?.id) return;
      const newDesign = await createDesign({
        projectId: project.id,
        name: \`\${template.name}\`,
        description: \`Based on \${template.name}\`,
        category: template.category || 'custom',
        isDoubleSided: template.isDoubleSided,
        cardWidthMm: template.widthMm,
        cardHeightMm: template.heightMm,
        frontConfig: template.frontConfig,
        backConfig: template.backConfig,
      });
      setDesigns(prev => [newDesign, ...prev]);
      handleEditDesign(newDesign);
    } catch (err: any) {
      setError(err.message || 'Failed to create design from template');
    }
  };

  const handleEditDesign = async (design: IdCardDesign) => {
    try {
      const fullDesign = await getDesign(design.id);
      if (!fullDesign) return;
      setEditingDesign(fullDesign);
      setFrontConfig(fullDesign.frontConfig);
      setBackConfig(fullDesign.backConfig);
      setIsDoubleSided(fullDesign.isDoubleSided);
      setCardWidthMm(fullDesign.cardWidthMm || 85.60);
      setCardHeightMm(fullDesign.cardHeightMm || 53.98);
      setActiveTab('designer');
      setSelectedElementId(null);
      
      const initial: HistoryState = {
        frontConfig: JSON.parse(JSON.stringify(fullDesign.frontConfig)),
        backConfig: JSON.parse(JSON.stringify(fullDesign.backConfig)),
        cardWidthMm: fullDesign.cardWidthMm || 85.60,
        cardHeightMm: fullDesign.cardHeightMm || 53.98
      };
      setHistory([initial]);
      setHistoryIndex(0);
    } catch (err: any) {
      setError(err.message || 'Failed to load design');
    }
  };

  const handleDuplicateDesign = async (design: IdCardDesign) => {
    try {
      if (!project?.id) return;
      const fullDesign = await getDesign(design.id);
      if (!fullDesign) return;
      const newDesign = await createDesign({
        projectId: project.id,
        name: \`\${design.name} (Copy)\`,
        description: design.description || undefined,
        category: design.category,
        isDoubleSided: design.isDoubleSided,
        cardWidthMm: design.cardWidthMm,
        cardHeightMm: design.cardHeightMm,
        frontConfig: fullDesign.frontConfig,
        backConfig: fullDesign.backConfig,
      });
      setDesigns(prev => [newDesign, ...prev]);
      alert(\`Design duplicated as "\${newDesign.name}"\`);
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate design');
    }
  };

  const handleAssignDesign = async (groupId: string, designId: string) => {
    try {
      await assignDesignToGroup({ projectId: project.id, groupId, designId });
      setAssignments(prev => ({ ...prev, [groupId]: designId }));
    } catch (err: any) {
      setError(err.message || 'Failed to assign design');
    }
  };

  const handleApplySizePreset = (preset: StandardSizePreset) => {
    setCardWidthMm(preset.widthMm);
    setCardHeightMm(preset.heightMm);
    pushHistoryState(frontConfig, backConfig, preset.widthMm, preset.heightMm);
  };

  const validateDesignElements = () => {
    const issues: Array<{ type: 'error' | 'warning'; message: string; elementId?: string }> = [];
    const elements = currentConfig.elements;
    
    // 1. Safe area boundary check (2mm margin)
    elements.forEach(el => {
      if (el.x < 1.5 || el.y < 1.5 || (el.x + el.width) > (cardWidthMm - 1.5) || (el.y + el.height) > (cardHeightMm - 1.5)) {
        issues.push({
          type: 'warning',
          message: \`Element "\${el.type.replace('_', ' ')}" is close to card edge. Text may be trimmed during cut.\`,
          elementId: el.id
        });
      }
      // 2. Minimum QR size check
      if (el.type === 'qr_code' && (el.width < 12 || el.height < 12)) {
        issues.push({
          type: 'warning',
          message: \`QR code (\${el.width}×\${el.height}mm) is smaller than recommended 12mm. It may not scan reliably.\`,
          elementId: el.id
        });
      }
    });

    // 3. Photo Frame check
    const hasPhoto = elements.some(e => e.type === 'photo_frame');
    if (!hasPhoto && (editingDesign?.category === 'student' || editingDesign?.category === 'employee')) {
      issues.push({
        type: 'warning',
        message: 'No photo frame found in this identity card design.'
      });
    }

    setValidationIssues(issues);
    setShowValidation(true);
    return issues.filter(i => i.type === 'error').length === 0;
  };

  const handleSaveDesign = async (asNewVersion: boolean) => {
    if (!editingDesign) return;
    try {
      if (asNewVersion) {
        await createDesignVersion(
          editingDesign.id, 
          { frontConfig, backConfig, isDoubleSided, cardWidthMm, cardHeightMm, changeNotes: 'Manual version save' }
        );
        const updated = await getDesign(editingDesign.id);
        if (updated) {
          setEditingDesign(updated);
          setDesigns(prev => prev.map(d => d.id === updated.id ? updated : d));
        }
      } else {
        await updateDesign(editingDesign.id, { 
          frontConfig, 
          backConfig,
          isDoubleSided,
          cardWidthMm,
          cardHeightMm
        });
        setDesigns(prev => prev.map(d => d.id === editingDesign.id ? { ...d, frontConfig, backConfig, isDoubleSided, cardWidthMm, cardHeightMm } : d));
      }
      alert(asNewVersion ? 'New design version created!' : 'Design saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to save design');
    }
  };

  const addElement = (type: DesignElementType, props: Partial<DesignElement> = {}) => {
    const snap = (v: number) => snapToGrid ? Math.round(v) : v;
    const newElement: DesignElement = {
      id: \`el_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`,
      type,
      x: snap(8),
      y: snap(8),
      width: type === 'text' || type === 'dynamic_text' ? 45 : (type === 'photo_frame' ? 28 : (type === 'barcode' ? 36 : 15)),
      height: type === 'text' || type === 'dynamic_text' ? 6 : (type === 'photo_frame' ? 35 : (type === 'barcode' ? 12 : 15)),
      rotation: 0,
      zIndex: (currentConfig.elements.length || 0) + 1,
      isVisible: true,
      isLocked: false,
      ...props
    };

    setCurrentConfig({
      ...currentConfig,
      elements: [...currentConfig.elements, newElement]
    });
    setSelectedElementId(newElement.id);
  };

  const alignSelected = (alignment: 'left' | 'center_h' | 'right' | 'top' | 'center_v' | 'bottom') => {
    if (!selectedElement) return;
    let newX = selectedElement.x;
    let newY = selectedElement.y;

    if (alignment === 'left') newX = 3;
    if (alignment === 'center_h') newX = (cardWidthMm - selectedElement.width) / 2;
    if (alignment === 'right') newX = cardWidthMm - selectedElement.width - 3;
    if (alignment === 'top') newY = 3;
    if (alignment === 'center_v') newY = (cardHeightMm - selectedElement.height) / 2;
    if (alignment === 'bottom') newY = cardHeightMm - selectedElement.height - 3;

    updateSelectedElement({ x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
  };

  const changeZIndex = (direction: 'front' | 'forward' | 'backward' | 'back') => {
    if (!selectedElementId) return;
    const elements = [...currentConfig.elements];
    const idx = elements.findIndex(e => e.id === selectedElementId);
    if (idx === -1) return;

    const [item] = elements.splice(idx, 1);
    if (direction === 'front') elements.push(item);
    if (direction === 'back') elements.unshift(item);
    if (direction === 'forward') elements.splice(Math.min(elements.length, idx + 1), 0, item);
    if (direction === 'backward') elements.splice(Math.max(0, idx - 1), 0, item);

    const reindexed = elements.map((el, i) => ({ ...el, zIndex: i + 1 }));
    setCurrentConfig({ ...currentConfig, elements: reindexed });
  };

  const samplePerson = samplePersons[samplePersonIndex];
  
  const sampleSnapshot: CardDataSnapshot = {
    displayName: samplePerson?.displayName || 'Rahul Kumar',
    personCode: samplePerson?.personCode || 'STU-2026-001',
    groupName: groups.find(g => g.id === samplePerson?.groupId)?.name || 'Class 10-A',
    sessionName: project?.name || 'Academic 2026-27',
    fieldValues: samplePerson?.fieldValues || {
      class: '10th',
      rollNo: '24',
      phone: '+91 98765 43210',
      bloodGroup: 'B+',
      dob: '15/08/2010',
      fatherName: 'Suresh Kumar',
      address: 'Sector 4, Main Road, City',
      designation: 'Senior Faculty',
      department: 'Science & Math'
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, elId?: string) => {
    if (elId) {
      setSelectedElementId(elId);
      const el = currentConfig.elements.find(item => item.id === elId);
      if (el && !el.isLocked) {
        setIsDragging(true);
        dragStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          elemX: el.x,
          elemY: el.y,
          elemW: el.width,
          elemH: el.height
        };
      }
    } else {
      setSelectedElementId(null);
    }
  };

  const handleResizeHandleDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.isLocked) return;
    setIsResizing(handle);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elemX: selectedElement.x,
      elemY: selectedElement.y,
      elemW: selectedElement.width,
      elemH: selectedElement.height
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!selectedElement || selectedElement.isLocked) return;
    const dxMm = (e.clientX - dragStartRef.current.mouseX) / zoom;
    const dyMm = (e.clientY - dragStartRef.current.mouseY) / zoom;
    const snap = (v: number) => snapToGrid ? Math.round(v * 2) / 2 : Math.round(v * 10) / 10;

    if (isDragging) {
      const newX = Math.max(0, Math.min(cardWidthMm - selectedElement.width, dragStartRef.current.elemX + dxMm));
      const newY = Math.max(0, Math.min(cardHeightMm - selectedElement.height, dragStartRef.current.elemY + dyMm));
      updateSelectedElement({ x: snap(newX), y: snap(newY) });
    } else if (isResizing) {
      let newW = dragStartRef.current.elemW;
      let newH = dragStartRef.current.elemH;
      let newX = dragStartRef.current.elemX;
      let newY = dragStartRef.current.elemY;

      if (isResizing.includes('e')) newW = Math.max(5, dragStartRef.current.elemW + dxMm);
      if (isResizing.includes('s')) newH = Math.max(3, dragStartRef.current.elemH + dyMm);
      if (isResizing.includes('w')) {
        const potentialW = Math.max(5, dragStartRef.current.elemW - dxMm);
        newX = dragStartRef.current.elemX + (dragStartRef.current.elemW - potentialW);
        newW = potentialW;
      }
      if (isResizing.includes('n')) {
        const potentialH = Math.max(3, dragStartRef.current.elemH - dyMm);
        newY = dragStartRef.current.elemY + (dragStartRef.current.elemH - potentialH);
        newH = potentialH;
      }

      updateSelectedElement({
        x: snap(newX),
        y: snap(newY),
        width: snap(newW),
        height: snap(newH)
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDragging || isResizing) {
      setIsDragging(false);
      setIsResizing(null);
      pushHistoryState(frontConfig, backConfig, cardWidthMm, cardHeightMm);
    }
  };

  if (isLoading) {
    return (
      <AdminContentContainer>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </AdminContentContainer>
    );
  }

  return (
    <AdminContentContainer>
      <div className="flex flex-col h-[calc(100vh-7.5rem)]">
        {/* Top Bar / Navigation */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Palette className="h-5 w-5 text-amber-500" />
                ID Card Designer
              </h1>
              {editingDesign && activeTab === 'designer' && (
                <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-full flex items-center gap-1">
                  Editing: {editingDesign.name} (v{editingDesign.versionCount || 1})
                </span>
              )}
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-300 bg-red-900/30 border border-red-500/30 px-3 py-1 rounded-lg text-xs">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-1 text-red-400 hover:text-white">✕</button>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/60">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('templates')}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors", activeTab === 'templates' ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:text-white hover:bg-slate-700")}
              >
                Starter Templates
              </button>
              <button
                onClick={() => setActiveTab('designs')}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors", activeTab === 'designs' ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:text-white hover:bg-slate-700")}
              >
                Saved Designs ({designs.length})
              </button>
              <button
                onClick={() => setActiveTab('designer')}
                disabled={!editingDesign}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5", 
                  activeTab === 'designer' ? "bg-amber-500 text-slate-900" : 
                  !editingDesign ? "text-slate-500 cursor-not-allowed" : "text-slate-300 hover:text-white hover:bg-slate-700")}
              >
                Visual Designer
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors", activeTab === 'assignments' ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:text-white hover:bg-slate-700")}
              >
                Group Assignments
              </button>
            </div>

            {activeTab === 'designer' && editingDesign && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button
                  onClick={() => validateDesignElements()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                  Validate
                </button>
                <button
                  onClick={() => handleSaveDesign(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
                <button
                  onClick={() => handleSaveDesign(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow transition-colors"
                >
                  <Layers className="h-3.5 w-3.5" /> Save as v{(editingDesign.versionCount || 1) + 1}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          
          {/* STARTER TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 overflow-y-auto pb-6 pr-2">
              {ID_CARD_TEMPLATES.map(template => (
                <div key={template.id} className="bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all flex flex-col group shadow-lg">
                  <div className="aspect-[1.58] bg-slate-900 flex items-center justify-center p-4 border-b border-slate-700/80 relative overflow-hidden">
                    <div 
                      className="w-full h-full rounded shadow-sm border border-slate-700/60 flex flex-col items-center justify-center relative p-3"
                      style={{ background: template.frontConfig.background.color || '#ffffff' }}
                    >
                      <div className="text-[11px] font-bold text-slate-800 truncate">{template.name}</div>
                      <div className="text-[9px] text-slate-500 mt-1 capitalize">{template.category} Template</div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className="px-2 py-0.5 bg-slate-800/90 border border-slate-700 text-[10px] font-bold rounded text-amber-400 uppercase tracking-wider">
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-white mb-1">{template.name}</h3>
                    <p className="text-xs text-slate-400 flex-1 mb-3">{template.widthMm} × {template.heightMm} mm ({template.orientation})</p>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Customize Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ACTIVE DESIGNS */}
          {activeTab === 'designs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 overflow-y-auto pb-6 pr-2">
              <div 
                onClick={() => setActiveTab('templates')}
                className="bg-slate-800/40 border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-800/70 cursor-pointer transition-all min-h-[240px]"
              >
                <Plus className="h-8 w-8 mb-2 text-amber-500" />
                <span className="font-bold text-sm text-white">Create New Design</span>
                <span className="text-xs mt-1 text-slate-400">Pick from starter templates</span>
              </div>
              
              {designs.map(design => (
                <div key={design.id} className="bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden flex flex-col shadow-lg">
                  <div className="aspect-[1.58] bg-slate-900/90 p-4 border-b border-slate-700 relative flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-amber-400 font-bold text-sm mb-1">{design.name}</div>
                      <div className="text-[11px] text-slate-400">{design.cardWidthMm} × {design.cardHeightMm} mm</div>
                    </div>
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 rounded">
                      v{design.versionCount || 1}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-white mb-1 truncate">{design.name}</h3>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2 flex-1">{design.description || 'Universal ID Card Design'}</p>
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button
                        onClick={() => handleEditDesign(design)}
                        className="col-span-2 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Palette className="h-3.5 w-3.5" /> Visual Designer
                      </button>
                      <button
                        onClick={() => handleDuplicateDesign(design)}
                        className="py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Copy className="h-3.5 w-3.5" /> Duplicate
                      </button>
                      <button
                        onClick={() => setActiveTab('assignments')}
                        className="py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Users className="h-3.5 w-3.5" /> Assign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VISUAL DESIGNER */}
          {activeTab === 'designer' && editingDesign && (
            <div className="flex flex-1 gap-4 min-h-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              
              {/* Left Toolbar - Elements Palette */}
              <div className="w-60 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto p-3.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Standard Elements</div>
                <div className="space-y-1.5">
                  <button onClick={() => addElement('text', { text: 'HEADING TEXT', fontSize: 13, fontWeight: 'bold' })} className="w-full flex items-center gap-2.5 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left text-xs text-white transition-colors">
                    <Type className="h-4 w-4 text-amber-400" />
                    <span>Heading Text</span>
                  </button>
                  <button onClick={() => addElement('text', { text: 'Secondary Subtitle', fontSize: 9, fontWeight: 'normal' })} className="w-full flex items-center gap-2.5 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left text-xs text-white transition-colors">
                    <Type className="h-4 w-4 text-slate-400" />
                    <span>Body Text</span>
                  </button>
                  <button onClick={() => addElement('photo_frame', { width: 28, height: 35, borderRadius: 2, strokeColor: '#1e293b', strokeWidth: 0.5 })} className="w-full flex items-center gap-2.5 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left text-xs text-white transition-colors">
                    <ImageIcon className="h-4 w-4 text-indigo-400" />
                    <span>Photo Frame (3:4)</span>
                  </button>
                  <button onClick={() => addElement('qr_code', { width: 14, height: 14 })} className="w-full flex items-center gap-2.5 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left text-xs text-white transition-colors">
                    <Grid className="h-4 w-4 text-emerald-400" />
                    <span>Dynamic QR Code</span>
                  </button>
                  <button onClick={() => addElement('barcode', { width: 36, height: 12 })} className="w-full flex items-center gap-2.5 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left text-xs text-white transition-colors">
                    <Barcode className="h-4 w-4 text-sky-400" />
                    <span>Barcode (Code128)</span>
                  </button>
                  <button onClick={() => addElement('line', { width: 30, height: 0, strokeWidth: 0.5, strokeColor: '#64748b' })} className="w-full flex items-center gap-2.5 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left text-xs text-white transition-colors">
                    <span className="h-0.5 w-4 bg-slate-400" />
                    <span>Divider Line</span>
                  </button>
                  <button onClick={() => addElement('shape', { shapeType: 'rectangle', width: 35, height: 10, fillColor: '#1e3a8a' })} className="w-full flex items-center gap-2.5 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left text-xs text-white transition-colors">
                    <Square className="h-4 w-4 text-blue-400" />
                    <span>Rectangle Box</span>
                  </button>
                  <button onClick={() => addElement('shape', { shapeType: 'circle', width: 16, height: 16, fillColor: '#dc2626' })} className="w-full flex items-center gap-2.5 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left text-xs text-white transition-colors">
                    <Circle className="h-4 w-4 text-red-400" />
                    <span>Circle / Badge</span>
                  </button>
                </div>

                <div className="h-px bg-slate-700 my-3" />
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dynamic Project Fields</div>
                <div className="space-y-2">
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        addElement('dynamic_text', { 
                          fieldKey: e.target.value, 
                          text: '{{' + e.target.value + '}}',
                          fontSize: 10,
                          fontWeight: 'bold',
                          color: '#0f172a'
                        });
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Add Dynamic Field...</option>
                    <option value="name">Full Name (name)</option>
                    <option value="personCode">ID / Adm Number (personCode)</option>
                    <option value="groupName">Group / Class (groupName)</option>
                    <option value="sessionName">Academic Session (sessionName)</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.fieldKey}>{f.label} ({f.fieldKey})</option>
                    ))}
                  </select>
                </div>

                {/* Layer Stack */}
                <div className="mt-auto pt-4 border-t border-slate-700">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                    <span>Layers ({currentConfig.elements.length})</span>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {[...currentConfig.elements].reverse().map(el => (
                      <div 
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={cn(
                          "flex items-center justify-between p-1.5 rounded text-[11px] cursor-pointer transition-colors",
                          selectedElementId === el.id ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40" : "text-slate-300 hover:bg-slate-700/60"
                        )}
                      >
                        <span className="truncate max-w-[110px]">{el.text || el.fieldKey || el.type}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); updateSelectedElement({ isVisible: !(el.isVisible ?? true) }); }} className="text-slate-400 hover:text-white">
                            {el.isVisible === false ? <EyeOff className="h-3 w-3 text-red-400" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); updateSelectedElement({ isLocked: !(el.isLocked ?? false) }); }} className="text-slate-400 hover:text-white">
                            {el.isLocked ? <Lock className="h-3 w-3 text-amber-400" /> : <Unlock className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center Canvas Studio */}
              <div 
                className="flex-1 flex flex-col bg-slate-950/60 relative overflow-hidden"
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              >
                {/* Secondary Canvas Controls Bar */}
                <div className="flex justify-between items-center p-2.5 border-b border-slate-700 bg-slate-800/90 text-xs">
                  {/* Side Switcher */}
                  <div className="flex items-center gap-2">
                    <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                      <button 
                        onClick={() => { setActiveSide('front'); setSelectedElementId(null); }}
                        className={cn("px-3 py-1 rounded-md font-bold transition-colors", activeSide === 'front' ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white")}
                      >
                        Front Side
                      </button>
                      {isDoubleSided && (
                        <button 
                          onClick={() => { setActiveSide('back'); setSelectedElementId(null); }}
                          className={cn("px-3 py-1 rounded-md font-bold transition-colors", activeSide === 'back' ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white")}
                        >
                          Back Side
                        </button>
                      )}
                    </div>
                    
                    <label className="flex items-center gap-1.5 text-slate-300 ml-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isDoubleSided} 
                        onChange={(e) => setIsDoubleSided(e.target.checked)} 
                        className="rounded border-slate-700 text-amber-500 focus:ring-0" 
                      />
                      <span>Double Sided</span>
                    </label>
                  </div>

                  {/* Contextual Alignment Bar when Element Selected */}
                  {selectedElement && !livePreviewMode ? (
                    <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700">
                      <button onClick={() => alignSelected('left')} className="p-1 hover:text-white text-slate-400" title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></button>
                      <button onClick={() => alignSelected('center_h')} className="p-1 hover:text-white text-slate-400" title="Center Horizontally"><AlignCenter className="h-3.5 w-3.5" /></button>
                      <button onClick={() => alignSelected('right')} className="p-1 hover:text-white text-slate-400" title="Align Right"><AlignRight className="h-3.5 w-3.5" /></button>
                      <div className="h-3.5 w-px bg-slate-700 mx-1" />
                      <button onClick={() => changeZIndex('forward')} className="p-1 hover:text-white text-slate-400" title="Bring Forward"><MoveUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => changeZIndex('backward')} className="p-1 hover:text-white text-slate-400" title="Send Backward"><MoveDown className="h-3.5 w-3.5" /></button>
                      <button onClick={() => changeZIndex('front')} className="p-1 hover:text-white text-slate-400" title="Bring to Front"><ArrowUpToLine className="h-3.5 w-3.5" /></button>
                      <button onClick={() => changeZIndex('back')} className="p-1 hover:text-white text-slate-400" title="Send to Back"><ArrowDownToLine className="h-3.5 w-3.5" /></button>
                      <div className="h-3.5 w-px bg-slate-700 mx-1" />
                      <button onClick={duplicateSelectedElement} className="p-1 hover:text-amber-400 text-slate-400" title="Duplicate (Ctrl+D)"><Copy className="h-3.5 w-3.5" /></button>
                      <button onClick={deleteSelectedElement} className="p-1 hover:text-red-400 text-slate-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : null}

                  {/* Viewport Toggles & Zoom */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setLivePreviewMode(!livePreviewMode)}
                      className={cn("px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors", livePreviewMode ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:text-white")}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {livePreviewMode ? 'Editing Mode' : 'Live Data Preview'}
                    </button>
                    <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={showSafeAreas} onChange={(e) => setShowSafeAreas(e.target.checked)} className="rounded border-slate-700" />
                      <span>Safe Area</span>
                    </label>
                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-700">
                      <button onClick={() => setZoom(Math.max(2, zoom - 0.5))} className="p-1 text-slate-400 hover:text-white"><ZoomOut className="h-3.5 w-3.5" /></button>
                      <span className="text-[11px] font-mono px-1 text-amber-400 font-bold">{Math.round(zoom * 25)}%</span>
                      <button onClick={() => setZoom(Math.min(6, zoom + 0.5))} className="p-1 text-slate-400 hover:text-white"><ZoomIn className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>

                {/* Sample Record Navigator when in Live Preview Mode */}
                {livePreviewMode && (
                  <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-200">
                    <div className="flex items-center gap-2 font-medium">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      <span>Previewing with Record: <strong className="text-white">{sampleSnapshot.displayName}</strong> ({sampleSnapshot.personCode})</span>
                    </div>
                    {samplePersons.length > 1 && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSamplePersonIndex(prev => (prev > 0 ? prev - 1 : samplePersons.length - 1))}
                          className="p-1 bg-emerald-900/60 hover:bg-emerald-800 rounded border border-emerald-700 text-white"
                          title="Previous Record"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-mono text-[11px]">{samplePersonIndex + 1} of {samplePersons.length}</span>
                        <button 
                          onClick={() => setSamplePersonIndex(prev => (prev < samplePersons.length - 1 ? prev + 1 : 0))}
                          className="p-1 bg-emerald-900/60 hover:bg-emerald-800 rounded border border-emerald-700 text-white"
                          title="Next Record"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Visual Canvas Viewport */}
                <div 
                  className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"
                  onMouseDown={(e) => handleCanvasMouseDown(e)}
                >
                  <div 
                    className="relative bg-white shadow-2xl transition-transform border border-slate-700 select-none"
                    style={{
                      width: \`\${cardWidthMm * zoom}px\`,
                      height: \`\${cardHeightMm * zoom}px\`,
                      background: currentConfig.background.color || '#ffffff'
                    }}
                  >
                    {/* Safe Area and Bleed Overlays */}
                    {showSafeAreas && (
                      <>
                        {/* Bleed Margin Area Guide */}
                        <div className="absolute -inset-[8px] border border-red-500/25 pointer-events-none border-dashed" title="Bleed Limit" />
                        {/* Safe Area Inner Guide */}
                        <div className="absolute inset-[8px] border border-blue-500/35 pointer-events-none border-dashed" title="Safe Printing Zone" />
                      </>
                    )}
                    
                    {/* Rendered Canvas Elements */}
                    {currentConfig.elements.map(el => {
                      if (el.isVisible === false) return null;
                      const isSel = selectedElementId === el.id && !livePreviewMode;
                      const ex = el.x * zoom;
                      const ey = el.y * zoom;
                      const ew = el.width * zoom;
                      const eh = el.height * zoom;
                      const textVal = el.type === 'dynamic_text' 
                        ? resolveText(el.text || \`{{\${el.fieldKey}}}\`, livePreviewMode ? sampleSnapshot : { displayName: 'Rahul Kumar', personCode: 'STU-001', groupName: 'Sample Group', sessionName: '2026', fieldValues: {} }) 
                        : el.text || '';

                      return (
                        <div
                          key={el.id}
                          onMouseDown={(e) => { e.stopPropagation(); handleCanvasMouseDown(e, el.id); }}
                          className={cn(
                            "absolute flex items-center justify-center select-none cursor-move",
                            isSel ? "ring-2 ring-blue-500 ring-offset-1 z-50 shadow-md" : "hover:ring-1 hover:ring-blue-400/50"
                          )}
                          style={{
                            left: \`\${ex}px\`,
                            top: \`\${ey}px\`,
                            width: \`\${ew}px\`,
                            height: \`\${eh}px\`,
                            zIndex: el.zIndex,
                            transform: el.rotation ? \`rotate(\${el.rotation}deg)\` : undefined,
                            backgroundColor: el.type === 'shape' ? el.fillColor : (el.type === 'photo_frame' ? '#f1f5f9' : (el.backgroundColor || 'transparent')),
                            border: el.strokeWidth ? \`\${el.strokeWidth * (zoom / 4)}px solid \${el.strokeColor || '#000'}\` : 'none',
                            borderRadius: el.borderRadius ? \`\${el.borderRadius * (zoom / 4)}px\` : '0',
                            color: el.color || '#000000',
                            fontSize: el.fontSize ? \`\${el.fontSize * (zoom / 2.8)}px\` : 'inherit',
                            fontWeight: el.fontWeight || 'normal',
                            fontStyle: el.fontStyle === 'italic' ? 'italic' : 'normal',
                            textDecoration: el.textDecoration === 'underline' ? 'underline' : 'none',
                            textAlign: (el.textAlign as any) || 'left',
                            fontFamily: el.fontFamily || 'sans-serif',
                            opacity: el.opacity ?? 1
                          }}
                        >
                          {/* Element Contents */}
                          {(el.type === 'text' || el.type === 'dynamic_text') && (
                            <span className="w-full truncate px-0.5" style={{ textAlign: el.textAlign || 'left' }}>{textVal}</span>
                          )}
                          {el.type === 'photo_frame' && (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                              <ImageIcon className="h-6 w-6" />
                              <span className="text-[9px] mt-0.5 font-medium">3:4 Photo</span>
                            </div>
                          )}
                          {el.type === 'qr_code' && (
                            <div className="w-full h-full p-1 bg-white flex items-center justify-center">
                              {sampleQrDataUrl ? (
                                <img src={sampleQrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                              ) : (
                                <Grid className="w-full h-full text-slate-800" />
                              )}
                            </div>
                          )}
                          {el.type === 'barcode' && (
                            <div className="w-full h-full bg-white p-1 flex flex-col items-center justify-center border border-slate-200">
                              <div className="w-full h-2/3 flex items-center justify-center gap-0.5">
                                {[...Array(20)].map((_, i) => (
                                  <span key={i} className="bg-black h-full" style={{ width: (i % 3 === 0 ? 2 : 1) * 1.5 }} />
                                ))}
                              </div>
                              <span className="text-[8px] font-mono text-black mt-0.5">{livePreviewMode ? sampleSnapshot.personCode : '12345678'}</span>
                            </div>
                          )}
                          {el.type === 'line' && <div className="w-full h-full border-b" style={{ borderColor: el.strokeColor || '#000', borderWidth: el.strokeWidth || 1 }} />}

                          {/* Interactive Corner Resize Handles */}
                          {isSel && (
                            <>
                              <div onMouseDown={(e) => handleResizeHandleDown(e, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-50" />
                              <div onMouseDown={(e) => handleResizeHandleDown(e, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-50" />
                              <div onMouseDown={(e) => handleResizeHandleDown(e, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-50" />
                              <div onMouseDown={(e) => handleResizeHandleDown(e, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-50" />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Sidebar - Properties Inspector */}
              <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col overflow-y-auto">
                
                {/* Global Card Dimensions Settings */}
                <div className="p-3.5 border-b border-slate-700">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Card Dimensions & Presets</div>
                  <div className="space-y-2">
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white outline-none focus:border-amber-500"
                      onChange={(e) => {
                        const p = SIZE_PRESETS.find(item => item.id === e.target.value);
                        if (p) handleApplySizePreset(p);
                      }}
                      value={SIZE_PRESETS.find(p => p.widthMm === cardWidthMm && p.heightMm === cardHeightMm)?.id || 'custom'}
                    >
                      {SIZE_PRESETS.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.widthMm}×{p.heightMm}mm)</option>
                      ))}
                      <option value="custom">Custom Dimensions</option>
                    </select>

                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Width (mm)</label>
                        <input 
                          type="number" 
                          value={cardWidthMm} 
                          onChange={(e) => { setCardWidthMm(Number(e.target.value)); pushHistoryState(frontConfig, backConfig, Number(e.target.value), cardHeightMm); }} 
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono" 
                        />
                      </div>
                      <span className="text-slate-500 self-end mb-1">×</span>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Height (mm)</label>
                        <input 
                          type="number" 
                          value={cardHeightMm} 
                          onChange={(e) => { setCardHeightMm(Number(e.target.value)); pushHistoryState(frontConfig, backConfig, cardWidthMm, Number(e.target.value)); }} 
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono" 
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="text-[10px] text-slate-400 block mb-1">Background Color ({activeSide.toUpperCase()})</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          className="h-7 w-7 rounded cursor-pointer bg-transparent border-0 p-0" 
                          value={currentConfig.background.color || '#ffffff'} 
                          onChange={(e) => setCurrentConfig({ ...currentConfig, background: { ...currentConfig.background, color: e.target.value } })} 
                        />
                        <input 
                          type="text" 
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 text-xs text-white uppercase font-mono" 
                          value={currentConfig.background.color || '#ffffff'} 
                          readOnly 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Element Properties */}
                {selectedElement ? (
                  <div className="p-3.5 flex-1 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">{selectedElement.type.replace('_', ' ')} Inspector</h3>
                      <button onClick={deleteSelectedElement} className="text-slate-400 hover:text-red-400" title="Delete Element">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Position & Dimensions */}
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Position & Size (mm)</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 block">X (from left)</label>
                          <input type="number" value={selectedElement.x} onChange={e => updateSelectedElement({x: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Y (from top)</label>
                          <input type="number" value={selectedElement.y} onChange={e => updateSelectedElement({y: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Width</label>
                          <input type="number" value={selectedElement.width} onChange={e => updateSelectedElement({width: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Height</label>
                          <input type="number" value={selectedElement.height} onChange={e => updateSelectedElement({height: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
                        </div>
                      </div>
                    </div>

                    {/* Typography Properties */}
                    {(selectedElement.type === 'text' || selectedElement.type === 'dynamic_text') && (
                      <div className="space-y-2.5 pt-2 border-t border-slate-700">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Typography</div>
                        {selectedElement.type === 'text' && (
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Text String</label>
                            <input type="text" value={selectedElement.text || ''} onChange={e => updateSelectedElement({text: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                          </div>
                        )}
                        {selectedElement.type === 'dynamic_text' && (
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Data Field Key</label>
                            <select value={selectedElement.fieldKey || ''} onChange={e => updateSelectedElement({fieldKey: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                              <option value="name">Full Name</option>
                              <option value="personCode">ID Number</option>
                              <option value="groupName">Group Name</option>
                              <option value="sessionName">Session Name</option>
                              {fields.map(f => <option key={f.id} value={f.fieldKey}>{f.label}</option>)}
                            </select>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Font Family</label>
                            <select value={selectedElement.fontFamily || 'Arial, sans-serif'} onChange={e => updateSelectedElement({fontFamily: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white">
                              {FONT_FAMILIES.map(ff => <option key={ff} value={ff}>{ff.split(',')[0]}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Font Size (pt)</label>
                            <input type="number" value={selectedElement.fontSize || 10} onChange={e => updateSelectedElement({fontSize: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono" />
                          </div>
                        </div>

                        {/* Text Styling Buttons */}
                        <div className="flex items-center gap-1 pt-1">
                          <button 
                            onClick={() => updateSelectedElement({ fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                            className={cn("px-2.5 py-1 rounded text-xs font-bold border transition-colors", selectedElement.fontWeight === 'bold' ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-slate-900 text-slate-300 border-slate-700")}
                          >
                            B
                          </button>
                          <button 
                            onClick={() => updateSelectedElement({ fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                            className={cn("px-2.5 py-1 rounded text-xs italic border transition-colors", selectedElement.fontStyle === 'italic' ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-slate-900 text-slate-300 border-slate-700")}
                          >
                            I
                          </button>
                          <button 
                            onClick={() => updateSelectedElement({ textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' })}
                            className={cn("px-2.5 py-1 rounded text-xs underline border transition-colors", selectedElement.textDecoration === 'underline' ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-slate-900 text-slate-300 border-slate-700")}
                          >
                            U
                          </button>
                          <div className="h-4 w-px bg-slate-700 mx-1" />
                          <button 
                            onClick={() => updateSelectedElement({ textAlign: 'left' })}
                            className={cn("p-1 rounded border transition-colors", selectedElement.textAlign === 'left' || !selectedElement.textAlign ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-slate-900 text-slate-300 border-slate-700")}
                          >
                            <AlignLeft className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => updateSelectedElement({ textAlign: 'center' })}
                            className={cn("p-1 rounded border transition-colors", selectedElement.textAlign === 'center' ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-slate-900 text-slate-300 border-slate-700")}
                          >
                            <AlignCenter className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => updateSelectedElement({ textAlign: 'right' })}
                            className={cn("p-1 rounded border transition-colors", selectedElement.textAlign === 'right' ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-slate-900 text-slate-300 border-slate-700")}
                          >
                            <AlignRight className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">Text Color</label>
                          <div className="flex gap-2">
                            <input type="color" value={selectedElement.color || '#000000'} onChange={e => updateSelectedElement({color: e.target.value})} className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                            <input type="text" value={selectedElement.color || '#000000'} readOnly className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 text-xs text-white uppercase font-mono" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shape / Border Styling */}
                    {selectedElement.type === 'shape' && (
                      <div className="space-y-2 pt-2 border-t border-slate-700 text-xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Shape Styling</div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">Fill Color</label>
                          <div className="flex gap-2">
                            <input type="color" value={selectedElement.fillColor || '#3b82f6'} onChange={e => updateSelectedElement({fillColor: e.target.value})} className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                            <input type="text" value={selectedElement.fillColor || '#3b82f6'} readOnly className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 text-xs text-white uppercase font-mono" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">Border Radius (mm)</label>
                          <input type="number" value={selectedElement.borderRadius || 0} onChange={e => updateSelectedElement({borderRadius: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
                        </div>
                      </div>
                    )}

                    {/* Photo Frame Styling */}
                    {selectedElement.type === 'photo_frame' && (
                      <div className="space-y-2 pt-2 border-t border-slate-700 text-xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Photo Frame Settings</div>
                        <div className="text-[11px] text-slate-300">Default standard: 28 × 35 mm (3:4 ratio).</div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">Corner Radius (mm)</label>
                          <input type="number" value={selectedElement.borderRadius || 0} onChange={e => updateSelectedElement({borderRadius: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">Frame Border Color</label>
                          <div className="flex gap-2">
                            <input type="color" value={selectedElement.strokeColor || '#cbd5e1'} onChange={e => updateSelectedElement({strokeColor: e.target.value})} className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                            <input type="text" value={selectedElement.strokeColor || '#cbd5e1'} readOnly className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 text-xs text-white uppercase font-mono" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-xs text-slate-500 text-center flex-1 flex flex-col items-center justify-center">
                    <Sliders className="h-6 w-6 mb-2 text-slate-600" />
                    <span>Click on any canvas element to inspect and edit its physical properties.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GROUP ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <div>
                  <h3 className="font-bold text-white text-base">Assign Designs to Groups</h3>
                  <p className="text-xs text-slate-400">Map specific ID card designs to student batches, teachers, employees, or security staff.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-700">
                      <th className="py-3 px-4 text-xs font-bold text-slate-300 uppercase">Group Category</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-300 uppercase">Description</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-300 uppercase">Assigned Design Template</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-300 uppercase text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {groups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                          No groups configured in this project yet.
                        </td>
                      </tr>
                    ) : (
                      groups.map(group => {
                        const assignedDesignId = assignments[group.id];
                        return (
                          <tr key={group.id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-white text-sm">{group.name}</td>
                            <td className="py-3.5 px-4 text-xs text-slate-400">{group.description || '—'}</td>
                            <td className="py-3.5 px-4">
                              <select 
                                value={assignedDesignId || ''}
                                onChange={(e) => handleAssignDesign(group.id, e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-amber-500 outline-none transition-all"
                              >
                                <option value="" disabled>Select a design...</option>
                                {designs.map(d => (
                                  <option key={d.id} value={d.id}>{d.name} (v{d.versionCount || 1})</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {assignedDesignId ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <Check className="h-3 w-3" /> Assigned
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  Unassigned
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Validation Drawer Modal */}
        {showValidation && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2 font-bold text-white text-base">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                  <span>Design Validation Report</span>
                </div>
                <button onClick={() => setShowValidation(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {validationIssues.length === 0 ? (
                  <div className="p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg flex items-center gap-2.5 text-emerald-300 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span>Design passed all checks! Safe area, QR dimensions, and dynamic fields are ready for generation.</span>
                  </div>
                ) : (
                  validationIssues.map((issue, idx) => (
                    <div key={idx} className={cn(
                      "p-3 rounded-lg text-xs flex items-start gap-2 border",
                      issue.type === 'error' ? "bg-red-900/30 border-red-700 text-red-200" : "bg-amber-900/30 border-amber-700 text-amber-200"
                    )}>
                      <AlertTriangle className={cn("h-4 w-4 shrink-0 mt-0.5", issue.type === 'error' ? "text-red-400" : "text-amber-400")} />
                      <span>{issue.message}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-700">
                <button
                  onClick={() => setShowValidation(false)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminContentContainer>
  );
};
`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully written IdCardDesignsPage.tsx');
