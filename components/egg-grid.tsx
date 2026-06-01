"use client"

import { useState, useEffect } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Grid3X3, List } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

interface EggData {
  id: string
  position: string
  result: "viable" | "no-viable"
  confidence: number
  imageUrl: string
  filename?: string
  timestamp?: Date
}

interface EggGridProps {
  eggs: EggData[]
  rows?: number
  cols?: number
}

export function EggGrid({ eggs, rows = 15, cols = 10 }: EggGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // 🔍 DEBUG: Ver qué formato envía tu backend
  useEffect(() => {
    if (eggs.length > 0) {
      console.log("🥚 Posiciones recibidas del backend:", eggs.slice(0, 5).map(e => e.position))
    }
  }, [eggs])

  // 🗺️ Parser robusto de posiciones
  const parsePosition = (pos: string) => {
    if (!pos || pos.trim() === "") return null

    // 1. Formato A1, B12, etc. (Letra = Columna, Número = Fila)
    const matchAlphaNum = pos.match(/^([A-Za-z])(\d+)$/)
    if (matchAlphaNum) {
      return {
        row: parseInt(matchAlphaNum[2]) - 1,
        col: matchAlphaNum[1].toUpperCase().charCodeAt(0) - 65
      }
    }

    // 2. Formato 1-2, 3-4 (Fila-Columna)
    const matchDash = pos.match(/^(\d+)-(\d+)$/)
    if (matchDash) {
      return { row: parseInt(matchDash[1]) - 1, col: parseInt(matchDash[2]) - 1 }
    }

    // 3. Formato 1,2 o 3.4 (Fila,Columna)
    const matchCommaDot = pos.match(/^(\d+)[,.](\d+)$/)
    if (matchCommaDot) {
      return { row: parseInt(matchCommaDot[1]) - 1, col: parseInt(matchCommaDot[2]) - 1 }
    }

    // 4. Solo números (secuencial: 1, 2, 3...) → tratar como fila 0, columna N-1
    const matchNum = pos.match(/^(\d+)$/)
    if (matchNum) {
      const idx = parseInt(matchNum[1]) - 1
      return { row: Math.floor(idx / cols), col: idx % cols }
    }

    console.warn(`⚠️ Formato de posición no reconocido: "${pos}". Se usará colocación secuencial.`)
    return null
  }

  // 📦 Construir mapa posición → huevo
  const eggMap = new Map<string, EggData>()
  let sequentialFallback = 0

  eggs.forEach(egg => {
    const coords = parsePosition(egg.position)
    if (coords && coords.row >= 0 && coords.row < rows && coords.col >= 0 && coords.col < cols) {
      eggMap.set(`${coords.row}-${coords.col}`, egg)
    } else {
      // 🔁 Fallback: colocar secuencialmente en la primera celda vacía
      while (sequentialFallback < rows * cols) {
        const r = Math.floor(sequentialFallback / cols)
        const c = sequentialFallback % cols
        const key = `${r}-${c}`
        sequentialFallback++
        if (!eggMap.has(key)) {
          eggMap.set(key, egg)
          break
        }
      }
    }
  })

  // 🎨 Estilos de celda
  const getCellClasses = (egg?: EggData) => {
    if (!egg) return "bg-muted/20 border-border/30"
    if (egg.result === "viable") return "bg-green-500/15 border-green-500/40 hover:border-green-500/60 hover:bg-green-500/25"
    return "bg-red-500/15 border-red-500/40 hover:border-red-500/60 hover:bg-red-500/25"
  }

  // 📄 Vista Lista
  if (viewMode === "list") {
    return (
      <div className="space-y-3">
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode("grid")}>
            <Grid3X3 className="h-4 w-4 mr-2" /> Vista Tablero
          </Button>
        </div>
        <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
          {eggs.map(egg => (
            <div key={egg.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="w-14 h-14 relative rounded overflow-hidden bg-muted flex-shrink-0">
                <Image src={egg.imageUrl} alt={egg.position} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">Pos: {egg.position} • {egg.filename || "Archivo"}</h4>
                <p className="text-xs text-muted-foreground">{egg.timestamp?.toLocaleString()}</p>
              </div>
              <Badge variant={egg.result === "viable" ? "default" : "destructive"} className="flex-shrink-0">
                {egg.result === "viable" ? "✅ Viable" : "❌ No Viable"} • {egg.confidence.toFixed(0)}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ♟️ Vista Tablero
  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Badge variant="outline">
            {eggs.filter(e => e.result === "viable").length} viables • {eggs.filter(e => e.result === "no-viable").length} no viables
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4 mr-2" /> Vista Lista
          </Button>
        </div>

        <div 
          className="grid gap-1.5 p-3 bg-background rounded-xl border shadow-sm select-none"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows * cols }).map((_, idx) => {
            const row = Math.floor(idx / cols)
            const col = idx % cols
            const key = `${row}-${col}`
            const egg = eggMap.get(key)

            // Etiqueta (A1, B2, etc.)
            const colLabel = col < 26 ? String.fromCharCode(65 + col) : `C${col+1}`
            const posLabel = `${colLabel}${row + 1}`

            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center relative cursor-pointer transition-all ${getCellClasses(egg)}`}>
                    {egg ? (
                      <>
                        <Image src={egg.imageUrl} alt={egg.position} fill className="w-full h-full object-cover rounded-lg opacity-90" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {egg.result === "viable" ? (
                            <CheckCircle className="h-6 w-6 text-white drop-shadow-md" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-white drop-shadow-md" />
                          )}
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                          {egg.confidence.toFixed(0)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground/50">{posLabel}</span>
                    )}
                  </div>
                </TooltipTrigger>
                {egg && (
                  <TooltipContent side="top" className="max-w-xs p-3 z-50">
                    <p className="font-semibold text-sm mb-1">Huevo {egg.position}</p>
                    <p className="text-xs text-muted-foreground mb-1">Archivo: {egg.filename || "N/A"}</p>
                    <p className="text-xs text-muted-foreground mb-2">Confianza: {egg.confidence.toFixed(1)}%</p>
                    <Badge variant={egg.result === "viable" ? "default" : "destructive"}>
                      {egg.result === "viable" ? "✅ Viable" : "❌ No Viable"}
                    </Badge>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center pt-1">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500/15 border border-green-500/40 rounded"></div> Viable</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500/15 border border-red-500/40 rounded"></div> No Viable</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-muted/20 border border-border/30 rounded"></div> Vacío</div>
        </div>
      </div>
    </TooltipProvider>
  )
}