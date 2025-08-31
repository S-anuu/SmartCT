"use client"

import { useEffect, useState, useRef, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import SidebarLayout from "../SidebarLayout"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, BarChart3, FileText, Calendar, CheckCircle, Upload, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ModelInfo {
  name: string
  version: string
  accuracy: number
  deployedDate: string
  status: string
}

interface SystemInfo {
  application: string
  model: ModelInfo
}

export default function About() {
  const router = useRouter()
  const [expandedFeatures, setExpandedFeatures] = useState<number[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    application: "SmartCT",
    
    model: {
      name: "",
      version: "",
      accuracy: 0,
      deployedDate: "",
      status: ""
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Add these new states for profile picture
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.match('image.*')) {
      alert('Please select an image file (jpg, png, etc.)')
      return
    }

    // Validate file size (e.g., 2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size too large (max 2MB)')
      return
    }

    setSelectedFile(file)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const features = [
    {
      title: "Automated Trauma Detection",
      items: [
        "AI-powered analysis of abdominal CT scans",
        `Detects internal bleeding, organ lacerations with ${systemInfo.model.accuracy}% accuracy`,
        "Provides instant preliminary findings (typically under 2 minutes)",
      ]
    },
    {
      title: "Multi-Format Support",
      items: [
        "Accepts .nii,.nii.gz and DICOM formats",
        "Automatic validation and slice organization"
      ]
    },
    {
      title: "Secure Uploads",
      items: [
        "End-to-end encryption during transfer",
        "Average upload speed: 10MB/s"
      ]
    },
    {
      title: "Detailed Analysis",
      items: [
        "Structured scan summaries with abnormality scoring",
        "Visual overlays highlighting affected areas",
      ]
    },
    {
      title: "Scan History",
      items: [
        "Cloud-based storage of all uploaded scans",
        "Downloadable PDF reports with findings",
        "Side-by-side comparison tool"
      ]
    },
    {
      title: "Account Security",
      items: [
        "Two-factor authentication options",
        "Session activity monitoring",
        "Role-based access control"
      ]
    }
  ]

  const toggleFeature = (index: number) => {
    setExpandedFeatures(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

 useEffect(() => {
  const fetchSystemInfo = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/about`
        : 'http://localhost:5000/api/about';
      
      console.log('Fetching from:', apiUrl);
      
      const res = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setSystemInfo(data);
      setError(null);
    } catch (err) {
      // Proper error type handling
      let errorMessage = 'Failed to load system information';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      console.error('Fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  fetchSystemInfo();
}, []);
  const modelMetrics = [
    {
      title: "Model Accuracy",
      value: `${systemInfo.model.accuracy}%`,
      icon: BarChart3,
      color: "text-green-600",
    },
    {
      title: "Version",
      value: systemInfo.model.version,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Deployed",
      value: systemInfo.model.deployedDate 
             ? new Date(systemInfo.model.deployedDate).toLocaleDateString() 
             : "N/A",
      icon: Calendar,
      color: "text-purple-600",
    },
  ]

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-600">Loading system information...</p>
          </div>
        </div>
      </SidebarLayout>
    )
  }

  if (error) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-red-600">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">About SmartCT</h1>
            <p className="text-lg text-gray-600">
              Advanced medical imaging analysis powered by AI
            </p>
          </div>

          {/* System Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">System Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">AI Model</p>
                <p className="text-gray-900">{systemInfo.model.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Model Version</p>
                <p className="text-gray-900">{systemInfo.model.version}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-gray-900">
                  {systemInfo.model.deployedDate 
                   ? new Date(systemInfo.model.deployedDate).toLocaleDateString() 
                   : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge
                  className={`${
                    systemInfo.model.status === "Active" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {systemInfo.model.status}
                </Badge>
              </div>
            </div>
          </div>

          
          {/* Key Features - Collapsible */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Key Features</h2>
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="border-b border-gray-200 pb-4">
                  <button
                    onClick={() => toggleFeature(index)}
                    className="w-full flex justify-between items-center text-left"
                  >
                    <h3 className="text-lg font-medium text-gray-900">{feature.title}</h3>
                    {expandedFeatures.includes(index) ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  {expandedFeatures.includes(index) && (
                    <ul className="mt-2 pl-4 space-y-2">
                      {feature.items.map((item, i) => (
                        <li key={i} className="text-gray-700">• {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

{/* Contact & Support Section */}
<div className="space-y-4">
  <h2 className="text-xl font-semibold text-gray-900">Contact & Support</h2>
  <div className="grid md:grid-cols-2 gap-6">
    {/* Support Email */}
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <div>
          <h3 className="font-medium text-gray-900">Email Support</h3>
          <p className="text-sm text-gray-600">team.smartct@gmail.com</p>
        </div>
      </div>
      <Button 
        variant="outline" 
        className="mt-3 w-full"
        onClick={() => window.location.href = 'mailto:support@smartct.com'}
      >
        Send Email
      </Button>
    </div>

    

    {/* Phone Support */}
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <div>
          <h3 className="font-medium text-gray-900">Phone Support</h3>
          <p className="text-sm text-gray-600">Mon-Fri, 9AM-5PM NPT</p>
        </div>
      </div>
      <Button 
        variant="outline" 
        className="mt-3 w-full"
        onClick={() => window.location.href = 'tel:+977 9876543210'}
      >
        +977 9876543210
      </Button>
    </div>

    
  </div>
</div>
        </div>
      </div>
    </SidebarLayout>
  )
}