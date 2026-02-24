import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, UserX, ChevronDown, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const roleConfig = {
  member: { label: 'Member', color: 'bg-slate-700 text-slate-300' },
  moderator: { label: 'Moderator', color: 'bg-blue-500/20 text-blue-300' },
  admin: { label: 'Admin', color: 'bg-purple-500/20 text-purple-300' }
};

export default function MemberManager({ community, user }) {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['all-community-members', community.id],
    queryFn: () => base44.entities.CommunityMember.filter({ community_id: community.id }, '-created_date', 100)
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }) => {
      await base44.entities.CommunityMember.update(memberId, { role });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-community-members', community.id] })
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      await base44.entities.CommunityMember.delete(memberId);
      await base44.entities.Community.update(community.id, {
        members_count: Math.max(0, (community.members_count || 1) - 1)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-community-members', community.id] });
      queryClient.invalidateQueries({ queryKey: ['community', community.id] });
    }
  });

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-slate-300">{members?.length || 0} members</span>
      </div>

      {members?.map(member => {
        const isOwner = member.user_id === community.owner_id;
        const isSelf = member.user_id === user?.id;
        const cfg = roleConfig[member.role] || roleConfig.member;

        return (
          <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-2xl">
            <Avatar className="w-9 h-9">
              <AvatarImage src={member.user_avatar} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-400 text-white text-sm">{member.user_name?.[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm truncate">{member.user_name}</p>
              {isOwner && <p className="text-xs text-amber-400">Community Owner</p>}
            </div>

            <Badge className={`text-xs ${cfg.color} border-0`}>{cfg.label}</Badge>

            {!isOwner && !isSelf && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white rounded-xl px-2 gap-1">
                    <Shield className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white rounded-xl">
                  <DropdownMenuItem
                    onClick={() => updateRoleMutation.mutate({ memberId: member.id, role: 'member' })}
                    className="hover:bg-slate-700 cursor-pointer"
                  >
                    Set as Member
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateRoleMutation.mutate({ memberId: member.id, role: 'moderator' })}
                    className="hover:bg-slate-700 cursor-pointer"
                  >
                    Set as Moderator
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateRoleMutation.mutate({ memberId: member.id, role: 'admin' })}
                    className="hover:bg-slate-700 cursor-pointer"
                  >
                    Set as Admin
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem
                    onClick={() => removeMemberMutation.mutate(member.id)}
                    className="text-red-400 hover:bg-slate-700 cursor-pointer"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Remove from Community
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}