"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { Zap, Plus, Trash2, X, Edit, Search, Filter, CheckCircle, XCircle } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "react-hot-toast";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function QuickRepliesPage() {
  const { data: replies, error, isLoading, mutate } = useSWR('/api/support/quick-replies', fetcher);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReply, setEditingReply] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newReply, setNewReply] = useState({ shortcut: '', title: '', body: '', is_active: true });
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
      setNewReply({ shortcut: '', title: '', body: '', is_active: true });
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Failed to save quick reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (reply: any) => {
    setEditingReply(reply);
    setNewReply({ shortcut: reply.shortcut, title: reply.title, body: reply.body, is_active: reply.is_active });
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
    setNewReply({ shortcut: '', title: '', body: '', is_active: true });
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Reply
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
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">{editingReply ? 'Edit Quick Reply' : 'Add Quick Reply'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReplies.map((reply: any) => (
            <div key={reply.id} className={`bg-white border ${reply.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'} rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 text-sm font-mono rounded-lg border border-slate-200">
                    {reply.shortcut}
                  </span>
                  <h3 className="font-bold text-slate-900 mt-3">{reply.title}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleToggleActive(reply)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={reply.is_active ? "Disable" : "Enable"}
                  >
                    {reply.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleEdit(reply)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(reply.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-slate-600 text-sm flex-1 whitespace-pre-wrap">{reply.body}</p>
              {!reply.is_active && (
                <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded font-medium">
                  Disabled
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
