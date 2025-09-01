"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, BarChart3, Filter, Download } from "lucide-react"
import FileUpload from "@/components/file-upload"
import DataVisualization from "@/components/data-visualization"

export default function SurveyAnalysisPage() {
  const [surveyData, setSurveyData] = useState<any[]>([])
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  const handleDataLoad = (data: any[]) => {
    setSurveyData(data)
    setIsDataLoaded(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">SurveyAnalysis</h1>
              <p className="text-muted-foreground">アンケート結果の可視化・分析プラットフォーム</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!isDataLoaded ? (
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <Card className="mb-8">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">アンケートデータをアップロード</CardTitle>
                <CardDescription className="text-lg">
                  ExcelファイルまたはCSVファイルをドラッグアンドドロップして、
                  <br />
                  多様な可視化と分析を開始しましょう
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onDataLoad={handleDataLoad} />
              </CardContent>
            </Card>

            {/* Features Section */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <FileSpreadsheet className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>データインポート</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">ExcelやCSVファイルを簡単にドラッグアンドドロップでインポート</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Filter className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>高度なフィルター</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">回答者別、質問別の詳細なフィルタリング機能</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Download className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>エクスポート機能</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">表やグラフを印刷または画像として保存</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <DataVisualization data={surveyData} />
        )}
      </main>
    </div>
  )
}
