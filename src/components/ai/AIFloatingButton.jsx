import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AIAssistantModal from './AIAssistantModal';
import AIImageGenerator from './AIImageGenerator';

export default function AIFloatingButton() {
  const [showAssistant, setShowAssistant] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [mode, setMode] = useState('caption');

  return (
    <>
      <div className="fixed bottom-24 lg:bottom-8 right-6 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl w-56">
            <DropdownMenuItem onClick={() => {
              setMode('caption');
              setShowAssistant(true);
            }}>
              <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
              Generate Caption
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowImageGen(true)}>
              <Sparkles className="w-4 h-4 mr-2 text-pink-500" />
              Generate Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setMode('listing');
              setShowAssistant(true);
            }}>
              <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
              Create Listing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AIAssistantModal
        isOpen={showAssistant}
        onClose={() => setShowAssistant(false)}
        mode={mode}
        onApply={(result) => {
          // Store in localStorage for now
          localStorage.setItem('ai_draft', JSON.stringify(result));
          setShowAssistant(false);
        }}
      />

      <AIImageGenerator
        isOpen={showImageGen}
        onClose={() => setShowImageGen(false)}
        onImageGenerated={(url) => {
          localStorage.setItem('ai_image', url);
          setShowImageGen(false);
        }}
      />
    </>
  );
}