"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "./SidebarLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UploadIcon, FileText, X, CheckCircle, AlertCircle, HelpCircle, Archive, FileImage } from "lucide-react";

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [zipContents, setZipContents] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const acceptedFormats = [".nii", ".nii.gz", ".zip"];

  const isValidFileExtension = (filename: string) => {
    return acceptedFormats.some((format) => filename.toLowerCase().endsWith(format));
  };

  const verifyToken = async () => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    
    try {
      const response = await fetch("http://localhost:5000/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const validateZipContents = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/validate-zip', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const { contents } = await response.json();
    
    const dcmFiles = contents.filter((name: string) => 
      name.toLowerCase().endsWith(".dcm") || 
      /\.dcm\.\d+$/.test(name.toLowerCase()) // Also handles split DICOM files
    );

    if (dcmFiles.length === 0) {
      return { isValid: false, contents: [], error: "No DICOM files found" };
    }

    return { 
      isValid: true, 
      contents: dcmFiles,
      fileCount: dcmFiles.length // Return count for validation
    };
  } catch (error) {
    return {
      isValid: false,
      contents: [],
      error: `Failed to process zip: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0];
  if (!selectedFile) return;

  setValidationError("");
  setZipContents([]);

  if (!isValidFileExtension(selectedFile.name)) {
    setValidationError("Invalid file format. Please upload a .nii, .nii.gz, or .zip file containing DICOM series.");
    return;
  }

  if (selectedFile.name.toLowerCase().endsWith(".dcm")) {
    setValidationError("Please upload a zipped folder containing all DICOM slices (not a single .dcm file).");
    return;
  }

  if (selectedFile.name.toLowerCase().endsWith(".zip")) {
    const validation = await validateZipContents(selectedFile);
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid zip file");
      return;
    }
    
    // Only show size warning if there are very few DICOM files
    if (validation.contents.length < 10) { // Adjust threshold as needed
      setValidationError("Warning: Few DICOM files found. This might not be a complete CT volume.");
    }
    
    setZipContents(validation.contents);
  }

  setFile(selectedFile);
  setAnalysisComplete(false);
};

  const removeFile = () => {
    setFile(null);
    setAnalysisComplete(false);
    setZipContents([]);
    setValidationError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      alert("Please upload a CT scan before proceeding.");
      return;
    }

    setIsUploading(true);
    setIsAnalyzing(true);
    setUploadProgress(0);
    setValidationError("");

    const formData = new FormData();
    formData.append("scan", file);
    formData.append("fileType", file.name.endsWith(".zip") ? "dicom_zip" : "nifti");
    formData.append("scanType", "CT");
    formData.append("bodyPart", "Abdomen");
    formData.append("contrast", "false");
    formData.append("priority", "Normal");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      const tokenCheck = await fetch("http://localhost:5000/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!tokenCheck.ok) {
        throw new Error("Session expired. Please login again.");
      }

      const uploadRes = await fetch("http://localhost:5000/api/scans/upload", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      setUploadProgress(30);

      const { scanId } = await uploadRes.json();

      let analysisComplete = false;
      while (!analysisComplete) {
        const statusRes = await fetch(`http://localhost:5000/api/scans/${scanId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (statusRes.status === 403) {
          throw new Error("Session expired. Please login again.");
        }

        if (!statusRes.ok) throw new Error("Status check failed");

        const statusData = await statusRes.json();
        
        if (statusData.status === "Completed") {
          analysisComplete = true;
          setUploadProgress(100);
          router.push(`/result?id=${scanId}`);
          return;
        } else if (statusData.status === "Failed") {
          throw new Error("Analysis failed");
        }

        if (statusData.progress) {
          setUploadProgress(30 + (statusData.progress * 0.6));
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error: any) {
      console.error("Error:", error);
      setValidationError(error.message);
      setIsUploading(false);
      setIsAnalyzing(false);
      
      if (error.message.includes("login")) {
        router.push("/login");
      }
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (filename: string) => {
    if (filename.toLowerCase().endsWith(".zip")) {
      return <Archive className="h-6 w-6 text-blue-600" />;
    }
    return <FileImage className="h-6 w-6 text-blue-600" />;
  };

  return (
    <TooltipProvider>
      <SidebarLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Upload CT Scan</h1>
            </div>
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center space-x-2">
                  <span>Select CT Scan File</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-5 w-5 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload NIfTI files (.nii, .nii.gz) or zipped DICOM series (.zip)</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>
                  Only NIfTI (.nii, .nii.gz) or zipped DICOM series (.zip) are supported
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {validationError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">{validationError}</AlertDescription>
                  </Alert>
                )}

                {!file ? (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={openFileDialog}
                  >
                    <UploadIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Click to upload or drag and drop</h3>
                    <p className="text-gray-600 mb-4">Supported formats: {acceptedFormats.join(", ")}</p>
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent"
                    >
                      Browse Files
                    </Button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          {getFileIcon(file.name)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{file.name}</h4>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(file.size)} •{" "}
                            {file.name.toLowerCase().endsWith(".zip") ? "DICOM Series" : "NIfTI Volume"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {zipContents.length > 0 && (
                      <div className="mt-4 p-4 bg-white rounded-lg border">
                        <h5 className="font-medium text-gray-900 mb-2">
                          Archive Contents ({zipContents.length} files):
                        </h5>
                        <div className="max-h-32 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-1 text-sm text-gray-600">
                            {zipContents.slice(0, 10).map((filename, index) => (
                              <div key={index} className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span>{filename}</span>
                              </div>
                            ))}
                            {zipContents.length > 10 && (
                              <div className="col-span-2 text-gray-500 text-center">
                                ... and {zipContents.length - 10} more files
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {isUploading && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {isAnalyzing ? "Analyzing CT scan..." : "Uploading..."}
                          </span>
                          <span className="text-gray-600">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2 [&>div]:bg-blue-500" />
                        {isAnalyzing && (
                          <div className="space-y-2">
                            <p className="text-sm text-blue-600">
                              AI analysis in progress. This may take a few seconds.
                            </p>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <div className="animate-pulse h-2 w-2 rounded-full bg-blue-500"></div>
                              <span>Processing your scan...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {analysisComplete && (
                      <Alert className="mt-4 border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Analysis complete! Redirecting to results...
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={acceptedFormats.join(",")}
                  className="hidden"
                />

                {file && !analysisComplete && !validationError && (
                  <Button
                    onClick={handleAnalyze}
                    disabled={isUploading}
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                  >
                    {isUploading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{isAnalyzing ? "Analyzing..." : "Uploading..."}</span>
                      </div>
                    ) : (
                      <>
                        <UploadIcon className="mr-2 h-5 w-5" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span>Upload Guidelines</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <span>File Requirements</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-2">
                            <p>
                              <strong>NIfTI:</strong> Single 3D volume file
                            </p>
                            <p>
                              <strong>DICOM:</strong> Multiple 2D slices in a zip
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </h4>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span>NIfTI format (.nii, .nii.gz) for 3D volumes</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span>Zipped DICOM series (.zip) with multiple slices</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                        <span>Single .dcm files are NOT supported</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span>Maximum file size: 500MB</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Best Practices</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span>Ensure complete CT volume (all slices)</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span>Use contrast-enhanced scans when available</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span>Remove patient identifiers before upload</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span>Minimum file size: 1MB for 3D volumes</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarLayout>
    </TooltipProvider>
  );
};

export default Upload;