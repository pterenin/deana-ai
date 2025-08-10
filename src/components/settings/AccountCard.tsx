import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AccountInfo {
  email: string;
  name: string;
  avatar_url: string;
  title: string;
  scope: string;
  expires_at: string;
  connected: boolean;
}

interface Props {
  accountType: "primary" | "secondary";
  account: AccountInfo | null;
  titleValue: string;
  onTitleChange: (value: string) => void;
  onUpdateTitle: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
  onConnect: () => void;
  updating: boolean;
  isAuthenticated: boolean;
}

export default function AccountCard({
  accountType,
  account,
  titleValue,
  onTitleChange,
  onUpdateTitle,
  onDisconnect,
  onReconnect,
  onConnect,
  updating,
  isAuthenticated,
}: Props) {
  const isPrimary = accountType === "primary";
  const isConnected = !!account && account.connected;
  const isExpired =
    !!account && account.expires_at
      ? new Date(account.expires_at).getTime() <= Date.now()
      : false;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isPrimary ? "Primary Account" : "Secondary Account"}
              {isPrimary ? (
                <Badge variant="destructive">Required</Badge>
              ) : (
                <Badge variant="secondary">Optional</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isPrimary
                ? "Required for chat functionality. This will be your main Google account."
                : "Optional secondary account for accessing additional Google services."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${accountType}-title`}>Account Title</Label>
          <div className="flex gap-2">
            <Input
              id={`${accountType}-title`}
              value={titleValue}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={isPrimary ? "e.g., Personal" : "e.g., Work"}
            />
            {isConnected && (
              <Button
                onClick={onUpdateTitle}
                disabled={updating}
                variant="outline"
              >
                {updating ? "Updating..." : "Update"}
              </Button>
            )}
          </div>
        </div>

        {isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {account?.avatar_url && (
                <img
                  src={account.avatar_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{account?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {account?.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  Title: <span className="font-medium">{account?.title}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button onClick={onDisconnect} variant="destructive" size="sm">
                Disconnect
              </Button>
              {isExpired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : (
                <Badge variant="outline" className="text-green-600">
                  Connected
                </Badge>
              )}
              {isExpired && (
                <Button size="sm" onClick={onReconnect}>
                  Reconnect
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground">Not connected</p>
            <Button
              onClick={onConnect}
              disabled={!isPrimary && !titleValue.trim()}
              className="w-full"
            >
              Connect {isPrimary ? "Primary" : "Secondary"} Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
