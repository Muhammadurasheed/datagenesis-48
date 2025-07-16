
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  RotateCcw,
  Sparkles,
  MessageSquare,
  Wand2,
  FileText,
  FileSpreadsheet,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Download,
  Filter,
  SortAsc,
  SortDesc,
  Maximize2,
  Minimize2,
  Stars,
  Zap,
  TrendingUp,
  Database
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
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
  isOpen?: boolean;
}

const EnhancedDataReviewEditor: React.FC<EnhancedDataReviewEditorProps> = ({
  data,
  metadata,
  onDataUpdate,
  onPromptEdit,
  onClose,
  isEditing = false,
  isOpen = true
}) => {
  const [editMode, setEditMode] = useState<'manual' | 'prompt' | null>(null);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [promptText, setPromptText] = useState('');
  const [localData, setLocalData] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showMetrics, setShowMetrics] = useState(true);
  const [isCompact, setIsCompact] = useState(false);

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

  if (!isOpen) return null;

  if (localData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <Database className="w-16 h-16 mx-auto mb-6 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">Generate some data first to start reviewing and editing.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const columns = Object.keys(localData[0] || {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 p-6"
    >
      {/* Beautiful Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Stars className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  Data Review & Editor
                </h1>
              </div>
              <p className="text-lg text-muted-foreground">
                Review, edit, and perfect your AI-generated synthetic data
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompact(!isCompact)}
                className="backdrop-blur-sm"
              >
                {isCompact ? <Maximize2 className="w-4 h-4 mr-2" /> : <Minimize2 className="w-4 h-4 mr-2" />}
                {isCompact ? 'Expand' : 'Compact'}
              </Button>
              
              {onClose && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="backdrop-blur-sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              )}
            </div>
          </div>

          {/* Enhanced Quality Metrics */}
          {showMetrics && metadata && !isCompact && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-1 md:grid-cols-5 gap-4"
            >
              {metadata.qualityScore !== undefined && (
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 p-6">
                  <div className="absolute top-2 right-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-green-400 mb-1">{metadata.qualityScore}%</div>
                  <div className="text-sm text-green-300/80 mb-2">Quality Score</div>
                  <Progress value={metadata.qualityScore} className="h-1.5" />
                </div>
              )}
              
              {metadata.privacyScore !== undefined && (
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 p-6">
                  <div className="absolute top-2 right-2">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-blue-400 mb-1">{metadata.privacyScore}%</div>
                  <div className="text-sm text-blue-300/80 mb-2">Privacy Score</div>
                  <Progress value={metadata.privacyScore} className="h-1.5" />
                </div>
              )}
              
              {metadata.biasScore !== undefined && (
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-6">
                  <div className="absolute top-2 right-2">
                    <Stars className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-3xl font-bold text-purple-400 mb-1">{metadata.biasScore}%</div>
                  <div className="text-sm text-purple-300/80 mb-2">Bias Score</div>
                  <Progress value={metadata.biasScore} className="h-1.5" />
                </div>
              )}
              
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 p-6">
                <div className="absolute top-2 right-2">
                  <Database className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-3xl font-bold text-orange-400 mb-1">{localData.length}</div>
                <div className="text-sm text-orange-300/80">Total Rows</div>
              </div>
              
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 p-6">
                <div className="absolute top-2 right-2">
                  <Filter className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-3xl font-bold text-teal-400 mb-1">{columns.length}</div>
                <div className="text-sm text-teal-300/80">Columns</div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={editMode === 'manual' ? 'default' : 'outline'}
            onClick={() => setEditMode(editMode === 'manual' ? null : 'manual')}
            className="transition-all duration-200"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Manual Edit
          </Button>
          
          <Button
            variant={editMode === 'prompt' ? 'default' : 'outline'}
            onClick={() => setEditMode(editMode === 'prompt' ? null : 'prompt')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            AI Edit
          </Button>
          
          <Button
            variant="outline"
            onClick={resetData}
            className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          {selectedRows.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="animate-pulse"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedRows.size} rows
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 bg-background/50 backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      {/* Enhanced AI Prompt Editor */}
      <AnimatePresence>
        {editMode === 'prompt' && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 border-purple-500/30">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    AI-Powered Data Enhancement
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-6">
                <Textarea
                  placeholder="✨ Describe your data improvements... 

Examples:
• 'Make ages more realistic for healthcare data'
• 'Add more variety to product categories'
• 'Ensure gender balance across all departments'
• 'Fix inconsistent date formats'
• 'Generate more diverse names and locations'"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="min-h-[120px] bg-background/50 backdrop-blur-sm border-purple-200/50 focus:border-purple-400"
                />
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePromptSubmit}
                    disabled={!promptText.trim() || isEditing}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                  >
                    {isEditing ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isEditing ? 'Enhancing...' : 'Enhance Data'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(null)}
                    className="backdrop-blur-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Data Table */}
      <Card className="overflow-hidden bg-background/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-background/80 to-muted/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Data Table ({filteredAndSortedData.length} rows)
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20 h-8">
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
                size="sm"
                onClick={handleAddRow}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            )}
            
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadData('csv')}
                className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
              >
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadData('json')}
                className="hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
              >
                JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadData('excel')}
                className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {editMode === 'manual' && (
                    <TableHead className="w-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="p-1 hover:bg-primary/10"
                      >
                        {selectedRows.size === paginatedData.length ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                    </TableHead>
                  )}
                  {columns.map((key) => (
                    <TableHead key={key} className="min-w-32">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort(key)}
                        className="flex items-center gap-2 font-medium hover:bg-primary/10 hover:text-primary"
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        {sortConfig?.key === key && (
                          sortConfig.direction === 'asc' ? 
                            <SortAsc className="w-3 h-3 text-primary" /> : 
                            <SortDesc className="w-3 h-3 text-primary" />
                        )}
                      </Button>
                    </TableHead>
                  ))}
                  {editMode === 'manual' && (
                    <TableHead className="w-20">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/30 transition-colors">
                    {editMode === 'manual' && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectRow(rowIndex)}
                          className="p-1 hover:bg-primary/10"
                        >
                          {selectedRows.has(rowIndex) ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                    {columns.map((key) => (
                      <TableCell key={key}>
                        {editMode === 'manual' && editingCell?.row === rowIndex && editingCell?.col === key ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave();
                                if (e.key === 'Escape') handleCellCancel();
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={handleCellSave}
                              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCellCancel}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`text-sm p-2 rounded transition-colors ${
                              editMode === 'manual' ? 'cursor-pointer hover:bg-primary/5 hover:text-primary' : ''
                            }`}
                            onClick={() => editMode === 'manual' && handleCellEdit(rowIndex, key, row[key])}
                          >
                            {String(row[key]).length > 50 
                              ? `${String(row[key]).substring(0, 50)}...` 
                              : String(row[key]) || '-'
                            }
                          </div>
                        )}
                      </TableCell>
                    ))}
                    {editMode === 'manual' && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRowDelete(rowIndex)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-6 bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
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
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-4 py-2">
            <Database className="w-4 h-4 mr-2" />
            {localData.length} rows
          </Badge>
          <Badge variant="outline" className="px-4 py-2">
            <Filter className="w-4 h-4 mr-2" />
            {columns.length} columns
          </Badge>
          {editMode && (
            <Badge variant="default" className="px-4 py-2">
              <Edit3 className="w-4 h-4 mr-2" />
              {editMode} mode active
            </Badge>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedDataReviewEditor;
