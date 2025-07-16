
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  RotateCcw,
  Sparkles,
  Wand2,
  Download,
  FileText,
  Database,
  FileSpreadsheet,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Check,
  AlertCircle,
  TrendingUp,
  Shield,
  Users,
  Target
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
  const filteredAndSortedData = useMemo(() => {
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

  // Pagination
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
      <Card className="bg-slate-900/95 border-slate-700">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300 text-lg">No data available for review</p>
          <p className="text-slate-500 text-sm mt-2">Generate some data first to start editing</p>
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(localData[0] || {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Review & Edit Generated Data
            </h1>
            <p className="text-slate-400 mt-2">
              Review, edit, and refine your synthetic data before downloading
            </p>
          </div>
          
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          )}
        </motion.div>

        {/* Quality Metrics */}
        {showMetadata && metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-slate-800/50 to-slate-700/30 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Data Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {metadata.qualityScore !== undefined && (
                    <div className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-400">{metadata.qualityScore}%</div>
                      <div className="text-sm text-slate-400">Quality Score</div>
                      <Progress value={metadata.qualityScore} className="mt-2 h-2" />
                    </div>
                  )}
                  {metadata.privacyScore !== undefined && (
                    <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-400">{metadata.privacyScore}%</div>
                      <div className="text-sm text-slate-400">Privacy Score</div>
                      <Progress value={metadata.privacyScore} className="mt-2 h-2" />
                    </div>
                  )}
                  {metadata.biasScore !== undefined && (
                    <div className="text-center p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-purple-400">{metadata.biasScore}%</div>
                      <div className="text-sm text-slate-400">Bias Score</div>
                      <Progress value={metadata.biasScore} className="mt-2 h-2" />
                    </div>
                  )}
                  <div className="text-center p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <Target className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-orange-400">{localData.length}</div>
                    <div className="text-sm text-slate-400">Total Rows</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <Database className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-cyan-400">{columns.length}</div>
                    <div className="text-sm text-slate-400">Columns</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col lg:flex-row gap-4 justify-between"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={editMode === 'manual' ? "default" : "outline"}
              onClick={() => setEditMode(editMode === 'manual' ? null : 'manual')}
              className={editMode === 'manual' 
                ? "bg-blue-500 hover:bg-blue-600 text-white" 
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
              }
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Manual Edit
            </Button>
            
            <Button
              variant={editMode === 'prompt' ? "default" : "outline"}
              onClick={() => setEditMode(editMode === 'prompt' ? null : 'prompt')}
              className={editMode === 'prompt' 
                ? "bg-purple-500 hover:bg-purple-600 text-white" 
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
              }
            >
              <Wand2 className="w-4 h-4 mr-2" />
              AI Edit
            </Button>
            
            <Button
              variant="outline"
              onClick={resetData}
              className="border-orange-500/30 text-orange-300 hover:bg-orange-500/20"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            {selectedRows.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedRows.size} rows
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <Filter className="w-5 h-5 text-slate-400" />
          </div>
        </motion.div>

        {/* AI Prompt Editor */}
        <AnimatePresence>
          {editMode === 'prompt' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
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
                    className="bg-slate-800 border-slate-600 text-white min-h-[120px] resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handlePromptSubmit}
                      disabled={!promptText.trim() || isEditing}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      {isEditing ? (
                        <>
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Apply AI Changes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(null)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-white">
                  Data Table ({filteredAndSortedData.length} rows)
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Rows per page:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-20 bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                    onClick={handleAddRow}
                    className="bg-green-500 hover:bg-green-600 text-white"
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
                        : "border-slate-600 text-slate-300 hover:bg-slate-700"
                      }
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  ))}
                  <Button
                    onClick={() => downloadData(selectedFormat)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                <ScrollArea className="h-[600px]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-700/50 sticky top-0 z-10">
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
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                {sortConfig?.key === key && (
                                  sortConfig.direction === 'asc' 
                                    ? <SortAsc className="w-4 h-4 text-blue-400" />
                                    : <SortDesc className="w-4 h-4 text-blue-400" />
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
                                  className="h-8 w-8 p-0 bg-red-500/20 hover:bg-red-500 border-red-500/30"
                                >
                                  <Trash2 className="w-3 h-3" />
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
                                      className="h-6 w-6 p-0 bg-green-500 hover:bg-green-600"
                                    >
                                      <Check className="w-3 h-3" />
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
                                    className={`text-sm text-slate-200 ${
                                      editMode === 'manual' ? 'cursor-pointer hover:bg-slate-600/50 px-3 py-2 rounded-md transition-colors' : ''
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
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-slate-700/50 bg-slate-800/30">
                    <div className="text-sm text-slate-400">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
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
                                : "border-slate-600 text-slate-300 hover:bg-slate-700"
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
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-4 text-sm"
        >
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {localData.length} total rows
          </Badge>
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {filteredAndSortedData.length} filtered rows
          </Badge>
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {columns.length} columns
          </Badge>
          {editMode && (
            <Badge variant="outline" className="border-blue-500 text-blue-400">
              {editMode} edit mode
            </Badge>
          )}
          {selectedRows.size > 0 && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-400">
              {selectedRows.size} selected
            </Badge>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedDataReviewEditor;
