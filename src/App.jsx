import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit2, Copy, Check, X, Users, Building2 } from 'lucide-react';

const BulkDataEntryPlatform = () => {
    const [entityType, setEntityType] = useState('individuals');
    const [data, setData] = useState([]);
    const [editingCell, setEditingCell] = useState(null);
    const [editingValue, setEditingValue] = useState('');
    const [modalState, setModalState] = useState(null);
    const [generatedJson, setGeneratedJson] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // Field definitions based on ARI Bulk Tool JSON breakdown
    const individualFields = {
        simple: ['fullName', 'gender', 'isDead', 'pepTier'],
        arrays: ['nationalities', 'datesOfBirth', 'datesOfDeath', 'profileImages'],
        complex: ['aliases', 'addresses', 'evidences', 'currentPepEntries', 'relEntries']
    };

    const businessFields = {
        simple: ['name', 'description'],
        arrays: ['activities', 'businessTypes', 'profileImages'],
        complex: ['addresses', 'evidences', 'relEntries']
    };

    // Allowed values from the document
    const genderOptions = ['Male', 'Female'];
    const pepTierOptions = ['PEP Tier 1', 'PEP Tier 2', 'PEP Tier 3'];
    const addressTypesIndividual = ['Registered', 'Operating', 'Previous', 'Branch Office', 'Representative Office', 'Headquarters'];
    const businessTypeOptions = [
        'Vessel', 'Aircraft', 'Terrorist Organisation', 'Organised Crime Group', 'Militant Group',
        'Shell Corporation', 'Sovereign Wealth Fund', 'Government Body', 'Political Party',
        'Civic Movement', 'International Organisation', 'Other International Organisations',
        'Non-Government Organisation', 'Charitable Organisation', 'Professional Organisation',
        'Privately-Held Company', 'Publicly-Traded Company', 'Trust Fund', 'Bank',
        'Cryptocurrency Business', 'Gaming Business', 'Non-Bank Financial Institution',
        'Designated Professional (Gatekeeper) Organisation', 'Website', 'Fake Entity/Clone Company',
        'Apps/Applications'
    ];

    // Country codes list (partial - in real app would include all from the document)
    const countryCodes = ['AF', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT', 'AZ',
        'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BA', 'BW', 'BR', 'VG', 'BN',
        'BG', 'BF', 'MM', 'BI', 'KH', 'CM', 'CA', 'CV', 'KY', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CD',
        'CG', 'CK', 'CR', 'HR', 'CU', 'CY', 'CW', 'CZ', 'CI', 'DK', 'DJ', 'DM', 'DO', 'TL', 'EC', 'EG',
        'SV', 'GQ', 'ER', 'EE', 'ET', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'GA', 'GM', 'GE', 'DE', 'GH',
        'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'VA', 'HN', 'HK', 'HU',
        'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI',
        'KP', 'KR', 'XK', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MK',
        'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX', 'FM', 'MD', 'MC', 'MN',
        'ME', 'MS', 'MA', 'MZ', 'NA', 'NR', 'NP', 'NL', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'MP',
        'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PL', 'PT', 'PR', 'QA', 'RE', 'RO',
        'RU', 'RW', 'KN', 'LC', 'PM', 'VC', 'WS', 'SM', 'ST', 'SX', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG',
        'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES', 'LK', 'SD', 'SR', 'SZ', 'SE', 'CH', 'SY', 'TW', 'TJ',
        'TZ', 'TH', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TC', 'TV', 'UG', 'UA', 'AE', 'GB', 'VI', 'US',
        'UY', 'UZ', 'VU', 'VE', 'VN', 'WF', 'EH', 'YE', 'ZM', 'ZW'];

    const currentFields = entityType === 'individuals' ? individualFields : businessFields;
    const allFields = [...currentFields.simple, ...currentFields.arrays, ...currentFields.complex];

    // Parse full name into components
    const parseFullName = (fullName) => {
        if (!fullName || typeof fullName !== 'string') return { firstName: '', middleName: '', lastName: '' };

        const parts = fullName.trim().split(/\s+/);

        if (parts.length === 1) {
            return { firstName: parts[0], middleName: '', lastName: '' };
        } else if (parts.length === 2) {
            return { firstName: parts[0], middleName: '', lastName: parts[1] };
        } else {
            return {
                firstName: parts[0],
                middleName: parts.slice(1, -1).join(' '),
                lastName: parts[parts.length - 1]
            };
        }
    };

    // Parse date fields
    const parseDates = (dateString) => {
        if (!dateString) return [];

        const dates = dateString.split(/[;|]/).map(d => d.trim()).filter(d => d);
        return dates.map(date => {
            const parts = date.split(/[-\/,]/).map(p => p.trim());
            if (parts.length === 3) {
                return {
                    day: parseInt(parts[0]) || null,
                    month: parseInt(parts[1]) || null,
                    year: parseInt(parts[2]) || null
                };
            }
            return null;
        }).filter(d => d && d.year >= 1900);
    };

    // Parse complex field data from paste
    const parseComplexFieldData = (field, data) => {
        if (!data || typeof data !== 'string') return [];

        // Split by common delimiters (newline, semicolon, or pipe)
        const items = data.split(/[\n;|]/).map(item => item.trim()).filter(item => item);

        if (field === 'addresses') {
            return items.map(item => {
                // Try to parse structured address (e.g., "Operating,52,Main St,,Sofia,Sofia,SF,1111")
                const parts = item.split(/[,\t]/).map(p => p.trim());
                if (parts.length >= 2) {
                    return {
                        addressType: parts[0] || 'Operating',
                        countryId: parseInt(parts[1]) || '',
                        line1: parts[2] || '',
                        line2: parts[3] || '',
                        city: parts[4] || '',
                        county: parts[5] || '',
                        countyAbbrev: parts[6] || '',
                        postcode: parts[7] || '',
                        deleted: parts[8] === 'true' || parts[8] === 'True'
                    };
                }
                // Otherwise treat as line1
                return {
                    addressType: 'Operating',
                    countryId: '',
                    line1: item,
                    line2: '',
                    city: '',
                    county: '',
                    countyAbbrev: '',
                    postcode: '',
                    deleted: false
                };
            });
        } else if (field === 'aliases') {
            // For aliases, each line is a different alias
            return items;
        } else if (field === 'evidences' || field === 'currentPepEntries' || field === 'relEntries') {
            // For other complex fields, try to parse as JSON or treat as simple strings
            return items.map(item => {
                try {
                    return JSON.parse(item);
                } catch {
                    return item;
                }
            });
        }

        return items;
    };

    // Initialize data with empty row
    const addNewRow = useCallback(() => {
        const newRow = { id: Date.now() };
        allFields.forEach(field => {
            if (currentFields.complex.includes(field) || currentFields.arrays.includes(field)) {
                newRow[field] = [];
            } else if (field === 'isDead') {
                newRow[field] = false;
            } else {
                newRow[field] = '';
            }
        });
        // Add individual name fields for individuals
        if (entityType === 'individuals') {
            newRow.firstName = '';
            newRow.middleName = '';
            newRow.lastName = '';
        }
        setData(prev => [...prev, newRow]);
    }, [allFields, currentFields, entityType]);

    // Handle cell editing
    const handleCellClick = (rowId, field) => {
        if (!currentFields.complex.includes(field)) {
            const row = data.find(r => r.id === rowId);
            setEditingCell({ rowId, field });
            setEditingValue(row[field] || '');
        }
    };

    const handleCellChange = (value) => {
        setEditingValue(value);
    };

    const saveCellValue = () => {
        if (editingCell) {
            setData(prev => prev.map(row => {
                if (row.id === editingCell.rowId) {
                    if (editingCell.field === 'fullName' && entityType === 'individuals') {
                        // Parse full name and update individual name fields
                        const nameParts = parseFullName(editingValue);
                        return { ...row, ...nameParts, fullName: editingValue };
                    } else {
                        return { ...row, [editingCell.field]: editingValue };
                    }
                }
                return row;
            }));
            setEditingCell(null);
            setEditingValue('');
        }
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditingValue('');
    };

    // Handle paste event for bulk data entry
    const handlePaste = (e, rowId, field) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const rows = pastedData.split('\n').filter(row => row.trim());
        const values = rows[0].split('\t');

        if (values.length > 1 || rows.length > 1) {
            // Multi-cell paste
            const fieldIndex = allFields.indexOf(field);
            const rowIndex = data.findIndex(r => r.id === rowId);

            const newData = [...data];

            rows.forEach((row, rIdx) => {
                const cells = row.split('\t');
                const targetRowIndex = rowIndex + rIdx;

                if (targetRowIndex >= newData.length) {
                    const newRow = { id: Date.now() + rIdx };
                    allFields.forEach(f => {
                        if (currentFields.complex.includes(f) || currentFields.arrays.includes(f)) {
                            newRow[f] = [];
                        } else if (f === 'isDead') {
                            newRow[f] = false;
                        } else {
                            newRow[f] = '';
                        }
                    });
                    if (entityType === 'individuals') {
                        newRow.firstName = '';
                        newRow.middleName = '';
                        newRow.lastName = '';
                    }
                    newData.push(newRow);
                }

                cells.forEach((cell, cIdx) => {
                    const targetFieldIndex = fieldIndex + cIdx;
                    if (targetFieldIndex < allFields.length) {
                        const targetField = allFields[targetFieldIndex];

                        if (targetField === 'fullName' && entityType === 'individuals') {
                            // Parse full name and store the components
                            const nameParts = parseFullName(cell.trim());
                            Object.assign(newData[targetRowIndex], nameParts);
                        } else if (targetField === 'datesOfBirth' || targetField === 'datesOfDeath') {
                            newData[targetRowIndex][targetField] = parseDates(cell);
                        } else if (currentFields.complex.includes(targetField)) {
                            // Parse complex field data
                            newData[targetRowIndex][targetField] = parseComplexFieldData(targetField, cell);
                        } else if (targetField === 'isDead') {
                            newData[targetRowIndex][targetField] = cell.toLowerCase() === 'true' || cell === '1';
                        } else if (currentFields.arrays.includes(targetField)) {
                            // Handle array fields by splitting on comma
                            newData[targetRowIndex][targetField] = cell.split(',').map(v => v.trim()).filter(v => v);
                        } else {
                            newData[targetRowIndex][targetField] = cell.trim();
                        }
                    }
                });
            });

            setData(newData);
            cancelEdit();
        } else {
            // Single cell paste
            if (field === 'fullName') {
                setEditingValue(values[0]);
            } else if (field === 'datesOfBirth' || field === 'datesOfDeath') {
                const dates = parseDates(values[0]);
                setData(prev => prev.map(row =>
                    row.id === rowId
                        ? { ...row, [field]: dates }
                        : row
                ));
                cancelEdit();
            } else if (currentFields.complex.includes(field)) {
                // Handle complex field paste
                const parsedData = parseComplexFieldData(field, values[0]);
                setData(prev => prev.map(row =>
                    row.id === rowId
                        ? { ...row, [field]: parsedData }
                        : row
                ));
                cancelEdit();
            } else {
                setEditingValue(values[0]);
            }
        }
    };

    // Handle table-level paste for bulk operations
    const handleTablePaste = (e) => {
        if (editingCell) return; // Don't handle if already editing

        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const rows = pastedData.split('\n').filter(row => row.trim());

        if (rows.length === 0) return;

        const newData = [...data];

        rows.forEach((row, rIdx) => {
            const cells = row.split('\t');
            const newRow = { id: Date.now() + rIdx };

            allFields.forEach((field, fIdx) => {
                const cellValue = cells[fIdx] || '';

                if (field === 'fullName' && entityType === 'individuals') {
                    // Parse full name and store the components
                    const nameParts = parseFullName(cellValue.trim());
                    Object.assign(newRow, nameParts);
                } else if (field === 'datesOfBirth' || field === 'datesOfDeath') {
                    newRow[field] = parseDates(cellValue);
                } else if (currentFields.complex.includes(field)) {
                    newRow[field] = parseComplexFieldData(field, cellValue);
                } else if (field === 'isDead') {
                    newRow[field] = cellValue ? (cellValue.toLowerCase() === 'true' || cellValue === '1') : false;
                } else if (currentFields.arrays.includes(field)) {
                    newRow[field] = cellValue ? cellValue.split(',').map(v => v.trim()).filter(v => v) : [];
                } else {
                    newRow[field] = cellValue.trim();
                }
            });

            // Ensure all fields have default values
            allFields.forEach(field => {
                if (!(field in newRow)) {
                    if (currentFields.complex.includes(field) || currentFields.arrays.includes(field)) {
                        newRow[field] = [];
                    } else if (field === 'isDead') {
                        newRow[field] = false;
                    } else {
                        newRow[field] = '';
                    }
                }
            });

            if (entityType === 'individuals' && !('firstName' in newRow)) {
                newRow.firstName = '';
                newRow.middleName = '';
                newRow.lastName = '';
            }

            newData.push(newRow);
        });

        setData(newData);
    };

    // Modal handlers
    const openModal = (rowId, field) => {
        const row = data.find(r => r.id === rowId);
        setModalState({
            rowId,
            field,
            items: row[field] || []
        });
    };

    const saveModalData = () => {
        setData(prev => prev.map(row =>
            row.id === modalState.rowId
                ? { ...row, [modalState.field]: modalState.items }
                : row
        ));
        setModalState(null);
    };

    // Complex field modal content
    const renderModalContent = () => {
        if (!modalState) return null;

        const { field, items } = modalState;

        if (field === 'addresses') {
            return (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Edit Addresses</h3>
                    {items.map((address, idx) => (
                        <div key={idx} className="border rounded p-4 space-y-2">
                            <div className="flex justify-between">
                                <select
                                    value={address.addressType || ''}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[idx] = { ...address, addressType: e.target.value };
                                        setModalState({ ...modalState, items: newItems });
                                    }}
                                    className="border rounded px-2 py-1"
                                >
                                    <option value="">Select Type</option>
                                    {addressTypesIndividual.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => {
                                        const newItems = items.filter((_, i) => i !== idx);
                                        setModalState({ ...modalState, items: newItems });
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <input
                                placeholder="Country ID (required)"
                                type="number"
                                value={address.countryId || ''}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx] = { ...address, countryId: parseInt(e.target.value) || '' };
                                    setModalState({ ...modalState, items: newItems });
                                }}
                                className="w-full border rounded px-2 py-1"
                            />
                            <input
                                placeholder="Address Line 1"
                                value={address.line1 || ''}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx] = { ...address, line1: e.target.value };
                                    setModalState({ ...modalState, items: newItems });
                                }}
                                className="w-full border rounded px-2 py-1"
                            />
                            <input
                                placeholder="Address Line 2"
                                value={address.line2 || ''}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx] = { ...address, line2: e.target.value };
                                    setModalState({ ...modalState, items: newItems });
                                }}
                                className="w-full border rounded px-2 py-1"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    placeholder="City"
                                    value={address.city || ''}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[idx] = { ...address, city: e.target.value };
                                        setModalState({ ...modalState, items: newItems });
                                    }}
                                    className="border rounded px-2 py-1"
                                />
                                <input
                                    placeholder="County"
                                    value={address.county || ''}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[idx] = { ...address, county: e.target.value };
                                        setModalState({ ...modalState, items: newItems });
                                    }}
                                    className="border rounded px-2 py-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    placeholder="County Abbrev"
                                    value={address.countyAbbrev || ''}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[idx] = { ...address, countyAbbrev: e.target.value };
                                        setModalState({ ...modalState, items: newItems });
                                    }}
                                    className="border rounded px-2 py-1"
                                />
                                <input
                                    placeholder="Postcode"
                                    value={address.postcode || ''}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[idx] = { ...address, postcode: e.target.value };
                                        setModalState({ ...modalState, items: newItems });
                                    }}
                                    className="border rounded px-2 py-1"
                                />
                            </div>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={address.deleted || false}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[idx] = { ...address, deleted: e.target.checked };
                                        setModalState({ ...modalState, items: newItems });
                                    }}
                                />
                                <span>Deleted</span>
                            </label>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const newItems = [...items, {
                                addressType: 'Operating',
                                countryId: '',
                                line1: '',
                                line2: '',
                                city: '',
                                county: '',
                                countyAbbrev: '',
                                postcode: '',
                                deleted: false
                            }];
                            setModalState({ ...modalState, items: newItems });
                        }}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                    >
                        <Plus size={16} /> <span>Add Address</span>
                    </button>
                </div>
            );
        }

        if (field === 'datesOfBirth' || field === 'datesOfDeath') {
            return (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Edit {field === 'datesOfBirth' ? 'Dates of Birth' : 'Dates of Death'}</h3>
                    {items.map((date, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                            <input
                                type="number"
                                placeholder="Day"
                                min="1"
                                max="31"
                                value={date.day || ''}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx] = { ...date, day: parseInt(e.target.value) || null };
                                    setModalState({ ...modalState, items: newItems });
                                }}
                                className="w-20 border rounded px-2 py-1"
                            />
                            <input
                                type="number"
                                placeholder="Month"
                                min="1"
                                max="12"
                                value={date.month || ''}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx] = { ...date, month: parseInt(e.target.value) || null };
                                    setModalState({ ...modalState, items: newItems });
                                }}
                                className="w-20 border rounded px-2 py-1"
                            />
                            <input
                                type="number"
                                placeholder="Year"
                                min="1900"
                                value={date.year || ''}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx] = { ...date, year: parseInt(e.target.value) || null };
                                    setModalState({ ...modalState, items: newItems });
                                }}
                                className="w-24 border rounded px-2 py-1"
                            />
                            <button
                                onClick={() => {
                                    const newItems = items.filter((_, i) => i !== idx);
                                    setModalState({ ...modalState, items: newItems });
                                }}
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const newItems = [...items, { day: null, month: null, year: null }];
                            setModalState({ ...modalState, items: newItems });
                        }}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                    >
                        <Plus size={16} /> <span>Add Date</span>
                    </button>
                </div>
            );
        }

        // Generic array handler for other complex fields
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Edit {field}</h3>
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                        <input
                            value={typeof item === 'string' ? item : JSON.stringify(item)}
                            onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx] = e.target.value;
                                setModalState({ ...modalState, items: newItems });
                            }}
                            className="flex-1 border rounded px-2 py-1"
                        />
                        <button
                            onClick={() => {
                                const newItems = items.filter((_, i) => i !== idx);
                                setModalState({ ...modalState, items: newItems });
                            }}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => {
                        const newItems = [...items, ''];
                        setModalState({ ...modalState, items: newItems });
                    }}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                    <Plus size={16} /> <span>Add Item</span>
                </button>
            </div>
        );
    };

    // Clean JSON generation
    const generateCleanJson = () => {
        const cleanData = data.map(row => {
            const cleanRow = {};

            Object.entries(row).forEach(([key, value]) => {
                if (key === 'id' || key === 'fullName') return; // Skip internal fields

                if (value === '' || value === null || value === undefined) return;
                if (typeof value === 'boolean' && value === false && key !== 'isDead') return; // Keep isDead even if false
                if (Array.isArray(value) && value.length === 0) return;
                if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return;

                if (Array.isArray(value)) {
                    const cleanArray = value.filter(item => {
                        if (typeof item === 'string' && item.trim() === '') return false;
                        if (typeof item === 'object') {
                            const cleanObj = {};
                            Object.entries(item).forEach(([k, v]) => {
                                if (v !== '' && v !== null && v !== undefined && !(typeof v === 'boolean' && v === false && k !== 'deleted')) {
                                    cleanObj[k] = v;
                                }
                            });
                            return Object.keys(cleanObj).length > 0;
                        }
                        return true;
                    });

                    if (cleanArray.length > 0) {
                        cleanRow[key] = cleanArray;
                    }
                } else {
                    cleanRow[key] = value;
                }
            });

            return cleanRow;
        }).filter(row => Object.keys(row).length > 0);

        const result = {
            [entityType]: cleanData
        };

        setGeneratedJson(JSON.stringify(result, null, 2));
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedJson);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    // Cell rendering
    const renderCell = (row, field) => {
        const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
        const value = row[field];

        if (isEditing) {
            if (field === 'gender') {
                return (
                    <select
                        value={editingValue}
                        onChange={(e) => handleCellChange(e.target.value)}
                        onBlur={saveCellValue}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCellValue();
                            if (e.key === 'Escape') cancelEdit();
                        }}
                        className="w-full px-1 py-0.5 border rounded"
                        autoFocus
                    >
                        <option value="">Select</option>
                        {genderOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            }

            if (field === 'pepTier') {
                return (
                    <select
                        value={editingValue}
                        onChange={(e) => handleCellChange(e.target.value)}
                        onBlur={saveCellValue}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCellValue();
                            if (e.key === 'Escape') cancelEdit();
                        }}
                        className="w-full px-1 py-0.5 border rounded"
                        autoFocus
                    >
                        <option value="">Select</option>
                        {pepTierOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            }

            if (field === 'isDead') {
                return (
                    <input
                        type="checkbox"
                        checked={editingValue === true || editingValue === 'true'}
                        onChange={(e) => handleCellChange(e.target.checked)}
                        onBlur={saveCellValue}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCellValue();
                            if (e.key === 'Escape') cancelEdit();
                        }}
                        className="cursor-pointer"
                        autoFocus
                    />
                );
            }

            if (field === 'nationalities') {
                return (
                    <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => handleCellChange(e.target.value)}
                        onBlur={saveCellValue}
                        onPaste={(e) => handlePaste(e, row.id, field)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCellValue();
                            if (e.key === 'Escape') cancelEdit();
                            if (e.key === 'Tab') {
                                e.preventDefault();
                                saveCellValue();
                                const fieldIndex = allFields.indexOf(field);
                                if (fieldIndex < allFields.length - 1) {
                                    const nextField = allFields[fieldIndex + 1];
                                    if (!currentFields.complex.includes(nextField)) {
                                        setTimeout(() => handleCellClick(row.id, nextField), 0);
                                    }
                                }
                            }
                        }}
                        placeholder="e.g. US,GB,FR"
                        className="w-full px-1 py-0.5 border rounded"
                        autoFocus
                    />
                );
            }

            if (field === 'businessTypes') {
                return (
                    <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => handleCellChange(e.target.value)}
                        onBlur={saveCellValue}
                        onPaste={(e) => handlePaste(e, row.id, field)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCellValue();
                            if (e.key === 'Escape') cancelEdit();
                        }}
                        placeholder="e.g. Bank,Trust Fund"
                        className="w-full px-1 py-0.5 border rounded"
                        autoFocus
                    />
                );
            }

            return (
                <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => handleCellChange(e.target.value)}
                    onBlur={saveCellValue}
                    onPaste={(e) => handlePaste(e, row.id, field)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') saveCellValue();
                        if (e.key === 'Escape') cancelEdit();
                        if (e.key === 'Tab') {
                            e.preventDefault();
                            saveCellValue();
                            const fieldIndex = allFields.indexOf(field);
                            if (fieldIndex < allFields.length - 1) {
                                const nextField = allFields[fieldIndex + 1];
                                if (!currentFields.complex.includes(nextField)) {
                                    setTimeout(() => handleCellClick(row.id, nextField), 0);
                                }
                            }
                        }
                    }}
                    className="w-full px-1 py-0.5 border rounded"
                    autoFocus
                />
            );
        }

        if (currentFields.complex.includes(field)) {
            const count = value?.length || 0;
            return (
                <div className="flex items-center justify-between group">
                    <div
                        className="flex-1 cursor-pointer min-h-[24px] flex items-center"
                        onClick={() => handleCellClick(row.id, field)}
                        onPaste={(e) => handlePaste(e, row.id, field)}
                    >
                        <span className="text-sm text-gray-600">{count} {field}</span>
                        <span className="text-xs text-gray-400 ml-2 opacity-0 group-hover:opacity-100">
              (paste here)
            </span>
                    </div>
                    <button
                        onClick={() => openModal(row.id, field)}
                        className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        <Edit2 size={12} />
                    </button>
                </div>
            );
        }

        if (field === 'datesOfBirth' || field === 'datesOfDeath') {
            const displayValue = Array.isArray(value)
                ? value.map(d => d.year ? `${d.day || '?'}/${d.month || '?'}/${d.year}` : '').filter(d => d).join(', ')
                : '';
            return (
                <div className="flex items-center justify-between group">
                    <div
                        onClick={() => handleCellClick(row.id, field)}
                        onPaste={(e) => handlePaste(e, row.id, field)}
                        className="flex-1 cursor-pointer truncate min-h-[24px] px-1"
                    >
                        {displayValue || <span className="text-gray-400">Click to edit</span>}
                    </div>
                    <button
                        onClick={() => openModal(row.id, field)}
                        className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 opacity-0 group-hover:opacity-100"
                    >
                        <Edit2 size={12} />
                    </button>
                </div>
            );
        }

        if (currentFields.arrays.includes(field)) {
            const displayValue = Array.isArray(value) ? value.join(', ') : '';
            return (
                <div
                    onClick={() => handleCellClick(row.id, field)}
                    onPaste={(e) => handlePaste(e, row.id, field)}
                    className="cursor-pointer truncate min-h-[24px] px-1"
                >
                    {displayValue || <span className="text-gray-400">Click to edit</span>}
                </div>
            );
        }

        if (field === 'isDead') {
            return (
                <div
                    onClick={() => handleCellClick(row.id, field)}
                    className="cursor-pointer text-center min-h-[24px]"
                >
                    {value ? '✓' : ''}
                </div>
            );
        }

        if (field === 'fullName' && entityType === 'individuals') {
            const displayName = row.firstName || row.lastName
                ? `${row.firstName} ${row.middleName} ${row.lastName}`.trim().replace(/\s+/g, ' ')
                : '';
            return (
                <div
                    onClick={() => handleCellClick(row.id, field)}
                    onPaste={(e) => handlePaste(e, row.id, field)}
                    className="cursor-pointer truncate min-h-[24px] px-1"
                >
                    {displayName || <span className="text-gray-400">Click to edit full name</span>}
                </div>
            );
        }

        return (
            <div
                onClick={() => handleCellClick(row.id, field)}
                onPaste={(e) => handlePaste(e, row.id, field)}
                className="cursor-pointer truncate min-h-[24px] px-1"
            >
                {value || <span className="text-gray-400">Click to edit</span>}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-full">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-4">ARI Bulk Data Entry Tool</h1>

                {/* Entity Type Toggle */}
                <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setEntityType('individuals')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                                entityType === 'individuals'
                                    ? 'bg-white shadow-sm text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <Users size={18} />
                            <span>Individuals</span>
                        </button>
                        <button
                            onClick={() => setEntityType('businesses')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                                entityType === 'businesses'
                                    ? 'bg-white shadow-sm text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <Building2 size={18} />
                            <span>Businesses</span>
                        </button>
                    </div>

                    <button
                        onClick={addNewRow}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        <Plus size={18} />
                        <span>Add Row</span>
                    </button>

                    <button
                        onClick={generateCleanJson}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        <span>Generate JSON</span>
                    </button>
                </div>

                <p className="text-sm text-gray-600">
                    <strong>Quick Start:</strong> Copy your Excel data and paste directly into the table area.
                    Full names are automatically split into first, middle, and last names.
                </p>
                <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <p>• <strong>Bulk Paste:</strong> Select all your data in Excel → Copy → Click anywhere in the table → Paste</p>
                    <p>• <strong>Full Names:</strong> Paste as "John Michael Doe" → automatically splits to firstName, middleName, lastName</p>
                    <p>• <strong>Complex Fields:</strong> You can now paste directly into aliases, addresses, evidences fields!</p>
                    <p>• <strong>Addresses:</strong> Paste as "Operating,52,Main St,,Sofia,Sofia,SF,1111" or use Edit button</p>
                    <p>• <strong>Dates:</strong> Paste as "1/2/2000" or "1/2/2000;5/6/2001" for multiple dates</p>
                    <p>• <strong>Nationalities:</strong> Use country codes like "US,GB,FR" (comma-separated)</p>
                    <p>• <strong>Aliases:</strong> Paste multiple aliases separated by newlines, semicolons, or pipes</p>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto border rounded-lg" onPaste={handleTablePaste}>
                <table className="w-full">
                    <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                        {allFields.map(field => (
                            <th key={field} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                {field}
                                {(field === 'firstName' || field === 'lastName' || field === 'gender' ||
                                    (field === 'nationalities' && entityType === 'individuals') ||
                                    field === 'name') && <span className="text-red-500 ml-1">*</span>}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={row.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">
                                <button
                                    onClick={() => setData(prev => prev.filter(r => r.id !== row.id))}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                            {allFields.map(field => (
                                <td key={field} className="px-4 py-2 text-sm">
                                    {renderCell(row, field)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>

                {data.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <p>No data yet. Click "Add Row" to start entering data.</p>
                        <p className="text-sm mt-2">Or paste your data directly from Excel!</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalState && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        {renderModalContent()}
                        <div className="mt-6 flex justify-end space-x-2">
                            <button
                                onClick={() => setModalState(null)}
                                className="px-4 py-2 border rounded hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveModalData}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generated JSON */}
            {generatedJson && (
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">Generated JSON</h3>
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
                        >
                            {copySuccess ? (
                                <>
                                    <Check size={16} className="text-green-600" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={16} />
                                    <span>Copy to Clipboard</span>
                                </>
                            )}
                        </button>
                    </div>
                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {generatedJson}
          </pre>
                </div>
            )}
        </div>
    );
};

export default BulkDataEntryPlatform;