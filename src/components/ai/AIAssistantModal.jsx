import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, Wand2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';

export default function AIAssistantModal({ 
  isOpen, 
  onClose, 
  mode = 'caption', // 'caption', 'enhance', 'repost', 'listing'
  imageUrl = null,
  existingContent = '',
  onApply
}) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);

  const modeConfig = {
    caption: {
      title: 'AI Caption Generator',
      icon: Wand2,
      placeholder: 'Describe what you want the caption to say (or leave blank for AI suggestions)',
      action: 'Generate Caption'
    },
    enhance: {
      title: 'AI Image Enhancer',
      icon: ImageIcon,
      placeholder: 'Describe how you want to enhance the image',
      action: 'Enhance Image'
    },
    repost: {
      title: 'AI Repost Assistant',
      icon: RefreshCw,
      placeholder: 'Add your own twist to this post (or leave blank for AI suggestions)',
      action: 'Generate Repost'
    },
    listing: {
      title: 'AI Listing Assistant',
      icon: Sparkles,
      placeholder: 'Describe your product or service',
      action: 'Generate Description'
    }
  };

  const config = modeConfig[mode];

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      if (mode === 'caption' || mode === 'repost') {
        const llmPrompt = imageUrl
          ? `You are a creative social media content writer. ${mode === 'repost' ? `Create a unique repost/remix of the following content, adding fresh perspective while giving credit to the original.` : `Generate an engaging, positive social media caption for this image.`}

${existingContent ? `Original content: "${existingContent}"` : ''}
${prompt ? `User's request: "${prompt}"` : ''}

Create a ${mode === 'repost' ? 'repost caption' : 'caption'} that is:
- Authentic and relatable
- Positive and uplifting
- 2-3 sentences max
- Includes relevant emojis
- ${mode === 'repost' ? 'Credits the original creator' : 'Has a clear call to action'}

Return only the caption text, no quotes or additional commentary.`
          : `Generate an engaging, positive social media post based on: ${prompt || existingContent}`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt: llmPrompt,
          add_context_from_internet: false,
          file_urls: imageUrl ? [imageUrl] : undefined
        });

        setResult(response);
      } else if (mode === 'enhance') {
        const enhancePrompt = prompt || 'Enhance this image to make it more vibrant, clear, and professional while maintaining its original character';
        
        const { url } = await base44.integrations.Core.GenerateImage({
          prompt: enhancePrompt,
          existing_image_urls: imageUrl ? [imageUrl] : []
        });
        
        setGeneratedImage(url);
        setResult('Image enhanced successfully!');
      } else if (mode === 'listing') {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert marketplace listing writer. Create a compelling product description for: ${prompt || existingContent}

Generate a description that includes:
- Clear title (max 60 chars)
- Detailed description (3-4 sentences)
- Key features (3-5 bullet points)
- Suggested price range

Format as JSON with keys: title, description, features (array), price_range`,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              features: { type: "array", items: { type: "string" } },
              price_range: { type: "string" }
            }
          },
          file_urls: imageUrl ? [imageUrl] : undefined
        });

        setResult(response);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      setResult('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (mode === 'enhance' && generatedImage) {
      onApply({ type: 'image', url: generatedImage });
    } else if (mode === 'listing' && typeof result === 'object') {
      onApply({ type: 'listing', data: result });
    } else {
      onApply({ type: 'text', content: result });
    }
    onClose();
  };

  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-pink-50">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Icon className="w-5 h-5 text-violet-500" />
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Original content preview */}
          {(existingContent || imageUrl) && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <Label className="text-sm text-slate-500 mb-2 block">Original Content</Label>
              {imageUrl && (
                <img src={imageUrl} alt="" className="w-full rounded-lg mb-2" />
              )}
              {existingContent && (
                <p className="text-sm text-slate-700">{existingContent}</p>
              )}
            </div>
          )}

          {/* Input */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">
              Your Instructions (Optional)
            </Label>
            <Textarea
              placeholder={config.placeholder}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] rounded-xl resize-none"
            />
          </div>

          {/* Quick suggestions */}
          <div>
            <Label className="text-sm text-slate-500 mb-2 block">Quick Suggestions</Label>
            <div className="flex flex-wrap gap-2">
              {mode === 'caption' && ['Make it inspiring', 'Add humor', 'Professional tone', 'Casual & fun'].map(s => (
                <Badge 
                  key={s}
                  variant="outline"
                  className="cursor-pointer hover:bg-violet-50"
                  onClick={() => setPrompt(s)}
                >
                  {s}
                </Badge>
              ))}
              {mode === 'enhance' && ['More vibrant', 'Professional look', 'Artistic style', 'Add bokeh effect'].map(s => (
                <Badge 
                  key={s}
                  variant="outline"
                  className="cursor-pointer hover:bg-violet-50"
                  onClick={() => setPrompt(s)}
                >
                  {s}
                </Badge>
              ))}
              {mode === 'repost' && ['Add my perspective', 'Ask a question', 'Share experience', 'Express gratitude'].map(s => (
                <Badge 
                  key={s}
                  variant="outline"
                  className="cursor-pointer hover:bg-violet-50"
                  onClick={() => setPrompt(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {config.action}
              </>
            )}
          </Button>

          {/* Result */}
          {result && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl border border-violet-100"
            >
              <Label className="text-sm text-slate-600 mb-2 block flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                AI Generated Result
              </Label>
              
              {generatedImage ? (
                <img src={generatedImage} alt="" className="w-full rounded-lg" />
              ) : typeof result === 'object' ? (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-800">{result.title}</p>
                  <p className="text-sm text-slate-600">{result.description}</p>
                  {result.features && (
                    <ul className="text-sm text-slate-600 list-disc list-inside">
                      {result.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                  {result.price_range && (
                    <Badge className="bg-green-100 text-green-700">
                      {result.price_range}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-slate-700 whitespace-pre-wrap">{result}</p>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-violet-500 text-white rounded-xl"
                >
                  Apply
                </Button>
                <Button
                  onClick={handleGenerate}
                  variant="outline"
                  className="rounded-xl"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}