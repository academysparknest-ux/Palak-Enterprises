import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Loader2, Printer, Download } from 'lucide-react';
import { getIdCardPersons, getIdCardTemplates, getIdCardGenerations } from '../../../lib/idcard/database';
import { generateCardsForPersons, buildCardsPdf, type GenerationProgress } from '../../../lib/idcard/generation';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import { GenerationProgressBar } from '../../../components/idcard/GenerationProgress';
import type { IdCardProject, IdCardPerson, IdCardTemplate, IdCardGeneration } from '../../../lib/idcard/types';

type ProjectContext = { project: IdCardProject };
type PageState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

export default function IdCardGeneratePage() {
  const { project } = useOutletContext<ProjectContext>();
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [persons, setPersons] = useState<IdCardPerson[]>([]);
  const [template, setTemplate] = useState<IdCardTemplate | null>(null);
  const [generations, setGenerations] = useState<IdCardGeneration[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [generating, setGenerating] = useState(false);
  const [buildingPdf, setBuildingPdf] = useState(false);

  async function load() {
    setState({ kind: 'loading' });
    try {
      const [personsResult, templates, gens] = await Promise.all([
        getIdCardPersons(project.id, { pageSize: 500 }),
        getIdCardTemplates(project.id),
        getIdCardGenerations(project.id),
      ]);
      setPersons(personsResult.data);
      setTemplate(templates.find((t) => t.id === project.template_id) ?? templates[0] ?? null);
      setGenerations(gens);
      setState({ kind: 'ready' });
    } catch (err) {
      setState({ kind: 'error', message: errorCodeToUserMessage(classifySupabaseError(err).code) });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate(targets: IdCardPerson[]) {
    if (!template || targets.length === 0) return;
    setGenerating(true);
    setProgress({ total: targets.length, completed: 0, succeeded: 0, failed: 0 });
    try {
      await generateCardsForPersons(targets, template, project.id, project.name, project.academic_year, setProgress);
    } finally {
      setGenerating(false);
      const gens = await getIdCardGenerations(project.id);
      setGenerations(gens);
    }
  }

  function latestGenerationFor(personId: string): IdCardGeneration | undefined {
    return generations.find((g) => g.person_id === personId);
  }

  function handlePrint(targets: IdCardPerson[]) {
    const urls = targets
      .map((p) => latestGenerationFor(p.id))
      .filter((g): g is IdCardGeneration => !!g && g.status === 'SUCCESS' && !!g.file_url)
      .map((g) => g.file_url as string);

    if (urls.length === 0) {
      alert('No generated cards available for these students yet.');
      return;
    }

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Print ID Cards</title>
      <style>
        body { margin: 0; padding: 16px; }
        img { width: 85.6mm; height: 54mm; object-fit: cover; margin: 4px; page-break-inside: avoid; }
      </style></head>
      <body>${urls.map((u) => `<img src="${u}" />`).join('')}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  async function handleDownloadPdf(targets: IdCardPerson[]) {
    if (!template) return;
    const cards = targets
      .map((p) => {
        const gen = latestGenerationFor(p.id);
        return gen?.status === 'SUCCESS' && gen.file_url ? { name: p.name, imageUrl: gen.file_url } : null;
      })
      .filter((c): c is { name: string; imageUrl: string } => !!c);

    if (cards.length === 0) {
      alert('No generated cards available for these students yet.');
      return;
    }

    setBuildingPdf(true);
    try {
      const pdfBlob = await buildCardsPdf(cards, template.card_width_mm, template.card_height_mm);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_id_cards.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to build PDF. Please try again.');
    } finally {
      setBuildingPdf(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading...
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        Unable to load generation data: {state.message}
      </div>
    );
  }

  if (!template) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-slate-400">
        Set up a template before generating cards.
      </div>
    );
  }

  const selectedPersons = persons.filter((p) => selected.has(p.id));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleGenerate(selectedPersons)}
          disabled={generating || selectedPersons.length === 0}
          className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
        >
          Generate Selected ({selectedPersons.length})
        </button>
        <button
          onClick={() => handleGenerate(persons)}
          disabled={generating || persons.length === 0}
          className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
        >
          Generate All ({persons.length})
        </button>
        <button
          onClick={() => handlePrint(selectedPersons.length > 0 ? selectedPersons : persons)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <Printer size={15} /> Print
        </button>
        <button
          onClick={() => handleDownloadPdf(selectedPersons.length > 0 ? selectedPersons : persons)}
          disabled={buildingPdf}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
        >
          <Download size={15} /> {buildingPdf ? 'Building PDF...' : 'Download PDF'}
        </button>
      </div>

      {progress && (
        <div className="mt-4">
          <GenerationProgressBar progress={progress} />
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2"></th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Student ID</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {persons.map((person) => {
              const gen = latestGenerationFor(person.id);
              return (
                <tr key={person.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(person.id)} onChange={() => toggle(person.id)} />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{person.name}</td>
                  <td className="px-3 py-2 text-slate-600">{person.student_id}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={gen?.status} />
                  </td>
                  <td className="px-3 py-2">
                    {gen?.status === 'SUCCESS' && gen.file_url && (
                      <a
                        href={gen.file_url}
                        download={`${person.student_id}.png`}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <Download size={14} /> Download
                      </a>
                    )}
                    {gen?.status === 'FAILED' && <span className="text-xs text-red-500">{gen.error_message}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: 'PENDING' | 'SUCCESS' | 'FAILED' }) {
  if (!status) return <span className="text-xs text-slate-400">Not generated</span>;
  const styles = {
    PENDING: 'bg-slate-100 text-slate-600',
    SUCCESS: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{status}</span>;
}
