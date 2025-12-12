import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

export default function ConversationItem({ conversation, currentUserId, isActive, onClick }) {
  // Get the other participant
  const otherIndex = conversation.participant_ids?.findIndex(id => id !== currentUserId) ?? 0;
  const otherName = conversation.participant_names?.[otherIndex] || 'User';
  const otherAvatar = conversation.participant_avatars?.[otherIndex];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left",
        isActive && "bg-violet-50 hover:bg-violet-50"
      )}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarImage src={otherAvatar} />
          <AvatarFallback className="bg-gradient-to-br from-violet-400 to-pink-400 text-white">
            {otherName[0]}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator could be added here */}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-800 truncate">{otherName}</span>
          {conversation.last_message_at && (
            <span className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500 truncate flex-1">
            {conversation.last_message || 'No messages yet'}
          </p>
          {conversation.unread_count > 0 && (
            <Badge className="bg-violet-500 text-white text-xs w-5 h-5 rounded-full p-0 flex items-center justify-center">
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}