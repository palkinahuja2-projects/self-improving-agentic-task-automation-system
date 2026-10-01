"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Shield, UserCheck, UserX, ShieldAlert, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import { User } from "@/types";
import { formatDate, formatErrorMessage } from "@/lib/utils";
import Link from "next/link";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  // Dialog States
  const [togglingUser, setTogglingUser] = useState<User | null>(null);
  const [roleUser, setRoleUser] = useState<User | null>(null);
  const [targetRole, setTargetRole] = useState("admin");

  // Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter, activeFilter],
    queryFn: () =>
      adminApi.listUsers({
        search: search.trim() || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        is_active: activeFilter === "all" ? undefined : activeFilter === "true",
      }),
  });

  // User Status Toggle Mutation
  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminApi.updateUserStatus(userId, isActive),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success(
        "Status updated",
        `User ${updatedUser.username || updatedUser.email} is now ${updatedUser.is_active ? "active" : "inactive"}.`
      );
      setTogglingUser(null);
    },
    onError: (err: any) => {
      toast.error("Status update failed", formatErrorMessage(err));
    },
  });

  // User Role Mutation
  const roleMutation = useMutation({
    mutationFn: ({ userId, role, isSuperuser }: { userId: string; role: string; isSuperuser?: boolean }) =>
      adminApi.updateUserRole(userId, role, isSuperuser),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success(
        "Role updated",
        `User ${updatedUser.username || updatedUser.email} promoted/changed to ${updatedUser.role}.`
      );
      setRoleUser(null);
    },
    onError: (err: any) => {
      toast.error("Role update failed", formatErrorMessage(err));
    },
  });

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">User & Role Management</h2>
              <p className="text-sm text-muted-foreground">
                Inspect accounts, assign administrative roles, and toggle active status.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by email or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sm:max-w-xs">
            <option value="all">All Roles</option>
            <option value="user">User Role</option>
            <option value="admin">Admin Role</option>
          </Select>
          <Select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="sm:max-w-xs">
            <option value="all">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </Select>
        </div>

        {/* User Cards Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading application users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-card">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold text-muted-foreground">No users match criteria</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => {
              const isAdminRole = u.role === "admin" || !!u.is_superuser;

              return (
                <Card key={u.id} className="flex flex-col justify-between hover:border-primary/40 transition-all">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={isAdminRole ? "destructive" : "secondary"} className="text-[10px] capitalize">
                        {u.role} {u.is_superuser && "(Superuser)"}
                      </Badge>
                      <Badge variant={u.is_active ? "success" : "outline"} className="text-[10px]">
                        {u.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </div>

                    <div>
                      <CardTitle className="text-base font-bold truncate">
                        {u.username}
                      </CardTitle>
                      <CardDescription className="text-xs truncate">{u.email}</CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">User ID:</span>
                        <span className="font-mono truncate max-w-[140px]">{u.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Registered:</span>
                        <span>{formatDate(u.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setTargetRole(isAdminRole ? "user" : "admin");
                          setRoleUser(u);
                        }}
                      >
                        <Shield className="h-3.5 w-3.5 mr-1 text-purple-400" />
                        {isAdminRole ? "Demote" : "Promote to Admin"}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className={u.is_active ? "text-amber-500" : "text-emerald-500"}
                        onClick={() => setTogglingUser(u)}
                      >
                        {u.is_active ? (
                          <>
                            <UserX className="h-3.5 w-3.5 mr-1" /> Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5 mr-1" /> Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Toggle Status Confirmation Dialog */}
        <ConfirmDialog
          open={!!togglingUser}
          onOpenChange={(open) => !open && setTogglingUser(null)}
          title={`${togglingUser?.is_active ? "Deactivate" : "Activate"} User Account`}
          description={`Are you sure you want to ${togglingUser?.is_active ? "deactivate" : "activate"} user ${togglingUser?.email}?`}
          onConfirm={() => {
            if (togglingUser) {
              statusMutation.mutate({ userId: togglingUser.id, isActive: !togglingUser.is_active });
            }
          }}
          isLoading={statusMutation.isPending}
        />

        {/* Update Role Confirmation Dialog */}
        <ConfirmDialog
          open={!!roleUser}
          onOpenChange={(open) => !open && setRoleUser(null)}
          title="Change User Administrative Role"
          description={`Are you sure you want to change ${roleUser?.email}'s role to ${targetRole}?`}
          onConfirm={() => {
            if (roleUser) {
              roleMutation.mutate({
                userId: roleUser.id,
                role: targetRole,
                isSuperuser: targetRole === "admin",
              });
            }
          }}
          isLoading={roleMutation.isPending}
        />
      </div>
    </AdminGuard>
  );
}
