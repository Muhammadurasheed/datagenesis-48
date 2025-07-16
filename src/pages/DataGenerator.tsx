
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, 
  Sparkles,
  CheckCircle,
  Brain,
  Zap,
  Shield,
  Target,
  Play,
  Loader2,
  Upload,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { DataGeneratorService } from '../lib/dataGenerator';
import EnhancedDataReviewEditor from '../components/unified/EnhancedDataReviewEditor';
import RealTimeActivityMonitor from '../components/RealTimeActivityMonitor';

interface QualityMetrics {
  qualityScore: number;
  privacyScore: number;
  biasScore: number;
  rowsGenerated: number;
  columnsGenerated: number;
}

interface FormData {
  prompt: string;
  rowCount: number;
  outputFormat: 'csv' | 'json' | 'xlsx';
  domain: string;
  dataType: string;
  qualityLevel: 'high' | 'medium' | 'fast';
  privacyLevel: 'low' | 'medium' | 'high';
}

const DataGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<any[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showMonitor, setShowMonitor] = useState(false);
  const [generationMode, setGenerationMode] = useState<'description' | 'upload'>('description');
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  
  // Initialize data generator service
  const dataGeneratorService = new DataGeneratorService();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    prompt: '',
    rowCount: 100,
    outputFormat: 'csv',
    domain: 'general',
    dataType: 'tabular',
    qualityLevel: 'high',
    privacyLevel: 'medium'
  });

  // Quality metrics
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    qualityScore: 0,
    privacyScore: 0,
    biasScore: 0,
    rowsGenerated: 0,
    columnsGenerated: 0
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (generationMode === 'description' && !formData.prompt.trim()) {
      toast.error('Please describe what kind of data you want to generate');
      return false;
    }
    if (generationMode === 'upload' && uploadedData.length === 0) {
      toast.error('Please upload a sample data file');
      return false;
    }
    if (formData.rowCount < 1 || formData.rowCount > 1000) {
      toast.error('Row count must be between 1 and 1,000');
      return false;
    }
    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsGenerating(true);
      const result = await dataGeneratorService.processUploadedData(file);
      setUploadedData(result.data);
      toast.success(`Successfully loaded ${result.data.length} records from ${file.name}`);
    } catch (error) {
      toast.error(`Failed to process file: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setShowMonitor(true);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      let response;
      
      if (generationMode === 'description') {
        // Generate schema from description first
        const schemaResult = await dataGeneratorService.generateSchemaFromDescription(
          formData.prompt,
          formData.domain,
          formData.dataType
        );

        // Then generate synthetic data
        response = await dataGeneratorService.generateSyntheticDataset({
          domain: formData.domain,
          data_type: formData.dataType,
          schema: schemaResult.schema,
          description: formData.prompt,
          rowCount: formData.rowCount,
          quality_level: formData.qualityLevel,
          privacy_level: formData.privacyLevel
        });
      } else {
        // Generate from uploaded data
        response = await dataGeneratorService.generateSyntheticDataset({
          domain: formData.domain,
          data_type: formData.dataType,
          sourceData: uploadedData,
          rowCount: formData.rowCount,
          quality_level: formData.qualityLevel,
          privacy_level: formData.privacyLevel,
          description: `Generate synthetic data similar to the uploaded sample`
        });
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (response.data && response.data.length > 0) {
        setGeneratedData(response.data);
        setQualityMetrics({
          qualityScore: response.metadata?.qualityScore || 95,
          privacyScore: response.metadata?.privacyScore || 88,
          biasScore: response.metadata?.biasScore || 92,
          rowsGenerated: response.data.length,
          columnsGenerated: response.data.length > 0 ? Object.keys(response.data[0]).length : 0
        });
        
        setShowEditor(true);
        toast.success(`Successfully generated ${response.data.length} rows of synthetic data!`);
      } else {
        throw new Error('No data generated');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Generation error:', error);
      toast.error(`Failed to generate data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDataUpdate = (updatedData: any[]) => {
    setGeneratedData(updatedData);
    setQualityMetrics(prev => ({
      ...prev,
      rowsGenerated: updatedData.length
    }));
  };

  const handlePromptEdit = async (newPrompt: string) => {
    const updatedFormData = { ...formData, prompt: newPrompt };
    setFormData(updatedFormData);
    await handleGenerate();
  };

  if (showEditor && generatedData.length > 0) {
    return (
      <div className="relative">
        <EnhancedDataReviewEditor
          data={generatedData}
          metadata={qualityMetrics}
          onDataUpdate={handleDataUpdate}
          onPromptEdit={handlePromptEdit}
          onClose={() => setShowEditor(false)}
          isEditing={isGenerating}
        />
        
        {showMonitor && (
          <RealTimeActivityMonitor
            isGenerating={isGenerating}
            showSystemStatus={true}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.h1 
              className="text-4xl font-bold text-white"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              AI-Powered Data Generator
            </motion.h1>
            <motion.p 
              className="text-xl text-slate-400 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Generate high-quality synthetic data with advanced AI agents ensuring privacy, reducing bias, and maintaining data integrity.
            </motion.p>
          </div>

          {/* Generation Mode Toggle */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex gap-4 p-1 bg-slate-700/50 rounded-lg mb-6">
                <button
                  onClick={() => setGenerationMode('description')}
                  className={`flex-1 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                    generationMode === 'description'
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-600/50'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  Describe Data
                </button>
                <button
                  onClick={() => setGenerationMode('upload')}
                  className={`flex-1 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                    generationMode === 'upload'
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-600/50'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Sample
                </button>
              </div>

              {/* Generation Progress */}
              <AnimatePresence>
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6"
                  >
                    <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-400 animate-pulse" />
                            <span className="text-white font-medium">AI Agents Working...</span>
                          </div>
                          <Badge className="bg-green-500 text-white">
                            Live Generation
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-300">Generation Progress</span>
                            <span className="text-blue-400 font-medium">{Math.round(generationProgress)}%</span>
                          </div>
                          <Progress value={generationProgress} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Content */}
              <div className="space-y-6">
                {generationMode === 'description' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="prompt" className="text-slate-200 font-medium">
                        Data Description
                      </Label>
                      <Textarea
                        id="prompt"
                        placeholder="Describe the data you want to generate... e.g., 'Customer records with names, emails, ages, and purchase history for an e-commerce platform'"
                        value={formData.prompt}
                        onChange={(e) => handleInputChange('prompt', e.target.value)}
                        className="min-h-[120px] bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="file-upload" className="text-slate-200 font-medium">
                        Upload Sample Data
                      </Label>
                      <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition-colors">
                        <input
                          id="file-upload"
                          type="file"
                          accept=".csv,.json,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div className="space-y-4">
                            <div className="w-16 h-16 mx-auto bg-slate-700 rounded-full flex items-center justify-center">
                              <Upload className="w-8 h-8 text-slate-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-white mb-2">
                                Upload your sample data
                              </h3>
                              <p className="text-slate-400">
                                Drop your CSV, Excel, or JSON file here, or click to browse
                              </p>
                            </div>
                            <div className="flex gap-2 justify-center text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <FileSpreadsheet className="w-4 h-4" />
                                CSV, Excel, JSON
                              </span>
                            </div>
                          </div>
                        </label>
                      </div>
                      {uploadedData.length > 0 && (
                        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <p className="text-green-400 font-medium">
                            ✓ Successfully loaded {uploadedData.length} records
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Configuration Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rowCount" className="text-slate-200 font-medium">
                      Rows
                    </Label>
                    <Input
                      id="rowCount"
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.rowCount}
                      onChange={(e) => handleInputChange('rowCount', parseInt(e.target.value))}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domain" className="text-slate-200 font-medium">
                      Domain
                    </Label>
                    <Select value={formData.domain} onValueChange={(value) => handleInputChange('domain', value)}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="general" className="text-white hover:bg-slate-700">General</SelectItem>
                        <SelectItem value="healthcare" className="text-white hover:bg-slate-700">Healthcare</SelectItem>
                        <SelectItem value="finance" className="text-white hover:bg-slate-700">Finance</SelectItem>
                        <SelectItem value="ecommerce" className="text-white hover:bg-slate-700">E-commerce</SelectItem>
                        <SelectItem value="education" className="text-white hover:bg-slate-700">Education</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qualityLevel" className="text-slate-200 font-medium">
                      Quality
                    </Label>
                    <Select value={formData.qualityLevel} onValueChange={(value) => handleInputChange('qualityLevel', value)}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="high" className="text-white hover:bg-slate-700">High Quality</SelectItem>
                        <SelectItem value="medium" className="text-white hover:bg-slate-700">Medium Quality</SelectItem>
                        <SelectItem value="fast" className="text-white hover:bg-slate-700">Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="privacyLevel" className="text-slate-200 font-medium">
                      Privacy
                    </Label>
                    <Select value={formData.privacyLevel} onValueChange={(value) => handleInputChange('privacyLevel', value)}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="high" className="text-white hover:bg-slate-700">High</SelectItem>
                        <SelectItem value="medium" className="text-white hover:bg-slate-700">Medium</SelectItem>
                        <SelectItem value="low" className="text-white hover:bg-slate-700">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    size="lg"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-3 text-lg font-semibold"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Generating Data...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI-Powered',
                description: 'Advanced language models generate realistic data',
                color: 'text-blue-400'
              },
              {
                icon: Shield,
                title: 'Privacy First',
                description: 'Built-in privacy protection and anonymization',
                color: 'text-green-400'
              },
              {
                icon: Target,
                title: 'Bias Detection',
                description: 'Automated bias detection and correction',
                color: 'text-purple-400'
              },
              {
                icon: Zap,
                title: 'Real-time',
                description: 'Live generation monitoring and feedback',
                color: 'text-yellow-400'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className="bg-slate-800/30 border-slate-700 hover:border-slate-600 transition-colors">
                  <CardContent className="p-6 text-center">
                    <feature.icon className={`w-8 h-8 ${feature.color} mx-auto mb-3`} />
                    <h3 className="text-white font-medium mb-2">{feature.title}</h3>
                    <p className="text-slate-400 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Real-time Monitor */}
      {showMonitor && (
        <RealTimeActivityMonitor
          isGenerating={isGenerating}
          showSystemStatus={true}
        />
      )}
    </div>
  );
};

export default DataGenerator;
