import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, UserCheck, Shield, Building2, MapPin, Search, UserPlus, Edit } from "lucide-react";
import { useState } from "react";
import type { User } from "@shared/schema";

type NewUserFormState = {
  mobile: string;
  fullName: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  alternatePhone: string;
  designation: string;
  department: string;
  employeeId: string;
  officeAddress: string;
  officePhone: string;
  role: string;
  district: string;
  password: string;
  confirmPassword: string;
};

type EditUserFormState = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  alternatePhone: string;
  designation: string;
  department: string;
  employeeId: string;
  district: string;
  officeAddress: string;
  officePhone: string;
  password: string;
  confirmPassword: string;
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState<NewUserFormState>({
    mobile: "",
    fullName: "",
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    alternatePhone: "",
    designation: "",
    department: "",
    employeeId: "",
    officeAddress: "",
    officePhone: "",
    role: "property_owner",
    district: "",
    password: "",
    confirmPassword: "",
  });
  const [editUserData, setEditUserData] = useState<EditUserFormState>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    alternatePhone: "",
    designation: "",
    department: "",
    employeeId: "",
    district: "",
    officeAddress: "",
    officePhone: "",
    password: "",
    confirmPassword: "",
  });

  const { data: usersData, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users"],
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${data.userId}`, {
        role: data.role,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async (data: { userId: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${data.userId}/status`, {
        isActive: data.isActive,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: variables.isActive ? "User Activated" : "User Deactivated",
        description: `User has been ${variables.isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: Omit<NewUserFormState, "confirmPassword">) => {
      return await apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCreateDialogOpen(false);
      setNewUserData({
        mobile: "",
        fullName: "",
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        alternatePhone: "",
        designation: "",
        department: "",
        employeeId: "",
        officeAddress: "",
        officePhone: "",
        role: "property_owner",
        district: "",
        password: "",
        confirmPassword: "",
      });
      toast({
        title: "User Created",
        description: "New user has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async (data: { userId: string; updates: Omit<EditUserFormState, "confirmPassword"> }) => {
      return await apiRequest("PATCH", `/api/admin/users/${data.userId}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditDialogOpen(false);
      setEditingUser(null);
      setEditUserData({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        alternatePhone: "",
        designation: "",
        department: "",
        employeeId: "",
        district: "",
        officeAddress: "",
        officePhone: "",
        password: "",
        confirmPassword: "",
      });
      toast({
        title: "User Updated",
        description: "User details have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    // Validate based on role type
    if (newUserData.role !== 'property_owner') {
      // Staff users require firstName, lastName, mobile, and password
      if (!newUserData.firstName || !newUserData.lastName || !newUserData.mobile || !newUserData.password || !newUserData.confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Please fill in first name, last name, mobile, and password (with confirmation)",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Property owners require fullName, mobile, and password
      if (!newUserData.mobile || !newUserData.fullName || !newUserData.password || !newUserData.confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields (including confirm password)",
          variant: "destructive",
        });
        return;
      }
    }

    if (newUserData.password !== newUserData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }

    // For staff users, auto-generate fullName from firstName + lastName if not set
    const userData = { ...newUserData };
    if (newUserData.role !== 'property_owner' && newUserData.firstName && newUserData.lastName) {
      userData.fullName = `${newUserData.firstName} ${newUserData.lastName}`;
    }

    const { confirmPassword, ...payload } = userData;
    createUserMutation.mutate(payload);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      email: user.email || "",
      alternatePhone: user.alternatePhone || "",
      designation: user.designation || "",
      department: user.department || "",
      employeeId: user.employeeId || "",
      district: user.district || "",
      officeAddress: user.officeAddress || "",
      officePhone: user.officePhone || "",
      password: "",
      confirmPassword: "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;

    // Validate required fields for staff users
    if (editingUser.role !== 'property_owner') {
      if (!editUserData.firstName || !editUserData.lastName) {
        toast({
          title: "Validation Error",
          description: "First name and last name are required for staff users",
          variant: "destructive",
        });
        return;
      }
    }

    if (editUserData.password) {
      if (!editUserData.confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Please confirm the new password.",
          variant: "destructive",
        });
        return;
      }
      if (editUserData.password !== editUserData.confirmPassword) {
        toast({
          title: "Password mismatch",
          description: "New password and confirm password must match.",
          variant: "destructive",
        });
        return;
      }
    }

    const updatesBase: any = {
      ...editUserData,
      email: editUserData.email || null,
      district: editUserData.district || null,
      alternatePhone: editUserData.alternatePhone || null,
      designation: editUserData.designation || null,
      department: editUserData.department || null,
      employeeId: editUserData.employeeId || null,
      officeAddress: editUserData.officeAddress || null,
      officePhone: editUserData.officePhone || null,
    };
    const { confirmPassword, ...updates } = updatesBase;

    // Keep staff display name consistent across dashboards
    if (
      editingUser.role !== 'property_owner' &&
      editUserData.firstName?.trim() &&
      editUserData.lastName?.trim()
    ) {
      updates.fullName = `${editUserData.firstName.trim()} ${editUserData.lastName.trim()}`;
    }

    // Remove password if empty (keep current password)
    if (!editUserData.password) {
      delete updates.password;
    }

    editUserMutation.mutate({ userId: editingUser.id, updates });
  };

  const filteredUsers = usersData?.users?.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.mobile.includes(searchTerm) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const staffUsers = filteredUsers.filter(user =>
    user.role !== 'property_owner'
  );

  const propertyOwners = filteredUsers.filter(user =>
    user.role === 'property_owner'
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'state_officer':
        return 'default';
      case 'district_officer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'state_officer':
        return 'State Officer';
      case 'district_officer':
        return 'District Officer';
      case 'property_owner':
        return 'Property Owner';
      default:
        return role;
    }
  };

  const getUserDisplayName = (user: User) => {
    // For staff users, prefer firstName + lastName if available
    if (user.role !== 'property_owner' && user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    // Fall back to fullName
    return user.fullName;
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserRoleMutation.mutate({ userId, role: newRole });
  };

  const userStats = {
    total: usersData?.users?.length || 0,
    active: usersData?.users?.filter(u => u.isActive).length || 0,
    propertyOwners: usersData?.users?.filter(u => u.role === 'property_owner').length || 0,
    staff: usersData?.users?.filter(u => u.role !== 'property_owner').length || 0,
  };

  if (isLoading) {
    return (
      <div className="bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">View and manage all system users</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              {/* Reuse existing Create User dialog content here */}
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. Choose the appropriate role and enter the required information.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Role Selection - Always shown first */}
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={newUserData.role}
                    onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="property_owner">Property Owner</SelectItem>
                      <SelectItem value="dealing_assistant">Dealing Assistant (DA)</SelectItem>
                      <SelectItem value="district_tourism_officer">District Tourism Officer (DTDO)</SelectItem>
                      <SelectItem value="district_officer">District Officer</SelectItem>
                      <SelectItem value="state_officer">State Officer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="admin_rc">Admin RC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Comprehensive fields for staff users */}
                {newUserData.role !== 'property_owner' ? (
                  <>
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-firstName">First Name *</Label>
                          <Input
                            id="create-firstName"
                            placeholder="First name"
                            value={newUserData.firstName}
                            onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                            data-testid="input-create-firstname"
                            characterRestriction="alpha-space"
                            maxLength={60}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-lastName">Last Name *</Label>
                          <Input
                            id="create-lastName"
                            placeholder="Last name"
                            value={newUserData.lastName}
                            onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                            data-testid="input-create-lastname"
                            characterRestriction="alpha-space"
                            maxLength={60}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-username">Username *</Label>
                        <Input
                          id="create-username"
                          placeholder="e.g., rajesh.kumar"
                          value={newUserData.username}
                          onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                          data-testid="input-create-username"
                        />
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
                      <div className="space-y-2">
                        <Label htmlFor="create-mobile">Mobile Number *</Label>
                        <Input
                          id="create-mobile"
                          placeholder="10-digit mobile number"
                          value={newUserData.mobile}
                          onChange={(e) => setNewUserData({ ...newUserData, mobile: e.target.value })}
                          data-testid="input-create-mobile"
                          characterRestriction="numeric"
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-email">Email</Label>
                        <Input
                          id="create-email"
                          type="email"
                          placeholder="email@hp.gov.in"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                          data-testid="input-create-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-alternatePhone">Alternate Phone</Label>
                        <Input
                          id="create-alternatePhone"
                          placeholder="Alternate contact number"
                          value={newUserData.alternatePhone}
                          onChange={(e) => setNewUserData({ ...newUserData, alternatePhone: e.target.value })}
                          data-testid="input-create-alternate-phone"
                          characterRestriction="numeric"
                          maxLength={10}
                        />
                      </div>
                    </div>

                    {/* Official Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">Official Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-designation">Designation</Label>
                          <Input
                            id="create-designation"
                            placeholder="e.g., District Tourism Officer"
                            value={newUserData.designation}
                            onChange={(e) => setNewUserData({ ...newUserData, designation: e.target.value })}
                            data-testid="input-create-designation"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-department">Department</Label>
                          <Input
                            id="create-department"
                            placeholder="e.g., Tourism Department"
                            value={newUserData.department}
                            onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                            data-testid="input-create-department"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-employeeId">Employee ID</Label>
                        <Input
                          id="create-employeeId"
                          placeholder="e.g., HP-DTO-001"
                          value={newUserData.employeeId}
                          onChange={(e) => setNewUserData({ ...newUserData, employeeId: e.target.value })}
                          data-testid="input-create-employee-id"
                        />
                      </div>
                      {(newUserData.role === 'dealing_assistant' ||
                        newUserData.role === 'district_tourism_officer' ||
                        newUserData.role === 'district_officer') && (
                          <div className="space-y-2">
                            <Label htmlFor="create-district">District Assignment</Label>
                            <Input
                              id="create-district"
                              placeholder="e.g., Shimla, Kullu, Mandi"
                              value={newUserData.district}
                              onChange={(e) => setNewUserData({ ...newUserData, district: e.target.value })}
                              data-testid="input-create-district"
                            />
                          </div>
                        )}
                      <div className="space-y-2">
                        <Label htmlFor="create-officeAddress">Office Address</Label>
                        <Input
                          id="create-officeAddress"
                          placeholder="Full office address"
                          value={newUserData.officeAddress}
                          onChange={(e) => setNewUserData({ ...newUserData, officeAddress: e.target.value })}
                          data-testid="input-create-office-address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-officePhone">Office Phone</Label>
                        <Input
                          id="create-officePhone"
                          placeholder="Office contact number"
                          value={newUserData.officePhone}
                          onChange={(e) => setNewUserData({ ...newUserData, officePhone: e.target.value })}
                          data-testid="input-create-office-phone"
                          characterRestriction="numeric"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Simple fields for property owners */}
                    <div className="space-y-2">
                      <Label htmlFor="create-mobile">Mobile Number *</Label>
                      <Input
                        id="create-mobile"
                        placeholder="10-digit mobile number"
                        value={newUserData.mobile}
                        onChange={(e) => setNewUserData({ ...newUserData, mobile: e.target.value })}
                        data-testid="input-create-mobile"
                        characterRestriction="numeric"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-fullName">Full Name *</Label>
                      <Input
                        id="create-fullName"
                        placeholder="Enter full name"
                        value={newUserData.fullName}
                        onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                        data-testid="input-create-fullname"
                        characterRestriction="alpha-space"
                        maxLength={120}
                      />
                    </div>
                  </>
                )}

                {/* Security - Always shown */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Security</h3>
                  <div className="space-y-2">
                    <Label htmlFor="create-password">Password *</Label>
                    <Input
                      id="create-password"
                      type="password"
                      placeholder="Enter password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      data-testid="input-create-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-confirm-password">Confirm Password *</Label>
                    <Input
                      id="create-confirm-password"
                      type="password"
                      placeholder="Re-enter password"
                      value={newUserData.confirmPassword}
                      onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })}
                      data-testid="input-create-confirm-password"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 flex-shrink-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-users">{userStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-active-users">{userStats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Property Owners</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-property-owners">{userStats.propertyOwners}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Users</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-staff">{userStats.staff}</div>
            </CardContent>
          </Card>
        </div>

        {/* User Tables with Tabs */}
        <Tabs defaultValue="staff" className="space-y-4">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="staff" data-testid="tab-staff">
              <Shield className="w-4 h-4 mr-2" />
              Staff Users ({staffUsers.length})
            </TabsTrigger>
            <TabsTrigger value="owners" data-testid="tab-owners">
              <Building2 className="w-4 h-4 mr-2" />
              Property Owners ({propertyOwners.length})
            </TabsTrigger>
          </TabsList>

          <Card className="border">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search and manage user accounts by category</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, mobile, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
              </div>

              <TabsContent value="staff" className="m-0">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No staff users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        staffUsers.map((user) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell className="font-medium">{getUserDisplayName(user)}</TableCell>
                            <TableCell>{user.mobile}</TableCell>
                            <TableCell>{user.email || '-'}</TableCell>
                            <TableCell>{user.district || '-'}</TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                                disabled={updateUserRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-[140px]" data-testid={`select-role-${user.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="property_owner">Property Owner</SelectItem>
                                  <SelectItem value="dealing_assistant">Dealing Assistant (DA)</SelectItem>
                                  <SelectItem value="district_tourism_officer">District Tourism Officer (DTDO)</SelectItem>
                                  <SelectItem value="district_officer">District Officer</SelectItem>
                                  <SelectItem value="state_officer">State Officer</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.isActive ? "default" : "outline"}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(user)}
                                  data-testid={`button-edit-${user.id}`}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.isActive ? "destructive" : "default"}
                                  onClick={() => toggleUserStatusMutation.mutate({
                                    userId: user.id,
                                    isActive: !user.isActive
                                  })}
                                  disabled={toggleUserStatusMutation.isPending}
                                  data-testid={`button-toggle-status-${user.id}`}
                                >
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="owners" className="m-0">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {propertyOwners.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No property owners found
                          </TableCell>
                        </TableRow>
                      ) : (
                        propertyOwners.map((user) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell className="font-medium">{getUserDisplayName(user)}</TableCell>
                            <TableCell>{user.mobile}</TableCell>
                            <TableCell>{user.email || "-"}</TableCell>
                            <TableCell>{user.district || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {getRoleLabel(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.isActive ? "default" : "destructive"} className={user.isActive ? "bg-green-600" : ""}>
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  data-testid={`button-edit-${user.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.isActive ? "destructive" : "default"}
                                  onClick={() => toggleUserStatusMutation.mutate({
                                    userId: user.id,
                                    isActive: !user.isActive
                                  })}
                                  disabled={toggleUserStatusMutation.isPending}
                                  data-testid={`button-toggle-status-${user.id}`}
                                >
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Profile</DialogTitle>
            <DialogDescription>
              Update comprehensive staff profile information. Leave password empty to keep current password.
            </DialogDescription>
          </DialogHeader>

          {editingUser && editingUser.role !== 'property_owner' ? (
            <div className="space-y-6 py-4">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstName">First Name *</Label>
                    <Input
                      id="edit-firstName"
                      placeholder="Enter first name"
                      value={editUserData.firstName}
                      onChange={(e) => setEditUserData({ ...editUserData, firstName: e.target.value })}
                      data-testid="input-edit-firstname"
                      characterRestriction="alpha-space"
                      maxLength={60}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Last Name *</Label>
                    <Input
                      id="edit-lastName"
                      placeholder="Enter last name"
                      value={editUserData.lastName}
                      onChange={(e) => setEditUserData({ ...editUserData, lastName: e.target.value })}
                      data-testid="input-edit-lastname"
                      characterRestriction="alpha-space"
                      maxLength={60}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-username">Username (staff only)</Label>
                    <Input
                      id="edit-username"
                      placeholder="Enter username"
                      value={editUserData.username}
                      onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                      data-testid="input-edit-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <Input
                      value={editingUser.mobile}
                      disabled
                      className="bg-muted"
                      data-testid="input-edit-mobile"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      placeholder="user@example.com"
                      value={editUserData.email}
                      onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                      data-testid="input-edit-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-alternatePhone">Alternate Phone</Label>
                    <Input
                      id="edit-alternatePhone"
                      placeholder="10-digit phone number"
                      value={editUserData.alternatePhone}
                      onChange={(e) => setEditUserData({ ...editUserData, alternatePhone: e.target.value })}
                      data-testid="input-edit-alternatephone"
                      characterRestriction="numeric"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* Official Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">Official Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-designation">Designation</Label>
                    <Input
                      id="edit-designation"
                      placeholder="Job title/position"
                      value={editUserData.designation}
                      onChange={(e) => setEditUserData({ ...editUserData, designation: e.target.value })}
                      data-testid="input-edit-designation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-department">Department</Label>
                    <Input
                      id="edit-department"
                      placeholder="Department name"
                      value={editUserData.department}
                      onChange={(e) => setEditUserData({ ...editUserData, department: e.target.value })}
                      data-testid="input-edit-department"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-employeeId">Employee ID</Label>
                    <Input
                      id="edit-employeeId"
                      placeholder="Official employee ID"
                      value={editUserData.employeeId}
                      onChange={(e) => setEditUserData({ ...editUserData, employeeId: e.target.value })}
                      data-testid="input-edit-employeeid"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-district">District</Label>
                    <Input
                      id="edit-district"
                      placeholder="e.g., Shimla, Kullu, Mandi"
                      value={editUserData.district}
                      onChange={(e) => setEditUserData({ ...editUserData, district: e.target.value })}
                      data-testid="input-edit-district"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-officeAddress">Office Address</Label>
                    <Input
                      id="edit-officeAddress"
                      placeholder="Complete office address"
                      value={editUserData.officeAddress}
                      onChange={(e) => setEditUserData({ ...editUserData, officeAddress: e.target.value })}
                      data-testid="input-edit-officeaddress"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-officePhone">Office Phone</Label>
                    <Input
                      id="edit-officePhone"
                      placeholder="10-digit phone number"
                      value={editUserData.officePhone}
                      onChange={(e) => setEditUserData({ ...editUserData, officePhone: e.target.value })}
                      data-testid="input-edit-officephone"
                      characterRestriction="numeric"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">Security</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">New Password (optional)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    placeholder="Leave empty to keep current password"
                    value={editUserData.password}
                    onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                    data-testid="input-edit-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-confirm-password">Confirm New Password</Label>
                  <Input
                    id="edit-confirm-password"
                    type="password"
                    placeholder="Re-enter new password"
                    value={editUserData.confirmPassword}
                    onChange={(e) => setEditUserData({ ...editUserData, confirmPassword: e.target.value })}
                    data-testid="input-edit-confirm-password"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Property owner profile editing coming soon...</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editUserMutation.isPending || (editingUser?.role === 'property_owner')}
              data-testid="button-save-edit"
            >
              {editUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
