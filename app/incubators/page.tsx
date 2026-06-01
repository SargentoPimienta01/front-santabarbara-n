"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Building2, Plus, Pencil, Trash2, Search, Filter, 
  Loader2, CheckCircle, AlertCircle, Package, Thermometer, Calendar 
} from "lucide-react"

// ============================================================================
// INTERFACES
// ============================================================================

interface Incubator {
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

interface IncubatorFormData {
  name: string
  capacity: number
  status: string
  temperature: string
  last_mant: string
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function IncubatorsPage() {
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  
  // Estados principales
  const [incubators, setIncubators] = useState<Incubator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // 👇 NUEVO: Estado para controlar el modal de creación (patrón controlado)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  // Formulario
  const [formData, setFormData] = useState<IncubatorFormData>({
    name: "",
    capacity: 100,
    status: "Disponible",
    temperature: "37.5°C",
    last_mant: new Date().toISOString().split("T")[0]
  })
  
  // Mensajes
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    fetchIncubators()
  }, [])

  // ============================================================================
  // FUNCIONES DE API
  // ============================================================================

  const fetchIncubators = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/api/incubators/`)
      
      if (!response.ok) throw new Error("Error al cargar incubadoras")
      
      const data: Incubator[] = await response.json()
      // Filtrar eliminadas lógicamente por defecto
      setIncubators(data.filter(inc => !inc.is_deleted))
    } catch (err) {
      setError("No se pudieron cargar las incubadoras")
      console.error("❌ Error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const createIncubator = async (data: IncubatorFormData) => {
    try {
      const response = await fetch(`${API_URL}/api/incubators/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || "Error al crear incubadora")
      }
      
      return await response.json()
    } catch (err) {
      throw err
    }
  }

  const updateIncubator = async (id: string, data: Partial<IncubatorFormData>) => {
    try {
      const response = await fetch(`${API_URL}/api/incubators/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || "Error al actualizar incubadora")
      }
      
      return await response.json()
    } catch (err) {
      throw err
    }
  }

  const softDeleteIncubator = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/incubators/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || "Error al eliminar incubadora")
      }
      
      return await response.json()
    } catch (err) {
      throw err
    }
  }

  // ============================================================================
  // MANEJADORES DE EVENTOS
  // ============================================================================

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError(null)
    
    try {
      await createIncubator(formData)
      setSuccess("✅ Incubadora creada exitosamente")
      
      // Resetear formulario
      setFormData({
        name: "",
        capacity: 100,
        status: "Disponible",
        temperature: "37.5°C",
        last_mant: new Date().toISOString().split("T")[0]
      })
      
      fetchIncubators()
      
      // 👇 Cerrar modal usando estado (patrón React correcto - sin manipulación DOM)
      setIsCreateDialogOpen(false)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsCreating(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleEdit = (incubator: Incubator) => {
    setIsEditing(incubator.id)
    setFormData({
      name: incubator.name,
      capacity: incubator.capacity,
      status: incubator.status,
      temperature: incubator.temperature,
      last_mant: incubator.last_mant
    })
  }

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault()
    setError(null)
    
    try {
      await updateIncubator(id, formData)
      setSuccess("✅ Incubadora actualizada exitosamente")
      setIsEditing(null)
      fetchIncubators()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}"? Esta acción es reversible.`)) {
      return
    }
    
    try {
      await softDeleteIncubator(id)
      setSuccess("✅ Incubadora eliminada (se puede restaurar)")
      fetchIncubators()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleCancel = () => {
    setIsEditing(null)
    setFormData({
      name: "",
      capacity: 100,
      status: "Disponible",
      temperature: "37.5°C",
      last_mant: new Date().toISOString().split("T")[0]
    })
    setError(null)
    // 👇 Si cancelamos desde el modal, también lo cerramos
    setIsCreateDialogOpen(false)
  }

  // ============================================================================
  // FILTROS Y BÚSQUEDA
  // ============================================================================

  const filteredIncubators = incubators.filter(inc => {
    const matchesSearch = inc.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || inc.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const statusOptions = ["all", "Disponible", "Activa", "Mantenimiento", "Fuera de servicio"]

  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Administración de Incubadoras
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las incubadoras disponibles para el análisis de huevos
          </p>
        </div>
        
        {/* 👇 Modal de Creación CONTROLADO (usando estado open) */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Incubadora
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nueva Incubadora</DialogTitle>
              <DialogDescription>
                Ingresa los datos de la nueva incubadora. Todos los campos son requeridos.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Incubadora Principal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperatura Ideal *</Label>
                  <Input
                    id="temperature"
                    placeholder="37.5°C"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Estado *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="Activa">Activa</SelectItem>
                      <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                      <SelectItem value="Fuera de servicio">Fuera de servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_mant">Último Mantenimiento *</Label>
                  <Input
                    id="last_mant"
                    type="date"
                    value={formData.last_mant}
                    onChange={(e) => setFormData({ ...formData, last_mant: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <DialogFooter>
                {/* 👇 Cancelar: cierra modal vía estado + limpia formulario */}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {isCreating ? "Creando..." : "Crear Incubadora"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ALERTAS */}
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {error && !success && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* FILTROS */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "Todos los estados" : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABLA DE INCUBADORAS */}
      <Card>
        <CardHeader>
          <CardTitle>Incubadoras Registradas</CardTitle>
          <CardDescription>
            {filteredIncubators.length} de {incubators.length} incubadoras mostradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando...</span>
            </div>
          ) : filteredIncubators.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay incubadoras registradas</p>
              <p className="text-sm">Crea tu primera incubadora usando el botón "Nueva Incubadora"</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Temperatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último Mantenimiento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncubators.map((inc) => (
                    <TableRow key={inc.id}>
                      {isEditing === inc.id ? (
                        // 👇 MODO EDICIÓN EN FILA
                        <TableCell colSpan={6}>
                          <form onSubmit={(e) => handleUpdate(e, inc.id)} className="space-y-3 p-2">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nombre"
                                className="col-span-2"
                              />
                              <Input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                placeholder="Cap."
                              />
                              <Input
                                value={formData.temperature}
                                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                                placeholder="Temp."
                              />
                              <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Disponible">Disponible</SelectItem>
                                  <SelectItem value="Activa">Activa</SelectItem>
                                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="date"
                                value={formData.last_mant}
                                onChange={(e) => setFormData({ ...formData, last_mant: e.target.value })}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                                Cancelar
                              </Button>
                              <Button type="submit" size="sm">
                                Guardar
                              </Button>
                            </div>
                          </form>
                        </TableCell>
                      ) : (
                        // 👇 MODO VISUALIZACIÓN
                        <>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {inc.name}
                            </div>
                          </TableCell>
                          <TableCell>{inc.capacity} huevos</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Thermometer className="h-3 w-3 text-muted-foreground" />
                              {inc.temperature}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                inc.status === "Disponible" ? "default" :
                                inc.status === "Activa" ? "secondary" :
                                inc.status === "Mantenimiento" ? "outline" : "destructive"
                              }
                            >
                              {inc.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(inc.last_mant).toLocaleDateString("es-ES")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(inc)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(inc.id, inc.name)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/analysis?incubator_id=${inc.id}`)}
                                title="Ir a análisis"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FOOTER / AYUDA */}
      <Alert className="bg-muted/50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Nota:</strong> La eliminación es suave (soft delete). Las incubadoras eliminadas 
          no aparecerán en la lista principal pero pueden restaurarse desde la base de datos si es necesario.
        </AlertDescription>
      </Alert>
    </div>
  )
}