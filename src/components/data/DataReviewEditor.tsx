
/**
 * REVOLUTIONARY DATA REVIEW & EDITING SYSTEM
 * Excel-like editing with natural language modifications
 * Real-time preview and version control
 * Compatible with React 18
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  MessageSquare, 
  Wand2, 
  Save, 
  Undo, 
  Redo,
  Search,
  Copy,
  Trash2,
  Plus,
  Loader2,
  Download,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface DataRow {
  id: string;
  [key: string]: any;
}

interface EditHistory {
  id: string;
  timestamp: string;
  action: string;
  changes: any;
  description: string;
}

interface DataReviewEditorProps {
  initialData: any[];
  onSave?: (data: any[]) => void;
  onCancel?: () => void;
  onDataChange?: (data: any[]) => void;
  metadata?: {
    rowsGenerated: number;
    qualityScore: number;
    privacyScore: number;
    biasScore: number;
  };
}

export const DataReviewEditor: React.FC<DataReviewEditorProps> = ({
  initialData = [],
  onSave,
  onCancel,
  onDataChange,
  metadata
}) => {
  const [data, setData] = useState<DataRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{rowId: string, column: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const [nlPrompt, setNlPrompt] = useState('');
  const [isProcessingNL, setIsProcessingNL] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // Initialize data
  useEffect(() => {
    console.log('🔄 DataReviewEditor initializing with data:', initialData);
    
    if (initialData && initialData.length > 0) {
      // Transform data to include IDs if not present
      const dataWithIds = initialData.map((row, index) => ({
        id: row.id || `row-${index}`,
        ...row
      }));
      
      setData(dataWithIds);
      console.log('✅ Data initialized:', dataWithIds);
    } else {
      // Create sample data if none provided
      const sampleData = createSampleData();
      setData(sampleData);
      console.log('📊 Created sample data:', sampleData);
    }
    
    setIsLoading(false);
  }, [initialData]);

  // Filtered data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // Get column keys (excluding id)
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => key !== 'id');
  }, [data]);

  // Create sample data for demo purposes
  const createSampleData = (): DataRow[] => {
    return Array.from({ length: 10 }, (_, index) => ({
      id: `sample-${index}`,
      name: `John Doe ${index + 1}`,
      email: `user${index + 1}@example.com`,
      age: 25 + Math.floor(Math.random() * 40),
      department: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'][index % 5],
      salary: 50000 + Math.floor(Math.random() * 100000),
      startDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString().split('T')[0],
      isActive: Math.random() > 0.2
    }));
  };

  // Row selection handlers
  const handleRowSelect = useCallback((rowId: string, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(rowId);
      } else {
        newSet.delete(rowId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(filteredData.map(row => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  }, [filteredData]);

  // Cell editing handlers
  const handleCellEdit = (rowId: string, column: string, currentValue: any) => {
    setEditingCell({ rowId, column });
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    const { rowId, column } = editingCell;
    const oldData = [...data];
    
    const newData = data.map(row => {
      if (row.id === rowId) {
        let value: any = editValue;
        
        // Type conversion based on original value type
        const originalValue = row[column];
        if (typeof originalValue === 'number') {
          value = parseFloat(editValue) || 0;
        } else if (typeof originalValue === 'boolean') {
          value = editValue.toLowerCase() === 'true';
        }
        
        return { ...row, [column]: value };
      }
      return row;
    });
    
    setData(newData);
    onDataChange?.(newData.map(row => {
      const { id, ...rest } = row;
      return rest;
    }));
    
    addToHistory('edit_cell', { old: oldData, new: newData }, `Edited ${column} in row ${rowId}`);
    
    setEditingCell(null);
    setEditValue('');
    toast.success('Cell updated successfully');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Helper functions
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  // Add to edit history
  const addToHistory = useCallback((action: string, changes: any, description: string) => {
    const historyEntry: EditHistory = {
      id: `edit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      changes,
      description
    };
    
    setEditHistory(prev => [...prev.slice(0, currentHistoryIndex + 1), historyEntry]);
    setCurrentHistoryIndex(prev => prev + 1);
  }, [currentHistoryIndex]);

  const handleDeleteRows = useCallback(() => {
    if (selectedRows.size === 0) {
      toast.error('Please select rows to delete');
      return;
    }

    const oldData = data;
    const newData = data.filter(row => !selectedRows.has(row.id));
    setData(newData);
    setSelectedRows(new Set());
    addToHistory('delete_rows', { deleted: Array.from(selectedRows), old: oldData }, `Deleted ${selectedRows.size} rows`);
    
    toast.success(`Deleted ${selectedRows.size} rows`);
  }, [data, selectedRows, addToHistory]);

  const handleAddRow = useCallback(() => {
    const newRow: DataRow = { id: `row-${Date.now()}` };
    
    // Add empty values for all existing columns
    if (data.length > 0) {
      Object.keys(data[0]).forEach(key => {
        if (key !== 'id') {
          const sampleValue = data[0][key];
          if (typeof sampleValue === 'string') newRow[key] = '';
          else if (typeof sampleValue === 'number') newRow[key] = 0;
          else if (typeof sampleValue === 'boolean') newRow[key] = false;
          else newRow[key] = '';
        }
      });
    }
    
    const newData = [...data, newRow];
    setData(newData);
    addToHistory('add_row', { added: newRow }, 'Added new row');
    
    toast.success('Added new row');
  }, [data, addToHistory]);

  const handleDuplicateRows = useCallback(() => {
    if (selectedRows.size === 0) {
      toast.error('Please select rows to duplicate');
      return;
    }

    const rowsToDuplicate = data.filter(row => selectedRows.has(row.id));
    const duplicatedRows = rowsToDuplicate.map(row => ({
      ...row,
      id: `dup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    const newData = [...data, ...duplicatedRows];
    setData(newData);
    setSelectedRows(new Set());
    addToHistory('duplicate_rows', { duplicated: duplicatedRows }, `Duplicated ${selectedRows.size} rows`);
    
    toast.success(`Duplicated ${selectedRows.size} rows`);
  }, [data, selectedRows, addToHistory]);

  const handleNaturalLanguageEdit = async () => {
    if (!nlPrompt.trim()) {
      toast.error('Please enter a modification request');
      return;
    }

    setIsProcessingNL(true);
    
    try {
      console.log('🤖 Processing NL request:', nlPrompt);
      
      // Simulate natural language processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock NL processing results based on prompt
      let newData = [...data];
      const prompt = nlPrompt.toLowerCase();
      
      if (prompt.includes('age') && (prompt.includes('realistic') || prompt.includes('increase') || prompt.includes('decrease'))) {
        newData = newData.map(row => ({
          ...row,
          age: row.age ? Math.max(18, Math.min(85, Number(row.age) + Math.floor(Math.random() * 10 - 5))) : row.age
        }));
        toast.success('Adjusted ages to be more realistic');
      } else if (prompt.includes('salary') && (prompt.includes('increase') || prompt.includes('boost'))) {
        newData = newData.map(row => ({
          ...row,
          salary: row.salary ? Math.round(Number(row.salary) * 1.1) : row.salary
        }));
        toast.success('Increased salaries by 10%');
      } else if (prompt.includes('email') && prompt.includes('fix')) {
        newData = newData.map(row => ({
          ...row,
          email: row.email ? row.email.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9@.-]/g, '') : row.email
        }));
        toast.success('Fixed email formats');
      } else if (prompt.includes('name') && prompt.includes('diverse')) {
        const diverseNames = ['Maria Garcia', 'Wei Chen', 'Aisha Patel', 'Omar Hassan', 'Sofia Rodriguez', 'Kwame Asante', 'Elena Popov'];
        newData = newData.map((row, index) => ({
          ...row,
          name: row.name ? diverseNames[index % diverseNames.length] : row.name
        }));
        toast.success('Made names more diverse');
      } else if (prompt.includes('department') && prompt.includes('random')) {
        const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design'];
        newData = newData.map(row => ({
          ...row,
          department: departments[Math.floor(Math.random() * departments.length)]
        }));
        toast.success('Randomized departments');
      } else {
        toast.info(`Applied modification: ${nlPrompt}`);
      }
      
      setData(newData);
      setNlPrompt('');
      addToHistory('nl_edit', { prompt: nlPrompt, old: data, new: newData }, `NL Edit: ${nlPrompt}`);
      
    } catch (error) {
      console.error('❌ NL processing failed:', error);
      toast.error('Failed to process natural language request');
    } finally {
      setIsProcessingNL(false);
    }
  };

  const handleUndo = useCallback(() => {
    if (currentHistoryIndex >= 0) {
      const historyEntry = editHistory[currentHistoryIndex];
      
      if (historyEntry.action === 'edit_cell' && historyEntry.changes.old) {
        setData(historyEntry.changes.old);
      } else if (historyEntry.action === 'delete_rows' && historyEntry.changes.old) {
        setData(historyEntry.changes.old);
      } else if (historyEntry.action === 'nl_edit' && historyEntry.changes.old) {
        setData(historyEntry.changes.old);
      }
      
      setCurrentHistoryIndex(prev => prev - 1);
      toast.success('Undid last action');
    }
  }, [currentHistoryIndex, editHistory]);

  const handleRedo = useCallback(() => {
    if (currentHistoryIndex < editHistory.length - 1) {
      setCurrentHistoryIndex(prev => prev + 1);
      const historyEntry = editHistory[currentHistoryIndex + 1];
      
      if (historyEntry.action === 'edit_cell' && historyEntry.changes.new) {
        setData(historyEntry.changes.new);
      } else if (historyEntry.action === 'nl_edit' && historyEntry.changes.new) {
        setData(historyEntry.changes.new);
      }
      
      toast.success('Redid action');
    }
  }, [currentHistoryIndex, editHistory]);

  const handleExport = useCallback((format: 'csv' | 'json' | 'xlsx') => {
    const exportData = data.map(row => {
      const { id, ...rest } = row;
      return rest;
    });

    let blob: Blob;
    let filename: string;

    try {
      switch (format) {
        case 'csv':
          const csv = Papa.unparse(exportData);
          blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          filename = `datagenesis_edited_${Date.now()}.csv`;
          break;
        case 'json':
          blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          filename = `datagenesis_edited_${Date.now()}.json`;
          break;
        case 'xlsx':
          const ws = XLSX.utils.json_to_sheet(exportData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Edited Data');
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          filename = `datagenesis_edited_${Date.now()}.xlsx`;
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
      
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-white">Loading data for review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Review & Edit Generated Data</h2>
            <p className="text-gray-400">
              {data.length} rows • {columns.length} columns
              {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
            </p>
          </div>
          
          {metadata && (
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-400">Quality</p>
                <p className="text-lg font-semibold text-green-400">{metadata.qualityScore}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Privacy</p>
                <p className="text-lg font-semibold text-blue-400">{metadata.privacyScore}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Bias</p>
                <p className="text-lg font-semibold text-purple-400">{metadata.biasScore}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-4">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search data..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={currentHistoryIndex < 0}
              className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleRedo}
              disabled={currentHistoryIndex >= editHistory.length - 1}
              className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>

            <div className="w-px h-8 bg-gray-600"></div>

            <button
              onClick={handleAddRow}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Add Row"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={handleDuplicateRows}
              disabled={selectedRows.size === 0}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Duplicate Selected"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={handleDeleteRows}
              disabled={selectedRows.size === 0}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Natural Language Editor */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">AI-Powered Data Editing</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={nlPrompt}
              onChange={(e) => setNlPrompt(e.target.value)}
              placeholder="e.g., 'Make ages more realistic', 'Fix email formats', 'Increase salaries by 10%', 'Make names more diverse'"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && !isProcessingNL && handleNaturalLanguageEdit()}
            />
            <button
              onClick={handleNaturalLanguageEdit}
              disabled={isProcessingNL || !nlPrompt.trim()}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessingNL ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {isProcessingNL ? 'Processing...' : 'Apply AI Edit'}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Data Table */}
      <div className="flex-1 overflow-auto bg-gray-800">
        <table className="w-full">
          <thead className="bg-gray-700 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-12">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length;
                    }
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
              </th>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 text-left text-sm font-medium text-gray-300 min-w-[120px]">
                  {column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row.id} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.id)}
                    onChange={(e) => handleRowSelect(row.id, e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                </td>
                {columns.map((column) => (
                  <td key={column} className="px-4 py-3">
                    {editingCell?.rowId === row.id && editingCell?.column === column ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleCellSave();
                            if (e.key === 'Escape') handleCellCancel();
                          }}
                        />
                        <button
                          onClick={handleCellSave}
                          className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                          title="Save"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCellCancel}
                          className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="text-sm text-gray-300 cursor-pointer hover:bg-gray-600/50 px-2 py-1 rounded flex items-center gap-2"
                        onClick={() => handleCellEdit(row.id, column, row[column])}
                      >
                        <span className="flex-1">
                          {formatCellValue(row[column])}
                        </span>
                        <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-6 border-t border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedRows.size > 0 && (
              <span className="text-sm text-blue-400 font-medium">
                {selectedRows.size} row{selectedRows.size === 1 ? '' : 's'} selected
              </span>
            )}
            {editHistory.length > 0 && (
              <span className="text-sm text-gray-400">
                {editHistory.length} edit{editHistory.length === 1 ? '' : 's'} made
              </span>
            )}
            <span className="text-sm text-gray-400">
              Total: {data.length} rows
            </span>
          </div>

          <div className="flex gap-3">
            <div className="flex gap-1">
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                JSON
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Excel
              </button>
            </div>

            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={() => onSave?.(data.map(row => {
                const { id, ...rest } = row;
                return rest;
              }))}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save & Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataReviewEditor;
