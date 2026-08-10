const { isLikelyJobRelated } = require('../src/utils/emailPrefilter');

describe('isLikelyJobRelated', () => {
  test('matches on a subject keyword', () => {
    expect(
      isLikelyJobRelated({
        from: 'noreply@somecompany.com',
        subject: 'Your application to Some Company',
        snippet: '',
      })
    ).toBe(true);
  });

  test('matches on a snippet keyword even with a generic subject', () => {
    expect(
      isLikelyJobRelated({
        from: 'noreply@somecompany.com',
        subject: 'Update',
        snippet: 'Unfortunately, we have decided to move forward with other candidates.',
      })
    ).toBe(true);
  });

  test('matches on a known ATS sender domain even with no keywords', () => {
    expect(
      isLikelyJobRelated({
        from: 'Some Company <no-reply@greenhouse.io>',
        subject: 'Update on your account',
        snippet: '',
      })
    ).toBe(true);
  });

  test('does not match ordinary mail with no signal', () => {
    expect(
      isLikelyJobRelated({
        from: 'friend@gmail.com',
        subject: 'Dinner Friday?',
        snippet: 'Are you free this Friday for dinner?',
      })
    ).toBe(false);
  });

  test('is case-insensitive', () => {
    expect(
      isLikelyJobRelated({
        from: 'noreply@somecompany.com',
        subject: 'INTERVIEW invitation',
        snippet: '',
      })
    ).toBe(true);
  });
});
