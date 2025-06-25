import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Camera, ImageIcon, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="p-6 space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold tracking-tight">Sistema de Evaluación de Viabilidad de Huevos</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Tecnología avanzada de visión artificial y redes neuronales convolucionales para optimizar la clasificación de
          huevos viables en granjas avícolas.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Análisis Realizados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+12% desde el mes pasado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Viabilidad</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <p className="text-xs text-muted-foreground">Promedio últimos 30 días</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precisión del Modelo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.8%</div>
            <p className="text-xs text-muted-foreground">Validación cruzada</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ImageIcon className="h-6 w-6 text-blue-600" />
              <CardTitle>Análisis de Imagen</CardTitle>
            </div>
            <CardDescription>
              Carga y analiza imágenes de huevos utilizando nuestro modelo CNN entrenado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/analysis">Iniciar Análisis</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Camera className="h-6 w-6 text-green-600" />
              <CardTitle>Calibración de Cámara</CardTitle>
            </div>
            <CardDescription>
              Configura y calibra los parámetros de captura para obtener resultados óptimos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/calibration">Calibrar Cámara</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <CardTitle>Estadísticas</CardTitle>
            </div>
            <CardDescription>Visualiza métricas detalladas y tendencias de los análisis realizados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/statistics">Ver Estadísticas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimos análisis realizados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { id: "IMG_001", result: "Viable", confidence: "96.2%", time: "Hace 5 min" },
              { id: "IMG_002", result: "No Viable", confidence: "89.7%", time: "Hace 12 min" },
              { id: "IMG_003", result: "Viable", confidence: "94.1%", time: "Hace 18 min" },
              { id: "IMG_004", result: "Viable", confidence: "91.8%", time: "Hace 25 min" },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.result === "Viable" ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="font-medium">{item.id}</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      item.result === "Viable" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.result}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Confianza: {item.confidence}</span>
                  <span>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
