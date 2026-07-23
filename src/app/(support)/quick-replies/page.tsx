"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { Zap, Plus, Trash2, X, Edit, Search, CheckCircle, XCircle, Image as ImageIcon } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "react-hot-toast";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function QuickRepliesPage() {
  const { data: replies, error, isLoading, mutate } = useSWR('/api/support/quick-replies', fetcher);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReply, setEditingReply] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newReply, setNewReply] = useState({ shortcut: '', title: '', body: '', image_url: '', is_active: true });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReplies = useMemo(() => {
    if (!replies) return [];
    if (!searchQuery) return replies;
    const lower = searchQuery.toLowerCase();
    return replies.filter((r: any) => 
      r.shortcut.toLowerCase().includes(lower) || 
      r.title.toLowerCase().includes(lower) || 
      r.body.toLowerCase().includes(lower)
    );
  }, [replies, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = editingReply ? 'PUT' : 'POST';
      const bodyPayload = editingReply ? { id: editingReply.id, ...newReply } : newReply;
      
      const res = await fetch('/api/support/quick-replies', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to save");
      
      toast.success(editingReply ? "Quick reply updated" : "Quick reply added");
      setShowAddModal(false);
      setEditingReply(null);
      setNewReply({ shortcut: '', title: '', body: '', image_url: '', is_active: true });
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Failed to save quick reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (reply: any) => {
    setEditingReply(reply);
    setNewReply({ shortcut: reply.shortcut, title: reply.title, body: reply.body, image_url: reply.image_url || '', is_active: reply.is_active });
    setShowAddModal(true);
  };

  const handleToggleActive = async (reply: any) => {
    try {
      const res = await fetch('/api/support/quick-replies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reply.id, is_active: !reply.is_active })
      });
      if (res.ok) {
        toast.success(reply.is_active ? "Reply disabled" : "Reply enabled");
        mutate();
      } else {
        toast.error("Failed to update status");
      }
    } catch (e) {
      toast.error("Error updating status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quick reply?")) return;
    try {
      const res = await fetch(`/api/support/quick-replies?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Quick reply deleted");
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error?.message || "Failed to delete");
      }
    } catch (e) {
      toast.error("Error deleting");
    }
  };

  const openAddModal = () => {
    setEditingReply(null);
    setNewReply({ shortcut: '', title: '', body: '', image_url: '', is_active: true });
    setShowAddModal(true);
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quick Replies</h1>
          <p className="text-slate-500 mt-1">Manage canned responses and shortcuts.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-[#2b3890] hover:bg-[#20296b] text-white rounded-lg transition-colors font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" /> Add Reply
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search shortcuts or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editingReply ? 'Edit Quick Reply' : 'Add Quick Reply'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shortcut</label>
                <input 
                  required
                  type="text" 
                  placeholder="/greeting"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newReply.shortcut}
                  onChange={e => setNewReply({...newReply, shortcut: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input 
                  required
                  type="text" 
                  placeholder="Welcome Message"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newReply.title}
                  onChange={e => setNewReply({...newReply, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message Body</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Hello! How can I help you today?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={newReply.body}
                  onChange={e => setNewReply({...newReply, body: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sawir (Upload Image)</label>
                {newReply.image_url ? (
                  <div className="relative w-full h-32 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center group">
                    <img src={newReply.image_url} alt="Preview" className="h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setNewReply({ ...newReply, image_url: '' })}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-md"
                      title="Ka bixi sawirka"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 hover:border-[#2b3890] bg-slate-50 hover:bg-slate-100/50 rounded-lg cursor-pointer transition-colors p-4">
                    <div className="flex flex-col items-center justify-center text-center">
                      <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs font-semibold text-slate-700">Geli sawir (Doorho Sawir / Upload)</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP ama GIF</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setNewReply({ ...newReply, image_url: event.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#2b3890] text-white rounded-lg hover:bg-[#20296b] font-medium transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : (editingReply ? 'Update Reply' : 'Save Reply')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton className="h-64 rounded-xl" />
      ) : error ? (
        <ErrorState title="Failed to load quick replies" message={error.message} onRetry={() => mutate()} />
      ) : filteredReplies.length === 0 ? (
        <EmptyState 
          icon={Zap}
          title={searchQuery ? "No matching replies" : "No quick replies"}
          description={searchQuery ? "Try a different search term." : "Create shortcuts for frequently used messages."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReplies.map((reply: any) => (
            <div key={reply.id} className={`bg-white border ${reply.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group relative`}>
              <div className="flex gap-4 items-center flex-1 min-w-0">
                {reply.image_url && (
                  <img src={reply.image_url} alt="Reply Media" className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2.5 py-0.5 bg-[#2b3890]/10 text-[#2b3890] text-xs font-mono font-bold rounded-md">
                      {reply.shortcut}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm truncate">{reply.title}</h3>
                  </div>
                  <p className="text-slate-600 text-xs line-clamp-2 whitespace-pre-wrap">{reply.body}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => handleToggleActive(reply)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={reply.is_active ? "Disable" : "Enable"}
                >
                  {reply.is_active ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-slate-400" />}
                </button>
                <button 
                  onClick={() => handleEdit(reply)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(reply.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
