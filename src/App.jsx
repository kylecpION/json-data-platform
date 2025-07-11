import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    Plus, Trash2, Download, Copy, Check, FileDown, Users, Briefcase,
    Building2, AlertTriangle, ClipboardCopy, ClipboardPaste, Eraser,
    ArrowUp, ArrowDown, Upload, Search, Filter, Eye, EyeOff, Save,
    Undo, Redo, Command, Moon, Sun, ChevronRight, ChevronLeft,
    Settings, HelpCircle, X, Loader2, CheckCircle, AlertCircle,
    Database, FileSpreadsheet, Zap, Sparkles, Grid3x3, Languages
} from 'lucide-react';

// Enhanced UI Components
const Tooltip = ({ children, content }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            {show && (
                <div className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded-md whitespace-nowrap bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2">
                    {content}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
            )}
        </div>
    );
};

const StatusIndicator = ({ status }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'saved': return { icon: CheckCircle, color: 'text-green-500', text: 'All changes saved' };
            case 'saving': return { icon: Loader2, color: 'text-blue-500', text: 'Saving...', animate: true };
            case 'error': return { icon: AlertCircle, color: 'text-red-500', text: 'Error saving' };
            default: return { icon: Database, color: 'text-gray-500', text: 'Ready' };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className="flex items-center space-x-2 text-sm">
            <Icon className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
            <span className="text-gray-600">{config.text}</span>
        </div>
    );
};

// Main Application Component
const BulkDataEntryPlatform = () => {
    // Core State
    const [data, setData] = useState([]);
    const [selectedCells, setSelectedCells] = useState(new Set());
    const [activeCell, setActiveCell] = useState(null);
    const [generatedJson, setGeneratedJson] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // UI/Feature State
    const [mode, setMode] = useState('create');
    const [profileType, setProfileType] = useState('rel');
    const [isDraggingFill, setIsDraggingFill] = useState(false);
    const [dragFillRange, setDragFillRange] = useState({ start: null, end: null });
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, rowIndex: null });
    const [darkMode, setDarkMode] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [saveStatus, setSaveStatus] = useState('saved');
    const [columnWidths, setColumnWidths] = useState({});
    const [hiddenColumns, setHiddenColumns] = useState(new Set());
    const [filterMode, setFilterMode] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

    // Refs
    const tableRef = useRef(null);
    const mainContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    // Column Definitions
    const excelColumns = [
        'no', 'full_name', 'alias_1', 'alias_2', 'name_original_script', 'gender',
        'dob_day', 'dob_month', 'dob_year',
        'nationality_iso_code', 'event_type', 'rel_category', 'rel_subcategory', 'list_name',
        'pep_tier', 'pep_segment', 'pep_position', 'pep_category', 'pep_entry_country_iso_code',
        'line1', 'line2', 'city', 'county', 'state', 'country', 'address_country_id',
        'summary', 'snippet', 'pdf_filename', 'url', 'article_id',
        'publication_date', 'event_date', 'day', 'month', 'year',
        'datefrom', 'dateto', 'day_from', 'month_from', 'year_from',
        'day_to', 'month_to', 'year_to',
        'reference_id', 'rel_id', 'bridge_id'
    ];

    // Column metadata for better UI
    const columnMetadata = {
        full_name: { icon: Users, color: 'blue' },
        nationality_iso_code: { icon: Building2, color: 'green' },
        event_type: { icon: Zap, color: 'purple' },
        reference_id: { icon: Database, color: 'orange' },
        name_original_script: { icon: Languages, color: 'indigo' }
    };

    // Helper to get required columns based on current mode
    const getRequiredColumns = () => {
        if (mode === 'create' && profileType === 'pep') {
            return ['full_name', 'nationality_iso_code', 'pep_entry_country_iso_code', 'pep_tier', 'pep_position', 'pep_category'];
        }
        if (mode === 'create' && profileType === 'rel') return ['full_name'];
        if (mode === 'update') return ['reference_id'];
        return [];
    };

    // Initialize or reset rows
    const initializeRows = (count = 20) => {
        return Array.from({ length: count }, (_, i) => {
            const row = { id: Date.now() + i };
            excelColumns.forEach(col => { row[col] = ''; });
            if (mode === 'create') row['reference_id'] = 'create';
            return row;
        });
    };

    // Save to history for undo/redo
    const saveToHistory = (newData) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newData)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    // Effect to handle mode changes
    useEffect(() => {
        // Only initialize empty rows on first load
        if (data.length === 0) {
            const newData = initializeRows();
            setData(newData);
            saveToHistory(newData);
        } else {
            // When switching modes, update reference_id for existing data
            if (mode === 'create') {
                setData(prevData => {
                    const updatedData = prevData.map(row => ({
                        ...row,
                        reference_id: row.reference_id && row.reference_id !== 'create' ? row.reference_id : 'create'
                    }));
                    saveToHistory(updatedData);
                    return updatedData;
                });
            }
        }
        setSelectedCells(new Set());
        setActiveCell(null);
    }, [mode, profileType]);

    // Effect to handle global clicks and keyboard shortcuts
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenu.visible && !event.target.closest('.context-menu')) {
                setContextMenu({ visible: false, x: 0, y: 0, rowIndex: null });
            }
        };

        const handleKeyDown = (e) => {
            // Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }
            // Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                generateCleanJson();
            }
            // Delete selected
            if (e.key === 'Delete' && selectedCells.size > 0) {
                clearSelectedCells();
            }
            // Show shortcuts
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                setShowKeyboardShortcuts(prev => !prev);
            }
        };

        window.addEventListener('click', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [contextMenu.visible, selectedCells, historyIndex]);

    // Undo/Redo functions
    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setData(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setData(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    // Simulate auto-save
    useEffect(() => {
        const timer = setTimeout(() => {
            if (saveStatus === 'saving') {
                setSaveStatus('saved');
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [saveStatus]);

    // --- DATA MANIPULATION HANDLERS ---
    const handleCellEdit = (rowIndex, colIndex, value) => {
        setSaveStatus('saving');
        setData(prevData => {
            const newData = [...prevData];
            newData[rowIndex][excelColumns[colIndex]] = value;
            saveToHistory(newData);
            return newData;
        });
    };

    const addRows = (count = 10, belowIndex = null) => {
        const newRows = initializeRows(count);
        setData(prev => {
            const dataCopy = [...prev];
            const insertIndex = belowIndex !== null ? belowIndex + 1 : prev.length;
            dataCopy.splice(insertIndex, 0, ...newRows);
            saveToHistory(dataCopy);
            return dataCopy;
        });
    };

    const deleteRows = () => {
        const rowsToDelete = new Set();
        selectedCells.forEach(cell => {
            const [rowIndex] = cell.split('-').map(Number);
            rowsToDelete.add(rowIndex);
        });
        setData(prev => {
            const newData = prev.filter((_, index) => !rowsToDelete.has(index));
            saveToHistory(newData);
            return newData;
        });
        setSelectedCells(new Set());
        setActiveCell(null);
    };

    const clearSelectedCells = () => {
        setData(prevData => {
            const newData = [...prevData];
            selectedCells.forEach(cell => {
                const [rowIndex, colIndex] = cell.split('-').map(Number);
                if (newData[rowIndex]) {
                    newData[rowIndex][excelColumns[colIndex]] = '';
                }
            });
            saveToHistory(newData);
            return newData;
        });
    };

    // Toggle column visibility
    const toggleColumnVisibility = (col) => {
        setHiddenColumns(prev => {
            const newHidden = new Set(prev);
            if (newHidden.has(col)) {
                newHidden.delete(col);
            } else {
                newHidden.add(col);
            }
            return newHidden;
        });
    };

    // --- SELECTION & DRAG HANDLERS ---
    const handleCellMouseDown = (rowIndex, colIndex, e) => {
        const cellKey = `${rowIndex}-${colIndex}`;
        setActiveCell(cellKey);

        if (e.shiftKey && activeCell) {
            const [startRow, startCol] = activeCell.split('-').map(Number);
            const newSelection = new Set();
            const minRow = Math.min(startRow, rowIndex);
            const maxRow = Math.max(startRow, rowIndex);
            const minCol = Math.min(startCol, colIndex);
            const maxCol = Math.max(startCol, colIndex);
            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    newSelection.add(`${r}-${c}`);
                }
            }
            setSelectedCells(newSelection);
        } else if (e.ctrlKey || e.metaKey) {
            const newSelection = new Set(selectedCells);
            newSelection.has(cellKey) ? newSelection.delete(cellKey) : newSelection.add(cellKey);
            setSelectedCells(newSelection);
        } else {
            setSelectedCells(new Set([cellKey]));
        }
    };

    const handleFillHandleMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFill(true);
        setDragFillRange({ start: activeCell, end: activeCell });
    };

    const handleCellMouseEnter = (rowIndex, colIndex) => {
        if (isDraggingFill) {
            setDragFillRange(prev => ({ ...prev, end: `${rowIndex}-${colIndex}` }));
        }
    };

    const handleMouseUp = () => {
        if (isDraggingFill) {
            const [startRow, startCol] = dragFillRange.start.split('-').map(Number);
            const [endRow] = dragFillRange.end.split('-').map(Number);
            const fillValue = data[startRow][excelColumns[startCol]];

            setData(prevData => {
                const newData = [...prevData];
                for (let r = startRow + 1; r <= endRow; r++) {
                    if (newData[r]) {
                        newData[r][excelColumns[startCol]] = fillValue;
                    }
                }
                saveToHistory(newData);
                return newData;
            });
        }
        setIsDraggingFill(false);
    };

    // --- CLIPBOARD & CONTEXT MENU ---
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text/plain');
        const rows = pastedData.split('\n').map(row => row.split('\t'));

        if (!activeCell) return;
        const [startRow, startCol] = activeCell.split('-').map(Number);

        setData(prevData => {
            const newData = [...prevData];
            const neededRows = startRow + rows.length;
            if (newData.length < neededRows) {
                newData.push(...initializeRows(neededRows - newData.length));
            }

            rows.forEach((row, rIdx) => {
                row.forEach((cell, cIdx) => {
                    const targetRow = startRow + rIdx;
                    const targetCol = startCol + cIdx;
                    if (targetCol < excelColumns.length && newData[targetRow]) {
                        newData[targetRow][excelColumns[targetCol]] = cell.trim();
                    }
                });
            });
            saveToHistory(newData);
            return newData;
        });
    };

    const handleCopy = (e) => {
        if (selectedCells.size === 0) return;
        e.preventDefault();
        const cells = Array.from(selectedCells).map(cell => cell.split('-').map(Number));
        const minRow = Math.min(...cells.map(c => c[0]));
        const maxRow = Math.max(...cells.map(c => c[0]));
        const minCol = Math.min(...cells.map(c => c[1]));
        const maxCol = Math.max(...cells.map(c => c[1]));

        const copyData = [];
        for (let r = minRow; r <= maxRow; r++) {
            const rowData = [];
            for (let c = minCol; c <= maxCol; c++) {
                rowData.push(data[r]?.[excelColumns[c]] || '');
            }
            copyData.push(rowData.join('\t'));
        }
        e.clipboardData.setData('text/plain', copyData.join('\n'));
    };

    const handleContextMenu = (e, rowIndex) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, rowIndex });
    };

    // --- CSV/JSON FILE HANDLING ---
    const exportDataAsCSV = () => {
        // Create CSV content with UTF-8 BOM for proper encoding
        const BOM = '\uFEFF'; // UTF-8 Byte Order Mark
        const headers = excelColumns.map(col => {
            // Escape quotes and wrap in quotes if contains special chars
            if (col.includes(',') || col.includes('"') || col.includes('\n')) {
                return `"${col.replace(/"/g, '""')}"`;
            }
            return col;
        });

        const rows = data.map(row => {
            return excelColumns.map(col => {
                const value = row[col] || '';
                // Escape quotes and wrap in quotes if contains special chars
                if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
                    return `"${value.toString().replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',');
        });

        const csvContent = BOM + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `${profileType}_${mode}_data_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadTemplate = () => {
        // Create CSV content with proper formatting and UTF-8 BOM
        const BOM = '\uFEFF'; // UTF-8 Byte Order Mark for proper encoding
        const headers = excelColumns.map(col => {
            // Check if column name contains comma or quotes
            if (col.includes(',') || col.includes('"') || col.includes('\n')) {
                return `"${col.replace(/"/g, '""')}"`;
            }
            return col;
        });

        const csvContent = BOM + headers.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${profileType}_${mode}_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;

            // Parse CSV more robustly
            const parseCSVLine = (line) => {
                const result = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    const nextChar = line[i + 1];

                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            current += '"';
                            i++; // Skip next quote
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert("CSV file must contain a header row and at least one data row.");
                return;
            }

            const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
            const importedData = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue; // Skip empty lines

                const values = parseCSVLine(line);
                const rowData = { id: Date.now() + i };

                // Initialize all columns with empty strings
                excelColumns.forEach(col => {
                    rowData[col] = '';
                });

                // Map CSV data to row data
                headers.forEach((header, index) => {
                    if (values[index] !== undefined && excelColumns.includes(header)) {
                        let value = values[index].trim();

                        // Check if this looks like a placeholder (all underscores)
                        if (value && /^[_]+$/.test(value)) {
                            console.log(`Row ${i}: Skipping placeholder value "${value}" for ${header}`);
                            value = ''; // Clear placeholder values
                        }

                        rowData[header] = value;

                        // Debug Thai names
                        if (header === 'name_original_script' && value) {
                            console.log(`Row ${i}: OSN = "${value}" (length: ${value.length}, Unicode: ${/[^\u0000-\u007F]/.test(value)})`);
                        }
                    }
                });

                // Set reference_id based on current mode if not provided
                if (mode === 'create' && (!rowData.reference_id || rowData.reference_id === '')) {
                    rowData.reference_id = 'create';
                }

                // Only add rows that have at least some data
                const hasData = Object.values(rowData).some(val => val && val !== '' && val !== 'create');
                if (hasData) {
                    importedData.push(rowData);
                }
            }

            // Check for placeholder values in imported data
            let placeholderWarning = '';
            const placeholderCells = [];
            importedData.forEach((row, idx) => {
                if (row.name_original_script && /^[_]+$/.test(row.name_original_script)) {
                    placeholderCells.push(idx + 1);
                }
            });

            if (placeholderCells.length > 0) {
                const displayRows = placeholderCells.slice(0, 5).join(', ');
                const moreCount = placeholderCells.length - 5;
                placeholderWarning = `\n\n⚠️ Found placeholder underscores in Original Script Name field for rows: ${displayRows}${moreCount > 0 ? ` and ${moreCount} more` : ''}.\n\nPlease enter the actual Thai/Unicode names in these cells.`;
            }

            console.log(`Imported ${importedData.length} rows with data`);
            setData(importedData);
            saveToHistory(importedData);
            setSaveStatus('saved');

            // Show success message
            alert(`✅ Successfully imported ${importedData.length} rows!${placeholderWarning}`);
        };
        reader.readAsText(file, 'UTF-8'); // Explicitly specify UTF-8 encoding
        event.target.value = null;
    };

    // --- JSON CONVERSION HELPERS ---
    const safeInt = (value) => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? null : parsed;
    };
    const parseDate = (day, month, year) => {
        const d = safeInt(day);
        const m = safeInt(month);
        const y = safeInt(year);
        const date = {};
        if (d !== null) date.day = d;
        if (m !== null) date.month = m;
        if (y !== null) date.year = y;
        return Object.keys(date).length > 0 ? date : null;
    };
    const cleanString = (str) => {
        return str ? str.toString().replace(/\./g, '').trim() : '';
    };
    const titleCase = (str) => {
        return str ? str.toString().toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '';
    };
    const splitName = (fullName, preserveOriginal = false) => {
        // For non-Latin scripts or when preserving original, don't apply transformations
        if (preserveOriginal || (fullName && /[^\u0000-\u007F]/.test(fullName))) {
            const parts = fullName.trim().split(/\s+/).filter(p => p);
            let firstName = '', middleName = '', lastName = '';
            if (parts.length === 1) {
                lastName = parts[0];
            } else if (parts.length === 2) {
                [firstName, lastName] = parts;
            } else if (parts.length >= 3) {
                firstName = parts[0];
                middleName = parts.slice(1, -1).join(' ');
                lastName = parts[parts.length - 1];
            }
            return { firstName, middleName, lastName };
        }

        // For Latin scripts, apply cleaning and title case
        const cleaned = titleCase(cleanString(fullName));
        const parts = cleaned.split(/\s+/).filter(p => p);
        let firstName = '', middleName = '', lastName = '';
        if (parts.length === 1) { lastName = parts[0]; }
        else if (parts.length === 2) { [firstName, lastName] = parts; }
        else if (parts.length >= 3) {
            firstName = parts[0];
            middleName = parts.slice(1, -1).join(' ');
            lastName = parts[parts.length - 1];
        }
        return { firstName, middleName, lastName };
    };

    // --- JSON CONVERSION LOGIC ---
    const convertToJsonCreate = () => {
        const individuals = [];
        const allRows = data.filter(row => row.full_name && row.full_name.toString().trim() !== '');
        console.log(`Total rows with names: ${allRows.length}`);

        const createRows = allRows.filter(row => {
            // In create mode, accept rows with 'create' or empty reference_id
            return !row.reference_id || row.reference_id === '' || row.reference_id === 'create';
        });
        console.log(`Rows for create mode: ${createRows.length}`);

        const uniqueRows = [];
        const seenNames = new Set();
        createRows.forEach(row => {
            const name = cleanString(row.full_name);
            if (!seenNames.has(name)) {
                seenNames.add(name);
                uniqueRows.push(row);
            }
        });
        console.log(`Unique names: ${uniqueRows.length}`);

        uniqueRows.forEach(row => {
            const person = {};
            const { firstName, middleName, lastName } = splitName(row.full_name);
            if (firstName) person.firstName = firstName;
            if (middleName) person.middleName = middleName;
            if (lastName) person.lastName = lastName;

            // Aliases - Only add actual aliases, not auto-generated variations
            const aliases = [];
            const osnValue = row.name_original_script ? row.name_original_script.trim() : '';

            // Check if OSN is valid (not empty, not just underscores)
            if (osnValue && !/^[_\s]+$/.test(osnValue)) {
                // Debug OSN
                console.log(`Processing OSN for ${row.full_name}: "${osnValue}"`);

                // Use preserveOriginal flag for non-Latin scripts
                const osnParts = splitName(osnValue, true);

                // Create alias object
                const osnAlias = { type: 'Original Script Name' };
                let hasValidName = false;

                if (osnParts.firstName && !/^[_\s]+$/.test(osnParts.firstName)) {
                    osnAlias.firstName = osnParts.firstName;
                    hasValidName = true;
                }
                if (osnParts.middleName && !/^[_\s]+$/.test(osnParts.middleName)) {
                    osnAlias.middleName = osnParts.middleName;
                    hasValidName = true;
                }
                if (osnParts.lastName && !/^[_\s]+$/.test(osnParts.lastName)) {
                    osnAlias.lastName = osnParts.lastName;
                    hasValidName = true;
                }

                // Only add if we have at least one valid name part
                if (hasValidName) {
                    console.log('OSN Alias:', osnAlias);
                    aliases.push(osnAlias);
                }
            }

            if (row.alias_1 && row.alias_1.trim() && !/^[_\s]+$/.test(row.alias_1)) {
                aliases.push({ type: 'Nickname', firstName: titleCase(cleanString(row.alias_1)) });
            }
            if (row.alias_2 && row.alias_2.trim() && !/^[_\s]+$/.test(row.alias_2)) {
                aliases.push({ type: 'Nickname', firstName: titleCase(cleanString(row.alias_2)) });
            }
            if (aliases.length > 0) person.aliases = aliases;

            if (row.gender) person.gender = row.gender.toString().trim();

            // Add nationalities for REL profiles too
            if (row.nationality_iso_code) {
                person.nationalities = [row.nationality_iso_code.toString().trim().toUpperCase()];
            }

            const dob = parseDate(row.dob_day, row.dob_month, row.dob_year);
            if (dob) { person.datesOfBirth = [dob]; }

            const articleId = row.article_id ? row.article_id.toString().trim() : '';
            const url = row.url ? row.url.toString().trim() : '';
            let pdfName = row.pdf_filename ? row.pdf_filename.toString().trim() : '';
            if (pdfName && !pdfName.toLowerCase().endsWith('.pdf')) pdfName += '.pdf';
            const hasEvidence = articleId || url || pdfName;
            if (hasEvidence) {
                const evidence = {};
                if (articleId) {
                    evidence.articleId = articleId;
                    if (row.summary) evidence.summary = row.summary.toString().trim();
                    else if (row.snippet) evidence.summary = row.snippet.toString().trim();
                    // Add evidenceDate for articleId evidence
                    let evidenceDate = parseDate(row.day, row.month, row.year);
                    if (evidenceDate) evidence.evidenceDate = evidenceDate;
                } else {
                    if (pdfName) {
                        evidence.bulkAssetFilename = pdfName;
                        if (url) evidence.originalUrl = url;
                    } else if (url) {
                        evidence.bulkAssetUrl = url;
                    }
                    evidence.copyrighted = true;
                    evidence.sourceOfWealth = false;
                    evidence.credibility = 'High';
                    evidence.language = 'eng';
                    let evidenceDate = parseDate(row.day, row.month, row.year);
                    if (evidenceDate) evidence.evidenceDate = evidenceDate;
                    const pubDate = parseDate(row.day, row.month, row.year);
                    if (pubDate) evidence.publicationDate = pubDate;
                    if (row.summary) evidence.summary = row.summary.toString().trim();
                    else if (row.snippet) evidence.summary = row.snippet.toString().trim();
                }
                person.evidences = [evidence];
            }

            const address = {};
            if (row.line1) address.line1 = titleCase(cleanString(row.line1));
            if (row.line2) address.line2 = titleCase(cleanString(row.line2));
            if (row.city) address.city = titleCase(cleanString(row.city));
            // Always include county even if empty
            address.county = row.county ? titleCase(cleanString(row.county)) : '';
            if (row.state) address.city = titleCase(cleanString(row.state));
            const countryId = safeInt(row.address_country_id);
            if (countryId !== null) {
                address.addressType = 'Business';
                address.countryId = countryId;
                person.addresses = [address];
            }

            if (profileType === 'pep') {
                if (row.pep_tier) person.pepTier = row.pep_tier.toString().trim();
                if (row.pep_segment || row.pep_position || row.pep_category) {
                    const pepEntry = {};
                    if (row.pep_segment) pepEntry.segment = row.pep_segment.toString().trim();
                    if (row.pep_position) pepEntry.position = row.pep_position.toString().trim();
                    if (row.pep_category) pepEntry.category = row.pep_category.toString().trim();
                    if (row.pep_entry_country_iso_code) {
                        pepEntry.countryIsoCode = row.pep_entry_country_iso_code.toString().trim().toUpperCase();
                    }
                    const dateFrom = parseDate(row.day_from, row.month_from, row.year_from);
                    if (dateFrom) pepEntry.dateFrom = dateFrom;
                    const dateTo = parseDate(row.day_to, row.month_to, row.year_to);
                    if (dateTo) pepEntry.dateTo = dateTo;
                    if (articleId) {
                        pepEntry.evidences = [{ evidenceId: articleId }];
                    }
                    person.currentPepEntries = [pepEntry];
                }
            } else {
                const relEntry = {};
                if (row.rel_category) relEntry.category = row.rel_category.toString().trim();
                if (row.rel_subcategory) relEntry.subcategory = row.rel_subcategory.toString().trim();
                if (row.list_name && !row.rel_subcategory) relEntry.subcategory = row.list_name.toString().trim();
                const event = {};
                if (row.event_type) event.type = row.event_type.toString().trim();
                const eventDate = parseDate(row.day, row.month, row.year);
                if (eventDate) event.date = eventDate;
                // Use evidenceId instead of articleId in events
                if (articleId) event.evidences = [{ evidenceId: articleId }];
                else if (pdfName) event.evidences = [{ bulkAssetFilename: pdfName }];
                else if (url) event.evidences = [{ bulkAssetUrl: url }];
                if (Object.keys(event).length > 0) relEntry.events = [event];
                if (Object.keys(relEntry).length > 0) person.relEntries = [relEntry];
            }
            individuals.push(person);
        });

        console.log(`Final individuals count: ${individuals.length}`);
        return { individuals };
    };

    const convertToJsonUpdate = () => {
        const individuals = [];
        const updateRows = data.filter(row => row.reference_id && row.reference_id !== 'create' && row.reference_id.toString().trim() !== '');
        const uniqueRows = [];
        const seenQRs = new Set();
        updateRows.forEach(row => {
            const refId = row.reference_id.toString().trim();
            if (!seenQRs.has(refId)) {
                seenQRs.add(refId);
                uniqueRows.push(row);
            }
        });

        uniqueRows.forEach(row => {
            const person = { referenceNumber: row.reference_id.toString().trim() };

            const dob = parseDate(row.dob_day, row.dob_month, row.dob_year);
            if (dob) {
                person.datesOfBirth = [dob];
            }

            const articleId = row.article_id ? row.article_id.toString().trim() : '';
            const url = row.url ? row.url.toString().trim() : '';
            let pdfName = row.pdf_filename ? row.pdf_filename.toString().trim() : '';
            if (pdfName && !pdfName.toLowerCase().endsWith('.pdf')) pdfName += '.pdf';

            if (row.rel_category && row.event_type) {
                const relEntry = { category: row.rel_category.toString().trim() };
                if (row.rel_id) relEntry.id = row.rel_id.toString().trim();
                if (row.rel_subcategory) relEntry.subcategory = row.rel_subcategory.toString().trim();

                const event = { type: row.event_type.toString().trim() };
                const eventDate = parseDate(row.day, row.month, row.year);
                if (eventDate) event.date = eventDate;

                if (articleId) event.evidences = [{ articleId }];
                else if (pdfName) event.evidences = [{ bulkAssetFilename: pdfName }];
                else if (url) event.evidences = [{ bulkAssetUrl: url }];

                relEntry.events = [event];
                person.relEntries = [relEntry];
            }
            else if (articleId || url || pdfName) {
                const isUpdatingOtherFields = 'datesOfBirth' in person;
                if (!isUpdatingOtherFields) {
                    const evidence = {};
                    if (articleId) {
                        evidence.articleId = articleId;
                        if (row.summary) evidence.summary = row.summary.toString().trim();
                    } else {
                        if (pdfName) {
                            evidence.bulkAssetFilename = pdfName;
                            if (url) evidence.originalUrl = url;
                        } else if (url) {
                            evidence.bulkAssetUrl = url;
                        }
                        evidence.copyrighted = true;
                        evidence.sourceOfWealth = false;
                        evidence.credibility = 'High';
                        evidence.language = 'eng';
                        let evidenceDate = parseDate(row.day, row.month, row.year);
                        if (evidenceDate) evidence.evidenceDate = evidenceDate;
                    }
                    person.evidences = [evidence];
                }
            }

            if (Object.keys(person).length > 1) {
                individuals.push(person);
            }
        });
        return { individuals };
    };

    // Data validation function
    const validateData = () => {
        const issues = [];
        let placeholderCount = 0;
        let validRowCount = 0;

        data.forEach((row, index) => {
            let hasValidData = false;

            // Check for placeholder values
            Object.entries(row).forEach(([key, value]) => {
                if (value && value !== 'create') {
                    hasValidData = true;
                    if (/^[_]+$/.test(value.toString())) {
                        placeholderCount++;
                        if (placeholderCount <= 5) { // Only report first 5 to avoid spam
                            issues.push(`Row ${index + 1}, column "${key.replace(/_/g, ' ')}": Contains placeholder underscores`);
                        }
                    }
                }
            });

            if (hasValidData) validRowCount++;
        });

        if (placeholderCount > 5) {
            issues.push(`...and ${placeholderCount - 5} more placeholder values`);
        }

        if (issues.length > 0) {
            alert(`⚠️ Data Validation Report:\n\n${issues.join('\n')}\n\nPlease replace placeholder underscores with actual values.\n\nValid rows: ${validRowCount}`);
            return false;
        } else {
            alert(`✅ Data Validation Passed!\n\nAll ${validRowCount} rows with data are valid.\nNo placeholder values found.\n\nYou can now generate JSON.`);
            return true;
        }
    };

    const generateCleanJson = () => {
        setSaveStatus('saving');
        const result = mode === 'create' ? convertToJsonCreate() : convertToJsonUpdate();
        setGeneratedJson(JSON.stringify(result, null, 4));

        // Open browser console to see debug info
        console.log('=== JSON Generation Debug Info ===');
        console.log('Mode:', mode);
        console.log('Profile Type:', profileType);
        console.log('Total data rows:', data.length);
        console.log('Sample row:', data[0]);
        console.log('Thai name check:');
        data.slice(0, 5).forEach((row, idx) => {
            if (row.name_original_script) {
                console.log(`Row ${idx + 1} OSN: "${row.name_original_script}" (chars: ${Array.from(row.name_original_script).map(c => c.charCodeAt(0)).join(',')})`);
            }
        });
        console.log('Generated result:', result);
        console.log('================================');
    };

    const exportJsonFile = () => {
        const result = mode === 'create' ? convertToJsonCreate() : convertToJsonUpdate();
        const jsonString = JSON.stringify(result, null, 4);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        const prefix = profileType === 'pep' ? 'PEP' : 'REL';
        link.download = `${prefix}_${mode.toUpperCase()}_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const copyJsonToClipboard = () => {
        navigator.clipboard.writeText(generatedJson).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    // Filtered data based on search
    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        return data.filter(row =>
            Object.values(row).some(value =>
                value.toString().toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [data, searchQuery]);

    // --- RENDER ---
    return (
        <div className={`flex h-screen font-sans transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`} ref={mainContainerRef} onMouseUp={handleMouseUp}>
            {/* Left Sidebar */}
            <aside className={`${sidebarCollapsed ? 'w-16' : 'w-80'} ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-all duration-300 ease-in-out border-r flex flex-col`}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'hidden' : 'block'}`}>
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                                <Grid3x3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Data Platform</h1>
                                <p className="text-xs text-gray-500">Advanced Entry System</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Sidebar Content */}
                <div className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'p-2' : 'p-6'} space-y-6`}>
                    {/* Profile Type Toggle */}
                    <div className={sidebarCollapsed ? 'space-y-2' : ''}>
                        {!sidebarCollapsed && <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Profile Type</h2>}
                        <div className={`${sidebarCollapsed ? 'flex flex-col space-y-2' : 'grid grid-cols-2 gap-2'}`}>
                            <Tooltip content="REL Profile">
                                <button
                                    onClick={() => setProfileType('rel')}
                                    className={`flex items-center justify-center ${sidebarCollapsed ? 'p-2' : 'px-4 py-3'} rounded-xl transition-all duration-200 ${
                                        profileType === 'rel'
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                                            : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Briefcase className={sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2'} />
                                    {!sidebarCollapsed && <span className="font-medium">REL</span>}
                                </button>
                            </Tooltip>
                            <Tooltip content="PEP Profile">
                                <button
                                    onClick={() => setProfileType('pep')}
                                    className={`flex items-center justify-center ${sidebarCollapsed ? 'p-2' : 'px-4 py-3'} rounded-xl transition-all duration-200 ${
                                        profileType === 'pep'
                                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105'
                                            : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Users className={sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2'} />
                                    {!sidebarCollapsed && <span className="font-medium">PEP</span>}
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className={sidebarCollapsed ? 'space-y-2' : ''}>
                        {!sidebarCollapsed && <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Operation Mode</h2>}
                        <div className={`${sidebarCollapsed ? 'flex flex-col space-y-2' : 'grid grid-cols-2 gap-2'}`}>
                            <Tooltip content="Create Mode">
                                <button
                                    onClick={() => setMode('create')}
                                    className={`flex items-center justify-center ${sidebarCollapsed ? 'p-2' : 'px-4 py-3'} rounded-xl transition-all duration-200 ${
                                        mode === 'create'
                                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                                            : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Plus className={sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2'} />
                                    {!sidebarCollapsed && <span className="font-medium">Create</span>}
                                </button>
                            </Tooltip>
                            <Tooltip content="Update Mode">
                                <button
                                    onClick={() => setMode('update')}
                                    className={`flex items-center justify-center ${sidebarCollapsed ? 'p-2' : 'px-4 py-3'} rounded-xl transition-all duration-200 ${
                                        mode === 'update'
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                                            : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Save className={sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2'} />
                                    {!sidebarCollapsed && <span className="font-medium">Update</span>}
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {!sidebarCollapsed && (
                        <div className="space-y-3">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
                            <div className="space-y-2">
                                <button onClick={() => addRows(10)} className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                                    <Plus className="w-4 h-4" />
                                    <span>Add 10 Rows</span>
                                </button>
                                <button onClick={validateData} className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Validate Data</span>
                                </button>
                                <button onClick={generateCleanJson} className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                                    <Sparkles className="w-4 h-4" />
                                    <span>Generate JSON</span>
                                </button>
                                <button onClick={exportJsonFile} className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                                    <FileDown className="w-4 h-4" />
                                    <span>Export JSON</span>
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={downloadTemplate} className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                        <Download className="w-4 h-4" />
                                        <span className="text-sm">Template</span>
                                    </button>
                                    <button onClick={() => fileInputRef.current.click()} className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                                        <Upload className="w-4 h-4" />
                                        <span className="text-sm">Import</span>
                                    </button>
                                </div>
                                <button onClick={exportDataAsCSV} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>Export Data as CSV</span>
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                            </div>
                        </div>
                    )}

                    {/* Undo/Redo Controls */}
                    {!sidebarCollapsed && (
                        <div className="space-y-3">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">History</h2>
                            <div className="flex space-x-2">
                                <button
                                    onClick={undo}
                                    disabled={historyIndex <= 0}
                                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                                        historyIndex > 0
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    <Undo className="w-4 h-4" />
                                    <span>Undo</span>
                                </button>
                                <button
                                    onClick={redo}
                                    disabled={historyIndex >= history.length - 1}
                                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                                        historyIndex < history.length - 1
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    <Redo className="w-4 h-4" />
                                    <span>Redo</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Footer */}
                <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4 space-y-3`}>
                    {!sidebarCollapsed && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 p-3 rounded-xl">
                            <div className="flex items-start space-x-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="text-xs space-y-1">
                                    <p className="font-medium text-gray-700 dark:text-gray-300">Required Fields</p>
                                    <p className="text-gray-600 dark:text-gray-400">Columns with red headers are mandatory for the current mode.</p>
                                    <p className="text-gray-600 dark:text-gray-400 mt-2">💡 Thai/Unicode names are preserved as-is in Original Script Name fields.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`flex ${sidebarCollapsed ? 'flex-col space-y-2' : 'space-x-2'}`}>
                        <Tooltip content="Dark Mode">
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={`${sidebarCollapsed ? 'w-full' : 'flex-1'} p-2 rounded-lg transition-colors ${
                                    darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'
                                } hover:bg-opacity-80`}
                            >
                                {darkMode ? <Sun className="w-5 h-5 mx-auto" /> : <Moon className="w-5 h-5 mx-auto" />}
                            </button>
                        </Tooltip>
                        <Tooltip content="Keyboard Shortcuts">
                            <button
                                onClick={() => setShowKeyboardShortcuts(true)}
                                className={`${sidebarCollapsed ? 'w-full' : 'flex-1'} p-2 rounded-lg transition-colors ${
                                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <Command className="w-5 h-5 mx-auto" />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Toolbar */}
                <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search data..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`pl-10 pr-4 py-2 w-80 rounded-lg border ${
                                        darkMode
                                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                            </div>

                            {/* Filter Toggle */}
                            <button
                                onClick={() => setFilterMode(!filterMode)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                                    filterMode
                                        ? 'bg-blue-500 text-white'
                                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                <span>Filter</span>
                            </button>

                            {/* Column Visibility */}
                            <div className="relative group">
                                <button className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}>
                                    <Eye className="w-4 h-4" />
                                    <span>Columns</span>
                                </button>
                                <div className={`absolute top-full left-0 mt-2 w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-h-96 overflow-y-auto`}>
                                    <div className="p-2">
                                        {excelColumns.map(col => (
                                            <button
                                                key={col}
                                                onClick={() => toggleColumnVisibility(col)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                                                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                                }`}
                                            >
                        <span className={`text-sm ${hiddenColumns.has(col) ? 'text-gray-400' : darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {col.replace(/_/g, ' ')}
                        </span>
                                                {hiddenColumns.has(col) ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-blue-500" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center space-x-6">
                            <StatusIndicator status={saveStatus} />
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {data.length} rows loaded | {data.filter(row => row.full_name && row.full_name.toString().trim() !== '').length} with names
                            </div>
                        </div>
                    </div>
                </header>

                {/* Spreadsheet Container */}
                <div className="flex-1 overflow-hidden p-6">
                    <div className={`h-full rounded-xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="h-full overflow-auto" onPaste={handlePaste} onCopy={handleCopy}>
                            <table ref={tableRef} className="w-full border-collapse">
                                <thead className="sticky top-0 z-20">
                                <tr>
                                    <th className={`sticky left-0 z-30 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} border-b border-r px-4 py-3 text-xs font-semibold text-gray-500`}>
                                        #
                                    </th>
                                    {excelColumns.filter(col => !hiddenColumns.has(col)).map((col, idx) => {
                                        const isRequired = getRequiredColumns().includes(col);
                                        const meta = columnMetadata[col];
                                        return (
                                            <th
                                                key={col}
                                                className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-300'} border-b border-r px-4 py-3 text-xs font-semibold whitespace-nowrap ${
                                                    isRequired ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                                style={{ minWidth: columnWidths[col] || '150px' }}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    {meta && <meta.icon className={`w-4 h-4 text-${meta.color}-500`} />}
                                                    <span>{col.replace(/_/g, ' ')}</span>
                                                    {isRequired && <span className="text-red-500">*</span>}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                                </thead>
                                <tbody>
                                {filteredData.map((row, rowIndex) => {
                                    const actualRowIndex = data.indexOf(row);
                                    return (
                                        <tr key={row.id} className={`group ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50/50'} transition-colors`}>
                                            <td
                                                className={`sticky left-0 z-10 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b border-r px-4 py-2 text-xs font-medium text-gray-500`}
                                                onContextMenu={(e) => handleContextMenu(e, actualRowIndex)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span>{actualRowIndex + 1}</span>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                                                            <Settings className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            {excelColumns.filter(col => !hiddenColumns.has(col)).map((col, colIndex) => {
                                                const actualColIndex = excelColumns.indexOf(col);
                                                const cellKey = `${actualRowIndex}-${actualColIndex}`;
                                                const isSelected = selectedCells.has(cellKey);
                                                const isActive = activeCell === cellKey;
                                                const value = row[col] || '';
                                                const isPlaceholder = value && /^[_]+$/.test(value);

                                                return (
                                                    <td
                                                        key={cellKey}
                                                        onMouseDown={(e) => handleCellMouseDown(actualRowIndex, actualColIndex, e)}
                                                        onMouseEnter={() => handleCellMouseEnter(actualRowIndex, actualColIndex)}
                                                        className={`border-b border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-0 relative ${
                                                            isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                                                        } ${isPlaceholder ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                                                        title={isPlaceholder ? 'This appears to be a placeholder. Please enter the actual value.' : ''}
                                                    >
                                                        <input
                                                            type="text"
                                                            value={value}
                                                            onChange={(e) => handleCellEdit(actualRowIndex, actualColIndex, e.target.value)}
                                                            onFocus={(e) => {
                                                                // Clear placeholder underscores on focus
                                                                if (/^[_]+$/.test(e.target.value)) {
                                                                    handleCellEdit(actualRowIndex, actualColIndex, '');
                                                                }
                                                            }}
                                                            className={`w-full h-full px-3 py-2 text-sm bg-transparent outline-none font-sans ${
                                                                darkMode ? 'text-gray-200' : 'text-gray-800'
                                                            } ${isActive ? 'ring-2 ring-blue-500 z-10' : ''} ${
                                                                isPlaceholder ? 'text-yellow-600 dark:text-yellow-400' : ''
                                                            } transition-all`}
                                                            style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Noto Sans Thai", sans-serif' }}
                                                        />
                                                        {isActive && (
                                                            <div
                                                                onMouseDown={handleFillHandleMouseDown}
                                                                className="absolute -right-1 -bottom-1 w-3 h-3 bg-blue-600 border-2 border-white rounded-sm cursor-crosshair z-20 hover:scale-125 transition-transform"
                                                            />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* JSON Output Section */}
                {generatedJson && (
                    <div className={`border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} p-6`}>
                        <div className="max-w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Generated JSON</h3>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={copyJsonToClipboard}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                                            copySuccess
                                                ? 'bg-green-500 text-white'
                                                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {copySuccess ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                                        <span>{copySuccess ? 'Copied!' : 'Copy JSON'}</span>
                                    </button>
                                    <button
                                        onClick={() => setGeneratedJson('')}
                                        className={`p-2 rounded-lg transition-colors ${
                                            darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <pre className={`${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-900 text-gray-100'} p-4 rounded-lg overflow-auto text-xs max-h-48 font-mono`}>
                {generatedJson}
              </pre>
                        </div>
                    </div>
                )}
            </main>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    className={`context-menu fixed ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-2xl rounded-lg py-2 w-56 z-50 border`}
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        onClick={() => {
                            addRows(1, contextMenu.rowIndex);
                            setContextMenu({ visible: false });
                        }}
                        className={`w-full flex items-center px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                        <ArrowDown className="w-4 h-4 mr-3" />
                        <span>Insert Row Below</span>
                    </button>
                    <button
                        onClick={() => {
                            addRows(1, contextMenu.rowIndex - 1);
                            setContextMenu({ visible: false });
                        }}
                        className={`w-full flex items-center px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                        <ArrowUp className="w-4 h-4 mr-3" />
                        <span>Insert Row Above</span>
                    </button>
                    <div className={`my-1 h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <button
                        onClick={() => {
                            deleteRows();
                            setContextMenu({ visible: false });
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <Trash2 className="w-4 h-4 mr-3" />
                        <span>Delete Selected Rows</span>
                    </button>
                    <button
                        onClick={() => {
                            clearSelectedCells();
                            setContextMenu({ visible: false });
                        }}
                        className={`w-full flex items-center px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                        <Eraser className="w-4 h-4 mr-3" />
                        <span>Clear Selected Cells</span>
                    </button>
                </div>
            )}

            {/* Keyboard Shortcuts Modal */}
            {showKeyboardShortcuts && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowKeyboardShortcuts(false)}>
                    <div
                        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Keyboard Shortcuts</h3>
                            <button
                                onClick={() => setShowKeyboardShortcuts(false)}
                                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {[
                                { keys: ['Ctrl', 'Z'], action: 'Undo' },
                                { keys: ['Ctrl', 'Y'], action: 'Redo' },
                                { keys: ['Ctrl', 'S'], action: 'Generate JSON' },
                                { keys: ['Delete'], action: 'Clear selected cells' },
                                { keys: ['Ctrl', 'C'], action: 'Copy cells' },
                                { keys: ['Ctrl', 'V'], action: 'Paste cells' },
                                { keys: ['Ctrl', '/'], action: 'Toggle shortcuts' },
                            ].map((shortcut, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {shortcut.keys.map((key, i) => (
                                            <React.Fragment key={i}>
                                                <kbd className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} font-mono`}>
                                                    {key}
                                                </kbd>
                                                {i < shortcut.keys.length - 1 && <span className="text-gray-500">+</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{shortcut.action}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkDataEntryPlatform;