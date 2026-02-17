import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function NewConversationModal({ isOpen, onClose, currentUser, onConversationCreated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectingUserId, setSelectingUserId] = useState(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-search', searchQuery],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u =>
        u.id !== currentUser?.id &&
        (searchQuery === '' ||
          u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 20);
    },
    enabled: isOpen && !!currentUser
  });

  const handleSelectUser = async (otherUser) => {
    setSelectingUserId(otherUser.id);
    try {
      // Check if conversation already exists
      const existingConvos = await base44.entities.Conversation.list();
      const existing = existingConvos.find(c =>
        c.participant_ids?.includes(currentUser.id) &&
        c.participant_ids?.includes(otherUser.id)
      );

      const conversation = existing || await base44.entities.Conversation.create({
        participant_ids: [currentUser.id, otherUser.id],
        participant_names: [currentUser.full_name, otherUser.full_name],
        participant_avatars: [currentUser.avatar, otherUser.avatar],
        last_message: '',
        last_message_at: new Date().toISOString()
      });

      onConversationCreated(conversation);
      onClose();
    } catch (e) {
      console.error('Failed to create conversation', e);
    } finally {
      setSelectingUserId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Start New Conversation</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : users?.length > 0 ? (
            users.map(user => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                disabled={!!selectingUserId}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-60"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-400 text-white">
                    {user.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-slate-800">{user.full_name || 'User'}</p>
                  <p className="text-sm text-slate-500">@{user.username || 'username'}</p>
                </div>
                {selectingUserId === user.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              {searchQuery ? 'No users found' : 'Start typing to search users'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}