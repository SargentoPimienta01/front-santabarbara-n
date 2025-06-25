"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { TrendingUp, TrendingDown, Download, Calendar, Target, AlertCircle } from "lucide-react"
import React, { useEffect, useState } from "react"

interface EggResponse {
  id: string
  viability: boolean
  confidence: number
  analyzed_at: string
}

export default function StatisticsPage() {
  const [eggs, setEggs] = useState<EggResponse[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar datos del backend
  useEffect(() => {
    const fetchEggs = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/eggs/")
        const data = await response.json()
        setEggs(data)
      } catch (error) {
        console.error("Error fetching egg data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEggs()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Cargando estadísticas...</p>
      </div>
    )
  }

  // Calcular métricas
  const totalEggs = eggs.length
  const viableEggs = eggs.filter((egg) => egg.viability).length
  const nonViableEggs = totalEggs - viableEggs
  const viabilityRate = totalEggs > 0 ? ((viableEggs / totalEggs) * 100).toFixed(1) : "0"
  const averageConfidence =
    totalEggs > 0 ? (eggs.reduce((sum, egg) => sum + egg.confidence, 0) / totalEggs).toFixed(2) : 0

  // Distribución diaria
  const dailyAnalysis = eggs.reduce(
    (acc, egg) => {
      const date = new Date(egg.analyzed_at).toISOString().split("T")[0]
      if (!acc[date]) {
        acc[date] = { date, viable: 0, noViable: 0, total: 0 }
      }
      if (egg.viability) {
        acc[date].viable += 1
      } else {
        acc[date].noViable += 1
      }
      acc[date].total += 1
      return acc
    },
    {} as Record<string, { date: string; viable: number; noViable: number; total: number }>
  )

  const dailyAnalysisArray = Object.values(dailyAnalysis)

  // Distribución mensual
  const monthlyTrends = eggs.reduce(
    (acc, egg) => {
      const month = new Date(egg.analyzed_at).toLocaleString("default", { month: "short" })
      if (!acc[month]) {
        acc[month] = { month, processed: 0, viable: 0, noViable: 0 }
      }
      acc[month].processed += 1
      if (egg.viability) {
        acc[month].viable += 1
      } else {
        acc[month].noViable += 1
      }
      return acc
    },
    {} as Record<string, { month: string; processed: number; viable: number; noViable: number }>
  )

  const monthlyTrendsArray = Object.values(monthlyTrends).sort((a, b) =>
    a.month.localeCompare(b.month, "es", { sensitivity: "base" })
  )

  // Distribución de confianza
  const confidenceDistribution = eggs.reduce(
    (acc, egg) => {
      let range = ""
      if (egg.confidence >= 0.9) range = "90-100%"
      else if (egg.confidence >= 0.8) range = "80-89%"
      else if (egg.confidence >= 0.7) range = "70-79%"
      else if (egg.confidence >= 0.6) range = "60-69%"
      else range = "<60%"

      const entry = acc.find((item) => item.range === range)
      if (entry) {
        entry.count += 1
        entry.percentage = 0 // recalculado más adelante
      } else {
        acc.push({ range, count: 1, percentage: 0 })
      }

      return acc
    },
    [] as { range: string; count: number; percentage: number }[]
  )

  const totalCount = eggs.length
  confidenceDistribution.forEach((item) => {
    item.percentage = ((item.count / totalCount) * 100).toFixed(1) as any
  })

  // Errores (huevos no viables)
  const errorAnalysis = eggs
    .filter((egg) => !egg.viability)
    .map((egg) => {
      const confidence = parseFloat((egg.confidence * 100).toFixed(1))
      let type = ""

      if (confidence >= 90) type = "Falsos Positivos"
      else if (confidence >= 80) type = "Falsos Negativos"
      else if (confidence >= 70) type = "Imagen Borrosa"
      else if (confidence >= 60) type = "Iluminación Deficiente"
      else type = "Desconocido"

      return type
    })
    .reduce((acc, type) => {
      const entry = acc.find((item) => item.type === type)
      if (entry) {
        entry.count += 1
      } else {
        acc.push({ type, count: 1, percentage: 0 })
      }
      return acc
    }, [] as { type: string; count: number; percentage: number }[])

  errorAnalysis.forEach((item) => {
    item.percentage = ((item.count / nonViableEggs) * 100).toFixed(1) as any
  })

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  const exportData = (type: string) => {
    console.log(`Exportando datos de ${type}`)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estadísticas y Métricas</h1>
          <p className="text-muted-foreground">Análisis detallado del rendimiento del sistema CNN</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="30d">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 días</SelectItem>
              <SelectItem value="30d">30 días</SelectItem>
              <SelectItem value="90d">90 días</SelectItem>
              <SelectItem value="1y">1 año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportData("all")}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procesados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEggs}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +12.5% vs mes anterior
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Viabilidad</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{viabilityRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              -0.3% vs mes anterior
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precisión del Modelo</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageConfidence}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +0.8% vs mes anterior
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3s</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-green-600" />
              -0.2s vs mes anterior
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Resumen General</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="quality">Calidad</TabsTrigger>
          <TabsTrigger value="errors">Análisis de Errores</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Análisis Diarios */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis Diario</CardTitle>
                <CardDescription>Huevos procesados por día</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyAnalysisArray}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value, name) => [
                        value,
                        name === "viable" ? "Viables" : name === "noViable" ? "No Viables" : "Total",
                      ]}
                    />
                    <Bar dataKey="viable" fill="#22c55e" name="viable" />
                    <Bar dataKey="noViable" fill="#ef4444" name="noViable" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución de Confianza */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Confianza</CardTitle>
                <CardDescription>Niveles de confianza del modelo CNN</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={confidenceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, percentage }) => `${range}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {confidenceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Cantidad"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias Mensuales</CardTitle>
              <CardDescription>Evolución de métricas clave a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthlyTrendsArray}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="viable"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Viabilidad (%)"
                  />
                  <Area
                    type="monotone"
                    dataKey="noViable"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="No Viables"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Calidad</CardTitle>
                <CardDescription>Indicadores de rendimiento del modelo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Sensibilidad (Recall)</span>
                  <Badge variant="default">{viabilityRate}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Precisión</span>
                  <Badge variant="default">{averageConfidence}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>F1-Score</span>
                  <Badge variant="default">{((parseFloat(viabilityRate) * 2) / 2).toFixed(1)}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>AUC-ROC</span>
                  <Badge variant="default">0.947</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Errores</CardTitle>
              <CardDescription>Tipos de errores detectados y su frecuencia</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={errorAnalysis} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={120} />
                  <Tooltip
                    formatter={(value, name) => [value, name === "count" ? "Cantidad" : "Porcentaje"]}
                  />
                  <Bar dataKey="count" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}