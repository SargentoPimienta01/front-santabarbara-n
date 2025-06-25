"use client"
import type React from "react"
import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, CheckCircle, AlertCircle, Download, RotateCcw } from "lucide-react"
import Image from "next/image"

interface AnalysisResult {
  id: string
  filename: string
  result: "viable" | "no-viable"
  confidence: number
  timestamp: Date
  imageUrl: string
}

// Interface for backend response
interface BackendEggResponse {
  id: string
  viability: boolean
  confidence: number
  image_url: string
  analyzed_at: string
  cracks: boolean
  deformities: boolean
  defects: string
  colorometry: string
  position: string
}

export default function AnalysisPage() {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [noEggsDetected, setNoEggsDetected] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("image/"))
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const analyzeImages = async () => {
    if (files.length === 0) return
    setIsAnalyzing(true)
    setNoEggsDetected(null)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)

      try {
        const response = await fetch("http://localhost:8000/api/eggs/process/", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Error en la solicitud: ${response.statusText}`)
        }

        const data: BackendEggResponse[] = await response.json()

        // Verifica si no se detectaron huevos
        if (data.length === 0) {
          setNoEggsDetected(file.name)
          setIsAnalyzing(false)
          setFiles([])
          continue
        }

        // Procesamos los resultados
        data.forEach((egg) => {
          const analysisResult: AnalysisResult = {
            id: egg.id,
            filename: file.name,
            result: egg.viability ? "viable" : "no-viable",
            confidence: egg.confidence * 100,
            timestamp: new Date(egg.analyzed_at),
            imageUrl: egg.image_url,
          }

          setResults((prev) => [...prev, analysisResult])
        })
      } catch (error) {
        console.error("Error al analizar la imagen:", error)
        alert(`No se pudo procesar la imagen "${file.name}"`)
      }
    }

    setIsAnalyzing(false)
    setFiles([])
  }

  const clearResults = () => {
    setResults([])
  }

  const exportResults = () => {
    const csvContent = [
      ["ID", "Archivo", "Resultado", "Confianza (%)", "Fecha/Hora"],
      ...results.map((r) => [
        r.id,
        r.filename,
        r.result === "viable" ? "Viable" : "No Viable",
        r.confidence.toFixed(1),
        r.timestamp.toLocaleString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `analisis_huevos_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Análisis de Imagen</h1>
          <p className="text-muted-foreground">
            Carga imágenes de huevos para evaluar su viabilidad usando nuestro modelo CNN
          </p>
        </div>
        {results.length > 0 && (
          <div className="flex gap-2">
            <Button onClick={exportResults} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={clearResults} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        )}
      </div>

      {/* Zona de carga */}
      <Card>
        <CardHeader>
          <CardTitle>Cargar Imágenes</CardTitle>
          <CardDescription>
            Arrastra y suelta imágenes o haz clic para seleccionar archivos. Formatos soportados: JPG, PNG, WEBP (mín.
            224x224px)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Arrastra imágenes aquí o haz clic para seleccionar</p>
            <p className="text-sm text-muted-foreground mb-4">Puedes cargar múltiples imágenes a la vez</p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Seleccionar Archivos
              </label>
            </Button>
          </div>

          {/* Vista previa de archivos */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">Archivos seleccionados ({files.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button onClick={analyzeImages} disabled={isAnalyzing} className="w-full md:w-auto">
                  {isAnalyzing ? "Analizando..." : "Iniciar Análisis"}
                </Button>
              </div>
            </div>
          )}

          {/* Barra de progreso */}
          {isAnalyzing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Procesando imágenes...</span>
                <span className="text-sm text-muted-foreground">
                  {results.length}/{files.length}
                </span>
              </div>
              <Progress value={(results.length / files.length) * 100} />
            </div>
          )}

          {/* Mensaje cuando no se detectan huevos */}
          {noEggsDetected && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No se han detectado huevos en la imagen <strong>{noEggsDetected}</strong>. Asegúrate de que la imagen sea
                clara y esté centrada.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados del Análisis</CardTitle>
            <CardDescription>Resultados de la evaluación de viabilidad usando el modelo CNN</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {results.map((result) => (
                <div key={result.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-16 h-16 relative rounded-lg overflow-hidden">
                    <Image src={result.imageUrl} alt={result.filename} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{result.filename}</h4>
                    <p className="text-sm text-muted-foreground">
                      Analizado el {result.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={result.result === "viable" ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {result.result === "viable" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {result.result === "viable" ? "Viable" : "No Viable"}
                    </Badge>
                    <div className="text-right">
                      <div className="font-medium">{result.confidence.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Confianza</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendaciones */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Recomendaciones:</strong> Para mejores resultados, asegúrate de que las imágenes tengan buena
          iluminación, el huevo esté centrado y la resolución sea de al menos 224x224 píxeles.
        </AlertDescription>
      </Alert>
    </div>
  )
}