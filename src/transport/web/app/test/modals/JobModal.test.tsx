import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { JobModal } from '../../src/modals/JobModal'

vi.mock('../../src/api/weather', () => ({
  geocodeCity: vi.fn(),
}))

vi.mock('../../src/api/jobs', () => ({
  createJob: vi.fn(),
  updateJob: vi.fn(),
}))

// Stub localStorage for JSDOM environments that don't initialize it properly
beforeAll(() => {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    const store: Record<string, string> = {}
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v },
        removeItem: (k: string) => { delete store[k] },
        clear: () => { Object.keys(store).forEach(k => delete store[k]) },
      },
      writable: true,
    })
  }
})

describe('JobModal with initialValues (pre-seeded outfit_reminder)', () => {
  const initialValues = {
    name: 'Wear Summer Vibes',
    type: 'outfit_reminder',
    params: {
      outfitId: 'outfit-1',
      chatId: '123456789',
    },
  }

  it('shows locked type badge when initialValues.type is set', () => {
    render(
      <JobModal
        initialValues={initialValues}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )
    expect(screen.getByText('Outfit Reminder')).toBeInTheDocument()
  })

  it('pre-fills name from initialValues', () => {
    render(
      <JobModal
        initialValues={initialValues}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )
    const nameInput = screen.getByDisplayValue('Wear Summer Vibes')
    expect(nameInput).toBeInTheDocument()
  })

  it('pre-fills chat ID from initialValues.params', () => {
    render(
      <JobModal
        initialValues={initialValues}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )
    expect(screen.getByDisplayValue('123456789')).toBeInTheDocument()
  })

  it('does not show type dropdown', () => {
    render(
      <JobModal
        initialValues={initialValues}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )
    // The type badge is shown, no select dropdown for type
    expect(screen.queryByRole('combobox', { name: /type/i })).not.toBeInTheDocument()
  })

  it('calls onClose when ✕ button clicked', () => {
    const onClose = vi.fn()
    render(
      <JobModal
        initialValues={initialValues}
        onClose={onClose}
        onSaved={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('JobModal in create mode (no initialValues)', () => {
  it('shows New Job title', () => {
    render(<JobModal onClose={() => {}} onSaved={() => {}} />)
    expect(screen.getByText('New Job')).toBeInTheDocument()
  })

  it('does not show locked type badge', () => {
    render(<JobModal onClose={() => {}} onSaved={() => {}} />)
    expect(screen.queryByText('Outfit Reminder')).not.toBeInTheDocument()
    expect(screen.queryByText('Daily Outfit')).not.toBeInTheDocument()
  })
})
