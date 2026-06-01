"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Upload, X, CheckCircle, AlertCircle, Download, RotateCcw, 
  Package, Link2, Link2Off, Building2, Loader2, FlaskConical 
} from "lucide-react"
import Image from "next/image"
import { EggGrid } from "@/components/egg-grid" // 👈 Componente de tablero

// ============================================================================
// INTERFACES
// ============================================================================

interface IncubatorOption {
  id: string
  name: string
  capacity: number
  status: string
  temperature: string
  last_mant: string
  is_deleted?: boolean
  deleted_at?: string | null
  maples?: string[]
}

interface MapleReference {
  id: string
  name: string
  level: string
  incubator_id?: string
  incubator_name?: string
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
  incubator_name?: string
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

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AnalysisPage() {
  // Estados de análisis
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [noEggsDetected, setNoEggsDetected] = useState<string | null>(null)
  
  // Estados de Maple/Ubicación
  const [mapleName, setMapleName] = useState("")
  const [mapleLevel, setMapleLevel] = useState<string>("1")
  const [activeMaple, setActiveMaple] = useState<MapleReference | null>(null)
  const [isCreatingMaple, setIsCreatingMaple] = useState(false)

  // Estados para Incubadoras
  const [incubators, setIncubators] = useState<IncubatorOption[]>([])
  const [selectedIncubatorId, setSelectedIncubatorId] = useState<string>("")
  const [isLoadingIncubators, setIsLoadingIncubators] = useState(false)
  
  // Refs
  const activeMapleRef = useRef<MapleReference | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Configuración
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    fetchIncubators()
  }, [])

  useEffect(() => {
    activeMapleRef.current = activeMaple
  }, [activeMaple])

  // ============================================================================
  // FUNCIONES DE API
  // ============================================================================

  const fetchIncubators = async () => {
    try {
      setIsLoadingIncubators(true)
      const response = await fetch(`${API_URL}/api/incubators/`)
      
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)
      
      const data: IncubatorOption[] = await response.json()
      const available = data.filter(inc => {
        const isDeleted = inc.is_deleted ?? false
        const status = inc.status?.toLowerCase() || ""
        const activeStatuses = ["disponible", "activa", "funcionamiento", "active", "en uso"]
        return !isDeleted && activeStatuses.includes(status)
      })
      setIncubators(available)
    } catch (error) {
      console.error("❌ Error cargando incubadoras:", error)
    } finally {
      setIsLoadingIncubators(false)
    }
  }

  const createMaple = async (incubatorId?: string): Promise<string | null> => {
    if (!mapleName.trim()) {
      alert("Por favor, ingresa un nombre para el Maple")
      return null
    }

    setIsCreatingMaple(true)
    try {
      const payload: Record<string, any> = {
        name: mapleName.trim(),
        capacity: 100,
        status: "incubation",
        level: mapleLevel,
        responsible: "Sistema"
      }
      if (incubatorId) payload.incubator_id = incubatorId

      const response = await fetch(`${API_URL}/api/maples/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `Error ${response.status} al crear el Maple`)
      }

      const data = await response.json()
      const selectedInc = incubators.find(inc => inc.id === incubatorId)
      
      const newMaple: MapleReference = { 
        id: data.id, 
        name: data.name, 
        level: data.level,
        incubator_id: data.incubator_id || incubatorId,
        incubator_name: selectedInc?.name
      }
      
      setActiveMaple(newMaple)
      activeMapleRef.current = newMaple
      return data.id
    } catch (error) {
      console.error("❌ Error al crear Maple:", error)
      alert(`No se pudo crear el Maple: ${error instanceof Error ? error.message : "Error desconocido"}`)
      return null
    } finally {
      setIsCreatingMaple(false)
    }
  }

  // ============================================================================
  // MANEJO DE ARCHIVOS
  // ============================================================================

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    if (droppedFiles.length === 0) {
      alert("Por favor, arrastra solo archivos de imagen")
      return
    }
    setFiles(prev => [...prev, ...droppedFiles])
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.type.startsWith("image/"))
      if (selected.length === 0) {
        alert("Por favor, selecciona solo archivos de imagen")
        return
      }
      setFiles(prev => [...prev, ...selected])
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index))
  const clearFiles = () => {
    setFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ============================================================================
  // ANÁLISIS DE IMÁGENES
  // ============================================================================

  const analyzeImages = async () => {
    if (files.length === 0) {
      alert("Por favor, selecciona al menos una imagen para analizar")
      return
    }

    setIsAnalyzing(true)
    setNoEggsDetected(null)

    const currentMaple = activeMapleRef.current
    let mapleIdForApi: string | undefined = undefined
    let mapleNameForUi: string | undefined = undefined
    let incubatorNameForUi: string | undefined = undefined

    if (mapleName.trim() && !currentMaple) {
      const uuid = await createMaple(selectedIncubatorId || undefined)
      const updated = activeMapleRef.current
      if (uuid && updated) {
        mapleIdForApi = uuid
        mapleNameForUi = updated.name
        incubatorNameForUi = updated.incubator_name
      } else {
        const continueWithout = confirm("No se pudo crear el Maple. ¿Continuar sin vincular?")
        if (!continueWithout) { setIsAnalyzing(false); return }
      }
    } else if (currentMaple) {
      mapleIdForApi = currentMaple.id
      mapleNameForUi = currentMaple.name
      incubatorNameForUi = currentMaple.incubator_name
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)

      try {
        const processUrl = mapleIdForApi 
          ? `${API_URL}/api/eggs/process/?maple_id=${mapleIdForApi}`
          : `${API_URL}/api/eggs/process/`

        const response = await fetch(processUrl, { method: "POST", body: formData })
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)

        const data: BackendEggResponse[] = await response.json()
        if (data.length === 0) {
          setNoEggsDetected(file.name)
          continue
        }

        data.forEach(egg => {
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
            incubator_name: incubatorNameForUi,
          }
          setResults(prev => [...prev, analysisResult])
        })
      } catch (error) {
        console.error(`❌ Error analizando "${file.name}":`, error)
        setResults(prev => [...prev, {
          id: `err-${Date.now()}-${i}`, filename: file.name, result: "no-viable", confidence: 0,
          timestamp: new Date(), imageUrl: "/placeholder.svg", colorometry: "#cccccc", position: "N/A",
          maple_name: mapleNameForUi, incubator_name: incubatorNameUi,
        }])
      }
    }

    setIsAnalyzing(false)
    if (!noEggsDetected) {
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  const clearResults = () => { setResults([]); setNoEggsDetected(null) }
  
  const resetAll = () => {
    clearResults()
    setActiveMaple(null); activeMapleRef.current = null
    setMapleName(""); setMapleLevel("1"); setSelectedIncubatorId("")
    setFiles([]); if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const detachMaple = () => {
    setActiveMaple(null); activeMapleRef.current = null
    setMapleName(""); setMapleLevel("1")
  }

  const exportResults = () => {
    if (results.length === 0) { alert("No hay resultados para exportar"); return }

    const csvContent = [
      ["ID", "Archivo", "Resultado", "Confianza (%)", "Color", "Posición", "Maple", "Incubadora", "Fecha/Hora"],
      ...results.map(r => [
        r.id, r.filename, r.result === "viable" ? "Viable" : "No Viable",
        r.confidence.toFixed(1), r.colorometry, r.position,
        r.maple_name || "Sin vincular", r.incubator_name || "Sin vincular",
        r.timestamp.toLocaleString("es-ES")
      ])
    ].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `analisis_huevos_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const floorOptions = Array.from({ length: 32 }, (_, i) => (i + 1).toString())

  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-primary" />
            Análisis de Viabilidad
          </h1>
          <p className="text-muted-foreground mt-1">
            Evalúa huevos usando nuestro modelo CNN con organización por incubadora
          </p>
        </div>
        {results.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
            <Button onClick={clearResults} variant="outline" size="sm">Limpiar Resultados</Button>
            <Button onClick={resetAll} variant="ghost" size="sm" className="text-muted-foreground">
              <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar
            </Button>
          </div>
        )}
      </div>

      {/* UBICACIÓN (INCUBADORA + MAPLE) */}
      <Card className={`${activeMaple ? "border-primary/40 bg-primary/5" : "border-muted-foreground/20"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeMaple ? <Link2 className="h-5 w-5 text-primary" /> : <Link2Off className="h-5 w-5 text-muted-foreground" />}
              <CardTitle className="text-lg">Ubicación en Incubadora</CardTitle>
            </div>
            {activeMaple && (
              <Button variant="ghost" size="sm" onClick={detachMaple} className="h-8 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4 mr-1" /> Cambiar
              </Button>
            )}
          </div>
          <CardDescription className="text-sm">
            {activeMaple 
              ? `📦 ${activeMaple.name} • Piso ${activeMaple.level}${activeMaple.incubator_name ? ` • 🏭 ${activeMaple.incubator_name}` : ''}`
              : "Selecciona una incubadora y define el Maple para organizar los huevos"
            }
          </CardDescription>
        </CardHeader>
        
        {!activeMaple ? (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="incubator-select" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Incubadora <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select 
                value={selectedIncubatorId} 
                onValueChange={setSelectedIncubatorId}
                disabled={isLoadingIncubators || isCreatingMaple || isAnalyzing}
              >
                <SelectTrigger id="incubator-select" className="w-full">
                  <SelectValue placeholder={isLoadingIncubators ? "Cargando..." : incubators.length === 0 ? "Sin incubadoras" : "Selecciona una"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingIncubators ? (
                    <SelectItem value="loading" disabled><div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div></SelectItem>
                  ) : incubators.length > 0 ? (
                    incubators.map(inc => (
                      <SelectItem key={inc.id} value={inc.id}>
                        <div className="flex items-center gap-2 w-full">
                          <Building2 className="h-4 w-4 text-muted-foreground" /> {inc.name}
                          <Badge variant="outline" className="ml-auto text-xs">{inc.status}</Badge>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Sin incubadoras registradas</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 ${selectedIncubatorId ? "pl-4 border-l-2 border-primary/20" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="maple-name">Nombre del Maple *</Label>
                <Input id="maple-name" placeholder="Ej: Bandeja-A5" value={mapleName} onChange={e => setMapleName(e.target.value)} disabled={isCreatingMaple || isAnalyzing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maple-level">Nivel / Piso *</Label>
                <Select value={mapleLevel} onValueChange={setMapleLevel} disabled={isCreatingMaple || isAnalyzing}>
                  <SelectTrigger id="maple-level"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>{floorOptions.map(f => <SelectItem key={f} value={f}>Piso {f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              💡 Si no completas estos campos, los huevos se procesarán sin vincular a ningún Maple ni Incubadora.
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <Alert className="bg-primary/10 border-primary/30">
              <Package className="h-4 w-4 text-primary" />
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                <span className="font-medium">{activeMaple.name} • Piso {activeMaple.level}</span>
                {activeMaple.incubator_name && <span className="text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{activeMaple.incubator_name}</span>}
                <Badge variant="secondary" className="sm:ml-auto text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Activo</Badge>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* ZONA DE CARGA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cargar Imágenes</CardTitle>
          <CardDescription className="text-sm">Arrastra y suelta o haz clic para seleccionar. Formatos: JPG, PNG, WEBP</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-all cursor-pointer ${dragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"} ${isAnalyzing ? "opacity-50 pointer-events-none" : ""}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileInput} className="hidden" id="file-upload" disabled={isAnalyzing} />
            <Upload className={`h-12 w-12 mx-auto mb-4 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-lg font-medium mb-2">{dragActive ? "¡Suelta las imágenes aquí!" : "Arrastra imágenes o haz clic para seleccionar"}</p>
            <Button asChild variant={dragActive ? "default" : "outline"}><label htmlFor="file-upload" className="cursor-pointer">{dragActive ? "Soltar" : "Seleccionar Archivos"}</label></Button>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Archivos seleccionados ({files.length})</h3>
                <Button variant="ghost" size="sm" onClick={clearFiles} className="h-8 text-muted-foreground hover:text-destructive"><X className="h-4 w-4 mr-1" /> Limpiar</Button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {files.map((file, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <div className="absolute inset-0 bg-muted rounded-lg overflow-hidden">
                      <Image src={URL.createObjectURL(file)} alt={file.name} fill className="object-cover transition-transform group-hover:scale-105" />
                    </div>
                    <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" onClick={e => { e.stopPropagation(); removeFile(idx) }} disabled={isAnalyzing}><X className="h-3 w-3" /></Button>
                    <p className="text-[10px] mt-1 truncate text-center text-muted-foreground" title={file.name}>{file.name.length > 12 ? file.name.substring(0, 10) + "..." : file.name}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-5 pt-4 border-t">
                <Button onClick={analyzeImages} disabled={isAnalyzing || isCreatingMaple || files.length === 0} className="w-full sm:w-auto" size="lg">
                  {isAnalyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analizando...</> : isCreatingMaple ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando Maple...</> : <><FlaskConical className="h-4 w-4 mr-2" /> Iniciar Análisis ({files.length})</>}
                </Button>
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                  {activeMaple && <Badge variant="default" className="px-3 py-1 text-xs"><Package className="h-3 w-3 mr-1" />{activeMaple.name}</Badge>}
                  {activeMaple?.incubator_name && <Badge variant="secondary" className="px-3 py-1 text-xs"><Building2 className="h-3 w-3 mr-1" />{activeMaple.incubator_name}</Badge>}
                  {!activeMaple && mapleName.trim() && <Badge variant="outline" className="px-3 py-1 text-xs text-muted-foreground">Sin vincular</Badge>}
                </div>
              </div>
            </div>
          )}

          {isAnalyzing && files.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="font-medium">Procesando...</span><span className="text-muted-foreground">{results.length}/{files.length} imágenes</span></div>
              <Progress value={(results.length / files.length) * 100} className="h-2" />
            </div>
          )}

          {noEggsDetected && (
            <Alert variant="destructive" className="mt-6"><AlertCircle className="h-4 w-4" /><AlertDescription>No se detectaron huevos en <strong>{noEggsDetected}</strong>. Verifica iluminación y enfoque.</AlertDescription></Alert>
          )}
        </CardContent>
      </Card>

      {/* 👇 RESULTADOS CON EGGGRID (TABLERO) */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Mapa de Huevos Analizados</CardTitle>
                <CardDescription className="text-sm">Visualización tipo tablero. Pasa el cursor sobre una celda para ver detalles.</CardDescription>
              </div>
              <Badge variant="outline">{results.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <EggGrid
              eggs={results.map(r => ({
                id: r.id,
                position: r.position,
                result: r.result,
                confidence: r.confidence,
                imageUrl: r.imageUrl,
                filename: r.filename,
                timestamp: r.timestamp
              }))}
              rows={10}
              cols={10}
            />
          </CardContent>
        </Card>
      )}

      {/* FOOTER */}
      <Alert className="bg-muted/50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Para mejores resultados:</strong> Usa imágenes con buena iluminación, fondo contrastado y el huevo centrado. Resolución recomendada: ≥224x224 píxeles.
        </AlertDescription>
      </Alert>
    </div>
  )
}