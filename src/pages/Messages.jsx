import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Search, Plus, ArrowLeft, Smile } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import ConversationItem from '@/components/messages/ConversationItem';
import NewConversationModal from '@/components/messages/NewConversationModal';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Messages() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const convos = await base44.entities.Conversation.list('-last_message_at', 50);
      return convos.filter(c => c.participant_ids?.includes(user?.id));
    },
    enabled: !!user
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: () => base44.entities.Message.filter(
      { conversation_id: selectedConversation?.id },
      'created_date',
      100
    ),
    enabled: !!selectedConversation
  });

  // Real-time message updates with polling
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation.id] });
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConversation, queryClient]);

  // Real-time conversation updates with polling
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
    }, 5000);

    return () => clearInterval(interval);
  }, [user, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const otherIndex = selectedConversation.participant_ids.findIndex(id => id !== user.id);
      const recipientId = selectedConversation.participant_ids[otherIndex];
      
      await base44.entities.Message.create({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_name: user.full_name,
        sender_avatar: user.avatar,
        recipient_id: recipientId,
        content
      });

      await base44.entities.Conversation.update(selectedConversation.id, {
        last_message: content,
        last_message_at: new Date().toISOString()
      });

      // Notify recipient
      if (recipientId) {
        base44.entities.Notification.create({
          recipient_id: recipientId,
          sender_id: user.id,
          sender_name: user.full_name,
          sender_avatar: user.avatar,
          type: 'message',
          content_id: selectedConversation.id,
          content_preview: content.slice(0, 80)
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setNewMessage('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage);
  };

  const getOtherParticipant = (conversation) => {
    const otherIndex = conversation?.participant_ids?.findIndex(id => id !== user?.id) ?? 0;
    return {
      name: conversation?.participant_names?.[otherIndex] || 'User',
      avatar: conversation?.participant_avatars?.[otherIndex]
    };
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex">
      {/* Conversations List */}
      <div className={`w-full lg:w-96 bg-white border-r border-slate-100 flex flex-col ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-800">Messages</h1>
            <Button
              size="icon"
              onClick={() => setShowNewConversationModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full w-9 h-9"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 h-10 rounded-xl bg-slate-50 border-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : conversations?.length > 0 ? (
            conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                currentUserId={user.id}
                isActive={selectedConversation?.id === conv.id}
                onClick={() => {
                  setSelectedConversation(conv);
                  setShowMobileChat(true);
                }}
              />
            ))
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-violet-100 flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="font-medium text-slate-700 mb-1">No messages yet</h3>
              <p className="text-sm text-slate-400">Start a conversation with someone!</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-50 ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-100 p-4 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-full"
                onClick={() => setShowMobileChat(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className="w-10 h-10">
                <AvatarImage src={getOtherParticipant(selectedConversation).avatar} />
                <AvatarFallback className="bg-gradient-to-br from-violet-400 to-pink-400 text-white">
                  {getOtherParticipant(selectedConversation).name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-slate-800">
                  {getOtherParticipant(selectedConversation).name}
                </h2>
                <p className="text-xs text-slate-400">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {messages?.map((msg, i) => {
                  const isOwn = msg.sender_id === user.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                        {!isOwn && (
                          <Avatar className="w-8 h-8 mb-1">
                            <AvatarImage src={msg.sender_avatar} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-violet-400 to-pink-400 text-white">
                              {msg.sender_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          isOwn 
                            ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-tr-sm' 
                            : 'bg-white text-slate-700 rounded-tl-sm'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <p className={`text-xs text-slate-400 mt-1 ${isOwn ? 'text-right' : ''}`}>
                          {msg.created_date && formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Smile className="w-5 h-5 text-slate-400" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 h-11 rounded-full bg-slate-50 border-0"
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sendMutation.isPending}
                  className="w-11 h-11 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white p-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-4">
                <span className="text-5xl">💬</span>
              </div>
              <h2 className="text-xl font-semibold text-slate-700 mb-2">Your Messages</h2>
              <p className="text-slate-400">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        currentUser={user}
        onConversationCreated={(conversation) => {
          setSelectedConversation(conversation);
          setShowMobileChat(true);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }}
      />
    </div>
  );
}