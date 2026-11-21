import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchableOptionSelect from './SearchableOptionSelect';

const options = [
  { value: '1', label: 'Beverages' },
  { value: '2', label: 'Personal Care' },
  { value: '3', label: 'Pantry' },
];

describe('SearchableOptionSelect', () => {
  test('focuses search when opened, filters options, and selects with keyboard navigation', () => {
    const onChange = jest.fn();
    render(
      <>
        <SearchableOptionSelect
          options={options}
          value=""
          onChange={onChange}
          placeholder="Choose category"
          searchPlaceholder="Search categories..."
          emptyMessage="No matching categories found."
        />
        <button type="button">Next field</button>
      </>,
    );

    const categorySelect = screen.getByRole('button', { name: /Choose category/i });
    fireEvent.click(categorySelect);
    const search = screen.getByRole('searchbox', {
      name: 'Search categories...',
    });
    expect(document.activeElement).toBe(search);
    fireEvent.change(search, { target: { value: 'personal' } });

    expect(screen.getByRole('option', { name: 'Personal Care' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Beverages' })).toBeNull();

    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('2');
    expect(document.activeElement).toBe(categorySelect);
    userEvent.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Next field' }),
    );
  });

  test('shows an empty message for a query with no matching options', () => {
    render(
      <SearchableOptionSelect
        options={options}
        value=""
        onChange={jest.fn()}
        placeholder="Choose brand"
        searchPlaceholder="Search brands..."
        emptyMessage="No matching brands found."
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Choose brand/i }));
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search brands...' }),
      { target: { value: 'missing' } },
    );

    expect(screen.getByRole('status').textContent).toBe(
      'No matching brands found.',
    );
  });
});
