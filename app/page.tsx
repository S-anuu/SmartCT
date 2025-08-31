"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SidebarLayout from "@/components/SidebarLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Target, BarChart3 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [modelAccuracy, setModelAccuracy] = useState<string>("Loading...")
  const [totalScans, setTotalScans] = useState<number | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/stats")
        const data = await res.json()
        if (data?.modelAccuracy) {
          setModelAccuracy(`${data.modelAccuracy}%`)
        }
        if (data?.totalScans !== undefined) {
          setTotalScans(data.totalScans)
        }
      } catch (err) {
        setModelAccuracy("Unavailable")
        setTotalScans(null)
      }
    }

    fetchStats()
  }, [])

  return (
    <SidebarLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-white to-blue-100 px-6 py-4"> {/* Reduced padding */}
        <div className="max-w-4xl text-center space-y-4"> {/* Reduced spacing */}
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mt-0"> {/* Reduced text size and removed margin */}
            Welcome to <span className="text-blue-600">SmartCT</span>
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            SmartCT helps doctors detect internal abdominal injuries from CT scans in just seconds. 
            Our AI-powered system scans medical images, highlights trauma regions, and delivers accurate results — so clinicians can make faster, better decisions when it matters most.
          </p>

          <div className="flex items-center justify-center flex-wrap gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-600" />
              <span className="text-lg text-gray-800">Model Accuracy:</span>
              <Badge className="bg-green-100 text-green-800">{modelAccuracy}</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="text-lg text-gray-800">Total Scans:</span>
              <Badge className="bg-blue-100 text-blue-800">
                {totalScans !== null ? totalScans.toLocaleString() : "Loading..."}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}