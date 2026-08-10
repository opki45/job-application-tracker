const { normalize, findMatchingApplication, isForwardMove } = require('../src/reconcile');

describe('normalize', () => {
  test('lowercases, trims, and collapses whitespace', () => {
    expect(normalize('  Monzo   Inc.  ')).toBe('monzo inc');
  });

  test('strips punctuation', () => {
    expect(normalize("Wayve, Inc.")).toBe('wayve inc');
  });

  test('handles null/undefined without throwing', () => {
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });
});

describe('findMatchingApplication', () => {
  const applications = [
    { id: 1, company: 'Monzo', role: 'Graduate Software Engineer', status: 'applied' },
    { id: 2, company: 'Wayve', role: 'AI Engineer', status: 'interviewing' },
  ];

  test('matches on normalized company + role, ignoring case/whitespace/punctuation', () => {
    const match = findMatchingApplication(applications, {
      company: '  monzo  ',
      role: 'Graduate Software Engineer.',
    });
    expect(match?.id).toBe(1);
  });

  test('returns null when company matches but role does not', () => {
    const match = findMatchingApplication(applications, { company: 'Monzo', role: 'Something else' });
    expect(match).toBeNull();
  });

  test('returns null when nothing matches', () => {
    const match = findMatchingApplication(applications, { company: 'Palantir', role: 'FDE' });
    expect(match).toBeNull();
  });

  test('returns null rather than guessing when company or role is missing', () => {
    expect(findMatchingApplication(applications, { company: null, role: 'AI Engineer' })).toBeNull();
    expect(findMatchingApplication(applications, { company: 'Wayve', role: null })).toBeNull();
  });
});

describe('isForwardMove', () => {
  test('applied -> interviewing is forward', () => {
    expect(isForwardMove('applied', 'interviewing')).toBe(true);
  });

  test('interviewing -> offer is forward', () => {
    expect(isForwardMove('interviewing', 'offer')).toBe(true);
  });

  test('offer -> accepted is forward', () => {
    expect(isForwardMove('offer', 'accepted')).toBe(true);
  });

  test('offer -> rejected is NOT forward (same rank, not a progression)', () => {
    expect(isForwardMove('offer', 'rejected')).toBe(false);
  });

  test('rejected -> offer is NOT forward (same rank)', () => {
    expect(isForwardMove('rejected', 'offer')).toBe(false);
  });

  test('a status restating the same stage is not forward', () => {
    expect(isForwardMove('interviewing', 'interviewing')).toBe(false);
  });

  test('a backward-looking status is not forward', () => {
    expect(isForwardMove('interviewing', 'applied')).toBe(false);
  });

  test('accepted has nothing further forward', () => {
    expect(isForwardMove('accepted', 'applied')).toBe(false);
    expect(isForwardMove('accepted', 'interviewing')).toBe(false);
  });

  test('a null/unrecognized new status is never forward', () => {
    expect(isForwardMove('applied', null)).toBe(false);
    expect(isForwardMove('applied', 'ghosted')).toBe(false);
  });
});
