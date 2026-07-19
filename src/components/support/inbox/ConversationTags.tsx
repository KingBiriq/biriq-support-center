"use client";
import { useState } from "react";
import useSWR from "swr";
import { Tag, Plus, X } from "lucide-react";
import { mutate } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function ConversationTags({ conversation }: { conversation: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  
  const { data: allTags } = useSWR('/api/support/tags', fetcher);
  const conversationTags = conversation.support_conversation_tags?.map((t: any) => t.support_tags) || [];
  const assignedTagIds = conversationTags.map((t: any) => t?.id);

  const availableTags = (allTags || []).filter((t: any) => !assignedTagIds.includes(t.id));

  const addTag = async (tagId: string) => {
    try {
      await fetch(`/api/support/conversations/${conversation.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId })
      });
      mutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      await fetch(`/api/support/conversations/${conversation.id}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId })
      });
      mutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
    } catch (e) {
      console.error(e);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch('/api/support/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName, color: '#3b82f6' })
      });
      const data = await res.json();
      if (data.success && data.data) {
        await addTag(data.data.id);
        mutate('/api/support/tags');
        setNewTagName("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 items-center">
        {conversationTags.map((t: any) => t && (
          <div key={t.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: `${t.color}20`, color: t.color }}>
            <Tag size={10} />
            {t.name}
            <button onClick={() => removeTag(t.id)} className="hover:opacity-70 ml-0.5"><X size={10} /></button>
          </div>
        ))}
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors border border-slate-200"
        >
          <Plus size={10} /> Add Tag
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-lg z-50 p-3">
          <div className="text-xs font-semibold text-slate-500 mb-2">Select a Tag</div>
          <div className="max-h-40 overflow-y-auto flex flex-col gap-1 mb-3">
            {availableTags.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-1">No more tags available</div>
            ) : (
              availableTags.map((t: any) => (
                <button 
                  key={t.id}
                  onClick={() => addTag(t.id)}
                  className="text-left px-2 py-1.5 rounded-md hover:bg-slate-50 text-sm flex items-center gap-2"
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                  {t.name}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="text-xs font-semibold text-slate-500 mb-2">Create New Tag</div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name..." 
                className="flex-1 text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && createTag()}
              />
              <button 
                onClick={createTag}
                className="bg-blue-500 text-white px-2 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
