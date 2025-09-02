"use client"

import { useState, useMemo, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Filter, X, Search, Download, FileSpreadsheet, Printer, ImageIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface DataVisualizationProps {
  data: any[]
}

export default function DataVisualization({ data }: DataVisualizationProps) {
  const [selectedRespondents, setSelectedRespondents] = useState<string[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // Extract columns (excluding response time and ID)
  const columns = useMemo(() => {
    if (data.length === 0) return []
    return Object.keys(data[0]).filter((key) => key !== "id" && !key.toLowerCase().includes("時間"))
  }, [data])

  const respondentColumn = useMemo(() => {
    const possibleNames = [
      "回答者",
      "respondent",
      "氏名",
      "名前",
      "name",
      "お名前",
      "ユーザー名",
      "user",
      "user_name",
      "username",
      "回答者名",
      "respondent_name",
      "姓名",
      "フルネーム",
      "fullname",
      "full_name",
    ]

    return columns.find((col) => possibleNames.some((name) => col.toLowerCase().includes(name.toLowerCase())))
  }, [columns])

  // Get unique respondents
  const respondents = useMemo(() => {
    if (!respondentColumn) return []
    return [...new Set(data.map((row) => row[respondentColumn]).filter(Boolean))]
  }, [data, respondentColumn])

  // Get questions (excluding respondent column)
  const questions = useMemo(() => {
    return columns.filter((col) => col !== respondentColumn)
  }, [columns, respondentColumn])

  // Filter data based on selections
  const filteredData = useMemo(() => {
    console.log("[v0] フィルター処理開始", {
      selectedRespondents,
      selectedQuestions,
      searchTerm,
      dataLength: data.length,
    })

    let filtered = [...data] // 配列のコピーを作成

    if (selectedRespondents.length > 0) {
      console.log("[v0] 回答者フィルター適用", { respondentColumn, selectedRespondents })

      if (respondentColumn) {
        const beforeFilter = filtered.length
        filtered = filtered.filter((row) => {
          const respondentValue = row[respondentColumn]
          const match = selectedRespondents.includes(respondentValue)
          console.log("[v0] 回答者比較", {
            respondentValue,
            selectedRespondents,
            match,
          })
          return match
        })
        console.log("[v0] 回答者フィルター結果", { beforeFilter, afterFilter: filtered.length })
      }
    }

    if (searchTerm) {
      const beforeSearch = filtered.length
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) => value && String(value).toLowerCase().includes(searchTerm.toLowerCase())),
      )
      console.log("[v0] 検索フィルター結果", { beforeSearch, afterSearch: filtered.length, searchTerm })
    }

    console.log("[v0] 最終フィルター結果", { originalLength: data.length, filteredLength: filtered.length })
    return filtered
  }, [data, selectedRespondents, searchTerm, respondentColumn])

  const chartData = useMemo(() => {
    if (selectedQuestions.length === 0 || filteredData.length === 0) {
      console.log("[v0] チャートデータなし", { selectedQuestions, filteredDataLength: filteredData.length })
      return []
    }

    // 最初に選択された質問のデータを生成
    const selectedQuestion = selectedQuestions[0]
    console.log("[v0] チャートデータ生成開始", { selectedQuestion, filteredDataLength: filteredData.length })

    // 選択された質問の回答を集計
    const responseCounts: { [key: string]: number } = {}
    const totalResponses = filteredData.length

    filteredData.forEach((row) => {
      const response = row[selectedQuestion]
      if (response !== undefined && response !== null && response !== "") {
        const responseStr = String(response).trim()
        responseCounts[responseStr] = (responseCounts[responseStr] || 0) + 1
      }
    })

    // チャートデータ形式に変換
    const data = Object.entries(responseCounts)
      .map(([response, count]) => ({
        response,
        count,
        percentage: Math.round((count / totalResponses) * 100),
      }))
      .sort((a, b) => b.count - a.count) // 回答数の多い順にソート

    console.log("[v0] チャートデータ生成完了", { dataLength: data.length, data })
    return data
  }, [selectedQuestions, filteredData])

  const displayedColumns = useMemo(() => {
    if (selectedQuestions.length > 0) {
      // 質問が選択されている場合は、回答者列と選択された質問列のみ表示
      return respondentColumn ? [respondentColumn, ...selectedQuestions] : selectedQuestions
    }
    // 質問が選択されていない場合は全ての列を表示
    return columns
  }, [columns, selectedQuestions, respondentColumn])

  const handleRespondentChange = (respondent: string, checked: boolean) => {
    if (checked) {
      setSelectedRespondents((prev) => [...prev, respondent])
    } else {
      setSelectedRespondents((prev) => prev.filter((r) => r !== respondent))
    }
  }

  const handleQuestionChange = (question: string, checked: boolean) => {
    if (checked) {
      setSelectedQuestions((prev) => [...prev, question])
    } else {
      setSelectedQuestions((prev) => prev.filter((q) => q !== question))
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const headers = displayedColumns.join(",")
    const rows = filteredData.map((row) =>
      displayedColumns
        .map((col) => {
          const value = row[col] || ""
          // CSVエスケープ処理
          return typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))
            ? `"${value.replace(/"/g, '""')}"`
            : value
        })
        .join(","),
    )

    const csvContent = [headers, ...rows].join("\n")
    const BOM = "\uFEFF" // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8" })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `survey-analysis-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveAsImage = async () => {
    if (!contentRef.current) {
      console.log("[v0] contentRef is null")
      alert("保存対象が見つかりません")
      return
    }

    setIsExporting(true)
    try {
      console.log("[v0] Starting image export...")

      // 動的インポート
      const html2canvas = (await import("html2canvas")).default

      // チャートの描画完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: true,
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
      })

      console.log("[v0] Canvas created successfully")

      const link = document.createElement("a")
      link.download = `survey-analysis-${new Date().toISOString().split("T")[0]}.png`
      link.href = canvas.toDataURL("image/png")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log("[v0] Image saved successfully")
    } catch (error) {
      console.error("[v0] 画像保存エラー:", error)
      alert(`画像保存に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSaveChartAsImage = async () => {
    if (!chartRef.current) {
      console.log("[v0] chartRef is null")
      alert("チャートが見つかりません")
      return
    }

    if (selectedQuestions.length === 0 || chartData.length === 0) {
      alert("チャートデータがありません。質問を選択してください。")
      return
    }

    setIsExporting(true)
    try {
      console.log("[v0] Starting chart export...")

      const html2canvas = (await import("html2canvas")).default

      // チャートの描画完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: true,
      })

      console.log("[v0] Chart canvas created successfully")

      const link = document.createElement("a")
      link.download = `chart-${selectedQuestions[0].replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().split("T")[0]}.png`
      link.href = canvas.toDataURL("image/png")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log("[v0] Chart image saved successfully")
    } catch (error) {
      console.error("[v0] チャート保存エラー:", error)
      alert(`チャート保存に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSaveAsPDF = async () => {
    if (!contentRef.current) {
      console.log("[v0] contentRef is null for PDF")
      alert("PDF出力対象が見つかりません")
      return
    }

    setIsExporting(true)
    try {
      console.log("[v0] Starting PDF export...")

      // 動的インポート
      const [html2canvas, jsPDF] = await Promise.all([
        import("html2canvas").then((m) => m.default),
        import("jspdf").then((m) => m.default),
      ])

      // チャートの描画完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const canvas = await html2canvas(contentRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: true,
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
      })

      console.log("[v0] PDF canvas created successfully")

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`survey-analysis-${new Date().toISOString().split("T")[0]}.pdf`)
      console.log("[v0] PDF saved successfully")
    } catch (error) {
      console.error("[v0] PDF保存エラー:", error)
      alert(`PDF保存に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportXLSX = async () => {
    try {
      // 動的インポート
      const XLSX = await import("xlsx")

      // ワークシートデータを準備
      const worksheetData = [
        displayedColumns, // ヘッダー行
        ...filteredData.map((row) => displayedColumns.map((col) => row[col] || "")),
      ]

      // ワークブックとワークシートを作成
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

      // ワークシートをワークブックに追加
      XLSX.utils.book_append_sheet(workbook, worksheet, "Survey Data")

      // ファイルを保存
      XLSX.writeFile(workbook, `survey-analysis-${new Date().toISOString().split("T")[0]}.xlsx`)
    } catch (error) {
      console.error("[v0] XLSX出力エラー:", error)
      alert(`XLSX出力に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`)
    }
  }

  const clearFilters = () => {
    setSelectedRespondents([])
    setSelectedQuestions([])
    setSearchTerm("")
  }

  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"]

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Controls */}
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              フィルターと検索
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium mb-3 block">回答者フィルター（複数選択可）</label>
                {respondentColumn ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {respondents.map((respondent) => (
                      <div key={respondent} className="flex items-center space-x-2">
                        <Checkbox
                          id={`respondent-${respondent}`}
                          checked={selectedRespondents.includes(respondent)}
                          onCheckedChange={(checked) => handleRespondentChange(respondent, checked as boolean)}
                        />
                        <Label htmlFor={`respondent-${respondent}`} className="text-sm cursor-pointer">
                          {respondent}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">回答者カラムが見つかりません</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">質問選択（複数選択可）</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {questions.map((question) => (
                    <div key={question} className="flex items-center space-x-2">
                      <Checkbox
                        id={`question-${question}`}
                        checked={selectedQuestions.includes(question)}
                        onCheckedChange={(checked) => handleQuestionChange(question, checked as boolean)}
                      />
                      <Label htmlFor={`question-${question}`} className="text-sm cursor-pointer">
                        {question}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">検索</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="データを検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button variant="outline" onClick={clearFilters} className="gap-2 bg-transparent w-full">
                  <X className="h-4 w-4" />
                  フィルタークリア
                </Button>
              </div>
            </div>

            {/* Active Filters */}
            {(selectedRespondents.length > 0 || selectedQuestions.length > 0 || searchTerm) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedRespondents.map((respondent) => (
                  <Badge key={respondent} variant="secondary">
                    回答者: {respondent}
                  </Badge>
                ))}
                {selectedQuestions.map((question) => (
                  <Badge key={question} variant="secondary">
                    質問: {question}
                  </Badge>
                ))}
                {searchTerm && <Badge variant="secondary">検索: {searchTerm}</Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export and Print Buttons */}
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              エクスポート・印刷
            </CardTitle>
            <CardDescription>
              フィルター適用後のデータ（{filteredData.length}件）をエクスポートまたは印刷できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleExportXLSX}
                variant="outline"
                className="gap-2 bg-transparent"
                disabled={filteredData.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" />
                XLSX出力
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="gap-2 bg-transparent"
                disabled={filteredData.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV出力
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                className="gap-2 bg-transparent"
                disabled={filteredData.length === 0}
              >
                <Printer className="h-4 w-4" />
                印刷
              </Button>
            </div>
          </CardContent>
        </Card>

        <div ref={contentRef} className="print-content space-y-6">
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold mb-2">SurveyAnalysis 分析レポート</h1>
            <p className="text-sm text-muted-foreground">生成日時: {new Date().toLocaleString("ja-JP")}</p>
            {(selectedRespondents.length > 0 || selectedQuestions.length > 0 || searchTerm) && (
              <div className="mt-2">
                <p className="text-sm font-medium">適用フィルター:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedRespondents.map((respondent) => (
                    <span key={respondent} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      回答者: {respondent}
                    </span>
                  ))}
                  {selectedQuestions.map((question) => (
                    <span key={question} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      質問: {question}
                    </span>
                  ))}
                  {searchTerm && <span className="text-xs bg-gray-100 px-2 py-1 rounded">検索: {searchTerm}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Data Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">総回答数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{filteredData.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">質問数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{questions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">回答者数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{respondents.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList className="no-print">
              <TabsTrigger value="table">データテーブル</TabsTrigger>
              <TabsTrigger value="charts">グラフ分析</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <Card>
                <CardHeader>
                  <CardTitle>アンケートデータ</CardTitle>
                  <CardDescription>
                    フィルター適用後: {filteredData.length}件のデータを表示
                    {selectedRespondents.length > 0 && ` (回答者: ${selectedRespondents.join(", ")})`}
                    {selectedQuestions.length > 0 && ` (質問: ${selectedQuestions.join(", ")})`}
                    {searchTerm && ` (検索: "${searchTerm}")`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>フィルター条件に一致するデータがありません。</p>
                      <p className="text-sm mt-2">フィルターを変更するか、クリアボタンを押してください。</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {displayedColumns.map((column) => (
                              <TableHead key={column} className="min-w-[150px]">
                                {column}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((row, index) => (
                            <TableRow
                              key={`${index}-${selectedRespondents.join(",")}-${searchTerm}-${selectedQuestions.join(",")}`}
                            >
                              {displayedColumns.map((column) => (
                                <TableCell key={column}>{row[column] || "-"}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="charts">
              {selectedQuestions.length > 0 && chartData.length > 0 ? (
                <div ref={chartRef} className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>棒グラフ - {selectedQuestions[0]}</CardTitle>
                      <CardDescription>回答数: {chartData.reduce((sum, item) => sum + item.count, 0)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="response" angle={-45} textAnchor="end" height={80} interval={0} />
                          <YAxis />
                          <Tooltip
                            formatter={(value, name) => [value, "回答数"]}
                            labelFormatter={(label) => `回答: ${label}`}
                          />
                          <Bar dataKey="count" fill="#1e3a8a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>円グラフ - {selectedQuestions[0]}</CardTitle>
                      <CardDescription>割合表示</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ response, percentage }) => `${response} (${percentage}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, "回答数"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>統計情報 - {selectedQuestions[0]}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>回答</TableHead>
                            <TableHead>回答数</TableHead>
                            <TableHead>割合</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chartData.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.response}</TableCell>
                              <TableCell>{item.count}</TableCell>
                              <TableCell>{item.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">
                      グラフを表示するには、上記のフィルターから質問を選択してください
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
