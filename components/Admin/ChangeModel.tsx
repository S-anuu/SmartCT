"use client"

import type React from "react"

import { useEffect, useState } from "react"
import AdminSidebarLayout from "./AdminSidebarLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Cog, Upload, CheckCircle, AlertTriangle, BarChart3, RefreshCw, FileText, Calendar } from "lucide-react"

const ChangeModel = () => {
  const [currentModel, setCurrentModel] = useState({
    name: "SmartCT AI v2.1.2",
    version: "2.1.2",
    accuracy: 94.2,
    deployedDate: "7/28/2025, 11:31:01 AM",
    status: "Active",
  })

  const [isDeploying, setIsDeploying] = useState(false)
  const [deployProgress, setDeployProgress] = useState(0)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false)

  // Form data for model metadata
  const [modelData, setModelData] = useState({
    name: "",
    version: "",
    accuracy: "",
  })
  useEffect(() =>{
      async function fetchData() {
        fetch("http://localhost:5000/api/models/current")
        .then((res) => res.json())
        .then((data) => setCurrentModel({
          accuracy: data?.accuracy || 82,
          deployedDate: new Date(data?.deployedDate).toLocaleString() || "2025-01-15",
          name: data?.name || "SmartCT AI v2.1.2",
          status: data?.status || "Active",
          version: data?.version || "3.0.0"
        }))
      };
       fetchData();
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check if file has .pth extension
      if (file.name.toLowerCase().endsWith(".pth")) {
        setUploadFile(file)
      } else {
        alert("Please select a .pth file only")
        event.target.value = ""
      }
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setModelData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const isFormValid = () => {
    return (
      uploadFile &&
      modelData.name.trim() !== "" &&
      modelData.version.trim() !== "" &&
      modelData.accuracy.trim() !== "" &&
      !isNaN(Number(modelData.accuracy)) &&
      Number(modelData.accuracy) >= 0 &&
      Number(modelData.accuracy) <= 100
    )
  }

  const handleUploadModel = async () => {
    if (!uploadFile || !isFormValid()) return

    const token = localStorage.getItem("token")

    const formData = new FormData()
    formData.append("model", uploadFile)
    formData.append("name", modelData.name.trim())
    formData.append("version", modelData.version.trim())
    formData.append("accuracy", modelData.accuracy.trim())

    try {
      const response = await fetch("http://localhost:5000/api/models/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      console.log("Upload success:", data)

      setIsUploadDialogOpen(false)
      setIsDeployDialogOpen(true)

      // Update current model with the uploaded data
      setCurrentModel({
        name: modelData.name,
        version: modelData.version,
        accuracy: Number(modelData.accuracy),
        deployedDate: new Date().toISOString().split("T")[0],
        status: "Pending Deployment",
      })
   } catch (error) {
  if (error instanceof Error) {
    alert("Upload failed: " + error.message);
  } else {
    alert("Upload failed: Unknown error");
  }
  console.error(error);
}

  }

  const handleDeployModel = () => {
    setIsDeploying(true)
    setDeployProgress(0)
    setIsDeployDialogOpen(false)

    const interval = setInterval(() => {
      setDeployProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsDeploying(false)
          setCurrentModel((prevModel) => ({
            ...prevModel,
            status: "Active",
            deployedDate: new Date().toISOString().split("T")[0],
          }))
          // Reset form
          setUploadFile(null)
          setModelData({ name: "", version: "", accuracy: "" })
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  const resetForm = () => {
    setUploadFile(null)
    setModelData({ name: "", version: "", accuracy: "" })
  }

  const modelMetrics = [
    {
      title: "Model Accuracy",
      value: `${currentModel.accuracy}%`,
      icon: BarChart3,
      color: "text-green-600",
    },
    {
      title: "Version",
      value: currentModel.version,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Deployed",
      value: currentModel.deployedDate,
      icon: Calendar,
      color: "text-purple-600",
    },
  ]

  return (
    <AdminSidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Model Management</h1>
              <p className="text-xl text-gray-600">Manage and deploy AI models for trauma detection</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge
                className={`${currentModel.status === "Active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {currentModel.status}
              </Badge>
            </div>
          </div>

          {/* Upload New Model */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center">
                <Upload className="h-6 w-6 mr-3" />
                Upload New Model
              </CardTitle>
              <CardDescription>Upload a new AI model to replace the current one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Model File</h3>
                    <p className="text-gray-600 mb-4">Choose a .pth file to upload</p>
                    <Dialog
                      open={isUploadDialogOpen}
                      onOpenChange={(open) => {
                        setIsUploadDialogOpen(open)
                        if (!open) resetForm()
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Upload className="h-4 w-4 mr-2" />
                          Browse Files
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Upload New AI Model</DialogTitle>
                          <DialogDescription>
                            Upload a new AI model file with its metadata to replace the current model.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Model Information */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Model Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="model-name">Model Name *</Label>
                                <Input
                                  id="model-name"
                                  placeholder="e.g., SmartCT AI v2.2.0"
                                  value={modelData.name}
                                  onChange={(e) => handleInputChange("name", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="model-version">Version *</Label>
                                <Input
                                  id="model-version"
                                  placeholder="e.g., 2.2.0"
                                  value={modelData.version}
                                  onChange={(e) => handleInputChange("version", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="model-accuracy">Model Accuracy (%) *</Label>
                              <Input
                                id="model-accuracy"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="e.g., 95.8"
                                value={modelData.accuracy}
                                onChange={(e) => handleInputChange("accuracy", e.target.value)}
                                className="mt-1"
                              />
                              <p className="text-xs text-gray-500 mt-1">Enter accuracy as a percentage (0-100)</p>
                            </div>
                          </div>

                          {/* File Upload */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Model File</h4>
                            <div>
                              <Label htmlFor="model-file">Model File (.pth only) *</Label>
                              <Input
                                id="model-file"
                                type="file"
                                accept=".pth"
                                onChange={handleFileUpload}
                                className="mt-1"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Supported format: .pth (PyTorch model files only)
                              </p>
                            </div>
                          </div>

                          {/* File Preview */}
                          {uploadFile && (
                            <Alert className="border-blue-200 bg-blue-50">
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-blue-800">
                                <div className="space-y-1">
                                  <p>
                                    <strong>Selected file:</strong> {uploadFile.name}
                                  </p>
                                  <p>
                                    <strong>Size:</strong> {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                                  </p>
                                  {modelData.name && (
                                    <p>
                                      <strong>Model:</strong> {modelData.name}
                                    </p>
                                  )}
                                  {modelData.version && (
                                    <p>
                                      <strong>Version:</strong> {modelData.version}
                                    </p>
                                  )}
                                  {modelData.accuracy && (
                                    <p>
                                      <strong>Accuracy:</strong> {modelData.accuracy}%
                                    </p>
                                  )}
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Validation Messages */}
                          {!isFormValid() && uploadFile && (
                            <Alert className="border-yellow-200 bg-yellow-50">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <AlertDescription className="text-yellow-800">
                                Please fill in all required fields with valid values.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUploadModel}
                            disabled={!isFormValid()}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Upload & Deploy Model
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-sm text-gray-500">Maximum file size: 500MB • Supported format: .pth</p>
                </div>
              </div>

              {/* Deployment Dialog */}
              <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Deploy New Model?</DialogTitle>
                    <DialogDescription>
                      This will replace the current model and may cause a brief service interruption. Are you sure you
                      want to proceed?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Warning:</strong> This action will immediately replace the current model. All active
                        scans will be processed with the new model.
                      </AlertDescription>
                    </Alert>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Deployment Details:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Model: {modelData.name}</li>
                        <li>• Version: {modelData.version}</li>
                        <li>• Accuracy: {modelData.accuracy}%</li>
                        <li>• Estimated deployment time: 5-10 seconds</li>
                        <li>• Service interruption: ~30 seconds</li>
                        <li>• Automatic rollback on failure</li>
                      </ul>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeployDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeployModel}
                      disabled={isDeploying}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isDeploying ? "Deploying..." : "Deploy Model"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Current Model Status */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center">
                <Cog className="h-6 w-6 mr-3" />
                Current Model
              </CardTitle>
              <CardDescription>Currently deployed AI model information and performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{currentModel.name}</h3>
                    <p className="text-gray-600">Version {currentModel.version}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge
                        className={`${currentModel.status === "Active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                      >
                        {currentModel.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {modelMetrics.map((metric, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <metric.icon className={`h-4 w-4 ${metric.color}`} />
                        <span className="text-sm font-medium text-gray-700">{metric.title}</span>
                      </div>
                      <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {isDeploying && (
                <Alert className="border-blue-200 bg-blue-50">
                  <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-800">
                    <div className="space-y-2">
                      <p>Deploying new model... {deployProgress}%</p>
                      <Progress value={deployProgress} className="h-2" />
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminSidebarLayout>
  )
}

export default ChangeModel
