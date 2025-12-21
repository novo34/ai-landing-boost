import { createData, createDataInTransaction } from './create-data.helper';

describe('createData', () => {
  it('should add id if not provided', () => {
    const data = { email: 'test@example.com' };
    const result = createData(data);

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
  });

  it('should use provided id if exists', () => {
    const customId = 'custom-id-123';
    const data = { id: customId, email: 'test@example.com' };
    const result = createData(data);

    expect(result.id).toBe(customId);
  });

  it('should add updatedAt if not provided', () => {
    const data = { email: 'test@example.com' };
    const result = createData(data);

    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should use provided updatedAt if exists', () => {
    const customDate = new Date('2025-01-01');
    const data = { email: 'test@example.com', updatedAt: customDate };
    const result = createData(data);

    expect(result.updatedAt).toBe(customDate);
  });

  it('should preserve all other fields', () => {
    const data = {
      email: 'test@example.com',
      name: 'Test User',
      tenantId: 'tenant-123',
    };
    const result = createData(data);

    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('Test User');
    expect(result.tenantId).toBe('tenant-123');
    expect(result.id).toBeDefined();
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should handle empty object', () => {
    const data = {};
    const result = createData(data);

    expect(result.id).toBeDefined();
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should handle nested objects', () => {
    const data = {
      email: 'test@example.com',
      metadata: { key: 'value' },
    };
    const result = createData(data);

    expect(result.email).toBe('test@example.com');
    expect(result.metadata).toEqual({ key: 'value' });
    expect(result.id).toBeDefined();
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});

describe('createDataInTransaction', () => {
  it('should work the same as createData', () => {
    const data = { email: 'test@example.com' };
    const result = createDataInTransaction(data);

    expect(result.id).toBeDefined();
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.email).toBe('test@example.com');
  });

  it('should preserve provided id and updatedAt', () => {
    const customId = 'custom-id-456';
    const customDate = new Date('2025-01-02');
    const data = {
      id: customId,
      email: 'test@example.com',
      updatedAt: customDate,
    };
    const result = createDataInTransaction(data);

    expect(result.id).toBe(customId);
    expect(result.updatedAt).toBe(customDate);
  });
});


