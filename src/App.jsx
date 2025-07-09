import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Copy, Check, FileDown, Users, Briefcase, Building2, AlertTriangle, ClipboardCopy, ClipboardPaste, Eraser, ArrowUp, ArrowDown, Upload } from 'lucide-react';

// Main Application Component
const BulkDataEntryPlatform = () => {
    // Core State
    const [data, setData] = useState([]);
    const [selectedCells, setSelectedCells] = useState(new Set());
    const [activeCell, setActiveCell] = useState(null); // e.g., '0-1' for row 0, col 1
    const [generatedJson, setGeneratedJson] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // UI/Feature State
    const [mode, setMode] = useState('create');
    const [profileType, setProfileType] = useState('rel');
    const [isDraggingFill, setIsDraggingFill] = useState(false);
    const [dragFillRange, setDragFillRange] = useState({ start: null, end: null });
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, rowIndex: null });

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

    // Effect to re-initialize data when mode or profile type changes
    useEffect(() => {
        setData(initializeRows());
        setSelectedCells(new Set());
        setActiveCell(null);
    }, [mode, profileType]);

    // Effect to handle global clicks for closing context menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenu.visible && !event.target.closest('.context-menu')) {
                setContextMenu({ visible: false, x: 0, y: 0, rowIndex: null });
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [contextMenu.visible]);


    // --- DATA MANIPULATION HANDLERS ---
    const handleCellEdit = (rowIndex, colIndex, value) => {
        setData(prevData => {
            const newData = [...prevData];
            newData[rowIndex][excelColumns[colIndex]] = value;
            return newData;
        });
    };

    const addRows = (count = 10, belowIndex = null) => {
        const newRows = initializeRows(count);
        setData(prev => {
            const dataCopy = [...prev];
            const insertIndex = belowIndex !== null ? belowIndex + 1 : prev.length;
            dataCopy.splice(insertIndex, 0, ...newRows);
            return dataCopy;
        });
    };

    const deleteRows = () => {
        const rowsToDelete = new Set();
        selectedCells.forEach(cell => {
            const [rowIndex] = cell.split('-').map(Number);
            rowsToDelete.add(rowIndex);
        });
        setData(prev => prev.filter((_, index) => !rowsToDelete.has(index)));
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
            return newData;
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
    const downloadTemplate = () => {
        const header = excelColumns.join(',');
        const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'data_entry_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert("CSV file must contain a header row and at least one data row.");
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const importedData = lines.slice(1).map((line, lineIndex) => {
                const values = line.split(',');
                const rowData = { id: Date.now() + lineIndex };
                excelColumns.forEach(col => { rowData[col] = ''; });

                headers.forEach((header, index) => {
                    if (excelColumns.includes(header)) {
                        rowData[header] = values[index] ? values[index].trim() : '';
                    }
                });
                return rowData;
            });

            setData(importedData);
        };
        reader.readAsText(file);
        event.target.value = null; // Reset file input
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
    const splitName = (fullName) => {
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
        const createRows = data.filter(row => row.reference_id === 'create' && row.full_name && row.full_name.toString().trim() !== '');
        const uniqueRows = [];
        const seenNames = new Set();
        createRows.forEach(row => {
            const name = cleanString(row.full_name);
            if (!seenNames.has(name)) {
                seenNames.add(name);
                uniqueRows.push(row);
            }
        });

        uniqueRows.forEach(row => {
            const person = {};
            const { firstName, middleName, lastName } = splitName(row.full_name);
            if (firstName) person.firstName = firstName;
            if (middleName) person.middleName = middleName;
            if (lastName) person.lastName = lastName;
            if (row.gender) person.gender = row.gender.toString().trim();
            const dob = parseDate(row.dob_day, row.dob_month, row.dob_year);
            if (dob) { person.datesOfBirth = [dob]; }
            const aliases = [];
            if (row.name_original_script) {
                const osnParts = splitName(row.name_original_script);
                const osnAlias = { type: 'Original Script Name' };
                if (osnParts.firstName) osnAlias.firstName = osnParts.firstName;
                if (osnParts.middleName) osnAlias.middleName = osnParts.middleName;
                if (osnParts.lastName) osnAlias.lastName = osnParts.lastName;
                aliases.push(osnAlias);
            }
            const alias1 = { type: 'Name Spelling Variation' };
            if (lastName) alias1.firstName = lastName;
            if (middleName) alias1.middleName = middleName;
            if (firstName) alias1.lastName = firstName;
            aliases.push(alias1);
            if (row.alias_1) aliases.push({ type: 'Nickname', firstName: titleCase(cleanString(row.alias_1)) });
            if (row.alias_2) aliases.push({ type: 'Nickname', firstName: titleCase(cleanString(row.alias_2)) });
            if (aliases.length > 0) person.aliases = aliases;
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
            if (row.county) address.county = titleCase(cleanString(row.county));
            if (row.state) address.city = titleCase(cleanString(row.state));
            const countryId = safeInt(row.address_country_id);
            if (countryId !== null) address.countryId = countryId;
            if (Object.keys(address).length > 0) {
                address.addressType = 'Business';
                person.addresses = [address];
            }
            if (profileType === 'pep') {
                person.nationalities = [];
                if (row.nationality_iso_code) {
                    person.nationalities = [row.nationality_iso_code.toString().trim().toUpperCase()];
                }
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
                const eventDate = parseDate(row.day, row.month, row.year);
                if (eventDate) event.date = eventDate;
                if (row.event_type) event.type = row.event_type.toString().trim();
                if (articleId) event.evidences = [{ articleId }];
                else if (pdfName) event.evidences = [{ bulkAssetFilename: pdfName }];
                else if (url) event.evidences = [{ bulkAssetUrl: url }];
                if (Object.keys(event).length > 0) relEntry.events = [event];
                if (Object.keys(relEntry).length > 0) person.relEntries = [relEntry];
            }
            individuals.push(person);
        });
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

            // 1. Handle simple field updates
            const dob = parseDate(row.dob_day, row.dob_month, row.dob_year);
            if (dob) {
                person.datesOfBirth = [dob];
            }

            // 2. Handle categorized REL Entry updates (these are valid updates)
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
                // 3. Handle adding uncategorized, top-level evidence
            // This should only happen if no other fields are being updated, to avoid ambiguity.
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
                // If other fields ARE being updated, we "unlink" the evidence by not adding it,
                // preventing the API error.
            }

            if (Object.keys(person).length > 1) {
                individuals.push(person);
            }
        });
        return { individuals };
    };

    const generateCleanJson = () => {
        const result = mode === 'create' ? convertToJsonCreate() : convertToJsonUpdate();
        setGeneratedJson(JSON.stringify(result, null, 4));
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
        const textArea = document.createElement('textarea');
        textArea.value = generatedJson;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            }
        } catch (err) {
            console.error('Fallback: Error copying JSON', err);
        }
        document.body.removeChild(textArea);
    };

    // --- RENDER ---
    return (
        <div ref={mainContainerRef} onMouseUp={handleMouseUp} className="flex h-screen bg-gray-100 font-sans">
            {/* Left Sidebar: Controls */}
            <aside className="w-72 bg-white p-6 border-r border-gray-200 flex flex-col space-y-6">
                <h1 className="text-2xl font-bold text-gray-800">ARI Json Convertor(Test_1)</h1>

                {/* Profile Type */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 mb-2">Profile Type</h2>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setProfileType('rel')} className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-all text-sm font-medium ${profileType === 'rel' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <Briefcase size={16} /><span>REL</span>
                        </button>
                        <button onClick={() => setProfileType('pep')} className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-all text-sm font-medium ${profileType === 'pep' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <Users size={16} /><span>PEP</span>
                        </button>
                    </div>
                </div>

                {/* Mode */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 mb-2">Mode</h2>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setMode('create')} className={`flex-1 px-3 py-2 rounded-md transition-all text-sm font-medium ${mode === 'create' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600 hover:bg-gray-200'}`}>Create</button>
                        <button onClick={() => setMode('update')} className={`flex-1 px-3 py-2 rounded-md transition-all text-sm font-medium ${mode === 'update' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>Update</button>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-500 mb-2">Actions</h2>
                    <button onClick={() => addRows(10)} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm">
                        <Plus size={16} /><span>Add 10 Rows</span>
                    </button>
                    <button onClick={generateCleanJson} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                        <span>Generate JSON</span>
                    </button>
                    <button onClick={exportJsonFile} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-sm">
                        <FileDown size={16} /><span>Export JSON</span>
                    </button>
                    <button onClick={downloadTemplate} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors shadow-sm">
                        <Download size={16} /><span>Download Template</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                    <button onClick={() => fileInputRef.current.click()} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm">
                        <Upload size={16} /><span>Import from CSV</span>
                    </button>
                </div>

                {/* Info Panel */}
                <div className="flex-grow flex items-end">
                    <div className="text-xs text-gray-500 space-y-2 bg-gray-50 p-3 rounded-lg w-full">
                        {getRequiredColumns().length > 0 && (
                            <div className="flex items-start text-amber-600">
                                <AlertTriangle size={14} className="mr-2 mt-0.5 flex-shrink-0"/>
                                <span>Required columns for this mode have a red header.</span>
                            </div>
                        )}
                        <p><strong>Tip:</strong> Right-click on a row number for more options. Drag the corner of a selected cell to fill down.</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-auto shadow-inner bg-white" onPaste={handlePaste} onCopy={handleCopy}>
                    <table ref={tableRef} className="w-full border-collapse relative" onMouseLeave={() => setIsDraggingFill(false)}>
                        <thead className="sticky top-0 z-10 bg-gray-50">
                        <tr>
                            <th className="border-b border-gray-300 px-2 py-2 text-xs font-medium text-gray-500 text-center w-14 shadow-sm">#</th>
                            {excelColumns.map((col, idx) => (
                                <th key={col} className={`border-b border-l border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 whitespace-nowrap shadow-sm ${getRequiredColumns().includes(col) ? 'bg-red-50 text-red-700' : ''}`}>
                                    {col.replace(/_/g, ' ')}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={row.id} className="hover:bg-blue-50/30">
                                <td className="border-b border-r border-gray-200 bg-gray-50 px-2 py-1 text-xs text-center font-medium text-gray-500 sticky left-0" onContextMenu={(e) => handleContextMenu(e, rowIndex)}>
                                    {rowIndex + 1}
                                </td>
                                {excelColumns.map((col, colIndex) => {
                                    const cellKey = `${rowIndex}-${colIndex}`;
                                    const isSelected = selectedCells.has(cellKey);
                                    const isActive = activeCell === cellKey;
                                    const value = row[col] || '';

                                    return (
                                        <td key={cellKey} onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)} onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)} className={`border-b border-r border-gray-200 p-0 text-xs relative ${isSelected ? 'bg-blue-100' : 'bg-white'}`}>
                                            <input type="text" value={value} onChange={(e) => handleCellEdit(rowIndex, colIndex, e.target.value)} className={`w-full h-full bg-transparent outline-none px-3 py-1.5 ${isActive ? 'ring-2 ring-blue-500 z-10' : ''}`} />
                                            {isActive && (
                                                <div onMouseDown={handleFillHandleMouseDown} className="w-2 h-2 bg-blue-600 border border-white absolute -right-1 -bottom-1 cursor-crosshair z-20" />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                {generatedJson && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">Generated JSON</h3>
                            <button onClick={copyJsonToClipboard} className="flex items-center space-x-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm text-gray-700 transition-colors">
                                {copySuccess ? <Check size={14} className="text-green-600" /> : <ClipboardCopy size={14} />}
                                <span>{copySuccess ? 'Copied!' : 'Copy JSON'}</span>
                            </button>
                        </div>
                        <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-auto text-xs max-h-48 shadow-inner">{generatedJson}</pre>
                    </div>
                )}
            </main>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div className="context-menu fixed bg-white shadow-2xl rounded-lg py-2 w-48 z-50 border border-gray-200" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <button onClick={() => { addRows(1, contextMenu.rowIndex); setContextMenu({visible: false}); }} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 space-x-3"><ArrowDown size={14}/><span>Insert Row Below</span></button>
                    <button onClick={() => { deleteRows(); setContextMenu({visible: false}); }} className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 space-x-3"><Trash2 size={14}/><span>Delete Selected Row(s)</span></button>
                    <div className="my-1 h-px bg-gray-200" />
                    <button onClick={() => { clearSelectedCells(); setContextMenu({visible: false}); }} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 space-x-3"><Eraser size={14}/><span>Clear Selected Cells</span></button>
                </div>
            )}
        </div>
    );
};

export default BulkDataEntryPlatform;
