"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminSidebarLayout from "./AdminSidebarLayout"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import {
  Users,
  Activity,
  FileText,
  AlertTriangle,
  Server,
  Clock,
  CheckCircle,
  XCircle,
  Target,
  TrendingUp
} from "lucide-react"

type ActivityItem = {
  _id: string;
  type: "scan" | "user" | "system" | "alert";
  user: string;
  action: string;
  status: "success" | "info" | "warning" | "error";
  createdAt: string;
};

const AdminDashboard = () => {
  const router = useRouter()

  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalScans: 0,
    todayScans: 0,
    systemUptime: "Loading...",
    modelAccuracy: 0,
    storageUsed: 0,
    processingQueue: 0,
  })

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

  const [systemAlerts, setSystemAlerts] = useState([
    {
      id: 1,
      type: "info",
      title: "Model Update Available",
      message: "New AI model version is available for deployment.",
      time: "",
    },
  ])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/stats")
        const data = await res.json()
        setSystemStats(data)
      } catch (err) {
        console.error("Error fetching stats:", err)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/recent-activity")
        const data = await res.json()
        setRecentActivity(data)
      } catch (err) {
        console.error("Failed to load activity:", err)
      }
    }

    fetchActivity()
  }, [])

  const statsCards = [
    {
      title: "Total Users",
      value: systemStats.totalUsers.toLocaleString(),
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Total Scans",
      value: systemStats.totalScans.toLocaleString(),
      icon: FileText,
      color: "bg-indigo-500",
    },
    {
      title: "Model Accuracy",
      value: `${systemStats.modelAccuracy}%`,
      icon: Target,
      color: "bg-green-500",
    },
    {
      title: "Today's Scans",
      value: systemStats.todayScans.toString(),
      icon: TrendingUp,
      color: "bg-purple-500",
    },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "scan":
        return <FileText className="h-4 w-4" />
      case "user":
        return <Users className="h-4 w-4" />
      case "system":
        return <Server className="h-4 w-4" />
      case "alert":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      case "info":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <AdminSidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="p-6 space-y-8">

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                System Online
              </Badge>

            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((stat, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-full ${stat.color}`}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity + Alerts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest system and user activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity._id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
                      <div className={`p-2 rounded-full bg-gray-100 ${getStatusColor(activity.status)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-600">by {activity.user}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemAlerts.map((alert) => (
                    <Alert key={alert.id} className="border-l-4 border-l-yellow-400">
                      <div className="flex items-start space-x-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{alert.time}</p>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminSidebarLayout>
  )
}

export default AdminDashboard
