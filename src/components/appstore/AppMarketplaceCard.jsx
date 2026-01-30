import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Download, Coins } from 'lucide-react';
import { cn } from "@/lib/utils";

const categoryColors = {
  integration: 'bg-blue-100 text-blue-700',
  game: 'bg-purple-100 text-purple-700',
  productivity: 'bg-green-100 text-green-700',
  social: 'bg-pink-100 text-pink-700',
  finance: 'bg-amber-100 text-amber-700',
  education: 'bg-indigo-100 text-indigo-700',
  entertainment: 'bg-rose-100 text-rose-700',
  utility: 'bg-slate-100 text-slate-700'
};

export default function AppMarketplaceCard({ app, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden border-slate-200 hover:border-cyan-300 transition-all hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-100 to-purple-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.title} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <span className="text-2xl font-bold bg-gradient-to-br from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                  {app.title[0]}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 mb-1 truncate">{app.title}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={app.developer_avatar} />
                  <AvatarFallback className="text-[8px]">
                    {app.developer_name?.[0] || 'D'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{app.developer_name}</span>
              </div>
            </div>
            {app.featured && (
              <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0">
                Featured
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs', categoryColors[app.category])}>
              {app.category}
            </Badge>
            <Badge variant="outline" className="text-xs">
              v{app.version}
            </Badge>
          </div>

          <p className="text-sm text-slate-600 line-clamp-2">
            {app.description}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-medium text-slate-700">
                  {app.rating > 0 ? app.rating.toFixed(1) : 'New'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>{app.downloads > 0 ? app.downloads.toLocaleString() : '0'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-lg font-bold">
              {app.price === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                <>
                  <span className="bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                    {app.price}
                  </span>
                  <Coins className="w-5 h-5 text-cyan-500" />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}