export const verboseTicketNumbers = (ticketNumbers) => {
  if (ticketNumbers.length === 1) {
    return ticketNumbers[0]
  }
  return [ticketNumbers.slice(0, -1).join(', '), ticketNumbers.slice(-1)].join(' y ')
}

export const formatTicketNumber = (ticketNumber) => String(ticketNumber).padStart(3, '0')

export const formatCurrency = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
}).format(value)
