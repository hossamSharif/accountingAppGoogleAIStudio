/**
 * Centralized formatting utilities for numbers and currency
 * Using English numerals (0-9) with Egyptian Pound (ج.س) currency
 */

/**
 * Format a number with English numerals and thousand separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string with English numerals
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  // Use 'en-US' locale to ensure English numerals (0-9)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format a currency value with English numerals and ج.س symbol
 * @param amount - The amount to format
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted currency string with English numerals and ج.س
 */
export const formatCurrency = (amount: number, showDecimals: boolean = true): string => {
  const decimals = showDecimals ? 2 : 0;
  const formattedNumber = formatNumber(Math.abs(amount), decimals);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${formattedNumber} ج.س`;
};

/**
 * Format a percentage value with English numerals
 * @param value - The percentage value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${formatNumber(value * 100, decimals)}%`;
};

/**
 * Parse a formatted number string back to a number
 * @param value - The formatted string to parse
 * @returns The parsed number
 */
export const parseFormattedNumber = (value: string): number => {
  // Remove commas, currency symbols, and spaces
  const cleaned = value.replace(/[,\s\u062C.\u0633]/g, '');
  return parseFloat(cleaned) || 0;
};