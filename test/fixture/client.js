// Test-only section provider. Never included in the published package.
window.__ModuleLoader__.load({
  id: 'dsh-settings-scroll-fixture',
  factory: require => {
    const React = require('react');
    return {
      inject: ['slots'],
      apply(ctx) {
        for (let i = 1; i <= 30; i++) {
          ctx.slots.inject('settings.section', () => ctx.slots.register({
            name: 'settings.section', id: `qa-${i}`, order: 1000 + i,
            label: () => `Test section ${String(i).padStart(2, '0')}`,
          }, () => React.createElement('div', null,
            React.createElement('h2', null, `Test section ${i}`),
            React.createElement('p', null, 'Test-only settings section for scroll verification.'))));
        }
      },
    };
  },
});
