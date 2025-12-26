import React from 'react';
import { Star } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function SellerRating({ rating, reviewCount, size = 'md' }) {
  const sizes = {
    sm: { star: 'w-3 h-3', text: 'text-xs' },
    md: { star: 'w-4 h-4', text: 'text-sm' },
    lg: { star: 'w-5 h-5', text: 'text-base' }
  };

  const config = sizes[size];

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${config.star} ${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-300'
            }`}
          />
        ))}
      </div>
      <span className={`${config.text} font-medium text-slate-700`}>
        {rating?.toFixed(1)}
      </span>
      {reviewCount !== undefined && (
        <span className={`${config.text} text-slate-400`}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
}