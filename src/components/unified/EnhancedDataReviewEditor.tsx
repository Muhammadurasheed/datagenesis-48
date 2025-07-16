import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, 
  X, 
  Plus, 
  Trash2, 
  RotateCcw,
  Sparkles,
  MessageSquare,
  Wand2,
  Download,
  FileText,
  Database,
  FileSpreadsheet,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface EnhancedDataReviewEditorProps {
  data: any[];
  metadata?: {
    qualityScore?: number;
    privacyScore?: number;
    biasScore?: number;
    rowsGenerated?: number;
    columnsGenerated?: number;
  };
  onDataUpdate: (updatedData: any[]) => void;
  onPromptEdit: (prompt: string) => void;
  onClose?: () => void;
  isEditing?: boolean;
}

const EnhancedDataReviewEditor: React.FC<EnhancedDataReviewEditorProps> = ({
  data,
  metadata,
  onDataUpdate,
  onPromptEdit,
  onClose,
  isEditing = false
}) => {
  const [editMode, setEditMode] = useState<'manual' | 'prompt' | null>(null);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [promptText, setPromptText] = useState('');
  const [localData, setLocalData] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showMetadata, setShowMetadata] = useState(true);

  // Update local data when prop changes
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    let filtered = localData.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [localData, searchTerm, sortConfig]);

  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const handleCellEdit = (rowIndex: number, colKey: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: colKey });
    setEditValue(String(currentValue));
  };

  const handleCellSave = () => {
    if (editingCell) {
      const updatedData = [...localData];
      const actualRowIndex = (currentPage - 1) * itemsPerPage + editingCell.row;
      updatedData[actualRowIndex][editingCell.col] = editValue;
      
      setLocalData(updatedData);
      onDataUpdate(updatedData);
      
      setEditingCell(null);
      setEditValue('');
      toast.success('Cell updated successfully');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleRowDelete = (displayRowIndex: number) => {
    const actualRowIndex = (currentPage - 1) * itemsPerPage + displayRowIndex;
    const updatedData = localData.filter((_, index) => index !== actualRowIndex);
    setLocalData(updatedData);
    onDataUpdate(updatedData);
    toast.success('Row deleted successfully');
  };

  const handleBulkDelete = () => {
    if (selectedRows.size === 0) return;
    
    const rowIndices = Array.from(selectedRows).map(displayIndex => 
      (currentPage - 1) * itemsPerPage + displayIndex
    );
    
    const updatedData = localData.filter((_, index) => !rowIndices.includes(index));
    setLocalData(updatedData);
    onDataUpdate(updatedData);
    setSelectedRows(new Set());
    toast.success(`${selectedRows.size} rows deleted successfully`);
  };

  const handleAddRow = () => {
    if (localData.length === 0) return;
    
    const newRow = Object.keys(localData[0]).reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {} as any);
    
    const updatedData = [...localData, newRow];
    setLocalData(updatedData);
    onDataUpdate(updatedData);
    toast.success('New row added');
  };

  const handlePromptSubmit = () => {
    if (promptText.trim()) {
      onPromptEdit(promptText);
      setPromptText('');
      setEditMode(null);
      toast.success('Regenerating data with your changes...');
    }
  };

  const resetData = () => {
    setLocalData(data);
    onDataUpdate(data);
    setSelectedRows(new Set());
    toast.success('Data reset to original');
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleSelectRow = (rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: paginatedData.length }, (_, i) => i)));
    }
  };

  const downloadData = (format: 'csv' | 'json' | 'excel') => {
    if (!localData.length) return;

    let blob: Blob;
    let filename: string;

    try {
      switch (format) {
        case 'csv':
          const csv = Papa.unparse(localData);
          blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          filename = `reviewed_data_${Date.now()}.csv`;
          break;
        case 'json':
          blob = new Blob([JSON.stringify(localData, null, 2)], { type: 'application/json' });
          filename = `reviewed_data_${Date.now()}.json`;
          break;
        case 'excel':
          const ws = XLSX.utils.json_to_sheet(localData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Reviewed Data');
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          filename = `reviewed_data_${Date.now()}.xlsx`;
          break;
        default:
          return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  if (localData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">No data available for review</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const columns = Object.keys(localData[0] || {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
              Data Review & Editor
            </h1>
            <p className="text-slate-400 mt-2">Review, edit, and refine your synthetic data before downloading</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
              className="border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-white"
            >
              {showMetadata ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showMetadata ? 'Hide' : 'Show'} Metrics
            </Button>
            
            {onClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Quality Metrics Dashboard */}
        <AnimatePresence>
          {showMetadata && metadata && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Data Quality Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {metadata.qualityScore !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-300">Quality Score</span>
                          <span className="text-lg font-bold text-emerald-400">{metadata.qualityScore}%</span>
                        </div>
                        <Progress value={metadata.qualityScore} className="h-2" />
                      </div>
                    )}
                    {metadata.privacyScore !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-300">Privacy Score</span>
                          <span className="text-lg font-bold text-blue-400">{metadata.privacyScore}%</span>
                        </div>
                        <Progress value={metadata.privacyScore} className="h-2" />
                      </div>
                    )}
                    {metadata.biasScore !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-300">Bias Score</span>
                          <span className="text-lg font-bold text-purple-400">{metadata.biasScore}%</span>
                        </div>
                        <Progress value={metadata.biasScore} className="h-2" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300">Total Rows</span>
                        <span className="text-lg font-bold text-yellow-400">{localData.length}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full">
                        <div className="h-full bg-yellow-400 rounded-full w-full"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300">Columns</span>
                        <span className="text-lg font-bold text-cyan-400">{columns.length}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full">
                        <div className="h-full bg-cyan-400 rounded-full w-full"></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant={editMode === 'manual' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode(editMode === 'manual' ? null : 'manual')}
                  className={editMode === 'manual' 
                    ? "bg-blue-500 hover:bg-blue-600 text-white" 
                    : "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                  }
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Manual Edit
                </Button>
                
                <Button
                  variant={editMode === 'prompt' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode(editMode === 'prompt' ? null : 'prompt')}
                  className={editMode === 'prompt' 
                    ? "bg-purple-500 hover:bg-purple-600 text-white" 
                    : "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400"
                  }
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  AI Edit
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetData}
                  className="border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>

                {selectedRows.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {selectedRows.size} rows
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <Input
                    placeholder="Search data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Prompt Editor */}
        <AnimatePresence>
          {editMode === 'prompt' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Wand2 className="w-5 h-5 text-purple-400" />
                    AI-Powered Data Editing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Describe how you'd like to modify the data... e.g., 'Make the ages more diverse', 'Add more variety to the names', 'Increase salary ranges', 'Fix inconsistent date formats'"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-[120px] resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handlePromptSubmit}
                      disabled={!promptText.trim() || isEditing}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      {isEditing ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Apply AI Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(null)}
                      className="border-slate-600 bg-slate-700/50 hover:bg-slate-600/50 text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Table */}
        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-white text-xl">
                Data Table ({filteredAndSortedData.length} rows)
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Rows per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20 bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {editMode === 'manual' && (
                <Button
                  size="sm"
                  onClick={handleAddRow}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
              )}
              
              <div className="flex gap-1">
                {[
                  { format: 'csv' as const, icon: FileText, label: 'CSV' },
                  { format: 'json' as const, icon: Database, label: 'JSON' },
                  { format: 'excel' as const, icon: FileSpreadsheet, label: 'Excel' }
                ].map(({ format, icon: Icon }) => (
                  <Button
                    key={format}
                    variant={selectedFormat === format ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFormat(format)}
                    className={selectedFormat === format 
                      ? "bg-purple-500 hover:bg-purple-600 text-white" 
                      : "border-slate-600 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300"
                    }
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                ))}
                <Button
                  onClick={() => downloadData(selectedFormat)}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white ml-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                    <tr>
                      {editMode === 'manual' && (
                        <th className="px-4 py-4 text-left text-sm font-medium text-slate-300 w-16">
                          <input
                            type="checkbox"
                            checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                          />
                        </th>
                      )}
                      {editMode === 'manual' && (
                        <th className="px-4 py-4 text-left text-sm font-medium text-slate-300 w-20">
                          Actions
                        </th>
                      )}
                      {columns.map((key) => (
                        <th 
                          key={key} 
                          className="px-4 py-4 text-left text-sm font-medium text-slate-300 cursor-pointer hover:bg-slate-600/50 transition-colors"
                          onClick={() => handleSort(key)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{key}</span>
                            {sortConfig?.key === key && (
                              <span className="text-purple-400">
                                {sortConfig.direction === 'asc' 
                                  ? <ArrowUp className="w-3 h-3" />
                                  : <ArrowDown className="w-3 h-3" />
                                }
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        {editMode === 'manual' && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(rowIndex)}
                              onChange={() => handleSelectRow(rowIndex)}
                              className="rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                            />
                          </td>
                        )}
                        {editMode === 'manual' && (
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRowDelete(rowIndex)}
                              className="h-7 w-7 p-0 bg-red-500/20 hover:bg-red-500/30 border-red-500/30"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </Button>
                          </td>
                        )}
                        {columns.map((key) => (
                          <td key={key} className="px-4 py-3">
                            {editMode === 'manual' && editingCell?.row === rowIndex && editingCell?.col === key ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-8 text-sm bg-slate-700 border-slate-600 text-white"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellSave();
                                    if (e.key === 'Escape') handleCellCancel();
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={handleCellSave}
                                  className="h-6 w-6 p-0 bg-emerald-500 hover:bg-emerald-600"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCellCancel}
                                  className="h-6 w-6 p-0 border-slate-600 hover:bg-slate-700"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                className={`text-sm text-slate-300 font-medium ${
                                  editMode === 'manual' ? 'cursor-pointer hover:bg-slate-600/30 px-2 py-1 rounded transition-colors' : ''
                                }`}
                                onClick={() => editMode === 'manual' && handleCellEdit(rowIndex, key, row[key])}
                              >
                                {String(row[key]).length > 50 
                                  ? `${String(row[key]).substring(0, 50)}...` 
                                  : String(row[key]) || '-'
                                }
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="border-slate-600 bg-slate-700/50 hover:bg-slate-600/50 text-white"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                      if (page > totalPages) return null;
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={page === currentPage 
                            ? "bg-purple-500 hover:bg-purple-600 text-white" 
                            : "border-slate-600 bg-slate-700/50 hover:bg-slate-600/50 text-white"
                          }
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="border-slate-600 bg-slate-700/50 hover:bg-slate-600/50 text-white"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline" className="border-slate-600 bg-slate-800/50 text-slate-300">
            {localData.length} total rows
          </Badge>
          <Badge variant="outline" className="border-slate-600 bg-slate-800/50 text-slate-300">
            {filteredAndSortedData.length} filtered rows
          </Badge>
          <Badge variant="outline" className="border-slate-600 bg-slate-800/50 text-slate-300">
            {columns.length} columns
          </Badge>
          {editMode && (
            <Badge variant="outline" className="border-blue-500 bg-blue-500/10 text-blue-400">
              {editMode} edit mode
            </Badge>
          )}
          {selectedRows.size > 0 && (
            <Badge variant="outline" className="border-yellow-500 bg-yellow-500/10 text-yellow-400">
              {selectedRows.size} selected
            </Badge>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EnhancedDataReviewEditor;
