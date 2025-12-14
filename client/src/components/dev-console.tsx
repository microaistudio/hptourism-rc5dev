import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Terminal, Trash2, RefreshCw, Database, Users, FileText, ShieldAlert } from "lucide-react";

export function DevConsole() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Only show in development
  if (import.meta.env.MODE !== "development") {
    return null;
  }

  const { data: stats, refetch: refetchStats } = useQuery<{
    users: number;
    applications: number;
    documents: number;
    payments: number;
  }>({
    queryKey: ["/api/dev/stats"],
    enabled: open,
    refetchOnMount: true,
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/dev/clear-all");
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      refetchStats();
      toast({
        title: "✅ Data cleared",
        description: "All in-memory data has been wiped clean.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to clear data",
        variant: "destructive",
      });
    },
  });

  const seedDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/dev/seed");
      return response.json();
    },
    onSuccess: () => {
      refetchStats();
      toast({
        title: "✅ Data seeded",
        description: "Sample data has been created for testing.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to seed data",
        description: "Check console for details",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600"
          data-testid="button-dev-console"
        >
          <Terminal className="w-4 h-4 mr-2" />
          Dev Console
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Development Console
          </DialogTitle>
          <DialogDescription>
            Tools for testing and development. Not available in production.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                In-Memory Storage Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Users</span>
                  </div>
                  <Badge variant="outline" data-testid="stat-users-count">
                    {stats?.users || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Applications</span>
                  </div>
                  <Badge variant="outline" data-testid="stat-applications-count">
                    {stats?.applications || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Documents</span>
                  </div>
                  <Badge variant="outline">
                    {stats?.documents || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Payments</span>
                  </div>
                  <Badge variant="outline">
                    {stats?.payments || 0}
                  </Badge>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchStats()}
                  className="w-full"
                  data-testid="button-refresh-stats"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Stats
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Reset or populate test data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    data-testid="button-clear-all-trigger"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-destructive" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all users, applications, documents, and payments from in-memory storage.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-clear">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearAllMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-clear"
                    >
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => seedDataMutation.mutate()}
                disabled={seedDataMutation.isPending}
                data-testid="button-seed-data"
              >
                <Database className="w-4 h-4 mr-2" />
                {seedDataMutation.isPending ? "Seeding..." : "Seed Sample Data"}
              </Button>
            </CardContent>
          </Card>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Note:</strong> This console is only available in development mode. 
              All data is stored in-memory and will be lost on server restart.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
