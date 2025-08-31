"use client"
import { useEffect, useState } from "react"
import AdminSidebarLayout from "./AdminSidebarLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, MoreHorizontal, UserCheck, UserX, Filter, Clock, Trash2, Ban } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'Active' | 'Inactive';
  lastLogin?: string | null;
  createdAt: string;
  phone?: string;
  role?: string;
}

const UserManagement = () => {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("http://localhost:5000/api/users", {
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error("Failed to fetch users")
        }
        
        const data = await response.json()
        if (Array.isArray(data.users)) {
          setUsers(data.users.map((user: User) => ({
            ...user,
            lastLogin: user.lastLogin || null
          })))
        } else {
          throw new Error("Invalid data format")
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load users",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatusFilter = filterStatus === "all" || 
      user.status.toLowerCase() === filterStatus.toLowerCase()
    return matchesSearch && matchesStatusFilter
  })

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Never"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "Invalid date"
    }
  }

  const formatLastLogin = (dateString: string | null | undefined): string => {
    if (!dateString) return "Never logged in"
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMs = now.getTime() - date.getTime()
      
      if (diffInMs < 0) return "Invalid date"
      
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
      
      if (diffInMinutes < 1) return "Just now"
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      if (diffInHours < 24) return `${diffInHours}h ago`
      if (diffInDays === 1) return "Yesterday"
      if (diffInDays < 7) return `${diffInDays}d ago`
      return formatDate(dateString)
    } catch {
      return "Invalid date"
    }
  }

  const handleToggleStatus = async (userId: string) => {
    try {
      const user = users.find(u => u._id === userId)
      if (!user) {
        throw new Error("User not found")
      }
      
      const newStatus = user.status === "Active" ? "Inactive" : "Active"
      
      const response = await fetch(`http://localhost:5000/api/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error("Failed to update user status")
      }
      
      setUsers(users.map(user => 
        user._id === userId ? { ...user, status: newStatus } : user
      ))
      
      toast({
        title: "Success",
        description: `User status changed to ${newStatus}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: "DELETE",
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete user")
      }
      
      setUsers(users.filter(user => user._id !== userId))
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const userStats = {
    total: users.length,
    active: users.filter((u) => u.status === "Active").length,
    inactive: users.filter((u) => u.status === "Inactive").length
  }

  return (
    <AdminSidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">User Management</h1>
              <p className="text-gray-600">Manage all user accounts</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{userStats.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-3xl font-bold text-green-600">{userStats.active}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Inactive Users</p>
                    <p className="text-3xl font-bold text-red-600">{userStats.inactive}</p>
                  </div>
                  <UserX className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(value: 'all' | 'active' | 'inactive') => setFilterStatus(value)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Users ({filteredUsers.length})
              </CardTitle>
              <CardDescription>
                {isLoading ? "Loading users..." : "Manage all registered users"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow key="loading">
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow key="empty">
                      <TableCell colSpan={5} className="text-center py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName} ${user.lastName}`}
                                alt={`${user.firstName} ${user.lastName}`}
                              />
                              <AvatarFallback>
                                {user.firstName[0]}{user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {formatLastLogin(user.lastLogin)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatDate(user.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleStatus(user._id)}>
                                {user.status === "Active" ? (
                                  <>
                                    <Ban className="h-4 w-4 mr-2 text-yellow-600" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user._id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminSidebarLayout>
  )
}

export default UserManagement

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800"
    case "inactive":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}