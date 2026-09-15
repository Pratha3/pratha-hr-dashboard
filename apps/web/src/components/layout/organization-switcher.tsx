'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronsUpDown, Check, Plus, UserPlus } from 'lucide-react';
import { CreateOrganizationModal } from '@/components/modals/create-organization-modal';
import { InviteMemberModal } from '@/components/modals/invite-member-modal';
import { Permissions } from '@ems/shared-types';

export function OrganizationSwitcher() {
  const {
    currentOrganization,
    organizations,
    switchOrganization,
    hasAnyPermission
  } = useAuth();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const canInvite = hasAnyPermission([
    Permissions.MEMBER_INVITE,
    Permissions.ORG_MANAGE,
    Permissions.USER_CREATE
  ]);

  if (!currentOrganization && organizations.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 px-2.5 gap-2 border-border/80 bg-background/50 hover:bg-accent hover:text-accent-foreground text-left font-normal"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground font-display">
              {currentOrganization?.name?.[0] || 'O'}
            </div>
            <div className="flex items-center gap-1.5 max-w-[150px] sm:max-w-[200px] truncate">
              <span className="truncate text-xs font-semibold text-foreground">
                {currentOrganization?.name || 'Select Workspace'}
              </span>
              {currentOrganization?.roleName && (
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1 py-0 h-3.5 hidden sm:inline-flex shrink-0 uppercase tracking-wider"
                >
                  {currentOrganization.roleName}
                </Badge>
              )}
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-auto" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 p-1.5 space-y-1">
          <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
            Workspaces ({organizations.length})
          </DropdownMenuLabel>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {organizations.map((org) => {
              const isActive = org.id === currentOrganization?.id;
              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => {
                    if (!isActive) {
                      switchOrganization(org.id);
                    }
                  }}
                  className="flex items-center justify-between px-2 py-2 cursor-pointer rounded-md text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-muted/50 text-[10px] font-semibold text-foreground">
                      {org.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-foreground leading-tight">
                        {org.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {org.roleName}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator />

          {canInvite && (
            <DropdownMenuItem
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground cursor-pointer font-medium"
            >
              <UserPlus className="h-3.5 w-3.5 text-primary" />
              <span>Invite Team Member</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground cursor-pointer font-medium"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span>Create New Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <InviteMemberModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />
    </>
  );
}
