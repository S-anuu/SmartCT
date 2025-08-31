"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SidebarLayout from "./SidebarLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar, Monitor, Eye, Download } from "lucide-react"

interface Scan {
  _id: string
  scanner: string
  date: string | null
  fileType: string
  status: string
  overallRisk: string | null
  findings: any
}

interface ApiResponse {
  scans: Scan[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ViewResults = () => {
  const router = useRouter()
  const [apiResponse, setApiResponse] = useState<ApiResponse>({
    scans: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch("http://localhost:5000/api/scans", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        
        const data = await res.json()
        setApiResponse(data)
      } catch (err) {
        console.error("Failed to fetch scans", err)
      } finally {
        setLoading(false)
      }
    }

    fetchScans()
  }, [])

  const handleViewResult = (id: string) => {
    router.push(`/result?id=${id}`)
  }

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case "Low Risk":
        return "bg-green-100 text-green-800 border-green-200"
      case "Moderate Risk":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "High Risk":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const parseDate = (dateStr: string | null) => {
    if (!dateStr) return { date: "Unknown Date", time: "Unknown Time" }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { date: "Invalid Date", time: "Invalid Time" }
    return {
      date: d.toLocaleDateString(),
      time: d.toTimeString().split(" ")[0],
    }
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Scan Results</h1>
              <p className="text-xl text-gray-600">Review your previous CT scan analyses</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="px-3 py-1">
               {apiResponse.scans.length} Total Scans
             </Badge>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <p>Loading scans...</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {apiResponse.scans.map((scan) => {
                const { _id, scanner, date, fileType, status, overallRisk, findings } = scan
                const { date: formattedDate } = parseDate(date)
                const riskLabel = overallRisk || "Unknown"

                return (
                  <Card
                    key={_id}
                    className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
                  >
                    <CardHeader>
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-semibold text-gray-900">
                              Scan #{_id.slice(-5).toUpperCase()}
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                              {findings?.summary || "Findings summary not available"}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={getSeverityColor(riskLabel)}>{riskLabel}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="flex items-center space-x-3">
                          <Monitor className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Scanner</p>
                            <p className="text-sm text-gray-600">{scanner}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Date</p>
                            <p className="text-sm text-gray-600">{formattedDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Type</p>
                            <p className="text-sm text-gray-600">{fileType}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Status</p>
                            <p className="text-sm text-gray-600">{status}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => handleViewResult(_id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Detailed Results
                        </Button>
                        <Button variant="outline" className="flex-1 border-gray-300 hover:bg-gray-50 bg-transparent">
                          <Download className="mr-2 h-4 w-4" />
                          Download Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {!loading && apiResponse.scans.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No scan results yet</h3>
                <p className="text-gray-600 mb-6">Upload your first CT scan to get started</p>
                <Button onClick={() => router.push("/upload")} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Upload First Scan
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SidebarLayout>
  )
}

export default ViewResults