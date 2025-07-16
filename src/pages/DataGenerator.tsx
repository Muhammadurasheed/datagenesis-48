import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, 
  Database, 
  Users, 
  FileText, 
  AlertCircle,
  Shield,
  Target,
  Sparkles,
  Download,
  Eye,
  Settings,
  Brain,
  Zap,
  CheckCircle
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
import { ApiService } from '../lib/api';
import EnhancedDataReviewEditor from '../components/EnhancedDataReviewEditor';
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
  includeHeaders: boolean;
  privacyLevel: 'low' | 'medium' | 'high';
  biasReduction: boolean;
  qualityChecks: boolean;
  aiModel: string;
}

const DataGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<any[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showMonitor, setShowMonitor] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    prompt: '',
    rowCount: 100,
    outputFormat: 'csv',
    includeHeaders: true,
    privacyLevel: 'medium',
    biasReduction: true,
    qualityChecks: true,
    aiModel: 'gemini-2.0-flash-exp'
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
    if (!formData.prompt.trim()) {
      toast.error('Please describe what kind of data you want to generate');
      return false;
    }
    if (formData.rowCount < 1 || formData.rowCount > 10000) {
      toast.error('Row count must be between 1 and 10,000');
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setShowMonitor(true);
    
    try {
      const response = await ApiService.generateData({
        prompt: formData.prompt,
        rowCount: formData.rowCount,
        outputFormat: formData.outputFormat,
        includeHeaders: formData.includeHeaders,
        privacyLevel: formData.privacyLevel,
        biasReduction: formData.biasReduction,
        qualityChecks: formData.qualityChecks,
        aiModel: formData.aiModel
      });

      if (response.success && response.data) {
        setGeneratedData(response.data);
        setQualityMetrics({
          qualityScore: response.metadata?.qualityScore || 95,
          privacyScore: response.metadata?.privacyScore || 88,
          biasScore: response.metadata?.biasScore || 92,
          rowsGenerated: response.data.length,
          columnsGenerated: response.data.length > 0 ? Object.keys(response.data[0]).length : 0
        });
        
        setGenerationProgress(100);
        setShowEditor(true);
        toast.success(`Successfully generated ${response.data.length} rows of synthetic data!`);
      } else {
        throw new Error(response.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate data. Please try again.');
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
            position="fixed"
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

          {/* Generation Progress */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-blue-400 animate-pulse" />
                        <span className="text-white font-medium">AI Agents Working...</span>
                      </div>
                      <Badge className="bg-green-500 text-white">
                        Live Generation
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Generation Progress</span>
                        <span className="text-blue-400 font-medium">{generationProgress}%</span>
                      </div>
                      <Progress value={generationProgress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Form */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Wand2 className="w-5 h-5 text-purple-400" />
                Data Generation Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                  <TabsTrigger value="basic" className="text-slate-300 data-[state=active]:text-white">Basic</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-slate-300 data-[state=active]:text-white">Advanced</TabsTrigger>
                  <TabsTrigger value="quality" className="text-slate-300 data-[state=active]:text-white">Quality</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-6 mt-6">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="rowCount" className="text-slate-200 font-medium">
                        Number of Rows
                      </Label>
                      <Input
                        id="rowCount"
                        type="number"
                        min="1"
                        max="10000"
                        value={formData.rowCount}
                        onChange={(e) => handleInputChange('rowCount', parseInt(e.target.value))}
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="outputFormat" className="text-slate-200 font-medium">
                        Output Format
                      </Label>
                      <Select value={formData.outputFormat} onValueChange={(value) => handleInputChange('outputFormat', value)}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="csv" className="text-white hover:bg-slate-700">CSV</SelectItem>
                          <SelectItem value="json" className="text-white hover:bg-slate-700">JSON</SelectItem>
                          <SelectItem value="xlsx" className="text-white hover:bg-slate-700">Excel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="aiModel" className="text-slate-200 font-medium">
                        AI Model
                      </Label>
                      <Select value={formData.aiModel} onValueChange={(value) => handleInputChange('aiModel', value)}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="gemini-2.0-flash-exp" className="text-white hover:bg-slate-700">Gemini 2.0 Flash (Experimental)</SelectItem>
                          <SelectItem value="gemini-1.5-pro" className="text-white hover:bg-slate-700">Gemini 1.5 Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="privacyLevel" className="text-slate-200 font-medium">
                        Privacy Level
                      </Label>
                      <Select value={formData.privacyLevel} onValueChange={(value) => handleInputChange('privacyLevel', value)}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="low" className="text-white hover:bg-slate-700">Low</SelectItem>
                          <SelectItem value="medium" className="text-white hover:bg-slate-700">Medium</SelectItem>
                          <SelectItem value="high" className="text-white hover:bg-slate-700">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="quality" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-slate-700/30 border-slate-600">
                      <CardContent className="p-4 text-center">
                        <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <h3 className="text-white font-medium mb-2">Privacy Protection</h3>
                        <p className="text-slate-400 text-sm">Advanced anonymization and synthetic data techniques</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-700/30 border-slate-600">
                      <CardContent className="p-4 text-center">
                        <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                        <h3 className="text-white font-medium mb-2">Bias Reduction</h3>
                        <p className="text-slate-400 text-sm">AI agents actively detect and reduce data bias</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-700/30 border-slate-600">
                      <CardContent className="p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <h3 className="text-white font-medium mb-2">Quality Assurance</h3>
                        <p className="text-slate-400 text-sm">Multi-layer validation and quality checks</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-center pt-6">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 text-lg"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
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
          position="fixed"
          showSystemStatus={true}
        />
      )}
    </div>
  );
};

export default DataGenerator;
