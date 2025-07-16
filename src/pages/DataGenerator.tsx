import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { useWebSocket } from '../hooks/useWebSocket';
import { ApiService } from '../lib/api';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import EnhancedDataReviewEditor from '../components/unified/EnhancedDataReviewEditor';
import EnhancedRealTimeMonitor from '../components/unified/EnhancedRealTimeMonitor';

interface GenerationFormProps {
  prompt: string;
  rowCount: number;
  isGenerating: boolean;
  onPromptChange: (prompt: string) => void;
  onRowCountChange: (rowCount: number) => void;
  onSubmit: () => void;
}

const GenerationForm: React.FC<GenerationFormProps> = ({
  prompt,
  rowCount,
  isGenerating,
  onPromptChange,
  onRowCountChange,
  onSubmit
}) => {
  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">Generate Synthetic Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="prompt" className="text-slate-300">
              Data Generation Prompt
            </Label>
            <Input
              id="prompt"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="e.g., 'Generate 100 customer records with realistic names, emails, and purchase history'"
            />
          </div>
          <div>
            <Label htmlFor="rowCount" className="text-slate-300">
              Number of Rows
            </Label>
            <Input
              id="rowCount"
              type="number"
              value={rowCount}
              onChange={(e) => onRowCountChange(Number(e.target.value))}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="e.g., 100"
            />
          </div>
        </div>
        <Button onClick={onSubmit} disabled={isGenerating} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
          {isGenerating ? 'Generating...' : 'Generate Data'}
        </Button>
      </CardContent>
    </Card>
  );
};

const ConnectionStatus = () => {
  const { isConnected } = useWebSocket('guest_user');

  return (
    <div className="fixed top-4 left-4 z-50">
      <Badge variant={isConnected ? "default" : "destructive"}>
        {isConnected ? "Connected" : "Disconnected"}
      </Badge>
    </div>
  );
};

const Header = () => {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-white">Synthetic Data Generator</h1>
      <p className="text-slate-400">Generate realistic synthetic data with AI</p>
    </div>
  );
};

const DataGenerator = () => {
  const [prompt, setPrompt] = useState('Generate 100 customer records with realistic names, emails, and purchase history');
  const [rowCount, setRowCount] = useState(100);
  const [generatedData, setGeneratedData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReviewEditor, setShowReviewEditor] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const response = await ApiService.generateData({
        prompt: prompt,
        rowCount: rowCount
      });

      if (response && response.data) {
        setGeneratedData(response.data);
        toast.success('Data generated successfully!');
      } else {
        toast.error('Failed to generate data.');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error?.message || 'An unexpected error occurred.');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(100);
    }
  };

  const downloadData = (format: 'csv' | 'json') => {
    if (!generatedData.length) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    if (format === 'csv') {
      csvContent += Papa.unparse(generatedData);
    } else if (format === 'json') {
      csvContent = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(generatedData, null, 2));
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `generated_data.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,119,198,0.1),transparent_50%)]" />
      
      {/* Content wrapper */}
      <div className="relative z-10">
        <ConnectionStatus />
        
        <div className="container mx-auto px-4 py-8">
          <Header />
          
          <div className="max-w-4xl mx-auto space-y-8">
            <GenerationForm
              prompt={prompt}
              rowCount={rowCount}
              isGenerating={isGenerating}
              onPromptChange={setPrompt}
              onRowCountChange={setRowCount}
              onSubmit={handleGenerate}
            />
            
            {/* Generation Status */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <h3 className="text-lg font-semibold text-white">
                      Generating Your Synthetic Data...
                    </h3>
                  </div>
                  
                  {generationProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-slate-400">
                        <span>Progress</span>
                        <span>{generationProgress}%</span>
                      </div>
                      <Progress value={generationProgress} className="h-2" />
                    </div>
                  )}
                  
                  <p className="text-slate-400 text-sm mt-3">
                    Our AI agents are working together to create high-quality, privacy-compliant synthetic data...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generated Data Display */}
            <AnimatePresence>
              {generatedData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white">Generated Data Results</CardTitle>
                        <Badge variant="outline" className="border-green-500/30 text-green-400">
                          {generatedData.length} rows generated
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 rounded-lg bg-slate-700/30">
                            <div className="text-xl font-bold text-white">{generatedData.length}</div>
                            <div className="text-xs text-slate-400">Records</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-slate-700/30">
                            <div className="text-xl font-bold text-white">
                              {generatedData.length > 0 ? Object.keys(generatedData[0]).length : 0}
                            </div>
                            <div className="text-xs text-slate-400">Columns</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-slate-700/30">
                            <div className="text-xl font-bold text-green-400">95%</div>
                            <div className="text-xs text-slate-400">Quality</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-slate-700/30">
                            <div className="text-xl font-bold text-blue-400">100%</div>
                            <div className="text-xs text-slate-400">Privacy</div>
                          </div>
                        </div>

                        {/* Preview Table */}
                        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                          <ScrollArea className="h-64">
                            <table className="w-full">
                              <thead className="bg-slate-700/50 sticky top-0">
                                <tr>
                                  {generatedData.length > 0 && Object.keys(generatedData[0]).map((key) => (
                                    <th key={key} className="px-4 py-3 text-left text-sm font-medium text-slate-300 capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {generatedData.slice(0, 10).map((row, index) => (
                                  <tr key={index} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                                    {Object.values(row).map((value, cellIndex) => (
                                      <td key={cellIndex} className="px-4 py-3 text-sm text-slate-200">
                                        {String(value).length > 30 
                                          ? `${String(value).substring(0, 30)}...` 
                                          : String(value)
                                        }
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                          {generatedData.length > 10 && (
                            <div className="p-3 bg-slate-700/30 text-center text-sm text-slate-400">
                              Showing first 10 rows of {generatedData.length} total records
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button
                            onClick={() => setShowReviewEditor(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Review & Edit
                          </Button>
                          
                          <Button
                            onClick={() => downloadData('csv')}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download CSV
                          </Button>
                          
                          <Button
                            onClick={() => downloadData('json')}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download JSON
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Enhanced Data Review Editor */}
        <AnimatePresence>
          {showReviewEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="absolute inset-4 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
              >
                <EnhancedDataReviewEditor
                  data={generatedData}
                  metadata={{
                    qualityScore: 95,
                    privacyScore: 100,
                    biasScore: 15,
                    rowsGenerated: generatedData.length,
                    columnsGenerated: generatedData.length > 0 ? Object.keys(generatedData[0]).length : 0
                  }}
                  onDataUpdate={(updatedData) => {
                    setGeneratedData(updatedData);
                  }}
                  onPromptEdit={(newPrompt) => {
                    setPrompt(prev => `${prev}\n\nAdditional modifications: ${newPrompt}`);
                    setShowReviewEditor(false);
                    handleGenerate();
                  }}
                  onClose={() => setShowReviewEditor(false)}
                  isEditing={isGenerating}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Real-time Monitor */}
        <EnhancedRealTimeMonitor 
          isGenerating={isGenerating}
          position="fixed"
          defaultPosition={{ x: 20, y: 20 }}
        />
      </div>
    </div>
  );
};

export default DataGenerator;
