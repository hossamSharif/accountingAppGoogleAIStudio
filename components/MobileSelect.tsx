import React, { useState, useRef, useEffect } from 'react';

interface MobileSelectOption {
    value: string;
    label: string;
}

interface MobileSelectProps {
    options: MobileSelectOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const ChevronDownIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
);

const MobileSelect: React.FC<MobileSelectProps> = ({
    options,
    value,
    onChange,
    label,
    placeholder = 'Select an option',
    className = '',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-text-secondary mb-2">
                    {label}
                </label>
            )}

            {/* Selected value display / trigger button */}
            <button
                type="button"
                onClick={toggleDropdown}
                disabled={disabled}
                className={`
                    w-full min-h-[44px] px-4 py-3
                    bg-background border border-gray-600 rounded-lg
                    text-text-primary text-right
                    flex items-center justify-between
                    transition-all duration-200
                    ${isOpen ? 'ring-2 ring-primary border-primary' : 'hover:border-gray-500'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    focus:outline-none focus:ring-2 focus:ring-primary
                `}
            >
                <span className={selectedOption ? 'text-text-primary' : 'text-text-secondary'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </span>
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="
                        absolute z-50 w-full mt-2
                        bg-surface border border-gray-600 rounded-lg shadow-2xl
                        max-h-[60vh] overflow-y-auto
                        animate-slideDown
                    "
                    style={{
                        // Ensure dropdown is visible on screen
                        top: '100%',
                    }}
                >
                    {options.length === 0 ? (
                        <div className="px-4 py-3 text-text-secondary text-center">
                            No options available
                        </div>
                    ) : (
                        <div className="py-2">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`
                                        w-full min-h-[44px] px-4 py-3
                                        text-right transition-colors
                                        ${option.value === value
                                            ? 'bg-primary text-white'
                                            : 'text-text-primary hover:bg-background'
                                        }
                                    `}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Inline styles for animation */}
            <style>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slideDown {
                    animation: slideDown 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

export default MobileSelect;
