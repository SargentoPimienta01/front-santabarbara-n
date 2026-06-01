"use client"
import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"  // ← useRef + useEffect
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, CheckCircle, AlertCircle, Download, RotateCcw, Package, Link2, Link2Off } from "lucide-react"
import Image from "next/image"

interface MapleReference {
  id: string
  name: string
  level: string
}

interface AnalysisResult {
  id: string
  filename: string
  result: "viable" | "no-viable"
  confidence: number
  timestamp: Date
  imageUrl: string
  colorometry: string
  position: string
  maple_name?: string
}

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
  maple_id?: string
}

export default function AnalysisPage() {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [noEggsDetected, setNoEggsDetected] = useState<string | null>(null)
  
  const [mapleName, setMapleName] = useState("")
  const [mapleLevel, setMapleLevel] = useState<string>("1")
  const [activeMaple, setActiveMaple] = useState<MapleReference | null>(null)
  const [isCreatingMaple, setIsCreatingMaple] = useState(false)

  const activeMapleRef = useRef<MapleReference | null>(null)

  useEffect(() => {
    activeMapleRef.current = activeMaple
  }, [activeMaple])

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  const createMaple = async (): Promise<string | null> => {
    if (!mapleName.trim()) return null

    setIsCreatingMaple(true)
    try {
      const response = await fetch(`${API_URL}/api/maples/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mapleName.trim(),
          capacity: 100,
          status: "incubation",
          level: mapleLevel,
          responsible: "Sistema"
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Error al crear el Maple")
      }

      const data = await response.json()
      const newMaple: MapleReference = { id: data.id, name: data.name, level: data.level }
      
      setActiveMaple(newMaple)
      activeMapleRef.current = newMaple
      
      return data.id
    } catch (error) {
      console.error("Error al crear Maple:", error)
      alert(`No se pudo crear el Maple: ${error instanceof Error ? error.message : "Error desconocido"}`)
      return null
    } finally {
      setIsCreatingMaple(false)
    }
  }

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

    const currentMaple = activeMapleRef.current

    let mapleIdForApi: string | undefined = undefined
    let mapleNameForUi: string | undefined = undefined

    if (mapleName.trim()) {
      if (!currentMaple) {
        const uuid = await createMaple()
        // ✅ Después de crear, leer de la ref (ya actualizada por useEffect)
        const updatedMaple = activeMapleRef.current
        if (uuid && updatedMaple) {
          mapleIdForApi = uuid
          mapleNameForUi = updatedMaple.name  // ✅ TypeScript sabe que updatedMaple es MapleReference
        }
      } else {
        // Usar maple existente desde la ref
        mapleIdForApi = currentMaple.id
        mapleNameForUi = currentMaple.name  // ✅ Tipo seguro
      }
    }

    // Procesar imágenes
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)

      try {
        const processUrl = mapleIdForApi 
          ? `${API_URL}/api/eggs/process/?maple_id=${mapleIdForApi}`
          : `${API_URL}/api/eggs/process/`

        const response = await fetch(processUrl, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Error en la solicitud: ${response.statusText}`)
        }

        const data: BackendEggResponse[] = await response.json()

        if (data.length === 0) {
          setNoEggsDetected(file.name)
          continue
        }

        data.forEach((egg) => {
          const analysisResult: AnalysisResult = {
            id: egg.id,
            filename: file.name,
            result: egg.viability ? "viable" : "no-viable",
            confidence: egg.confidence * 100,
            timestamp: new Date(egg.analyzed_at),
            imageUrl: egg.image_url,
            colorometry: egg.colorometry,
            position: egg.position,
            maple_name: mapleNameForUi,
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
    setActiveMaple(null)
    activeMapleRef.current = null  // ✅ Limpiar ref también
  }

  const detachMaple = () => {
    setActiveMaple(null)
    activeMapleRef.current = null  // ✅ Limpiar ref también
    setMapleName("")
    setMapleLevel("1")
  }

  const exportResults = () => {
    const csvContent = [
      ["ID", "Archivo", "Resultado", "Confianza (%)", "Color", "Maple", "Fecha/Hora"],
      ...results.map((r) => [
        r.id,
        r.filename,
        r.result === "viable" ? "Viable" : "No Viable",
        r.confidence.toFixed(1),
        r.colorometry,
        r.maple_name || "Sin vincular",
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

  const floorOptions = Array.from({ length: 32 }, (_, i) => (i + 1).toString())

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

      {/* Sección: Vinculación opcional a Maple */}
      <Card className={`${activeMaple ? "border-primary/40 bg-primary/5" : "border-muted-foreground/20"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeMaple ? (
                <Link2 className="h-5 w-5 text-primary" />
              ) : (
                <Link2Off className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle>Vincular a Maple (Opcional)</CardTitle>
            </div>
            {activeMaple && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={detachMaple}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Desvincular
              </Button>
            )}
          </div>
          <CardDescription>
            {activeMaple 
              ? `Los huevos se asociarán a "${activeMaple.name}" (Piso ${activeMaple.level})`
              : "Ingresa un nombre y nivel para organizar los huevos en una incubadora específica"
            }
          </CardDescription>
        </CardHeader>
        
        {!activeMaple ? (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maple-name">Nombre del Maple</Label>
                <Input
                  id="maple-name"
                  placeholder="Ej: Maple-A1, Incubadora-Principal"
                  value={mapleName}
                  onChange={(e) => setMapleName(e.target.value)}
                  disabled={isCreatingMaple || isAnalyzing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maple-level">Nivel / Piso (1-32)</Label>
                <Select 
                  value={mapleLevel} 
                  onValueChange={setMapleLevel}
                  disabled={isCreatingMaple || isAnalyzing}
                >
                  <SelectTrigger id="maple-level">
                    <SelectValue placeholder="Selecciona un piso" />
                  </SelectTrigger>
                  <SelectContent>
                    {floorOptions.map((floor) => (
                      <SelectItem key={floor} value={floor}>
                        Piso {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 <strong>Opcional:</strong> Si no completas estos campos, los huevos se procesarán sin vincular a ningún Maple.
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <Alert className="bg-primary/10 border-primary/30">
              <Package className="h-4 w-4 text-primary" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  <strong>Vinculado a:</strong> {activeMaple.name} • Piso {activeMaple.level}
                </span>
                <Badge variant="secondary" className="ml-2">
                  Activo
                </Badge>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Zona de carga */}
      <Card>
        <CardHeader>
          <CardTitle>Cargar Imágenes</CardTitle>
          <CardDescription>
            Arrastra y suelta imágenes o haz clic para seleccionar archivos. Formatos soportados: JPG, PNG, WEBP (mín. 224x224px)
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
              <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
                <Button 
                  onClick={analyzeImages} 
                  disabled={isAnalyzing || isCreatingMaple} 
                  className="flex-1 md:flex-none"
                >
                  {isAnalyzing 
                    ? "Analizando..." 
                    : isCreatingMaple 
                      ? "Creando Maple..." 
                      : "Iniciar Análisis"}
                </Button>
                
                {activeMaple && (
                  <Badge variant="default" className="px-3 py-1">
                    <Package className="h-3 w-3 mr-1" />
                    Vinculado: {activeMaple.name}
                  </Badge>
                )}
                {!activeMaple && mapleName.trim() && (
                  <Badge variant="outline" className="px-3 py-1 text-muted-foreground">
                    Sin vincular
                  </Badge>
                )}
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
                No se han detectado huevos en la imagen <strong>{noEggsDetected}</strong>. Asegúrate de que la imagen sea clara y esté centrada.
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
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{result.filename}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>Analizado el {result.timestamp.toLocaleString()}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-4 h-4 rounded border border-muted-foreground/30"
                          style={{ backgroundColor: result.colorometry }}
                          title={`Color: ${result.colorometry}`}
                        />
                        <span className="font-mono text-xs">{result.colorometry}</span>
                      </div>
                      {result.maple_name && (
                        <Badge variant="secondary" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {result.maple_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
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
                    <div>
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
          <strong>Recomendaciones:</strong> Para mejores resultados, asegúrate de que las imágenes tengan buena iluminación, el huevo esté centrado y la resolución sea de al menos 224x224 píxeles.
        </AlertDescription>
      </Alert>
    </div>
  )
}