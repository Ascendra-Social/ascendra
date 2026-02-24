import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, Image, Video, Upload, FileText, ShoppingBag, Play, Loader2, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from 'framer-motion';
import CreateListingModal from '@/components/marketplace/CreateListingModal';

const MODES = [
  { id: 'post', label: 'Post', icon: FileText, color: 'from-violet-500 to-pink-500', desc: 'Share to your feed' },
  { id: 'reel', label: 'Reel', icon: Play, color: 'from-pink-500 to-rose-500', desc: 'Short-form video' },
  { id: 'listing', label: 'Listing', icon: ShoppingBag, color: 'from-amber-500 to-orange-500', desc: 'Sell on marketplace' },
];

export default function CreateModal({ isOpen, onClose, user }) {
  const [mode, setMode] = useState(null);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('none');
  const [submitting, setSubmitting] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const reset = () => {
    setMode(null);
    setContent('');
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType('none');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMediaType(file.type.startsWith('video') ? 'video' : 'image');
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) return;
    setSubmitting(true);
    try {
      let media_url = '';
      if (mediaFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: mediaFile });
        media_url = file_url;
      }

      if (mode === 'post' || mode === 'reel') {
        await base44.entities.Post.create({
          author_id: user.id,
          author_name: user.full_name || 'User',
          author_avatar: user.avatar || '',
          content,
          media_url,
          media_type: mediaType,
          is_reel: mode === 'reel',
        });
        handleClose();
        if (mode === 'reel') navigate(createPageUrl('Reels'));
      } else if (mode === 'listing') {
        // handled by CreateListingModal directly
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28 }}
            className="relative bg-slate-900 border border-slate-700 rounded-t-3xl lg:rounded-3xl w-full lg:max-w-md p-6 space-y-4 z-10"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
                {mode ? `Create ${MODES.find(m => m.id === mode)?.label}` : 'Create'}
              </h2>
              <button onClick={handleClose} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!mode ? (
              <div className="grid grid-cols-3 gap-3 py-2">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                      <m.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white font-medium text-sm">{m.label}</span>
                    <span className="text-slate-400 text-xs text-center">{m.desc}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={mode === 'reel' ? "Describe your reel..." : "What's on your mind?"}
                  className="bg-slate-800 border-slate-700 text-white resize-none rounded-xl"
                  rows={3}
                />

                {mediaPreview && (
                  <div className="relative rounded-xl overflow-hidden">
                    {mediaType === 'video' ? (
                      <video src={mediaPreview} className="w-full rounded-xl" controls />
                    ) : (
                      <img src={mediaPreview} alt="" className="w-full rounded-xl max-h-48 object-cover" />
                    )}
                    <button
                      onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType('none'); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept={mode === 'reel' ? 'video/*,image/*' : 'image/*,video/*'} className="hidden" onChange={handleFileSelect} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg bg-slate-800"
                    >
                      {mode === 'reel' ? <Upload className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                      {mediaFile ? mediaFile.name.slice(0, 16) + '...' : 'Add media'}
                    </button>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || (!content.trim() && !mediaFile)}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                  </Button>
                </div>

                <button onClick={() => setMode(null)} className="text-slate-500 text-sm hover:text-slate-300">
                  ← Back
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}