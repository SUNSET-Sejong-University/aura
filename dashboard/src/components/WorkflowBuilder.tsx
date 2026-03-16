/**
 * WorkflowBuilder – Drag-and-drop node editor
 *
 * Lets users connect an "Object" (Tag) node to an "Action" (Webhook) node.
 * Uses a simple canvas-based UI rather than a full reactflow installation
 * to keep the bundle lean.
 */
import { useState } from 'react';

interface Tag {
  uid:   string;
  label: string;
}

interface Workflow {
  id:         number;
  name:       string;
  tag_uid:    string;
  url:        string;
  event_type: string;
  enabled:    boolean;
}

interface Props {
  tags:      Tag[];
  workflows: Workflow[];
  onAdd:     (wf: Omit<Workflow, 'id'>) => void;
  onDelete:  (id: number) => void;
  onToggle:  (id: number, enabled: boolean) => void;
}

export default function WorkflowBuilder({ tags, workflows, onAdd, onDelete, onToggle }: Props) {
  const [form, setForm] = useState({
    name:       '',
    tag_uid:    tags[0]?.uid ?? '',
    url:        '',
    event_type: 'TAG_PLACED',
    enabled:    true,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tag_uid || !form.url) return;
    onAdd(form);
    setForm(f => ({ ...f, name: '', url: '' }));
  }

  return (
    <section className="rounded-xl bg-gray-900 p-4 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Workflow Builder</h2>

      {/* Node canvas (simplified visual representation) */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-800 rounded-lg min-h-32">
        {workflows.map(wf => {
          const tag = tags.find(t => t.uid === wf.tag_uid);
          return (
            <div key={wf.id} className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2 text-sm">
              {/* Object node */}
              <div className="bg-indigo-700 rounded px-2 py-1">
                {tag?.label || wf.tag_uid}
              </div>
              <span className="text-gray-400">→</span>
              {/* Action node */}
              <div className="bg-emerald-700 rounded px-2 py-1 max-w-40 truncate">
                {wf.name || wf.url}
              </div>
              {/* Controls */}
              <button
                onClick={() => onToggle(wf.id, !wf.enabled)}
                className={`ml-1 text-xs px-1.5 rounded ${wf.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
              >
                {wf.enabled ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => onDelete(wf.id)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                ✕
              </button>
            </div>
          );
        })}
        {workflows.length === 0 && (
          <p className="text-gray-500 text-sm self-center">No workflows yet – add one below.</p>
        )}
      </div>

      {/* Add-workflow form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 text-sm">
        <input
          className="col-span-2 bg-gray-800 rounded px-2 py-1.5 outline-none focus:ring-1 ring-indigo-500"
          placeholder="Workflow name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <select
          className="bg-gray-800 rounded px-2 py-1.5 outline-none"
          value={form.tag_uid}
          onChange={e => setForm(f => ({ ...f, tag_uid: e.target.value }))}
        >
          {tags.map(t => (
            <option key={t.uid} value={t.uid}>{t.label || t.uid}</option>
          ))}
        </select>
        <select
          className="bg-gray-800 rounded px-2 py-1.5 outline-none"
          value={form.event_type}
          onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
        >
          <option value="TAG_PLACED">TAG_PLACED</option>
          <option value="TAG_REMOVED">TAG_REMOVED</option>
        </select>
        <input
          className="col-span-2 bg-gray-800 rounded px-2 py-1.5 outline-none focus:ring-1 ring-emerald-500"
          placeholder="Webhook URL (https://…)"
          value={form.url}
          onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
          required
        />
        <button
          type="submit"
          className="col-span-2 bg-indigo-600 hover:bg-indigo-500 rounded py-1.5 font-medium transition"
        >
          + Add Workflow
        </button>
      </form>
    </section>
  );
}
