"use client";

import React from "react";
import { User, Shield, Key, LogOut, Mail, Calendar, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Profile & Security</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account credentials, view role permissions, and audit active JWT session security.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* User Card */}
        <Card className="md:col-span-1 border-primary/30">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-2xl">
              {user?.username?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                {user?.username || "User Account"}
              </CardTitle>
              <CardDescription className="text-xs">{user?.email}</CardDescription>
            </div>
            <Badge variant="outline" className="capitalize inline-block text-xs">
              {user?.role || "User"} Role
            </Badge>
          </CardHeader>

          <CardContent className="pt-0">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4 mr-2" /> Log Out
            </Button>
          </CardContent>
        </Card>

        {/* Security & Account Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Session & Tenant Information
            </CardTitle>
            <CardDescription>Multi-tenant authorization boundaries</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-4 w-4" /> User ID:
                </span>
                <span className="font-mono font-semibold">{user?.id}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> Email Address:
                </span>
                <span className="font-semibold">{user?.email}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Key className="h-4 w-4" /> JWT Access Token:
                </span>
                <Badge variant="success" className="text-[10px]">
                  Active & Authenticated
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Account Created:
                </span>
                <span className="font-semibold">{formatDate(user?.created_at)}</span>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Multi-Tenant Isolation Protection
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your account is strictly isolated at the database level. All agents, memories, tasks, workflows, multi-agent executions, proposals, and versions are scoped to your unique tenant ID.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
