import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, Download, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';

export default function AIImageGenerator({ isOpen, onClose, onImageGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const promptSuggestions = [
    'Peaceful sunset over mountains',
    'Modern minimalist workspace',
    'Abstract colorful art',
    'Futuristic cityscape',
    'Nature photography',
    'Product photography setup',
    'Cozy coffee shop interior',
    'Vibrant street art'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: prompt
      });
      
      setGeneratedImages(prev => [url, ...prev]);
    } catch (error) {
      console.error('Image generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseImage = (url) => {
    if (onImageGenerated) {
      onImageGenerated(url);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-pink-50">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            AI Image Generator
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Input */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">
              Describe the image you want to create
            </Label>
            <Textarea
              placeholder="A serene mountain landscape at sunset with vibrant colors..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] rounded-xl resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleGenerate();
                }
              }}
            />
            <p className="text-xs text-slate-400 mt-2">
              Tip: Be specific and descriptive for best results. Press Ctrl+Enter to generate.
            </p>
          </div>

          {/* Quick suggestions */}
          <div>
            <Label className="text-sm text-slate-500 mb-2 block">Quick Ideas</Label>
            <div className="flex flex-wrap gap-2">
              {promptSuggestions.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-violet-50 hover:border-violet-300"
                  onClick={() => setPrompt(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full h-12 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Image...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>

          {/* Generated images */}
          {generatedImages.length > 0 && (
            <div>
              <Label className="text-sm text-slate-600 mb-3 block">
                Generated Images ({generatedImages.length})
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <AnimatePresence>
                  {generatedImages.map((url, index) => (
                    <motion.div
                      key={url}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group rounded-xl overflow-hidden border-2 border-slate-100 hover:border-violet-300 transition-all"
                    >
                      <img
                        src={url}
                        alt={`Generated ${index + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          onClick={() => handleUseImage(url)}
                          className="bg-violet-500 text-white rounded-full"
                        >
                          Use This
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-full"
                          asChild
                        >
                          <a href={url} download target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Empty state */}
          {generatedImages.length === 0 && !isGenerating && (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <Sparkles className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 mb-1">No images generated yet</p>
              <p className="text-sm text-slate-400">Describe your image and click generate</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}