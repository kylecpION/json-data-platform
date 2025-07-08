import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Copy, Check, FileDown, Users, Briefcase, Building2 } from 'lucide-react';

const BulkDataEntryPlatform = () => {
    const [data, setData] = useState([]);
    const [selectedCells, setSelectedCells] = useState(new Set());
    const [selectionStart, setSelectionStart] = useState(null);
    const [generatedJson, setGeneratedJson] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [mode, setMode] = useState('create'); // 'create' or 'update'
    const [profileType, setProfileType] = useState('rel'); // 'rel' or 'pep'
    const tableRef = useRef(null);

    // Excel columns - flexible structure that can handle various data types
    const excelColumns = [
        'no', 'name', 'alias', 'alias2', 'osn', 'gender', 'type',
        'event_type', 'rel_category', 'rel_subcategory', 'list_name',
        'pep_tier', 'pep_segment', 'pep_position', 'pep_category',
        'line1', 'line2', 'city', 'county', 'state', 'country', 'country_id',
        'summary', 'snippet', 'pdf_names', 'url', 'article_id',
        'publication_date', 'event_date', 'day', 'month', 'year',
        'datefrom', 'dateto', 'day_from', 'month_from', 'year_from',
        'day_to', 'month_to', 'year_to',
        'qr', 'rel_id', 'qr2', 'bridge'
    ];

    // Initialize empty rows
    const initializeRows = (count = 20) => {
        const newRows = [];
        for (let i = 0; i < count; i++) {
            const row = { id: Date.now() + i };
            excelColumns.forEach(col => {
                row[col] = '';
            });
            row['qr'] = mode;
            newRows.push(row);
        }
        return newRows;
    };

    useEffect(() => {
        setData(initializeRows());
        setSelectedCells(new Set());
    }, [mode, profileType]);

    // Handle cell click and selection
    const handleCellClick = (rowIndex, colIndex, e) => {
        const cellKey = `${rowIndex}-${colIndex}`;

        if (e.shiftKey && selectionStart) {
            const [startRow, startCol] = selectionStart.split('-').map(Number);
            const minRow = Math.min(startRow, rowIndex);
            const maxRow = Math.max(startRow, rowIndex);
            const minCol = Math.min(startCol, colIndex);
            const maxCol = Math.max(startCol, colIndex);

            const newSelection = new Set();
            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    newSelection.add(`${r}-${c}`);
                }
            }
            setSelectedCells(newSelection);
        } else if (e.ctrlKey || e.metaKey) {
            const newSelection = new Set(selectedCells);
            if (newSelection.has(cellKey)) {
                newSelection.delete(cellKey);
            } else {
                newSelection.add(cellKey);
            }
            setSelectedCells(newSelection);
            setSelectionStart(cellKey);
        } else {
            setSelectedCells(new Set([cellKey]));
            setSelectionStart(cellKey);
        }
    };

    // Handle cell editing
    const handleCellEdit = (rowIndex, colIndex, value) => {
        const newData = [...data];
        if (!newData[rowIndex]) {
            newData[rowIndex] = { id: Date.now() + rowIndex };
            excelColumns.forEach(col => {
                newData[rowIndex][col] = '';
            });
        }
        newData[rowIndex][excelColumns[colIndex]] = value;
        setData(newData);
    };

    // Handle paste event
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const rows = pastedData.split('\n').map(row => row.split('\t'));

        let startRow = 0;
        let startCol = 0;

        if (selectedCells.size > 0) {
            const firstCell = Array.from(selectedCells).sort()[0];
            [startRow, startCol] = firstCell.split('-').map(Number);
        }

        const newData = [...data];

        const neededRows = startRow + rows.length;
        while (newData.length < neededRows) {
            const newRow = { id: Date.now() + newData.length };
            excelColumns.forEach(col => {
                newRow[col] = '';
            });
            newRow['qr'] = mode;
            newData.push(newRow);
        }

        rows.forEach((row, rIdx) => {
            const targetRow = startRow + rIdx;
            row.forEach((cell, cIdx) => {
                const targetCol = startCol + cIdx;
                if (targetCol < excelColumns.length) {
                    newData[targetRow][excelColumns[targetCol]] = cell.trim();
                }
            });
        });

        setData(newData);
    };

    // Handle copy event
    const handleCopy = (e) => {
        if (selectedCells.size === 0) return;

        e.preventDefault();

        const cells = Array.from(selectedCells).map(cell => {
            const [row, col] = cell.split('-').map(Number);
            return { row, col };
        });

        const minRow = Math.min(...cells.map(c => c.row));
        const maxRow = Math.max(...cells.map(c => c.row));
        const minCol = Math.min(...cells.map(c => c.col));
        const maxCol = Math.max(...cells.map(c => c.col));

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

    // Helper functions
    const checkLen = (text, n = 1) => {
        return text && text.toString().length >= n;
    };

    const safeInt = (value) => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? null : parsed;
    };

    const cleanString = (str) => {
        return str ? str.toString().replace(/\./g, '').trim() : '';
    };

    const titleCase = (str) => {
        return str ? str.toString().toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '';
    };

    // Split name function
    const splitName = (fullName) => {
        const cleaned = titleCase(cleanString(fullName));
        const parts = cleaned.split(/\s+/).filter(p => p);

        let firstName = '';
        let middleName = '';
        let lastName = '';

        if (parts.length === 1) {
            lastName = parts[0];
        } else if (parts.length === 2) {
            firstName = parts[0];
            lastName = parts[1];
        } else if (parts.length >= 3) {
            firstName = parts[0];
            middleName = parts.slice(1, -1).join(' ');
            lastName = parts[parts.length - 1];
        }

        return { firstName, middleName, lastName };
    };

    // Parse date helper
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

    // Convert to JSON format - CREATE
    const convertToJsonCreate = () => {
        const individuals = [];

        const createRows = data.filter(row =>
            row.qr === 'create' &&
            row.name &&
            row.name.toString().trim() !== ''
        );

        // Remove duplicates by name
        const uniqueRows = [];
        const seenNames = new Set();
        createRows.forEach(row => {
            const name = cleanString(row.name);
            if (!seenNames.has(name)) {
                seenNames.add(name);
                uniqueRows.push(row);
            }
        });

        uniqueRows.forEach(row => {
            const person = {};

            // Parse name
            const { firstName, middleName, lastName } = splitName(row.name);
            if (firstName) person.firstName = firstName;
            if (middleName) person.middleName = middleName;
            if (lastName) person.lastName = lastName;

            // Gender & nationalities
            if (row.gender) person.gender = row.gender;
            if (row.country) person.nationalities = [row.country.toString().trim()];

            // Aliases
            const aliases = [];

            // Original Script Name if available
            if (row.osn) {
                const osnParts = splitName(row.osn);
                const osnAlias = { type: 'Original Script Name' };
                if (osnParts.firstName) osnAlias.firstName = osnParts.firstName;
                if (osnParts.middleName) osnAlias.middleName = osnParts.middleName;
                if (osnParts.lastName) osnAlias.lastName = osnParts.lastName;
                aliases.push(osnAlias);
            }

            // Name spelling variation (reversed order)
            const alias1 = { type: 'Name Spelling Variation' };
            if (lastName) alias1.firstName = lastName;
            if (middleName) alias1.middleName = middleName;
            if (firstName) alias1.lastName = firstName;
            aliases.push(alias1);

            // Nickname from alias field
            if (row.alias) {
                aliases.push({
                    type: 'Nickname',
                    firstName: titleCase(cleanString(row.alias))
                });
            }

            // Nickname from alias2 field
            if (row.alias2) {
                aliases.push({
                    type: 'Nickname',
                    firstName: titleCase(cleanString(row.alias2))
                });
            }

            if (aliases.length > 0) person.aliases = aliases;

            // Evidences
            const evidence = {};
            const url = row.url ? row.url.toString().trim() : '';
            let pdfName = row.pdf_names ? row.pdf_names.toString().trim() : '';
            const articleId = row.article_id ? row.article_id.toString().trim() : '';

            if (pdfName && !pdfName.toLowerCase().endsWith('.pdf')) {
                pdfName += '.pdf';
            }

            if (articleId) evidence.articleId = articleId;

            if (pdfName) {
                evidence.bulkAssetFilename = pdfName;
                if (url) evidence.originalUrl = url;
            } else if (url) {
                evidence.bulkAssetUrl = url;
            }

            // Only add these fields if we have evidence content
            if (pdfName || url || articleId) {
                evidence.copyrighted = true;
                evidence.sourceOfWealth = false;
                evidence.credibility = 'High';
                evidence.language = 'eng';

                // Evidence date - check multiple possible date columns
                let evidenceDate = null;
                if (row.event_date) {
                    const eventDate = new Date(row.event_date);
                    if (!isNaN(eventDate)) {
                        evidenceDate = {
                            day: eventDate.getDate(),
                            month: eventDate.getMonth() + 1,
                            year: eventDate.getFullYear()
                        };
                    }
                } else {
                    evidenceDate = parseDate(row.day, row.month, row.year);
                }

                if (evidenceDate) evidence.evidenceDate = evidenceDate;

                // Publication date
                const pubDate = parseDate(row.day, row.month, row.year);
                if (pubDate) evidence.publicationDate = pubDate;

                if (row.summary) {
                    evidence.summary = row.summary.toString().trim();
                } else if (row.snippet) {
                    evidence.summary = row.snippet.toString().trim();
                }

                person.evidences = [evidence];
            }

            // Addresses
            const address = {};
            if (row.line1) address.line1 = titleCase(cleanString(row.line1));
            if (row.line2) address.line2 = titleCase(cleanString(row.line2));
            if (row.city) address.city = titleCase(cleanString(row.city));
            if (row.county) address.county = titleCase(cleanString(row.county));
            if (row.state) address.city = titleCase(cleanString(row.state)); // Map state to city if no city

            const countryId = safeInt(row.country_id);
            if (countryId !== null) address.countryId = countryId;

            // Only add address if it has content
            if (Object.keys(address).length > 0) {
                address.addressType = 'Business';
                person.addresses = [address];
            }

            // Handle based on profile type
            if (profileType === 'pep') {
                // PEP specific fields
                if (row.pep_tier) person.pepTier = row.pep_tier;

                // Current PEP entries
                if (row.pep_segment || row.pep_position || row.pep_category) {
                    const pepEntry = {};
                    if (row.pep_segment) pepEntry.segment = row.pep_segment;
                    if (row.pep_position) pepEntry.position = row.pep_position;
                    if (row.pep_category) pepEntry.category = row.pep_category;

                    // Date from/to for PEP
                    const dateFrom = parseDate(row.day_from, row.month_from, row.year_from);
                    const dateTo = parseDate(row.day_to, row.month_to, row.year_to);

                    if (dateFrom) pepEntry.dateFrom = dateFrom;
                    if (dateTo) pepEntry.dateTo = dateTo;

                    person.currentPepEntries = [pepEntry];
                }
            } else {
                // REL entries (for non-PEP profiles)
                const relEntry = {};

                // Only add category/subcategory if provided
                if (row.rel_category) relEntry.category = row.rel_category;
                if (row.rel_subcategory) relEntry.subcategory = row.rel_subcategory;
                if (row.list_name && !row.rel_subcategory) relEntry.subcategory = row.list_name;

                const event = {};

                // Event date
                const eventDate = parseDate(row.day, row.month, row.year);
                if (eventDate) event.date = eventDate;

                // Event type
                if (row.event_type) {
                    event.type = row.event_type;
                } else if (row.type) {
                    event.type = row.type;
                }

                // Event evidences
                if (articleId) {
                    event.evidences = [{ articleId: articleId }];
                } else if (pdfName) {
                    event.evidences = [{ bulkAssetFilename: pdfName }];
                } else if (url) {
                    event.evidences = [{ bulkAssetUrl: url }];
                }

                // Only add event if it has content
                if (Object.keys(event).length > 0) {
                    relEntry.events = [event];
                }

                // Only add REL entry if it has content
                if (Object.keys(relEntry).length > 0) {
                    person.relEntries = [relEntry];
                }
            }

            individuals.push(person);
        });

        return { individuals };
    };

    // Convert to JSON format - UPDATE
    const convertToJsonUpdate = () => {
        const individuals = [];

        const updateRows = data.filter(row =>
            row.qr &&
            row.qr !== 'create' &&
            row.qr !== 'no-update' &&
            row.qr.toString().trim() !== ''
        );

        // Remove duplicates by qr (reference number)
        const uniqueRows = [];
        const seenQRs = new Set();
        updateRows.forEach(row => {
            const qr = row.qr.toString().trim();
            if (!seenQRs.has(qr)) {
                seenQRs.add(qr);
                uniqueRows.push(row);
            }
        });

        uniqueRows.forEach(row => {
            const person = {};

            person.referenceNumber = row.qr.toString();

            // Evidence
            const evidence = {};
            const url = row.url ? row.url.toString().trim() : '';
            let pdfName = row.pdf_names ? row.pdf_names.toString().trim() : '';
            const articleId = row.article_id ? row.article_id.toString().trim() : '';

            if (pdfName && !pdfName.toLowerCase().endsWith('.pdf')) {
                pdfName += '.pdf';
            }

            if (articleId) evidence.articleId = articleId;

            if (pdfName) {
                evidence.bulkAssetFilename = pdfName;
                if (url) evidence.originalUrl = url;
            } else if (url) {
                evidence.bulkAssetUrl = url;
            }

            if (pdfName || url || articleId) {
                evidence.copyrighted = true;
                evidence.sourceOfWealth = false;
                evidence.credibility = 'High';
                evidence.language = 'eng';

                // Evidence date
                let evidenceDate = null;
                if (row.event_date) {
                    const eventDate = new Date(row.event_date);
                    if (!isNaN(eventDate)) {
                        evidenceDate = {
                            day: eventDate.getDate(),
                            month: eventDate.getMonth() + 1,
                            year: eventDate.getFullYear()
                        };
                    }
                } else {
                    evidenceDate = parseDate(row.day, row.month, row.year);
                }

                if (evidenceDate) evidence.evidenceDate = evidenceDate;

                // Publication date
                if (row.publication_date) {
                    const pubDate = parseDate(row.day, row.month, row.year);
                    if (pubDate) evidence.publicationDate = pubDate;
                }

                if (row.summary) {
                    evidence.summary = row.summary.toString().trim();
                } else if (row.snippet) {
                    evidence.summary = row.snippet.toString().trim();
                }

                person.evidences = [evidence];
            }

            // REL entries for updates
            const relEntry = {};

            if (row.rel_id) {
                relEntry.id = row.rel_id.toString();
            } else {
                // Only add category/subcategory if provided
                if (row.rel_category) relEntry.category = row.rel_category;
                if (row.rel_subcategory) relEntry.subcategory = row.rel_subcategory;
                if (row.list_name && !row.rel_subcategory) relEntry.subcategory = row.list_name;
            }

            const event = {};

            // Event date
            const eventDate = parseDate(row.day, row.month, row.year);
            if (eventDate) event.date = eventDate;

            // Event type with mapping
            const eventTypeMap = {
                'Asset Forfeiture/Seizure': 'Asset Freeze',
                'Asset Forfeiture': 'Asset Freeze',
                'Seizure': 'Asset Freeze'
            };

            const rawType = row.event_type || row.type || '';
            if (rawType) {
                event.type = eventTypeMap[rawType] || rawType;
            }

            // Event evidences
            if (articleId) {
                event.evidences = [{ articleId: articleId }];
            } else if (pdfName) {
                event.evidences = [{ bulkAssetFilename: pdfName }];
            } else if (url) {
                event.evidences = [{ bulkAssetUrl: url }];
            }

            if (Object.keys(event).length > 0) {
                relEntry.events = [event];
            }

            if (Object.keys(relEntry).length > 0) {
                person.relEntries = [relEntry];
            }

            individuals.push(person);
        });

        return { individuals };
    };

    // Generate clean JSON
    const generateCleanJson = () => {
        const result = mode === 'create' ? convertToJsonCreate() : convertToJsonUpdate();
        setGeneratedJson(JSON.stringify(result, null, 4));
    };

    // Export JSON to file
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

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedJson);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const addRows = (count = 10) => {
        const newRows = initializeRows(count);
        setData(prev => [...prev, ...newRows]);
    };

    const renderCell = (row, col, rowIndex, colIndex) => {
        const value = row[col] || '';
        const cellKey = `${rowIndex}-${colIndex}`;
        const isSelected = selectedCells.has(cellKey);

        // Special styling for qr column
        const isQrColumn = col === 'qr';
        const cellStyle = isQrColumn && mode === 'create' ? 'bg-green-50' : 'bg-white';

        return (
            <td
                key={cellKey}
                className={`border border-gray-300 px-1 py-0.5 text-xs relative ${
                    isSelected ? 'bg-blue-100' : cellStyle
                } hover:bg-gray-50`}
                onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                onDoubleClick={() => {
                    const input = document.querySelector(`#cell-${rowIndex}-${colIndex}`);
                    if (input) input.focus();
                }}
            >
                <input
                    id={`cell-${rowIndex}-${colIndex}`}
                    type="text"
                    value={value}
                    onChange={(e) => handleCellEdit(rowIndex, colIndex, e.target.value)}
                    className="w-full bg-transparent outline-none"
                    onFocus={() => {
                        setSelectedCells(new Set([cellKey]));
                        setSelectionStart(cellKey);
                    }}
                />
            </td>
        );
    };

    // Highlight relevant columns based on profile type
    const getColumnStyle = (col) => {
        if (profileType === 'pep') {
            if (['pep_tier', 'pep_segment', 'pep_position', 'pep_category'].includes(col)) {
                return 'bg-purple-100';
            }
        } else {
            if (['rel_category', 'rel_subcategory', 'list_name', 'event_type'].includes(col)) {
                return 'bg-blue-100';
            }
        }
        if (col === 'qr') return 'bg-yellow-100';
        return 'bg-gray-200';
    };

    return (
        <div className="p-4 max-w-full">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-xl font-bold mb-4">Flexible Excel to JSON Converter</h1>

                {/* Controls */}
                <div className="flex items-center space-x-4 mb-4 flex-wrap gap-2">
                    {/* Profile Type Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setProfileType('rel')}
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-sm ${
                                profileType === 'rel'
                                    ? 'bg-white shadow-sm text-blue-600 font-medium'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <Briefcase size={16} />
                            <span>REL</span>
                        </button>
                        <button
                            onClick={() => setProfileType('pep')}
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-sm ${
                                profileType === 'pep'
                                    ? 'bg-white shadow-sm text-purple-600 font-medium'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <Users size={16} />
                            <span>PEP</span>
                        </button>
                    </div>

                    {/* Create/Update Mode */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setMode('create')}
                            className={`px-3 py-1.5 rounded-md transition-colors text-sm ${
                                mode === 'create'
                                    ? 'bg-white shadow-sm text-green-600 font-medium'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setMode('update')}
                            className={`px-3 py-1.5 rounded-md transition-colors text-sm ${
                                mode === 'update'
                                    ? 'bg-white shadow-sm text-blue-600 font-medium'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Update
                        </button>
                    </div>

                    <button
                        onClick={() => addRows(10)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                    >
                        <Plus size={16} />
                        <span>Add 10 Rows</span>
                    </button>

                    <button
                        onClick={generateCleanJson}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                        <span>Generate JSON</span>
                    </button>

                    <button
                        onClick={exportJsonFile}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                    >
                        <FileDown size={16} />
                        <span>Export JSON</span>
                    </button>
                </div>

                <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded">
                    <p className="font-semibold">
                        Current Mode: <span className={profileType === 'pep' ? 'text-purple-600' : 'text-blue-600'}>{profileType.toUpperCase()}</span> -
                        <span className={mode === 'create' ? 'text-green-600' : 'text-blue-600'}> {mode.toUpperCase()}</span>
                    </p>
                    <p>📋 <strong>Flexible Data Handling:</strong> The system adapts to whatever data you provide</p>
                    <p>⚡ <strong>Quick Tips:</strong></p>
                    <ul className="ml-4 space-y-0.5">
                        <li>• <strong>REL Mode:</strong> Uses rel_category, rel_subcategory, event_type fields</li>
                        <li>• <strong>PEP Mode:</strong> Uses pep_tier, pep_segment, pep_position fields</li>
                        <li>• Names can be in 'name' column or 'osn' (Original Script Name)</li>
                        <li>• Dates can be in multiple formats - the system will find them</li>
                        <li>• Empty fields are automatically excluded from JSON</li>
                    </ul>
                </div>
            </div>

            {/* Excel-like Table */}
            <div
                className="overflow-auto border-2 border-gray-400"
                style={{ maxHeight: '60vh' }}
                onPaste={handlePaste}
                onCopy={handleCopy}
                ref={tableRef}
            >
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10">
                    <tr>
                        <th className="border border-gray-400 bg-gray-200 px-2 py-1 text-xs font-medium text-center w-12">
                            #
                        </th>
                        {excelColumns.map((col, idx) => (
                            <th
                                key={col}
                                className={`border border-gray-400 px-2 py-1 text-xs font-medium whitespace-nowrap ${
                                    getColumnStyle(col)
                                }`}
                                style={{ minWidth: col === 'summary' || col === 'snippet' ? '200px' : '100px' }}
                            >
                                {col}
                                {col === 'qr' && <span className="text-red-500 ml-1">*</span>}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={row.id}>
                            <td className="border border-gray-400 bg-gray-100 px-2 py-1 text-xs text-center font-medium">
                                {rowIndex + 1}
                            </td>
                            {excelColumns.map((col, colIndex) =>
                                renderCell(row, col, rowIndex, colIndex)
                            )}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Generated JSON */}
            {generatedJson && (
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">
                            Generated JSON - {profileType.toUpperCase()} {mode === 'create' ? 'CREATE' : 'UPDATE'} Format
                        </h3>
                        <div className="flex space-x-2">
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                            >
                                {copySuccess ? (
                                    <>
                                        <Check size={14} className="text-green-600" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={exportJsonFile}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-purple-500 text-white hover:bg-purple-600 rounded text-sm"
                            >
                                <Download size={14} />
                                <span>Download</span>
                            </button>
                        </div>
                    </div>
                    <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-xs max-h-64 overflow-y-auto">
            {generatedJson}
          </pre>
                </div>
            )}
        </div>
    );
};

export default BulkDataEntryPlatform;