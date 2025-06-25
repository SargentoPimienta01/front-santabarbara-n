"use client"
import { useState, useRef, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, Save, RotateCcw, CheckCircle, AlertTriangle, Settings } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface CalibrationResult {
  reference_color: { r: number; g: number; b: number }
  detected_color: { r: number; g: number; b: number }
  deviation: number
  status: string
  image_url: string
  timestamp: string
}

export default function CalibrationPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [result, setResult] = useState<CalibrationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Color esperado por defecto: Blanco
  const [referenceColor, setReferenceColor] = useState({ r: 255, g: 255, b: 255 })

  // Iniciar la cámara
  useEffect(() => {
    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Tu navegador no soporta acceso a la cámara.")
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setIsStreaming(true)
      } catch (err) {
        console.error("Error accediendo a la cámara", err)
        alert("No se pudo acceder a la cámara.")
      }
    }

    startCamera()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [])

  // Capturar imagen
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        const dataURL = canvas.toDataURL("image/jpeg")
        setCapturedImage(dataURL)
      }
    }
  }

  // Enviar imagen al backend
  const sendImageToServer = async () => {
    if (!capturedImage) {
      alert("Primero debes capturar una imagen.")
      return
    }

    setIsLoading(true)

    // Convertir Data URL a Blob
    const blob = await fetch(capturedImage).then((res) => res.blob())

    // Crear FormData
    const formData = new FormData()
    formData.append("file", blob, "calibration.jpg")
    formData.append("expected_r", referenceColor.r.toString())
    formData.append("expected_g", referenceColor.g.toString())
    formData.append("expected_b", referenceColor.b.toString())

    try {
      const response = await fetch("http://localhost:8000/calibration/process/", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.statusText}`)
      }

      const resultData = await response.json()
      setResult(resultData)
      setIsLoading(false)
    } catch (error) {
      console.error("Error al enviar la imagen:", error)
      alert("Hubo un error al procesar la imagen.")
      setIsLoading(false)
    }
  }

  // Mostrar resultados de calibración
  const renderResult = () => {
    if (!result) return null

    const deviation = result.deviation
    const isGood = deviation < 15

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Resultado de Calibración</CardTitle>
          <CardDescription>Análisis del color comparado con el valor esperado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium">Color Esperado</h4>
              <div
                className="w-full h-12 rounded-md my-2"
                style={{ backgroundColor: `rgb(${referenceColor.r}, ${referenceColor.g}, ${referenceColor.b})` }}
              ></div>
              <p>R: {referenceColor.r}, G: {referenceColor.g}, B: {referenceColor.b}</p>
            </div>
            <div>
              <h4 className="font-medium">Color Detectado</h4>
              <div
                className="w-full h-12 rounded-md my-2"
                style={{
                  backgroundColor: `rgb(${result.detected_color.r}, ${result.detected_color.g}, ${result.detected_color.b})`,
                }}
              ></div>
              <p>R: {result.detected_color.r}, G: {result.detected_color.g}, B: {result.detected_color.b}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Desviación de color</h4>
            <div className="flex items-center justify-between">
              <span>{deviation.toFixed(2)} px</span>
              <Badge variant={isGood ? "default" : "destructive"}>
                {isGood ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" /> Buen ajuste
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-1" /> Ajuste necesario
                  </>
                )}
              </Badge>
            </div>
            <Progress value={(1 - deviation / 50) * 100} className="h-2" />
          </div>

          {result.status === "needs_adjustment" && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Se detectó una desviación significativa. Recomendamos ajustar los parámetros de iluminación o balance
                de blancos.
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            <strong>Hora:</strong> {new Date(result.timestamp).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-3xl font-bold flex items-center">
          <Settings className="mr-2" />
          Calibración de Cámara
        </h1>
        <p className="text-muted-foreground">
          Realiza una calibración para asegurar una detección precisa del color de los huevos.
        </p>
      </div>

      {/* Panel de configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Captura de Imagen</CardTitle>
          <CardDescription>Usa la cámara para tomar una foto de un huevo blanco</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {!isStreaming ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Iniciando cámara...</p>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={captureImage} disabled={!isStreaming}>
                <Camera className="h-4 w-4 mr-2" />
                Tomar Foto
              </Button>
              <Button onClick={sendImageToServer} disabled={!capturedImage || isLoading}>
                {isLoading ? "Enviando..." : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enviar para Calibrar
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setCapturedImage(null)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reiniciar
              </Button>
            </div>

            {capturedImage && (
              <div className="mt-4">
                <h4 className="font-medium">Vista previa</h4>
                <img src={capturedImage} alt="Vista previa" className="mt-2 w-full rounded border" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuración de color de referencia */}
      <Card>
        <CardHeader>
          <CardTitle>Color de Referencia</CardTitle>
          <CardDescription>Selecciona el color ideal que debería tener el huevo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Red</label>
              <Slider min={0} max={255} step={1} defaultValue={[referenceColor.r]} onValueChange={(value) =>
                setReferenceColor((prev) => ({ ...prev, r: value[0] }))
              } />
              <div className="text-right">{referenceColor.r}</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Green</label>
              <Slider min={0} max={255} step={1} defaultValue={[referenceColor.g]} onValueChange={(value) =>
                setReferenceColor((prev) => ({ ...prev, g: value[0] }))
              } />
              <div className="text-right">{referenceColor.g}</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Blue</label>
              <Slider min={0} max={255} step={1} defaultValue={[referenceColor.b]} onValueChange={(value) =>
                setReferenceColor((prev) => ({ ...prev, b: value[0] }))
              } />
              <div className="text-right">{referenceColor.b}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {renderResult()}

      {/* Notas */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Recomendaciones:</strong> Usa un fondo neutro y asegúrate de que el huevo esté bien iluminado y
          centrado. Una buena calibración mejora la detección de colores reales en los análisis posteriores.
        </AlertDescription>
      </Alert>
    </div>
  )
}