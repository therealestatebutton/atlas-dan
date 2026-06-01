/**
 * Format a date to a readable string
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

/**
 * Format a date with time
 */
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

/**
 * Format a number as currency
 */
export function formatCurrency(value: string | null): string {
  if (!value) return 'N/A';
  try {
    const num = parseInt(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  } catch {
    return value;
  }
}

/**
 * Format a lead type for display
 */
export function formatLeadType(type: string): string {
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a status with appropriate styling
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-green-100 text-green-800';
    case 'contacted':
      return 'bg-yellow-100 text-yellow-800';
    case 'qualified':
      return 'bg-blue-100 text-blue-800';
    case 'closed':
      return 'bg-purple-100 text-purple-800';
    case 'not-interested':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string | null, length: number = 50): string {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

/**
 * Get initials from a name
 */
export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
