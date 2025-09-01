"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Upload, FileSpreadsheet, AlertCircle, Settings } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as XLSX from "xlsx"

interface FileUploadProps {
  onDataLoad: (data: any[]) => void
}

const ENCODING_OPTIONS = [
  { value: "auto", label: "自動検出" },
  { value: "utf-8", label: "UTF-8" },
  { value: "shift-jis", label: "Shift-JIS (Windows)" },
  { value: "euc-jp", label: "EUC-JP" },
  { value: "utf-16", label: "UTF-16" },
  { value: "iso-2022-jp", label: "ISO-2022-JP" },
]

export default function FileUpload({ onDataLoad }: FileUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEncoding, setSelectedEncoding] = useState("auto")
  const [showEncodingOptions, setShowEncodingOptions] = useState(false)

  const detectAndConvertEncoding = (buffer: ArrayBuffer, encoding: string): string => {
    const uint8Array = new Uint8Array(buffer)

    if (encoding === "auto") {
      // 簡易的な日本語エンコーディング検出
      const text = new TextDecoder("utf-8", { fatal: false }).decode(uint8Array)
      if (text.includes("�")) {
        // UTF-8でデコードに失敗した場合、Shift-JISを試す
        try {
          return new TextDecoder("shift-jis").decode(uint8Array)
        } catch {
          return new TextDecoder("utf-8", { fatal: false }).decode(uint8Array)
        }
      }
      return text
    }

    try {
      return new TextDecoder(encoding).decode(uint8Array)
    } catch {
      // フォールバック
      return new TextDecoder("utf-8", { fatal: false }).decode(uint8Array)
    }
  }

  const parseCSV = (text: string): any[][] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    const result: any[][] = []

    for (const line of lines) {
      const row: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          row.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }

      row.push(current.trim())
      result.push(row)
    }

    return result
  }

  const processFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      setError(null)

      try {
        const arrayBuffer = await file.arrayBuffer()
        let jsonData: any[][]

        if (file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt")) {
          // CSV/TXTファイルの処理（エンコーディング対応）
          const text = detectAndConvertEncoding(arrayBuffer, selectedEncoding)
          jsonData = parseCSV(text)
        } else {
          // Excelファイルの処理
          const workbook = XLSX.read(arrayBuffer, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        }

        if (jsonData.length < 2) {
          throw new Error("ファイルにデータが含まれていません")
        }

        // Convert to object format with headers
        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1) as any[][]

        const processedData = rows.map((row, index) => {
          const obj: any = { id: index + 1 }
          headers.forEach((header, colIndex) => {
            // Skip response time column (assuming it's the first column)
            if (colIndex === 0 && (header.toLowerCase().includes("時間") || header.toLowerCase().includes("time"))) {
              return
            }
            obj[header] = row[colIndex] || ""
          })
          return obj
        })

        onDataLoad(processedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "ファイルの処理中にエラーが発生しました")
      } finally {
        setIsLoading(false)
      }
    },
    [onDataLoad, selectedEncoding],
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        if (file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt")) {
          setShowEncodingOptions(true)
        }
        processFile(file)
      }
    },
    [processFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
    multiple: false,
  })

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4" />
            <Label className="text-sm font-medium">文字エンコーディング設定</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="encoding" className="text-xs text-muted-foreground">
                文字化けする場合は適切なエンコーディングを選択してください
              </Label>
              <Select value={selectedEncoding} onValueChange={setSelectedEncoding}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENCODING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Windows:</strong> Shift-JIS
              </p>
              <p>
                <strong>Mac:</strong> UTF-8
              </p>
              <p>
                <strong>その他:</strong> 自動検出
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        {...getRootProps()}
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />

          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg font-medium">ファイルを処理中...</p>
              <p className="text-sm text-muted-foreground">
                エンコーディング: {ENCODING_OPTIONS.find((opt) => opt.value === selectedEncoding)?.label}
              </p>
            </div>
          ) : (
            <>
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
              <div className="text-center">
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? "ファイルをここにドロップしてください" : "ファイルをドラッグアンドドロップ"}
                </p>
                <p className="text-muted-foreground mb-4">または</p>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Upload className="h-4 w-4" />
                  ファイルを選択
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  対応形式: Excel (.xlsx, .xls), CSV (.csv), テキスト (.txt)
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {error.includes("エラー") && (
              <div className="mt-2 text-xs">
                <p>文字化けが原因の可能性があります。上記のエンコーディング設定を変更してお試しください。</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
