"use client"

import { useRouter, useSearchParams } from "next/navigation"
import SidebarLayout from "./SidebarLayout"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, ArrowLeft, Heart, Droplets, Activity, AlertTriangle, CheckCircle, Info } from "lucide-react"

interface Finding {
  status: string
  severity: "normal" | "low" | "high"
}

interface Findings {
  bowel: Finding
  extravasation: Finding
  liver: Finding
  kidney: Finding
  spleen: Finding
}

interface ScanResult {
  predictions?: any
  findings?: Findings
  confidence?: number
  scanner?: string
  formattedDateTime?: string
  date?: string
  time?: string
  overallRisk?: string
}

const Result = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scanId = searchParams?.get("id") || ""

  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!scanId) {
      setError("Scan ID not provided")
      setLoading(false)
      return
    }

    const fetchResult = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("Authentication token not found. Please log in again.")
        }

        const res = await fetch(`http://localhost:5000/api/scans/${scanId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: 'include'
        })

        if (res.status === 401) {
          localStorage.removeItem("token")
          throw new Error("Session expired. Please log in again.")
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to fetch scan results (HTTP ${res.status})`)
        }

        const data = await res.json()
        setScanResult(data)
      } catch (err: any) {
        setError(err.message || "Failed to load scan results")
        if (err.message.includes("Session expired") || err.message.includes("token")) {
          router.push("/login")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [scanId, router])

  const getEffectiveSeverity = (organ: string, finding: Finding) => {
    if (organ === 'bowel') return finding.status === 'Injured' ? 'high' : 'normal'
    if (organ === 'extravasation') return finding.status === 'Present' ? 'high' : 'normal'
    return finding.severity
  }

  const getSeverityIcon = (organ: string, finding: Finding) => {
    const severity = getEffectiveSeverity(organ, finding)
    switch (severity) {
      case 'high': return <AlertTriangle className="h-6 w-6 text-red-600" />
      case 'low': return <Info className="h-6 w-6 text-yellow-600" />
      default: return <CheckCircle className="h-6 w-6 text-green-600" />
    }
  }

  const getSeverityColor = (organ: string, finding: Finding) => {
    const severity = getEffectiveSeverity(organ, finding)
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200'
      case 'low': return 'bg-yellow-50 border-yellow-200'
      default: return 'bg-green-50 border-green-200'
    }
  }

  const getStatusColor = (organ: string, finding: Finding) => {
    const severity = getEffectiveSeverity(organ, finding)
    switch (severity) {
      case 'high': return 'text-red-800'
      case 'low': return 'text-yellow-800'
      default: return 'text-green-800'
    }
  }

  const computeOverallRisk = (findings: Findings) => {
    const severities = []
    
    if (findings.bowel?.status === 'Injured') severities.push('high')
    if (findings.extravasation?.status === 'Present') severities.push('high')
    
    if (findings.liver?.severity) severities.push(findings.liver.severity)
    if (findings.kidney?.severity) severities.push(findings.kidney.severity)
    if (findings.spleen?.severity) severities.push(findings.spleen.severity)

    if (severities.includes('high')) return 'High'
    if (severities.includes('low')) return 'Moderate'
    return 'Low'
  }

  const getOverallRiskColor = (risk: string) => {
    switch (risk) {
      case "Low": return "bg-green-100 text-green-800 border border-green-200"
      case "Moderate": return "bg-yellow-100 text-yellow-800 border border-yellow-200"
      case "High": return "bg-red-100 text-red-800 border border-red-200"
      default: return "bg-gray-100 text-gray-800 border border-gray-200"
    }
  }

  const organIcons = {
    bowel: Activity,
    extravasation: Droplets,
    liver: Heart,
    kidney: Heart,
    spleen: Heart,
  }

  const organLabels = {
    bowel: "Bowel",
    extravasation: "Internal Bleeding",
    liver: "Liver",
    kidney: "Kidney",
    spleen: "Spleen",
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600 text-lg">Loading scan results...</p>
        </div>
      </SidebarLayout>
    )
  }

  if (error) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
        </div>
      </SidebarLayout>
    )
  }

  if (!scanResult) return null

  const findings = scanResult.findings || {
    bowel: { status: "Healthy", severity: "normal" },
    extravasation: { status: "Absent", severity: "normal" },
    liver: { status: "Healthy", severity: "normal" },
    kidney: { status: "Healthy", severity: "normal" },
    spleen: { status: "Healthy", severity: "normal" }
  }

  const overallRisk = scanResult.overallRisk || computeOverallRisk(findings)
  const scanner = scanResult.scanner || "Unknown Scanner"
  const dateTime = scanResult.formattedDateTime || `${scanResult.date || "Unknown Date"} at ${scanResult.time || "Unknown Time"}`

  const downloadReport = () => {
    const userData = localStorage.getItem("user")
    const user = userData ? JSON.parse(userData) : { name: "Unknown Patient" }
    const patientName = user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : user.name || "Unknown Patient"

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>CT Scan Analysis Report</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #000;
              background: #fff;
              margin: 20px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            .header h2 {
              margin: 5px 0;
              font-size: 16px;
              font-weight: normal;
            }
            .patient-info {
              margin-bottom: 30px;
            }
            .patient-info table {
              width: 100%;
              border-collapse: collapse;
            }
            .patient-info td {
              padding: 8px;
              border: 1px solid #000;
            }
            .patient-info td:first-child {
              font-weight: bold;
              width: 30%;
              background: #f5f5f5;
            }
            .assessment {
              margin-bottom: 30px;
            }
            .assessment h3 {
              font-size: 16px;
              margin-bottom: 15px;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
            }
            .risk-badge {
              display: inline-block;
              padding: 8px 16px;
              border: 2px solid #000;
              font-weight: bold;
              font-size: 14px;
            }
            .findings {
              margin-bottom: 30px;
            }
            .findings table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .findings th,
            .findings td {
              padding: 12px;
              border: 1px solid #000;
              text-align: left;
            }
            .findings th {
              background: #f5f5f5;
              font-weight: bold;
            }
            .status-normal { font-weight: bold; }
            .status-low { font-weight: bold; }
            .status-high { font-weight: bold; }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #000;
              padding-top: 20px;
              font-size: 10px;
              text-align: center;
            }
            .print-button {
              margin: 20px 0;
              text-align: center;
            }
            .print-button button {
              padding: 10px 20px;
              font-size: 14px;
              background: #000;
              color: #fff;
              border: none;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SmartCT AI Trauma Detection</h1>
            <h2>CT Scan Analysis Report</h2>
          </div>

          <div class="patient-info">
            <table>
              <tr>
                <td>Patient Name:</td>
                <td>${patientName}</td>
              </tr>
              <tr>
                <td>Scan ID:</td>
                <td>#${scanId}</td>
              </tr>
              <tr>
                <td>Date & Time:</td>
                <td>{${dateTime}}</td>
              </tr>
              <tr>
                <td>Scanner:</td>
                <td>${scanner}</td>
              </tr>
            </table>
          </div>

          <div class="assessment">
            <h3>Overall Assessment</h3>
            <p>Risk Level: <span class="risk-badge">${overallRisk}</span></p>
          </div>

          <div class="findings">
            <h3>Detailed Findings</h3>
            <table>
              <thead>
                <tr>
                  <th>Organ/System</th>
                  <th>Status</th>
                  <th>Severity Level</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(findings)
                  .map(
                    ([organ, data]) => `
                  <tr>
                    <td>${organLabels[organ as keyof typeof organLabels]}</td>
                    <td class="status-${getEffectiveSeverity(organ, data)}">${data.status}</td>
                    <td>${getEffectiveSeverity(organ, data) === "normal" ? "Normal" : 
                         getEffectiveSeverity(organ, data) === "low" ? "Low" : "High"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>

          <div class="print-button no-print">
            <button onclick="window.print()">Print Report</button>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.back()} className="hover:bg-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Results
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Scan Analysis Report</h1>
                <p className="text-gray-600">
                  Scan #{scanId} • {dateTime}
                </p>
              </div>
            </div>
            <Button onClick={downloadReport} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">Overall Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Risk Level</h3>
                  <Badge className={`${getOverallRiskColor(overallRisk)} text-base px-4 py-2`}>
                    {overallRisk}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">Detailed Findings</CardTitle>
              <CardDescription>Organ-specific analysis results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(findings).map(([organ, data]) => {
                  const IconComponent = organIcons[organ as keyof typeof organIcons]
                  const organLabel = organLabels[organ as keyof typeof organLabels]

                  return (
                    <Card key={organ} className={`border-2 ${getSeverityColor(organ, data)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <IconComponent className="h-5 w-5 text-blue-600" />
                            </div>
                            <h4 className="font-semibold text-gray-900">{organLabel}</h4>
                          </div>
                          {getSeverityIcon(organ, data)}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Status</p>
                          <p className={`font-semibold text-lg ${getStatusColor(organ, data)}`}>
                            {data.status}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">Scan Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Scanner</p>
                  <p className="text-gray-900">{scanner}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Date & Time</p>
                  <p className="text-gray-900">
                    {dateTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Analysis ID</p>
                  <p className="text-gray-900">#{scanId}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  )
}

export default Result